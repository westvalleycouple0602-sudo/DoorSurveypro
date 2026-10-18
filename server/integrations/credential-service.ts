import { db } from "../db";
import { integrationCredentials, type IntegrationCredential } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { encryptToken, decryptToken } from "../encryption";
import { logger } from "../logger";
import axios from "axios";

type ServiceType = "quickbooks" | "docusign" | "slack" | "google_drive" | "dropbox" | "sendgrid" | "twilio";

interface TokenRefreshFunction {
  (credential: IntegrationCredential): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>;
}

class CredentialService {
  private refreshFunctions: Map<ServiceType, TokenRefreshFunction> = new Map();

  registerRefreshFunction(service: ServiceType, refreshFn: TokenRefreshFunction) {
    this.refreshFunctions.set(service, refreshFn);
  }

  async getValidCredential(
    organizationId: string,
    service: ServiceType
  ): Promise<IntegrationCredential> {
    const [credential] = await db
      .select()
      .from(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.organizationId, organizationId),
          eq(integrationCredentials.service, service),
          eq(integrationCredentials.isActive, "yes")
        )
      )
      .limit(1);

    if (!credential) {
      throw new Error(`${service} not connected for this organization`);
    }

    if (!credential.expiresAt || new Date() >= credential.expiresAt) {
      return this.refreshCredential(credential);
    }

    return credential;
  }

  private async refreshCredential(
    credential: IntegrationCredential
  ): Promise<IntegrationCredential> {
    const service = credential.service as ServiceType;
    const refreshFn = this.refreshFunctions.get(service);

    if (!refreshFn) {
      throw new Error(`No refresh function registered for ${service}`);
    }

    if (!credential.refreshToken) {
      throw new Error(`No refresh token available for ${service}`);
    }

    try {
      const { accessToken, refreshToken, expiresIn } = await refreshFn(credential);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      const [updatedCredential] = await db
        .update(integrationCredentials)
        .set({
          accessToken: encryptToken(accessToken),
          refreshToken: encryptToken(refreshToken),
          expiresAt,
          updatedAt: new Date()
        })
        .where(eq(integrationCredentials.id, credential.id))
        .returning();

      logger.info(`Token refreshed for ${service} - organization ${credential.organizationId}`);

      return updatedCredential;
    } catch (error: any) {
      logger.error(`Token refresh failed for ${service}:`, error.message);
      
      await db
        .update(integrationCredentials)
        .set({
          isActive: "no",
          updatedAt: new Date()
        })
        .where(eq(integrationCredentials.id, credential.id));

      throw new Error(`Failed to refresh ${service} token: ${error.message}. Please reconnect the integration.`);
    }
  }

  async updateLastSynced(credentialId: string): Promise<void> {
    await db
      .update(integrationCredentials)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(integrationCredentials.id, credentialId));
  }

  async disconnect(organizationId: string, service: ServiceType): Promise<void> {
    await db
      .update(integrationCredentials)
      .set({
        isActive: "no",
        updatedAt: new Date()
      })
      .where(
        and(
          eq(integrationCredentials.organizationId, organizationId),
          eq(integrationCredentials.service, service)
        )
      );

    logger.info(`${service} disconnected for organization ${organizationId}`);
  }
}

export const credentialService = new CredentialService();

// Register QuickBooks refresh function
credentialService.registerRefreshFunction("quickbooks", async (credential) => {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID || "";
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || "";
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const decryptedRefreshToken = decryptToken(credential.refreshToken || "");

  const response = await axios.post(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptedRefreshToken
    }),
    {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authHeader}`
      }
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in
  };
});

// Register DocuSign refresh function
credentialService.registerRefreshFunction("docusign", async (credential) => {
  const clientId = process.env.DOCUSIGN_CLIENT_ID || "";
  const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET || "";
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const decryptedRefreshToken = decryptToken(credential.refreshToken || "");

  const response = await axios.post(
    "https://account.docusign.com/oauth/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptedRefreshToken
    }),
    {
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in
  };
});
