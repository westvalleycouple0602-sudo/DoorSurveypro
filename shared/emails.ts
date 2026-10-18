/**
 * DoorSurvey Pro Email Directory
 * Centralized email configuration for all company communications
 */

export const COMPANY_EMAILS = {
  // Support & Service
  support: "support@doorsurveypro.com",
  techSupport: "techsupport@doorsurveypro.com",
  compliance: "compliance@doorsurveypro.com",
  billing: "billing@doorsurveypro.com",
  privacy: "privacy@doorsurveypro.com",
  onboarding: "onboarding@doorsurveypro.com",

  // Marketing & Communications
  marketing: "marketing@doorsurveypro.com",
  partnerships: "partners@doorsurveypro.com",
  press: "press@doorsurveypro.com",
  events: "events@doorsurveypro.com",
  social: "social@doorsurveypro.com",
  newsletter: "news@doorsurveypro.com",

  // Sales
  sales: "sales@doorsurveypro.com",
  enterprise: "enterprise@doorsurveypro.com",
  resellers: "resellers@doorsurveypro.com",
  quotes: "quotes@doorsurveypro.com",
  usSales: "us-sales@doorsurveypro.com",
  canadaSales: "canada-sales@doorsurveypro.com",

  // Internal & Operations
  hr: "hr@doorsurveypro.com",
  accounting: "accounting@doorsurveypro.com",
  legal: "legal@doorsurveypro.com",
  status: "status@doorsurveypro.com",
  api: "api@doorsurveypro.com",
  ceo: "ceo@doorsurveypro.com",
  operations: "ops@doorsurveypro.com",
  investors: "investors@doorsurveypro.com",

  // General
  hello: "hello@doorsurveypro.com",
  info: "info@doorsurveypro.com",
  team: "team@doorsurveypro.com",
  contact: "contact@doorsurveypro.com",
  
  // System/Automated
  noReply: "no-reply@doorsurveypro.com",
} as const;

/**
 * Email descriptions for help text and tooltips
 */
export const EMAIL_DESCRIPTIONS = {
  support: "Main contact for all user issues and questions",
  techSupport: "For bug reports, app crashes, AR/LiDAR or AI issues",
  compliance: "Handles questions about ADA, NFPA, IBC, and code validations",
  billing: "Subscription, invoice, refund, and payment assistance",
  privacy: "Data requests, GDPR/CCPA inquiries, and user data deletions",
  onboarding: "Guides new customers through setup and integrations",
  marketing: "Oversees campaigns, branding, SEO, and promotions",
  partnerships: "For strategic collaborations and affiliate programs",
  press: "Handles media inquiries, interviews, and PR releases",
  events: "Coordinates trade shows, demos, and webinars",
  social: "Manages social engagement, community responses, and brand mentions",
  newsletter: "For product updates, blog content, and announcements",
  sales: "Core contact for new business, pricing, and demos",
  enterprise: "For large-scale facility and enterprise clients",
  resellers: "For channel partners, manufacturers, and distributors",
  quotes: "Manages RFQs and quote generation support",
  usSales: "Region-specific contacts for US clients",
  canadaSales: "Region-specific contacts for Canadian clients",
  hr: "Hiring, recruiting, and HR-related questions",
  accounting: "Vendor payments, financial records, and audits",
  legal: "Terms of service, contracts, and intellectual property inquiries",
  status: "Automatic system alerts or maintenance notices",
  api: "For integration partners (HubSpot, Jira, Replit, etc.)",
  ceo: "Direct leadership contact",
  operations: "Internal coordination and project oversight",
  investors: "Funding, partnerships, and investor communications",
  hello: "Friendly catch-all for general inquiries",
  info: "Basic information request inbox",
  team: "Internal alias that forwards to multiple team members",
  contact: "Universal public contact email",
  noReply: "Automated system emails and notifications (do not reply)",
} as const;

/**
 * Get email with optional description
 */
export function getEmailInfo(key: keyof typeof COMPANY_EMAILS): {
  email: string;
  description: string;
} {
  return {
    email: COMPANY_EMAILS[key],
    description: EMAIL_DESCRIPTIONS[key],
  };
}

/**
 * Common email combinations for different use cases
 */
export const EMAIL_GROUPS = {
  customerSupport: [
    COMPANY_EMAILS.support,
    COMPANY_EMAILS.techSupport,
    COMPANY_EMAILS.billing,
  ],
  salesInquiries: [
    COMPANY_EMAILS.sales,
    COMPANY_EMAILS.enterprise,
    COMPANY_EMAILS.quotes,
  ],
  generalContact: [
    COMPANY_EMAILS.contact,
    COMPANY_EMAILS.hello,
    COMPANY_EMAILS.info,
  ],
} as const;
