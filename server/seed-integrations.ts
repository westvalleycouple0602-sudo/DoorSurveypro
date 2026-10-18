import { db } from "./db";
import { integrationProviders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function seedIntegrationProviders() {
  try {
    // Check if already seeded
    const existing = await db.select().from(integrationProviders).limit(1);
    if (existing.length > 0) {
      logger.info("Integration providers already seeded, skipping...");
      return;
    }

    const providers = [
      // Accounting integrations
      {
        providerKey: "quickbooks",
        name: "QuickBooks Online",
        category: "accounting",
        authType: "oauth2",
        baseUrl: "https://quickbooks.api.intuit.com",
        documentationUrl: "https://developer.intuit.com/app/developer/qbo/docs/get-started",
        logoUrl: "https://plugin.intuitcdn.net/designsystem/assets/2020/01/10103638/QuickbooksOnline_green.svg",
        oauthConfig: {
          authUrl: "https://appcenter.intuit.com/connect/oauth2",
          tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
          scopes: ["com.intuit.quickbooks.accounting"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "xero",
        name: "Xero",
        category: "accounting",
        authType: "oauth2",
        baseUrl: "https://api.xero.com",
        documentationUrl: "https://developer.xero.com/documentation",
        logoUrl: "https://developer.xero.com/static/images/xero-logo.svg",
        oauthConfig: {
          authUrl: "https://login.xero.com/identity/connect/authorize",
          tokenUrl: "https://identity.xero.com/connect/token",
          scopes: ["accounting.transactions", "accounting.contacts"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },

      // Project Management integrations
      {
        providerKey: "asana",
        name: "Asana",
        category: "project_management",
        authType: "oauth2",
        baseUrl: "https://app.asana.com/api/1.0",
        documentationUrl: "https://developers.asana.com/docs",
        logoUrl: "https://asana.com/static/images/logo-2x.png",
        oauthConfig: {
          authUrl: "https://app.asana.com/-/oauth_authorize",
          tokenUrl: "https://app.asana.com/-/oauth_token",
          scopes: ["default"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "monday",
        name: "Monday.com",
        category: "project_management",
        authType: "oauth2",
        baseUrl: "https://api.monday.com/v2",
        documentationUrl: "https://developer.monday.com/api-reference/docs",
        logoUrl: "https://dapulse-res.cloudinary.com/image/upload/monday_platform/monday-logo-x2.png",
        oauthConfig: {
          authUrl: "https://auth.monday.com/oauth2/authorize",
          tokenUrl: "https://auth.monday.com/oauth2/token",
          scopes: ["boards:read", "boards:write"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "jira",
        name: "Jira",
        category: "project_management",
        authType: "oauth2",
        baseUrl: "https://api.atlassian.com",
        documentationUrl: "https://developer.atlassian.com/cloud/jira/platform/",
        logoUrl: "https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png",
        oauthConfig: {
          authUrl: "https://auth.atlassian.com/authorize",
          tokenUrl: "https://auth.atlassian.com/oauth/token",
          scopes: ["read:jira-work", "write:jira-work"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },

      // Communication integrations
      {
        providerKey: "twilio",
        name: "Twilio",
        category: "communication",
        authType: "api_key",
        baseUrl: "https://api.twilio.com",
        documentationUrl: "https://www.twilio.com/docs/usage/api",
        logoUrl: "https://www.twilio.com/content/dam/twilio-com/global/en/logos/twilio-logo-red.svg",
        supportedFeatures: ["sms", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "whatsapp",
        name: "WhatsApp Business",
        category: "communication",
        authType: "api_key",
        baseUrl: "https://graph.facebook.com",
        documentationUrl: "https://developers.facebook.com/docs/whatsapp",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
        supportedFeatures: ["messaging", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "sendgrid",
        name: "SendGrid",
        category: "communication",
        authType: "api_key",
        baseUrl: "https://api.sendgrid.com",
        documentationUrl: "https://docs.sendgrid.com/api-reference",
        logoUrl: "https://sendgrid.com/brand/sg-logo-300.png",
        supportedFeatures: ["email", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },

      // Document Storage integrations
      {
        providerKey: "google_drive",
        name: "Google Drive",
        category: "document_storage",
        authType: "oauth2",
        baseUrl: "https://www.googleapis.com/drive/v3",
        documentationUrl: "https://developers.google.com/drive/api/v3/about-sdk",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_(2020).svg",
        oauthConfig: {
          authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
          tokenUrl: "https://oauth2.googleapis.com/token",
          scopes: ["https://www.googleapis.com/auth/drive.file"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "dropbox",
        name: "Dropbox",
        category: "document_storage",
        authType: "oauth2",
        baseUrl: "https://api.dropboxapi.com",
        documentationUrl: "https://www.dropbox.com/developers/documentation",
        logoUrl: "https://cfl.dropboxstatic.com/static/metaserver/static/images/logo_catalog/blue_dropbox_glyph.svg",
        oauthConfig: {
          authUrl: "https://www.dropbox.com/oauth2/authorize",
          tokenUrl: "https://api.dropboxapi.com/oauth2/token",
          scopes: ["files.content.write", "files.content.read"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "box",
        name: "Box",
        category: "document_storage",
        authType: "oauth2",
        baseUrl: "https://api.box.com/2.0",
        documentationUrl: "https://developer.box.com/guides/",
        logoUrl: "https://images.ctfassets.net/tlkdt8iyq15v/3lXgG8AJJqcKeKMIeAmkEe/5e42b88cb1c41d8a83e16f45b76e3cc7/box-logo-blue.svg",
        oauthConfig: {
          authUrl: "https://account.box.com/api/oauth2/authorize",
          tokenUrl: "https://api.box.com/oauth2/token",
          scopes: ["root_readwrite"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },

      // CRM integrations
      {
        providerKey: "hubspot",
        name: "HubSpot",
        category: "crm",
        authType: "oauth2",
        baseUrl: "https://api.hubapi.com",
        documentationUrl: "https://developers.hubspot.com/docs/api/overview",
        logoUrl: "https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png",
        oauthConfig: {
          authUrl: "https://app.hubspot.com/oauth/authorize",
          tokenUrl: "https://api.hubapi.com/oauth/v1/token",
          scopes: ["contacts", "companies"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "salesforce",
        name: "Salesforce",
        category: "crm",
        authType: "oauth2",
        baseUrl: "https://login.salesforce.com",
        documentationUrl: "https://developer.salesforce.com/docs/apis",
        logoUrl: "https://www.salesforce.com/content/dam/web/en_us/www/images/nav/salesforce-logo.svg",
        oauthConfig: {
          authUrl: "https://login.salesforce.com/services/oauth2/authorize",
          tokenUrl: "https://login.salesforce.com/services/oauth2/token",
          scopes: ["api", "refresh_token"],
        },
        supportedFeatures: ["sync", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },

      // Email integrations
      {
        providerKey: "gmail",
        name: "Gmail",
        category: "communication",
        authType: "oauth2",
        baseUrl: "https://gmail.googleapis.com",
        documentationUrl: "https://developers.google.com/gmail/api/guides",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_(2020).svg",
        oauthConfig: {
          authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
          tokenUrl: "https://oauth2.googleapis.com/token",
          scopes: ["https://www.googleapis.com/auth/gmail.send"],
        },
        supportedFeatures: ["email", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "outlook",
        name: "Microsoft Outlook",
        category: "communication",
        authType: "oauth2",
        baseUrl: "https://graph.microsoft.com",
        documentationUrl: "https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_(2018%E2%80%93present).svg",
        oauthConfig: {
          authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
          tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
          scopes: ["Mail.Send", "Mail.Read"],
        },
        supportedFeatures: ["email", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },

      // Payment integrations
      {
        providerKey: "stripe",
        name: "Stripe",
        category: "payment",
        authType: "api_key",
        baseUrl: "https://api.stripe.com",
        documentationUrl: "https://stripe.com/docs/api",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
        supportedFeatures: ["payment", "webhooks"],
        isActive: "yes",
        isPopular: "yes",
      },
      {
        providerKey: "paypal",
        name: "PayPal",
        category: "payment",
        authType: "oauth2",
        baseUrl: "https://api.paypal.com",
        documentationUrl: "https://developer.paypal.com/docs/api/overview/",
        logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
        oauthConfig: {
          authUrl: "https://www.paypal.com/signin/authorize",
          tokenUrl: "https://api.paypal.com/v1/oauth2/token",
          scopes: ["openid"],
        },
        supportedFeatures: ["payment", "webhooks"],
        isActive: "yes",
        isPopular: "no",
      },
    ];

    await db.insert(integrationProviders).values(providers);
    logger.info(`✅ Seeded ${providers.length} integration providers`);
  } catch (error) {
    logger.error("Failed to seed integration providers", { error });
  }
}
