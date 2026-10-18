import { Resend } from "resend";
import type { QuoteRequest, ManufacturerContact, Project, DoorOpening, HardwareItem } from "@shared/schema";
import { logger, logError } from "./logger";
import { COMPANY_EMAILS } from "@shared/emails";

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

interface QuoteEmailData {
  project: Project;
  opening?: DoorOpening;
  hardwareItem?: HardwareItem;
  manufacturerContact: ManufacturerContact;
  quoteRequest: QuoteRequest;
  attachments: EmailAttachment[];
}

class EmailService {
  private resend: Resend | null;
  private sandboxMode: boolean;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.sandboxMode = !this.apiKey;
    this.resend = this.apiKey ? new Resend(this.apiKey) : null;

    if (this.sandboxMode) {
      logger.warn("Email service running in SANDBOX MODE - emails will be logged but not sent");
      logger.info("To enable email sending, set RESEND_API_KEY environment variable");
    } else {
      logger.info("Email service initialized with Resend API - emails will be sent");
    }
  }

  async sendEmail({ to, subject, html, attachments = [] }: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.sandboxMode) {
      logger.info("SANDBOX EMAIL", { 
        to, 
        subject, 
        attachments: attachments.map(a => a.filename), 
        bodyPreview: html.substring(0, 200) 
      });
      
      return {
        success: true,
        messageId: `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    try {
      if (!this.resend) {
        throw new Error("Resend client not initialized");
      }

      logger.info("Sending email via Resend", { to, subject });

      const { data, error } = await this.resend.emails.send({
        from: `DoorSurvey Pro <${COMPANY_EMAILS.noReply}>`,
        to: [to],
        subject,
        html,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content,
        })),
      });

      if (error) {
        logger.error("Resend API error", { error: error.message, to, subject });
        
        // Check if this is a testing mode restriction
        if (error.message?.includes("testing emails") || error.message?.includes("verify a domain")) {
          logger.warn("Resend account is in testing mode", { 
            message: "Verify a domain at resend.com/domains to send to any email address" 
          });
          
          return {
            success: false,
            error: "Email service is in testing mode. Emails can only be sent to the account owner's verified email address. To enable sending to any email, please verify a domain in your Resend account settings.",
          };
        }
        
        return {
          success: false,
          error: error.message,
        };
      }

      logger.info("Email sent successfully", { messageId: data?.id, to, subject });
      
      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      logError(error as Error, { context: 'email-send', to, subject });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendManufacturerQuote(data: QuoteEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { project, opening, hardwareItem, manufacturerContact, attachments } = data;

    const itemDescription = opening 
      ? `Opening ${opening.openingNumber} - ${opening.location}`
      : hardwareItem 
      ? `Custom Hardware: ${hardwareItem.description}`
      : "Quote Request";

    const subject = `Quote Request - ${project.name} - ${itemDescription}`;

    const html = this.generateQuoteEmailHtml(data);

    return this.sendEmail({
      to: manufacturerContact.email,
      subject,
      html,
      attachments,
    });
  }

  private generateQuoteEmailHtml(data: QuoteEmailData): string {
    const { project, opening, hardwareItem, manufacturerContact } = data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #2563eb; color: white; padding: 20px; }
          .content { padding: 20px; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; color: #666; }
          .value { margin-left: 10px; }
          .footer { background: #f3f4f6; padding: 20px; margin-top: 30px; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Manufacturer Quote Request</h1>
        </div>
        
        <div class="content">
          <div class="section">
            <h2>Contact Information</h2>
            <p><span class="label">Manufacturer:</span><span class="value">${manufacturerContact.manufacturerName}</span></p>
            <p><span class="label">Contact:</span><span class="value">${manufacturerContact.contactName}</span></p>
          </div>

          <div class="section">
            <h2>Project Details</h2>
            <p><span class="label">Project:</span><span class="value">${project.name}</span></p>
            <p><span class="label">Location:</span><span class="value">${project.location}</span></p>
            <p><span class="label">Building Type:</span><span class="value">${project.buildingType}</span></p>
          </div>

          ${opening ? `
          <div class="section">
            <h2>Door Opening Details</h2>
            <p><span class="label">Opening Number:</span><span class="value">${opening.openingNumber}</span></p>
            <p><span class="label">Location:</span><span class="value">${opening.location}</span></p>
            ${opening.doorType ? `<p><span class="label">Door Type:</span><span class="value">${opening.doorType}</span></p>` : ''}
            ${opening.doorWidth ? `<p><span class="label">Door Width:</span><span class="value">${opening.doorWidth}"</span></p>` : ''}
            ${opening.doorHeight ? `<p><span class="label">Door Height:</span><span class="value">${opening.doorHeight}"</span></p>` : ''}
            ${opening.frameType ? `<p><span class="label">Frame Type:</span><span class="value">${opening.frameType}</span></p>` : ''}
          </div>
          ` : ''}

          ${hardwareItem ? `
          <div class="section">
            <h2>Custom Hardware Details</h2>
            <p><span class="label">Item Type:</span><span class="value">${hardwareItem.itemType}</span></p>
            <p><span class="label">Description:</span><span class="value">${hardwareItem.description}</span></p>
            <p><span class="label">Quantity:</span><span class="value">${hardwareItem.quantity}</span></p>
            ${hardwareItem.manufacturer ? `<p><span class="label">Manufacturer:</span><span class="value">${hardwareItem.manufacturer}</span></p>` : ''}
            ${hardwareItem.model ? `<p><span class="label">Model:</span><span class="value">${hardwareItem.model}</span></p>` : ''}
          </div>
          ` : ''}

          <div class="section">
            <h2>Required Documents</h2>
            <p>Please find attached:</p>
            <ul>
              <li>Hard Machine Sheet - Technical specifications</li>
              <li>Cover Page - Project summary</li>
              <li>Order Form - Quantities and specifications</li>
            </ul>
            <p>Please review the attached documents and provide a quote at your earliest convenience.</p>
          </div>

          <div class="section">
            <h2>Response Instructions</h2>
            <p>Please reply to this email with your quote, including:</p>
            <ul>
              <li>Unit pricing</li>
              <li>Lead time</li>
              <li>Delivery terms</li>
              <li>Payment terms</li>
              <li>Any technical clarifications needed</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>This is an automated quote request from DoorSurvey Pro.</p>
          <p>For questions, please contact the project team.</p>
          <p style="margin-top: 15px;">
            <strong>DoorSurvey Pro Support:</strong><br>
            General Support: <a href="mailto:${COMPANY_EMAILS.support}">${COMPANY_EMAILS.support}</a><br>
            Technical Support: <a href="mailto:${COMPANY_EMAILS.techSupport}">${COMPANY_EMAILS.techSupport}</a><br>
            Sales Inquiries: <a href="mailto:${COMPANY_EMAILS.sales}">${COMPANY_EMAILS.sales}</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  async sendClientProposal(data: {
    project: Project;
    customerEmail: string;
    customerName: string;
    attachment: EmailAttachment;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { project, customerEmail, customerName, attachment } = data;

    const subject = `Project Proposal - ${project.name}`;

    const html = this.generateClientProposalEmailHtml(project, customerName);

    return this.sendEmail({
      to: customerEmail,
      subject,
      html,
      attachments: [attachment],
    });
  }

  private generateClientProposalEmailHtml(project: Project, customerName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #2563eb; color: white; padding: 20px; }
          .content { padding: 20px; }
          .section { margin: 20px 0; }
          .label { font-weight: bold; color: #666; }
          .value { margin-left: 10px; }
          .footer { background: #f3f4f6; padding: 20px; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Project Proposal</h1>
        </div>
        
        <div class="content">
          <div class="section">
            <p>Dear ${customerName},</p>
            <p>Please find attached the comprehensive proposal for your project:</p>
          </div>

          <div class="section">
            <h2>Project Information</h2>
            <p><span class="label">Project Name:</span><span class="value">${project.name}</span></p>
            <p><span class="label">Location:</span><span class="value">${project.location}</span></p>
            <p><span class="label">Building Type:</span><span class="value">${project.buildingType}</span></p>
          </div>

          <div class="section">
            <h2>Attached Documents</h2>
            <p>The attached PDF includes:</p>
            <ul>
              <li>Project narrative and overview</li>
              <li>Complete door schedule with specifications</li>
              <li>Frame schedule with dimensions and materials</li>
              <li>Hardware schedule detailing all components</li>
              <li>Opening diagrams for installation reference</li>
              <li>Cost summary and breakdown</li>
              <li>Disclaimers and addendums</li>
            </ul>
          </div>

          <div class="section">
            <h2>Next Steps</h2>
            <p>Please review the attached proposal at your convenience. If you have any questions or would like to discuss any aspect of the project, please don't hesitate to contact us.</p>
            <p>We look forward to working with you on this project.</p>
          </div>
        </div>

        <div class="footer">
          <p>This proposal was generated by DoorSurvey Pro - Commercial Door Estimating Tool</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <p style="margin-top: 15px;">
            <strong>Need Assistance?</strong><br>
            General Support: <a href="mailto:${COMPANY_EMAILS.support}">${COMPANY_EMAILS.support}</a><br>
            Sales Team: <a href="mailto:${COMPANY_EMAILS.sales}">${COMPANY_EMAILS.sales}</a><br>
            Billing Questions: <a href="mailto:${COMPANY_EMAILS.billing}">${COMPANY_EMAILS.billing}</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  isSandboxMode(): boolean {
    return this.sandboxMode;
  }
}

export const emailService = new EmailService();
