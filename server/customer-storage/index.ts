import type { Express } from 'express';
import { pool } from '../db';
import { storage } from '../storage';
import { getOrganizationContext } from '../clerkAuth';
import { archiveAuthorizer } from './access';
import { ArchiveSecrets } from './secrets';
import { PostgresArchiveRepository } from './repository';
import { GoogleArchiveOAuth } from './oauth';
import { CustomerArchiveService } from './service';
import { archiveRouter } from './routes';

export function registerCustomerStorage(app: Express) {
  // Explicit opt-in; no migration, credential access, or provider requests at startup.
  if (process.env.CUSTOMER_STORAGE_ENABLED !== 'true') return;
  const clientId = process.env.CUSTOMER_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.CUSTOMER_GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.CUSTOMER_GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Customer Google OAuth configuration is incomplete');
  const repo = new PostgresArchiveRepository(pool);
  const secrets = new ArchiveSecrets();
  const oauth = new GoogleArchiveOAuth(pool, repo, secrets, { clientId, clientSecret, redirectUri });
  const service = new CustomerArchiveService(repo, secrets, (d, store) => oauth.adapter(d, store), archiveAuthorizer(storage));
  app.use('/api/customer-storage', archiveRouter({ service, repo, oauth, context: async req => {
    const context = await getOrganizationContext(req);
    if (!context || !req.dbUser) return null;
    return { organizationId: context.organizationId, userId: context.userId, role: req.dbUser.role };
  } }));
}
