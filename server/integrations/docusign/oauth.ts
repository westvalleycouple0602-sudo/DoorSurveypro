import type { Request, Response } from "express";
import axios from "axios";
import type { IntegrationCredential } from "@shared/schema";
import { db } from "../../db";
import { integrationCredentials } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { encryptToken, decryptToken } from "../../encryption";
import { logger } from "../../logger";

const DOCUSIGN_AUTH_URL = "https://account.docusign.com/oauth/auth";
const DOCUSIGN_TOKEN_URL = "https://account.docusign.com/oauth/token";
const DOCUSIGN_USERINFO_URL = "https://account.docusign.com/oauth/userinfo";

interface DocuSignTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface DocuSignUserInfo {
  sub: string;
  name: string;
  email: string;
  accounts: Array<{
    account_id: string;
    account_name: string;
    base_uri: string;
    is_default: boolean;
  }>;
}

export class DocuSignOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.DOCUSIGN_CLIENT_ID || "";
    this.clientSecret = process.env.DOCUSIGN_CLIENT_SECRET || "";
    this.redirectUri = process.env.DOCUSIGN_REDIRECT_URI || `${process.env.VITE_APP_URL || "http://localhost:5000"}/api/integrations/docusign/callback`;
    
    if (!this.clientId || !this.clientSecret) {
      logger.warn("DocuSign credentials not configured");
    }
  }

  getAuthorizationUrl(organizationId: string): string {
    const scopes = ["signature", "impersonation"].join(" ");

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      scope: scopes,
      redirect_uri: this.redirectUri,
      state: organizationId
    });

    return `${DOCUSIGN_AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(code: string, organizationId: string): Promise<IntegrationCredential> {
    try {
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

      const tokenResponse = await axios.post<DocuSignTokenResponse>(
        DOCUSIGN_TOKEN_URL,
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.redirectUri
        }),
        {
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      const userInfoResponse = await axios.get<DocuSignUserInfo>(
        DOCUSIGN_USERINFO_URL,
        {
          headers: {
            "Authorization": `Bearer ${access_token}`
          }
        }
      );

      const userInfo = userInfoResponse.data;
      const defaultAccount = userInfo.accounts.find(acc => acc.is_default) || userInfo.accounts[0];

      if (!defaultAccount) {
        throw new Error("No DocuSign account found");
      }

      const expiresAt = new Date(Date.now() + expires_in * 1000);

      const existing = await db
        .select()
        .from(integrationCredentials)
        .where(
          and(
            eq(integrationCredentials.organizationId, organizationId),
            eq(integrationCredentials.service, "docusign")
          )
        )
        .limit(1);

      const credentialData = {
        organizationId,
        service: "docusign" as const,
        accessToken: encryptToken(access_token),
        refreshToken: encryptToken(refresh_token),
        expiresAt,
        metadata: {
          accountId: defaultAccount.account_id,
          accountName: defaultAccount.account_name,
          baseUri: defaultAccount.base_uri,
          email: userInfo.email
        },
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

      logger.info(`DocuSign integration connected for organization ${organizationId}`);
      return credential;

    } catch (error: any) {
      logger.error("DocuSign OAuth callback error:", error.response?.data || error.message);
      throw new Error(`Failed to connect DocuSign: ${error.response?.data?.error_description || error.message}`);
    }
  }

  // Note: Token refresh and credential validation now handled by centralized credentialService
  // This reduces duplication and ensures consistent error handling across all integrations
}

export const docuSignOAuth = new DocuSignOAuthService();
