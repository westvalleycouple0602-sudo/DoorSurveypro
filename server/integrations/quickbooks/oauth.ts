import type { Request, Response } from "express";
import axios from "axios";
import type { IntegrationCredential } from "@shared/schema";
import { db } from "../../db";
import { integrationCredentials } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { encryptToken, decryptToken } from "../../encryption";
import { logger } from "../../logger";

const QUICKBOOKS_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QUICKBOOKS_API_BASE = "https://quickbooks.api.intuit.com/v3/company";

interface QuickBooksTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

export class QuickBooksOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.QUICKBOOKS_CLIENT_ID || "";
    this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || "";
    this.redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.VITE_APP_URL || "http://localhost:5000"}/api/integrations/quickbooks/callback`;
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn("QuickBooks credentials not configured");
    }
  }

  getAuthorizationUrl(organizationId: string): string {
    const scopes = [
      "com.intuit.quickbooks.accounting",
      "openid",
      "profile",
      "email"
    ].join(" ");

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      scope: scopes,
      redirect_uri: this.redirectUri,
      state: organizationId
    });

    return `${QUICKBOOKS_AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(code: string, realmId: string, organizationId: string): Promise<IntegrationCredential> {
    try {
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

      const response = await axios.post<QuickBooksTokenResponse>(
        QUICKBOOKS_TOKEN_URL,
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.redirectUri
        }),
        {
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${authHeader}`
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      const existing = await db
        .select()
        .from(integrationCredentials)
        .where(
          and(
            eq(integrationCredentials.organizationId, organizationId),
            eq(integrationCredentials.service, "quickbooks")
          )
        )
        .limit(1);

      const credentialData = {
        organizationId,
        service: "quickbooks" as const,
        accessToken: encryptToken(access_token),
        refreshToken: encryptToken(refresh_token),
        expiresAt,
        metadata: { realmId },
        isActive: "yes" as const
      };

      let credential: IntegrationCredential;

      if (existing.length > 0) {
        await db
          .update(integrationCredentials)
          .set({
            ...credentialData,
            updatedAt: new Date()
          })
          .where(eq(integrationCredentials.id, existing[0].id));
        
        credential = { ...existing[0], ...credentialData };
      } else {
        const [newCredential] = await db
          .insert(integrationCredentials)
          .values(credentialData)
          .returning();
        
        credential = newCredential;
      }

      logger.info(`QuickBooks integration connected for organization ${organizationId}`);
      return credential;

    } catch (error: any) {
      logger.error("QuickBooks OAuth callback error:", error.response?.data || error.message);
      throw new Error(`Failed to connect QuickBooks: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Note: Token refresh and credential validation now handled by centralized credentialService
  // This reduces duplication and ensures consistent error handling across all integrations
}

export const quickBooksOAuth = new QuickBooksOAuthService();
