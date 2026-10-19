import { logger } from "../logger";

class SecretsManager {
  private warnedSecrets = new Set<string>();

  private validateRequired(key: string, value: string | undefined): string {
    if (!value || value.trim() === '') {
      const error = `Missing required secret: ${key}`;
      logger.error(error);
      throw new Error(error);
    }
    return value;
  }

  private validateOptional(key: string, value: string | undefined): string | null {
    if (!value || value.trim() === '') {
      // Only warn once per secret to avoid log flooding
      if (!this.warnedSecrets.has(key)) {
        logger.warn(`Optional secret not set: ${key}`);
        this.warnedSecrets.add(key);
      }
      return null;
    }
    return value;
  }

  getResendApiKey(): string | null {
    return this.validateOptional('RESEND_API_KEY', process.env.RESEND_API_KEY);
  }

  getOpenAIBaseUrl(): string {
    return this.validateRequired('AI_INTEGRATIONS_OPENAI_BASE_URL', process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
  }

  getOpenAIApiKey(): string {
    return this.validateRequired('AI_INTEGRATIONS_OPENAI_API_KEY', process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
  }

  getSessionSecret(): string {
    return this.validateRequired('SESSION_SECRET', process.env.SESSION_SECRET);
  }

  getDatabaseUrl(): string {
    return this.validateRequired('DATABASE_URL', process.env.DATABASE_URL);
  }

  getHubSpotApiKey(): string | null {
    return this.validateOptional('HUBSPOT_API_KEY', process.env.HUBSPOT_API_KEY);
  }

  getOIDCIssuerUrl(): string {
    return this.validateRequired('OIDC_ISSUER_URL', process.env.OIDC_ISSUER_URL);
  }

  getOIDCClientId(): string {
    return this.validateRequired('OIDC_CLIENT_ID', process.env.OIDC_CLIENT_ID);
  }

  getOIDCClientSecret(): string {
    return this.validateRequired('OIDC_CLIENT_SECRET', process.env.OIDC_CLIENT_SECRET);
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}

export const secrets = new SecretsManager();
