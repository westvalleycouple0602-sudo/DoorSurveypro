import { db } from "../db";
import { emailTemplates } from "@shared/schema";
import { count } from "drizzle-orm";

interface TemplateData {
  name: string;
  slug: string;
  description: string;
  category: string;
  subcategory?: string;
  subject: string;
  htmlContent: string;
  markdownContent: string;
  variables: string[];
  allowedRoles: string[];
  triggerType?: string;
  triggerDetails?: Record<string, any>;
  lifecycleStage?: string;
}

// All templates from the provided templates plus additional beneficial ones
const TEMPLATES: TemplateData[] = [
  // ============================================================================
  // NEW CUSTOMER TEMPLATES
  // ============================================================================
  {
    name: "New Lead Welcome",
    slug: "new-customer-new-lead-welcome",
    description: "Welcome email when a new contact is created from web form or import",
    category: "new_customer",
    subcategory: "welcome",
    subject: "Welcome to DoorSurvey Pro – Let's Get Started",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Welcome to DoorSurvey Pro</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Welcome to DoorSurvey Pro</h2>
<p>Hi {{FirstName}},</p>
<p>Thank you for reaching out! We received your request and are excited to help you with your door, frame, and hardware needs.</p>
<p>Our team will review the details you submitted and follow up shortly with next steps. If this is urgent, feel free to call us directly at {{PhoneNumber}}.</p>
<p>Looking forward to working with you!</p>
<p>— The DoorSurvey Pro Team</p>
</body></html>`,
    markdownContent: `# Welcome to DoorSurvey Pro\n\nHi {{FirstName}},\n\nThank you for reaching out! We received your request and are excited to help you with your door, frame, and hardware needs.\n\nOur team will review the details you submitted and follow up shortly with next steps. If this is urgent, feel free to call us directly at {{PhoneNumber}}.\n\nLooking forward to working with you!\n— The DoorSurvey Pro Team`,
    variables: ["FirstName", "PhoneNumber"],
    allowedRoles: ["sales_rep", "admin", "owner"],
    triggerType: "contact_property_change",
    triggerDetails: { source: "Web form", lifecycleStage: "Lead" },
    lifecycleStage: "Lead"
  },
  {
    name: "Account Created",
    slug: "new-customer-account-created",
    description: "Sends account created email when a DoorSurvey Pro portal is provisioned",
    category: "new_customer",
    subcategory: "account",
    subject: "Your DoorSurvey Pro Account Is Ready",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Account Created</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Your DoorSurvey Pro Account Is Ready</h2>
<p>Hi {{FirstName}},</p>
<p>Your account has been successfully created! You can now:</p>
<ul>
<li>Create and manage surveys</li>
<li>Upload photos, scans, and LiDAR measurements</li>
<li>Track project progress</li>
<li>Receive engineering and compliance insights</li>
</ul>
<p><a href="{{LoginLink}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Log in to Your Account</a></p>
<p>If you have any questions, just reply to this email.</p>
</body></html>`,
    markdownContent: `# Your DoorSurvey Pro Account Is Ready\n\nHi {{FirstName}},\n\nYour account has been successfully created! You can now:\n\n- Create and manage surveys\n- Upload photos, scans, and LiDAR measurements\n- Track project progress\n- Receive engineering and compliance insights\n\nLog in here: {{LoginLink}}\n\nIf you have any questions, just reply to this email.`,
    variables: ["FirstName", "LoginLink"],
    allowedRoles: ["admin", "owner"],
    triggerType: "custom_event",
    triggerDetails: { event: "account_created" },
    lifecycleStage: "Customer"
  },
  {
    name: "Welcome Package",
    slug: "new-customer-welcome-package",
    description: "Comprehensive onboarding email with what to expect",
    category: "new_customer",
    subcategory: "onboarding",
    subject: "Welcome to DoorSurvey Pro – Here's What Happens Next",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Welcome Package</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Welcome to DoorSurvey Pro – Here's What Happens Next</h2>
<p>Hi {{FirstName}},</p>
<p>We're thrilled to partner with you on your upcoming project. Here's what you can expect:</p>
<ol>
<li><strong>Survey Scheduling</strong> – Our team will confirm your site visit time.</li>
<li><strong>Information Gathering</strong> – You'll receive a checklist of any documents we might need.</li>
<li><strong>Door Survey + Measurement</strong> – Performed using LiDAR/AR for accuracy.</li>
<li><strong>Engineering Review</strong> – Code compliance, hardware verification, and feasibility checks.</li>
<li><strong>Proposal Delivery</strong> – A clear, itemized quote with alternatives if needed.</li>
</ol>
<p>Let's build something great!</p>
</body></html>`,
    markdownContent: `# Welcome to DoorSurvey Pro – Here's What Happens Next\n\nHi {{FirstName}},\n\nWe're thrilled to partner with you on your upcoming project. Here's what you can expect:\n\n1. **Survey Scheduling** – Our team will confirm your site visit time.\n2. **Information Gathering** – You'll receive a checklist of any documents we might need.\n3. **Door Survey + Measurement** – Performed using LiDAR/AR for accuracy.\n4. **Engineering Review** – Code compliance, hardware verification, and feasibility checks.\n5. **Proposal Delivery** – A clear, itemized quote with alternatives if needed.\n\nLet's build something great!`,
    variables: ["FirstName"],
    allowedRoles: ["sales_rep", "project_manager", "admin", "owner"],
    lifecycleStage: "Customer"
  },

  // ============================================================================
  // SALES FOLLOW-UP TEMPLATES
  // ============================================================================
  {
    name: "Quote Follow-Up",
    slug: "sales-followup-quote-followup-1",
    description: "Follow-up 2 days after proposal is sent if deal is still open",
    category: "sales_followup",
    subcategory: "proposal",
    subject: "Following Up on Your DoorSurvey Pro Proposal",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Quote Follow-Up</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Following Up on Your Proposal</h2>
<p>Hi {{FirstName}},</p>
<p>I wanted to follow up on the proposal we sent you on {{DateSent}}.</p>
<p>Please let me know if you have any questions or would like to review options.</p>
<p>I'm here to help!</p>
<p>Best regards,<br/>{{SenderName}}</p>
</body></html>`,
    markdownContent: `# Following Up on Your Proposal\n\nHi {{FirstName}},\n\nI wanted to follow up on the proposal we sent you on {{DateSent}}.\n\nPlease let me know if you have any questions or would like to review options.\n\nI'm here to help!\n\nBest regards,\n{{SenderName}}`,
    variables: ["FirstName", "DateSent", "SenderName"],
    allowedRoles: ["sales_rep", "project_manager", "admin", "owner"],
    triggerType: "deal_stage_change",
    triggerDetails: { stage: "Proposal Sent", delay: "2 days" },
    lifecycleStage: "Opportunity"
  },
  {
    name: "Soft Check-In",
    slug: "sales-followup-soft-check-in",
    description: "Soft follow-up 5 days after proposal if no response",
    category: "sales_followup",
    subcategory: "nurture",
    subject: "Just Checking In",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Checking In</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Just Checking In</h2>
<p>Hi {{FirstName}},</p>
<p>I hope you're having a great week! I wanted to check in and see if you had any questions about the proposal we sent.</p>
<p>No pressure at all – just want to make sure you have everything you need.</p>
<p>Best,<br/>{{SenderName}}</p>
</body></html>`,
    markdownContent: `# Just Checking In\n\nHi {{FirstName}},\n\nI hope you're having a great week! I wanted to check in and see if you had any questions about the proposal we sent.\n\nNo pressure at all – just want to make sure you have everything you need.\n\nBest,\n{{SenderName}}`,
    variables: ["FirstName", "SenderName"],
    allowedRoles: ["sales_rep", "admin", "owner"],
    triggerType: "deal_stage_time",
    triggerDetails: { stage: "Proposal Sent", delay: "5 days", condition: "no_recent_activity" },
    lifecycleStage: "Opportunity"
  },
  {
    name: "Final Follow-Up",
    slug: "sales-followup-final-breakup",
    description: "Final 'breakup' style follow-up 10 days after proposal",
    category: "sales_followup",
    subcategory: "closing",
    subject: "Should I Keep Your File Open?",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Final Follow-Up</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Should I Keep Your File Open?</h2>
<p>Hi {{FirstName}},</p>
<p>I haven't heard back from you, so I wanted to check in one last time.</p>
<p>If the timing isn't right or you've decided to go a different direction, no worries at all – just let me know and I'll close out your file.</p>
<p>Otherwise, I'm happy to answer any questions you might have.</p>
<p>Best,<br/>{{SenderName}}</p>
</body></html>`,
    markdownContent: `# Should I Keep Your File Open?\n\nHi {{FirstName}},\n\nI haven't heard back from you, so I wanted to check in one last time.\n\nIf the timing isn't right or you've decided to go a different direction, no worries at all – just let me know and I'll close out your file.\n\nOtherwise, I'm happy to answer any questions you might have.\n\nBest,\n{{SenderName}}`,
    variables: ["FirstName", "SenderName"],
    allowedRoles: ["sales_rep", "admin", "owner"],
    triggerType: "deal_stage_time",
    triggerDetails: { stage: "Proposal Sent", delay: "10 days" },
    lifecycleStage: "Opportunity"
  },

  // ============================================================================
  // SCHEDULING TEMPLATES
  // ============================================================================
  {
    name: "Schedule Survey",
    slug: "scheduling-schedule-survey",
    description: "Request to schedule a site survey",
    category: "scheduling",
    subcategory: "request",
    subject: "Schedule Your Door Opening Survey",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Schedule Survey</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Schedule Your Door Opening Survey</h2>
<p>Hi {{FirstName}},</p>
<p>Your project is ready for scheduling. Please choose a time that works best:</p>
<p><a href="{{SchedulingLink}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Schedule Now</a></p>
<p>Our technician will perform:</p>
<ul>
<li>Door/Frame measurements</li>
<li>AR/LiDAR scanning</li>
<li>Hardware identification</li>
<li>Compliance checks</li>
</ul>
<p>Please confirm if site access or credentials are required.</p>
</body></html>`,
    markdownContent: `# Schedule Your Door Opening Survey\n\nHi {{FirstName}},\n\nYour project is ready for scheduling. Please choose a time that works best: {{SchedulingLink}}\n\nOur technician will perform:\n- Door/Frame measurements\n- AR/LiDAR scanning\n- Hardware identification\n- Compliance checks\n\nPlease confirm if site access or credentials are required.`,
    variables: ["FirstName", "SchedulingLink"],
    allowedRoles: ["project_manager", "technician", "surveyor", "admin", "owner"],
    lifecycleStage: "Customer"
  },
  {
    name: "Reschedule Request",
    slug: "scheduling-reschedule-request",
    description: "Reschedule a survey appointment",
    category: "scheduling",
    subcategory: "change",
    subject: "Need to Reschedule Your Survey",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Reschedule Survey</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Need to Reschedule Your Survey</h2>
<p>Hi {{FirstName}},</p>
<p>No problem — we can absolutely reschedule.</p>
<p><a href="{{SchedulingLink}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Select a New Time</a></p>
<p>If you have any timing constraints, let us know and we'll accommodate.</p>
</body></html>`,
    markdownContent: `# Need to Reschedule Your Survey\n\nHi {{FirstName}},\n\nNo problem — we can absolutely reschedule.\n\nPlease select a new time here: {{SchedulingLink}}\n\nIf you have any timing constraints, let us know and we'll accommodate.`,
    variables: ["FirstName", "SchedulingLink"],
    allowedRoles: ["project_manager", "technician", "surveyor", "admin", "owner"],
    lifecycleStage: "Customer"
  },
  {
    name: "Appointment Confirmation",
    slug: "scheduling-appointment-confirmation",
    description: "Send confirmation when a survey appointment is booked",
    category: "scheduling",
    subcategory: "confirmation",
    subject: "Your Survey Appointment Is Confirmed",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Appointment Confirmed</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Your Survey Appointment Is Confirmed</h2>
<p>Hi {{FirstName}},</p>
<p>Your appointment is confirmed for:</p>
<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
<p style="margin: 4px 0;">📅 <strong>{{Date}}</strong></p>
<p style="margin: 4px 0;">⏰ <strong>{{Time}}</strong></p>
<p style="margin: 4px 0;">📍 <strong>{{Location}}</strong></p>
</div>
<p>You'll receive a reminder 24 hours before.</p>
<p>Looking forward to meeting you onsite!</p>
</body></html>`,
    markdownContent: `# Your Survey Appointment Is Confirmed\n\nHi {{FirstName}},\n\nYour appointment is confirmed for:\n\n📅 **{{Date}}**\n⏰ **{{Time}}**\n📍 **{{Location}}**\n\nYou'll receive a reminder 24 hours before.\n\nLooking forward to meeting you onsite.`,
    variables: ["FirstName", "Date", "Time", "Location"],
    allowedRoles: ["project_manager", "technician", "surveyor", "admin", "owner"],
    triggerType: "meeting_scheduled",
    triggerDetails: { meetingType: "Site Survey" },
    lifecycleStage: "Customer"
  },

  // ============================================================================
  // PROPOSAL TEMPLATES
  // ============================================================================
  {
    name: "Proposal Delivery",
    slug: "proposal-proposal-delivery",
    description: "Deliver customized proposal to customer",
    category: "proposal",
    subcategory: "delivery",
    subject: "Your Proposal from DoorSurvey Pro",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Your Proposal</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Your Proposal from DoorSurvey Pro</h2>
<p>Hi {{FirstName}},</p>
<p>Attached is your customized proposal for <strong>{{ProjectName}}</strong>.</p>
<p>Inside you'll find:</p>
<ul>
<li>Measured opening data</li>
<li>Recommended hardware sets</li>
<li>Code compliance notes</li>
<li>Pricing with options</li>
<li>Lead times & procurement details</li>
</ul>
<p>If you'd like revisions, add-ons, or an alternative solution, just reply to this email.</p>
</body></html>`,
    markdownContent: `# Your Proposal from DoorSurvey Pro\n\nHi {{FirstName}},\n\nAttached is your customized proposal for **{{ProjectName}}**.\n\nInside you'll find:\n- Measured opening data\n- Recommended hardware sets\n- Code compliance notes\n- Pricing with options\n- Lead times & procurement details\n\nIf you'd like revisions, add-ons, or an alternative solution, just reply.`,
    variables: ["FirstName", "ProjectName"],
    allowedRoles: ["project_manager", "estimator", "sales_rep", "admin", "owner"],
    lifecycleStage: "Opportunity"
  },
  {
    name: "Engineering Notes",
    slug: "proposal-engineering-notes",
    description: "Share engineering review findings with customer",
    category: "proposal",
    subcategory: "engineering",
    subject: "Engineering Review for {{ProjectName}} – Please Review",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Engineering Review</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Engineering Review for {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>Our engineering team has completed their compliance review. Your proposal now includes:</p>
<ul>
<li>Fire rating requirements</li>
<li>ADA / IBC compliance status</li>
<li>Hardware compatibility checks</li>
<li>Any red flags that need addressing</li>
</ul>
<p>Please review at your earliest convenience.</p>
</body></html>`,
    markdownContent: `# Engineering Review for {{ProjectName}}\n\nHi {{FirstName}},\n\nOur engineering team has completed their compliance review. Your proposal now includes:\n\n- Fire rating requirements\n- ADA / IBC compliance status\n- Hardware compatibility checks\n- Any red flags that need addressing\n\nPlease review at your earliest convenience.`,
    variables: ["FirstName", "ProjectName"],
    allowedRoles: ["engineer", "project_manager", "admin", "owner"],
    lifecycleStage: "Opportunity"
  },
  {
    name: "Upgrade Options",
    slug: "proposal-upgrade-options",
    description: "Present optional upgrades based on project details",
    category: "proposal",
    subcategory: "upsell",
    subject: "Optional Upgrades for {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Upgrade Options</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Optional Upgrades for {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>Based on your project details, here are optional upgrades that may benefit you:</p>
<ul>
<li><strong>Electronic access control (Div 28)</strong></li>
<li><strong>Grade 1 hardware upgrades</strong></li>
<li><strong>Security or anti-ligature options</strong></li>
<li><strong>Energy-efficient or acoustical door assemblies</strong></li>
</ul>
<p>Let me know if you'd like pricing on any of these options!</p>
</body></html>`,
    markdownContent: `# Optional Upgrades for {{ProjectName}}\n\nHi {{FirstName}},\n\nBased on your project details, here are optional upgrades that may benefit you:\n\n- **Electronic access control (Div 28)**\n- **Grade 1 hardware upgrades**\n- **Security or anti-ligature options**\n- **Energy-efficient or acoustical door assemblies**\n\nLet me know if you'd like pricing.`,
    variables: ["FirstName", "ProjectName"],
    allowedRoles: ["sales_rep", "estimator", "project_manager", "admin", "owner"],
    lifecycleStage: "Opportunity"
  },

  // ============================================================================
  // PROSPECTING TEMPLATES
  // ============================================================================
  {
    name: "Prospecting Intro",
    slug: "prospecting-intro",
    description: "Initial outreach to new leads who haven't booked a demo",
    category: "prospecting",
    subcategory: "initial",
    subject: "Modernizing Door Surveys and Hardware Procurement",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Intro to DoorSurvey Pro</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Modernizing Door Surveys and Hardware Procurement</h2>
<p>Hi {{FirstName}},</p>
<p>We help contractors, architects, and facility managers eliminate errors in door and hardware projects using:</p>
<ul>
<li>LiDAR scanning</li>
<li>Code validation</li>
<li>Automated hardware sets</li>
<li>Project management workflows</li>
<li>One-click procurement packages</li>
</ul>
<p>Would you like a quick walkthrough?</p>
<p>Best,<br/>{{SenderName}}</p>
</body></html>`,
    markdownContent: `# Modernizing Door Surveys and Hardware Procurement\n\nHi {{FirstName}},\n\nWe help contractors, architects, and facility managers eliminate errors in door and hardware projects using:\n\n- LiDAR scanning\n- Code validation\n- Automated hardware sets\n- Project management workflows\n- One-click procurement packages\n\nWould you like a quick walkthrough?`,
    variables: ["FirstName", "SenderName"],
    allowedRoles: ["sales_rep", "admin", "owner"],
    triggerType: "contact_property_time",
    triggerDetails: { lifecycleStage: "Lead", delay: "7 days", condition: "no_meeting_booked" },
    lifecycleStage: "Lead"
  },
  {
    name: "Value Proposition",
    slug: "prospecting-value-prop",
    description: "Highlight pain points and how DoorSurvey Pro solves them",
    category: "prospecting",
    subcategory: "nurture",
    subject: "How We Help Clients Reduce Errors and Save Time",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Value Proposition</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>How We Help Clients Reduce Errors and Save Time</h2>
<p>Hi {{FirstName}},</p>
<p>Most of our clients come to us with one of these challenges:</p>
<ul>
<li>Inaccurate door schedules</li>
<li>Unexpected field conditions</li>
<li>Missing or mismatched hardware</li>
<li>Manual measurement errors</li>
<li>Procurement delays</li>
</ul>
<p>DoorSurvey Pro solves all of these with automation + expertise.</p>
<p>Interested in a demo?</p>
</body></html>`,
    markdownContent: `# How We Help Clients Reduce Errors and Save Time\n\nHi {{FirstName}},\n\nMost of our clients come to us with one of these challenges:\n\n- Inaccurate door schedules\n- Unexpected field conditions\n- Missing or mismatched hardware\n- Manual measurement errors\n- Procurement delays\n\nDoorSurvey Pro solves all of these with automation + expertise.\n\nInterested in a demo?`,
    variables: ["FirstName"],
    allowedRoles: ["sales_rep", "admin", "owner"],
    lifecycleStage: "Lead"
  },
  {
    name: "No Response Check",
    slug: "prospecting-no-response-check",
    description: "Final check for unresponsive leads",
    category: "prospecting",
    subcategory: "final",
    subject: "Still Interested in Door & Hardware Solutions?",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Still Interested?</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Still Interested in Door & Hardware Solutions?</h2>
<p>Hi {{FirstName}},</p>
<p>Just wanted to circle back one last time.</p>
<p>If you're still exploring solutions for doors and hardware, we'd love to help.</p>
<p>Otherwise, we'll check back in down the road.</p>
<p>Best,<br/>{{SenderName}}</p>
</body></html>`,
    markdownContent: `# Still Interested in Door & Hardware Solutions?\n\nHi {{FirstName}},\n\nJust wanted to circle back one last time.\n\nIf you're still exploring solutions for doors and hardware, we'd love to help.\n\nOtherwise, we'll check back in down the road.`,
    variables: ["FirstName", "SenderName"],
    allowedRoles: ["sales_rep", "admin", "owner"],
    lifecycleStage: "Lead"
  },

  // ============================================================================
  // REMINDER TEMPLATES
  // ============================================================================
  {
    name: "Survey Tomorrow",
    slug: "reminder-survey-tomorrow",
    description: "Reminder email sent 24 hours before survey appointment",
    category: "reminder",
    subcategory: "survey",
    subject: "Reminder: Your Survey Is Tomorrow",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Survey Reminder</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Reminder: Your Survey Is Tomorrow</h2>
<p>Hi {{FirstName}},</p>
<p>Just a reminder that your survey appointment is scheduled for tomorrow at <strong>{{Time}}</strong>.</p>
<p>Please ensure access is available and any required contacts are present.</p>
<p>See you soon!</p>
</body></html>`,
    markdownContent: `# Reminder: Your Survey Is Tomorrow\n\nHi {{FirstName}},\n\nJust a reminder that your survey appointment is scheduled for tomorrow at {{Time}}.\n\nPlease ensure access is available and any required contacts are present.`,
    variables: ["FirstName", "Time"],
    allowedRoles: ["technician", "surveyor", "project_manager", "admin", "owner"],
    triggerType: "date_based",
    triggerDetails: { offset: "-1 day", reference: "survey_date" },
    lifecycleStage: "Customer"
  },
  {
    name: "Approval Needed",
    slug: "reminder-approval-needed",
    description: "Reminder that customer approval is needed to proceed",
    category: "reminder",
    subcategory: "approval",
    subject: "Approval Needed to Move Forward",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Approval Needed</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Approval Needed to Move Forward</h2>
<p>Hi {{FirstName}},</p>
<p>We're ready to proceed with your project, but we need your approval on:</p>
<ul>
<li>Proposal</li>
<li>Hardware options</li>
<li>Schedule</li>
<li>Payment terms (if applicable)</li>
</ul>
<p>Please reply at your earliest convenience so we can keep your project moving.</p>
</body></html>`,
    markdownContent: `# Approval Needed to Move Forward\n\nHi {{FirstName}},\n\nWe're ready to proceed with your project, but we need your approval on:\n\n- Proposal\n- Hardware options\n- Schedule\n- Payment terms (if applicable)\n\nPlease reply at your earliest convenience so we can keep your project moving.`,
    variables: ["FirstName"],
    allowedRoles: ["project_manager", "sales_rep", "admin", "owner"],
    lifecycleStage: "Opportunity"
  },

  // ============================================================================
  // CUSTOMER SERVICE TEMPLATES
  // ============================================================================
  {
    name: "Issue Acknowledgment",
    slug: "customer-service-issue-ack",
    description: "Acknowledge customer service/support form submission",
    category: "customer_service",
    subcategory: "acknowledgment",
    subject: "We Received Your Request — We're On It",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Request Received</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>We Received Your Request</h2>
<p>Hi {{FirstName}},</p>
<p>Thanks for bringing this to our attention.</p>
<p>Our team is reviewing the issue and will follow up within <strong>{{Timeframe}}</strong> with next steps.</p>
<p>We appreciate your patience.</p>
</body></html>`,
    markdownContent: `# We Received Your Request — We're On It\n\nHi {{FirstName}},\n\nThanks for bringing this to our attention.\n\nOur team is reviewing the issue and will follow up within {{Timeframe}} with next steps.\n\nWe appreciate your patience.`,
    variables: ["FirstName", "Timeframe"],
    allowedRoles: ["admin", "manager", "owner"],
    triggerType: "ticket_created",
    triggerDetails: { pipeline: "Support", status: "New" },
    lifecycleStage: "Customer"
  },
  {
    name: "Issue Update",
    slug: "customer-service-issue-update",
    description: "Provide status update on customer issue",
    category: "customer_service",
    subcategory: "update",
    subject: "Update on Your Request",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Issue Update</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Update on Your Request</h2>
<p>Hi {{FirstName}},</p>
<p>Here's an update on your case:</p>
<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
<p>{{StatusUpdate}}</p>
</div>
<p>We will notify you as soon as we have the final resolution.</p>
</body></html>`,
    markdownContent: `# Update on Your Request\n\nHi {{FirstName}},\n\nHere's an update on your case:\n\n{{StatusUpdate}}\n\nWe will notify you as soon as we have the final resolution.`,
    variables: ["FirstName", "StatusUpdate"],
    allowedRoles: ["admin", "manager", "owner"],
    lifecycleStage: "Customer"
  },
  {
    name: "Issue Resolved",
    slug: "customer-service-issue-resolved",
    description: "Notify customer that their issue has been resolved",
    category: "customer_service",
    subcategory: "resolution",
    subject: "Your Issue Has Been Resolved",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Issue Resolved</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Your Issue Has Been Resolved</h2>
<p>Hi {{FirstName}},</p>
<p>We're happy to let you know that your issue regarding <strong>{{Topic}}</strong> has been resolved.</p>
<p>If there's anything more we can do, feel free to reach out anytime.</p>
</body></html>`,
    markdownContent: `# Your Issue Has Been Resolved\n\nHi {{FirstName}},\n\nWe're happy to let you know that your issue regarding **{{Topic}}** has been resolved.\n\nIf there's anything more we can do, feel free to reach out anytime.`,
    variables: ["FirstName", "Topic"],
    allowedRoles: ["admin", "manager", "owner"],
    lifecycleStage: "Customer"
  },

  // ============================================================================
  // PROCUREMENT TEMPLATES
  // ============================================================================
  {
    name: "Manufacturer Order",
    slug: "procurement-manufacturer-order",
    description: "Submit order to manufacturer",
    category: "procurement",
    subcategory: "order",
    subject: "Order Submission – {{ProjectName}} ({{Manufacturer}})",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Order Submission</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Order Submission – {{ProjectName}}</h2>
<p>Hello,</p>
<p>Attached is the order form for <strong>{{ProjectName}}</strong>, including all line items, finishes, quantities, and required on-site dates.</p>
<p>Please confirm acknowledgment and estimated lead times.</p>
<p>Thank you,<br/>{{YourName}}</p>
</body></html>`,
    markdownContent: `# Order Submission – {{ProjectName}} ({{Manufacturer}})\n\nHello,\n\nAttached is the order form for **{{ProjectName}}**, including all line items, finishes, quantities, and required on-site dates.\n\nPlease confirm acknowledgment and estimated lead times.\n\nThank you,\n{{YourName}}`,
    variables: ["ProjectName", "Manufacturer", "YourName"],
    allowedRoles: ["procurement_officer", "project_manager", "admin", "owner"],
    lifecycleStage: "Customer"
  },
  {
    name: "Lead Time Request",
    slug: "procurement-leadtime-request",
    description: "Request lead times from manufacturer",
    category: "procurement",
    subcategory: "inquiry",
    subject: "Lead Time Request for {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Lead Time Request</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Lead Time Request for {{ProjectName}}</h2>
<p>Hello,</p>
<p>Do you have current lead times for the following hardware items?</p>
<p><em>Attached: PDF line-item summary.</em></p>
<p>Thank you!<br/>{{YourName}}</p>
</body></html>`,
    markdownContent: `# Lead Time Request for {{ProjectName}}\n\nHello,\n\nDo you have current lead times for the following hardware items?\n\nAttached: PDF line-item summary.\n\nThank you!\n{{YourName}}`,
    variables: ["ProjectName", "YourName"],
    allowedRoles: ["procurement_officer", "project_manager", "admin", "owner"],
    lifecycleStage: "Customer"
  },
  {
    name: "Manufacturer Clarification",
    slug: "procurement-manufacturer-clarification",
    description: "Request clarification on order details",
    category: "procurement",
    subcategory: "clarification",
    subject: "Clarification Needed on Order – {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Clarification Request</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Clarification Needed on Order – {{ProjectName}}</h2>
<p>Hi {{RepName}},</p>
<p>We need clarification on the following items from our submitted order:</p>
<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
{{QuestionsList}}
</div>
<p>Please advise so we can proceed.</p>
</body></html>`,
    markdownContent: `# Clarification Needed on Order – {{ProjectName}}\n\nHi {{RepName}},\n\nWe need clarification on the following items from our submitted order:\n\n{{QuestionsList}}\n\nPlease advise so we can proceed.`,
    variables: ["ProjectName", "RepName", "QuestionsList"],
    allowedRoles: ["procurement_officer", "project_manager", "admin", "owner"],
    lifecycleStage: "Customer"
  },

  // ============================================================================
  // CLOSEOUT TEMPLATES
  // ============================================================================
  {
    name: "Project Complete",
    slug: "closeout-project-complete",
    description: "Send completion email when project is marked Complete",
    category: "closeout",
    subcategory: "completion",
    subject: "Project Completed — Thank You!",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Project Complete</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Project Completed — Thank You!</h2>
<p>Hi {{FirstName}},</p>
<p>Your project <strong>{{ProjectName}}</strong> is now complete.</p>
<p>Thank you for choosing DoorSurvey Pro — it was a pleasure working with you.</p>
<p>If you need additional openings surveyed or hardware reviewed, we're always here.</p>
</body></html>`,
    markdownContent: `# Project Completed — Thank You!\n\nHi {{FirstName}},\n\nYour project **{{ProjectName}}** is now complete.\n\nThank you for choosing DoorSurvey Pro — it was a pleasure working with you.\n\nIf you need additional openings surveyed or hardware reviewed, we're always here.`,
    variables: ["FirstName", "ProjectName"],
    allowedRoles: ["project_manager", "admin", "owner"],
    triggerType: "custom_object_stage_change",
    triggerDetails: { objectType: "Project", status: "Completed" },
    lifecycleStage: "Customer"
  },
  {
    name: "Review Request",
    slug: "closeout-review-request",
    description: "Send review request 3 days after project completion",
    category: "closeout",
    subcategory: "feedback",
    subject: "Quick Favor — How Did We Do?",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Review Request</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Quick Favor — How Did We Do?</h2>
<p>Hi {{FirstName}},</p>
<p>If you have a moment, we'd love to hear how your experience was with our team.</p>
<p>Your feedback helps us improve every day.</p>
<p><a href="{{ReviewLink}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Leave a Review</a></p>
<p>Thank you again!</p>
</body></html>`,
    markdownContent: `# Quick Favor — How Did We Do?\n\nHi {{FirstName}},\n\nIf you have a moment, we'd love to hear how your experience was with our team.\n\nYour feedback helps us improve every day.\n\nReview link: {{ReviewLink}}\n\nThank you again!`,
    variables: ["FirstName", "ReviewLink"],
    allowedRoles: ["project_manager", "sales_rep", "admin", "owner"],
    triggerType: "custom_object_time",
    triggerDetails: { objectType: "Project", status: "Completed", delay: "3 days" },
    lifecycleStage: "Customer"
  },

  // ============================================================================
  // SURVEYOR TEMPLATES (Additional role-specific)
  // ============================================================================
  {
    name: "Site Access Request",
    slug: "surveyor-site-access-request",
    description: "Request site access credentials before survey",
    category: "surveyor",
    subcategory: "preparation",
    subject: "Site Access Needed for {{ProjectName}} Survey",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Site Access Request</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Site Access Needed for {{ProjectName}} Survey</h2>
<p>Hi {{FirstName}},</p>
<p>We're scheduled to perform the door survey at {{Location}} on {{Date}}.</p>
<p>Please provide the following:</p>
<ul>
<li>Building access codes or key card arrangements</li>
<li>Parking instructions</li>
<li>On-site contact name and number</li>
<li>Any restricted areas to be aware of</li>
</ul>
<p>Thank you!</p>
</body></html>`,
    markdownContent: `# Site Access Needed for {{ProjectName}} Survey\n\nHi {{FirstName}},\n\nWe're scheduled to perform the door survey at {{Location}} on {{Date}}.\n\nPlease provide:\n- Building access codes or key card arrangements\n- Parking instructions\n- On-site contact name and number\n- Any restricted areas to be aware of`,
    variables: ["FirstName", "ProjectName", "Location", "Date"],
    allowedRoles: ["technician", "surveyor", "project_manager", "admin", "owner"],
    lifecycleStage: "Customer"
  },
  {
    name: "Survey Completed",
    slug: "surveyor-survey-completed",
    description: "Notify stakeholders that survey is complete",
    category: "surveyor",
    subcategory: "completion",
    subject: "Survey Completed: {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Survey Completed</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Survey Completed: {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>We've completed the door survey for <strong>{{ProjectName}}</strong>.</p>
<p><strong>Summary:</strong></p>
<ul>
<li>{{TotalOpenings}} openings surveyed</li>
<li>{{PhotosCount}} photos captured</li>
<li>LiDAR scans completed</li>
</ul>
<p>Our engineering team will review the data and prepare your proposal within {{Timeframe}}.</p>
</body></html>`,
    markdownContent: `# Survey Completed: {{ProjectName}}\n\nHi {{FirstName}},\n\nWe've completed the door survey for **{{ProjectName}}**.\n\n**Summary:**\n- {{TotalOpenings}} openings surveyed\n- {{PhotosCount}} photos captured\n- LiDAR scans completed\n\nOur engineering team will review the data and prepare your proposal within {{Timeframe}}.`,
    variables: ["FirstName", "ProjectName", "TotalOpenings", "PhotosCount", "Timeframe"],
    allowedRoles: ["technician", "surveyor", "project_manager", "admin", "owner"],
    lifecycleStage: "Customer"
  },

  // ============================================================================
  // ESTIMATOR TEMPLATES (Additional role-specific)
  // ============================================================================
  {
    name: "Quote Request Acknowledgment",
    slug: "estimator-quote-request-ack",
    description: "Acknowledge receipt of quote request",
    category: "estimator",
    subcategory: "acknowledgment",
    subject: "Quote Request Received – {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Quote Request Received</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Quote Request Received – {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>We've received your request for a quote on <strong>{{ProjectName}}</strong>.</p>
<p>Our estimating team is reviewing the specifications and will provide a detailed proposal within {{Timeframe}}.</p>
<p>If you have any additional requirements or questions, please let us know.</p>
</body></html>`,
    markdownContent: `# Quote Request Received – {{ProjectName}}\n\nHi {{FirstName}},\n\nWe've received your request for a quote on **{{ProjectName}}**.\n\nOur estimating team is reviewing the specifications and will provide a detailed proposal within {{Timeframe}}.\n\nIf you have any additional requirements or questions, please let us know.`,
    variables: ["FirstName", "ProjectName", "Timeframe"],
    allowedRoles: ["estimator", "project_manager", "admin", "owner"],
    lifecycleStage: "Opportunity"
  },
  {
    name: "Pricing Update",
    slug: "estimator-pricing-update",
    description: "Notify about pricing changes",
    category: "estimator",
    subcategory: "update",
    subject: "Pricing Update for {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Pricing Update</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Pricing Update for {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>We wanted to let you know about some pricing changes that may affect your project:</p>
<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
{{PricingDetails}}
</div>
<p>Please review the updated proposal and let us know if you have any questions.</p>
</body></html>`,
    markdownContent: `# Pricing Update for {{ProjectName}}\n\nHi {{FirstName}},\n\nWe wanted to let you know about some pricing changes that may affect your project:\n\n{{PricingDetails}}\n\nPlease review the updated proposal and let us know if you have any questions.`,
    variables: ["FirstName", "ProjectName", "PricingDetails"],
    allowedRoles: ["estimator", "project_manager", "sales_rep", "admin", "owner"],
    lifecycleStage: "Opportunity"
  },

  // ============================================================================
  // ENGINEER TEMPLATES (Additional role-specific)
  // ============================================================================
  {
    name: "Compliance Issue Alert",
    slug: "engineer-compliance-issue",
    description: "Alert about code compliance issues found",
    category: "engineer",
    subcategory: "alert",
    subject: "Compliance Issue Found – {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Compliance Issue</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Compliance Issue Found – {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>During our engineering review of <strong>{{ProjectName}}</strong>, we identified the following compliance issues:</p>
<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
{{IssuesList}}
</div>
<p>We recommend addressing these items before proceeding. Our team can provide guidance on solutions.</p>
</body></html>`,
    markdownContent: `# Compliance Issue Found – {{ProjectName}}\n\nHi {{FirstName}},\n\nDuring our engineering review of **{{ProjectName}}**, we identified the following compliance issues:\n\n{{IssuesList}}\n\nWe recommend addressing these items before proceeding. Our team can provide guidance on solutions.`,
    variables: ["FirstName", "ProjectName", "IssuesList"],
    allowedRoles: ["engineer", "project_manager", "admin", "owner"],
    lifecycleStage: "Opportunity"
  },
  {
    name: "Technical Review Complete",
    slug: "engineer-review-complete",
    description: "Notify that technical review is complete",
    category: "engineer",
    subcategory: "completion",
    subject: "Technical Review Complete – {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Technical Review Complete</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Technical Review Complete – {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>The engineering team has completed the technical review for <strong>{{ProjectName}}</strong>.</p>
<p><strong>Review Summary:</strong></p>
<ul>
<li>ADA Compliance: {{ADAStatus}}</li>
<li>Fire Rating: {{FireRatingStatus}}</li>
<li>Hardware Compatibility: {{HardwareStatus}}</li>
</ul>
<p>The proposal is now ready for your review.</p>
</body></html>`,
    markdownContent: `# Technical Review Complete – {{ProjectName}}\n\nHi {{FirstName}},\n\nThe engineering team has completed the technical review for **{{ProjectName}}**.\n\n**Review Summary:**\n- ADA Compliance: {{ADAStatus}}\n- Fire Rating: {{FireRatingStatus}}\n- Hardware Compatibility: {{HardwareStatus}}\n\nThe proposal is now ready for your review.`,
    variables: ["FirstName", "ProjectName", "ADAStatus", "FireRatingStatus", "HardwareStatus"],
    allowedRoles: ["engineer", "project_manager", "admin", "owner"],
    lifecycleStage: "Opportunity"
  },

  // ============================================================================
  // PROJECT MANAGEMENT TEMPLATES
  // ============================================================================
  {
    name: "Project Status Update",
    slug: "project-management-status-update",
    description: "Weekly or milestone-based project status update",
    category: "project_management",
    subcategory: "status",
    subject: "Project Update: {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Project Update</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Project Update: {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>Here's the latest update on your project:</p>
<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
<p><strong>Current Phase:</strong> {{CurrentPhase}}</p>
<p><strong>Progress:</strong> {{ProgressPercentage}}% complete</p>
<p><strong>Expected Completion:</strong> {{CompletionDate}}</p>
</div>
<p><strong>Recent Milestones:</strong></p>
{{MilestonesList}}
<p>Please don't hesitate to reach out with any questions.</p>
</body></html>`,
    markdownContent: `# Project Update: {{ProjectName}}\n\nHi {{FirstName}},\n\nHere's the latest update on your project:\n\n**Current Phase:** {{CurrentPhase}}\n**Progress:** {{ProgressPercentage}}% complete\n**Expected Completion:** {{CompletionDate}}\n\n**Recent Milestones:**\n{{MilestonesList}}\n\nPlease don't hesitate to reach out with any questions.`,
    variables: ["FirstName", "ProjectName", "CurrentPhase", "ProgressPercentage", "CompletionDate", "MilestonesList"],
    allowedRoles: ["project_manager", "pm_manager", "admin", "owner"],
    lifecycleStage: "Customer"
  },
  {
    name: "Deadline Approaching",
    slug: "project-management-deadline-approaching",
    description: "Alert about upcoming project deadline",
    category: "project_management",
    subcategory: "alert",
    subject: "Deadline Approaching: {{ProjectName}}",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Deadline Approaching</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Deadline Approaching: {{ProjectName}}</h2>
<p>Hi {{FirstName}},</p>
<p>This is a reminder that the following deadline is approaching for <strong>{{ProjectName}}</strong>:</p>
<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
<p><strong>{{MilestoneName}}</strong></p>
<p>Due: {{DueDate}}</p>
</div>
<p>Please ensure all required items are completed on time.</p>
</body></html>`,
    markdownContent: `# Deadline Approaching: {{ProjectName}}\n\nHi {{FirstName}},\n\nThis is a reminder that the following deadline is approaching for **{{ProjectName}}**:\n\n**{{MilestoneName}}**\nDue: {{DueDate}}\n\nPlease ensure all required items are completed on time.`,
    variables: ["FirstName", "ProjectName", "MilestoneName", "DueDate"],
    allowedRoles: ["project_manager", "pm_manager", "admin", "owner"],
    lifecycleStage: "Customer"
  },

  // ============================================================================
  // ONBOARDING TEMPLATES (Employee/Team)
  // ============================================================================
  {
    name: "Employee Welcome",
    slug: "onboarding-employee-welcome",
    description: "Welcome email for new team members",
    category: "onboarding",
    subcategory: "welcome",
    subject: "Welcome to the Team, {{FirstName}}!",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Welcome to the Team</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Welcome to the Team, {{FirstName}}!</h2>
<p>We're excited to have you join us as a <strong>{{JobTitle}}</strong>.</p>
<p>Here's what you need to get started:</p>
<ol>
<li>Set up your account: <a href="{{SetupLink}}">Click here to create your password</a></li>
<li>Review the onboarding checklist in your dashboard</li>
<li>Connect with your manager: {{ManagerName}}</li>
<li>Connect with your onboarding buddy: {{BuddyName}}</li>
</ol>
<p>We're here to help you succeed!</p>
</body></html>`,
    markdownContent: `# Welcome to the Team, {{FirstName}}!\n\nWe're excited to have you join us as a **{{JobTitle}}**.\n\nHere's what you need to get started:\n\n1. Set up your account: {{SetupLink}}\n2. Review the onboarding checklist in your dashboard\n3. Connect with your manager: {{ManagerName}}\n4. Connect with your onboarding buddy: {{BuddyName}}\n\nWe're here to help you succeed!`,
    variables: ["FirstName", "JobTitle", "SetupLink", "ManagerName", "BuddyName"],
    allowedRoles: ["admin", "manager", "owner"],
    lifecycleStage: "Customer"
  },
  {
    name: "Account Setup Reminder",
    slug: "onboarding-setup-reminder",
    description: "Reminder to complete account setup",
    category: "onboarding",
    subcategory: "reminder",
    subject: "Complete Your Account Setup",
    htmlContent: `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Complete Your Setup</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<h2>Complete Your Account Setup</h2>
<p>Hi {{FirstName}},</p>
<p>We noticed you haven't completed your account setup yet.</p>
<p><a href="{{SetupLink}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Setup Now</a></p>
<p>This link will expire on {{ExpiryDate}}.</p>
<p>If you have any issues, please contact your administrator.</p>
</body></html>`,
    markdownContent: `# Complete Your Account Setup\n\nHi {{FirstName}},\n\nWe noticed you haven't completed your account setup yet.\n\nClick here to complete setup: {{SetupLink}}\n\nThis link will expire on {{ExpiryDate}}.\n\nIf you have any issues, please contact your administrator.`,
    variables: ["FirstName", "SetupLink", "ExpiryDate"],
    allowedRoles: ["admin", "manager", "owner"],
    lifecycleStage: "Customer"
  }
];

export async function seedEmailTemplates(): Promise<void> {
  try {
    // Check if templates already exist
    const [result] = await db.select({ count: count() }).from(emailTemplates);
    
    if (result.count > 0) {
      console.log(`Email templates already seeded (${result.count} templates exist), skipping...`);
      return;
    }

    // Insert all templates as system templates (no organization ID)
    for (const template of TEMPLATES) {
      await db.insert(emailTemplates).values({
        organizationId: null, // System-wide templates
        name: template.name,
        slug: template.slug,
        description: template.description,
        category: template.category,
        subcategory: template.subcategory,
        subject: template.subject,
        htmlContent: template.htmlContent,
        markdownContent: template.markdownContent,
        plainTextContent: template.markdownContent?.replace(/[#*_`]/g, ""),
        variables: template.variables,
        allowedRoles: template.allowedRoles,
        triggerType: template.triggerType,
        triggerDetails: template.triggerDetails,
        lifecycleStage: template.lifecycleStage,
        isActive: true,
        isSystem: true,
        version: 1
      });
    }

    console.log(`[Email Templates Seed] Seeded ${TEMPLATES.length} email templates`);
  } catch (error) {
    console.error("[Email Templates Seed] Error seeding templates:", error);
    throw error;
  }
}
