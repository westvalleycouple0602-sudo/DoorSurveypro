import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from '@neondatabase/serverless';
import { ArchiveError, requireManager, type ArchiveRepository, type Destination, type Scope } from './contracts';
import { ArchiveSecrets } from './secrets';
import { GoogleDriveDestination, googleId } from './google-drive';

type Tokens = { access_token: string; refresh_token: string; expiresAt: number; accountId: string };
export class GoogleArchiveOAuth {
  constructor(private pool: Pool, private repo: ArchiveRepository, private secrets: ArchiveSecrets,
    private config: { clientId: string; clientSecret: string; redirectUri: string }, private http: typeof fetch = fetch) {
    const uri = new URL(config.redirectUri);
    if (uri.protocol !== 'https:' || uri.username || uri.password || uri.search || uri.hash)
      throw new Error('Google archive redirect URI must be a fixed HTTPS URL');
  }
  private binding(org: string, id: string) { return `${org}:${id}:oauth`; }
  async begin(scope: Scope, rootId?: string, destinationId?: string) {
    requireManager(scope);
    if (rootId) googleId(rootId);
    if (destinationId && !await this.repo.destination(scope.organizationId, destinationId)) throw new ArchiveError('destination-not-found', 404);
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(state).digest('hex');
    await this.pool.query('DELETE FROM customer_storage_oauth_states WHERE expires_at < now()');
    await this.pool.query(`INSERT INTO customer_storage_oauth_states (state_hash,organization_id,user_id,secret,expires_at)
      VALUES ($1,$2,$3,$4,now() + interval '10 minutes')`, [hash, scope.organizationId, scope.userId,
      this.secrets.seal(JSON.stringify({ verifier, rootId, destinationId }), `${scope.organizationId}:${scope.userId}:${hash}`)]);
    const params = new URLSearchParams({ client_id: this.config.clientId, redirect_uri: this.config.redirectUri,
      response_type: 'code', scope: 'https://www.googleapis.com/auth/drive.file', access_type: 'offline',
      prompt: 'consent', state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  private async exchange(params: Record<string, string>) {
    const response = await this.http('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error',
      signal: AbortSignal.timeout(30_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...params, client_id: this.config.clientId, client_secret: this.config.clientSecret }) });
    if (!response.ok) throw new ArchiveError(response.status >= 500 || response.status === 429 ? 'provider-retry' : 'provider-disconnected', response.status >= 500 || response.status === 429 ? 503 : 409);
    const body = await response.json();
    if (!body.access_token || !Number.isFinite(body.expires_in)) throw new ArchiveError('provider-invalid-token', 502);
    return body;
  }
  async callback(scope: Scope, state: string, code: string) {
    requireManager(scope);
    const hash = createHash('sha256').update(state).digest('hex');
    const record = (await this.pool.query(`DELETE FROM customer_storage_oauth_states
      WHERE state_hash=$1 AND organization_id=$2 AND user_id=$3 AND expires_at > now() RETURNING secret`,
    [hash, scope.organizationId, scope.userId])).rows[0];
    if (!record) throw new ArchiveError('invalid-oauth-state', 400);
    const pending = JSON.parse(this.secrets.open(record.secret, `${scope.organizationId}:${scope.userId}:${hash}`));
    const token = await this.exchange({ code, grant_type: 'authorization_code', redirect_uri: this.config.redirectUri, code_verifier: pending.verifier });
    if (!token.refresh_token) throw new ArchiveError('offline-consent-required', 409);
    const adapter = new GoogleDriveDestination(async () => token.access_token, this.http);
    const response = await this.http('https://www.googleapis.com/drive/v3/about?fields=user(permissionId)', {
      headers: { Authorization: `Bearer ${token.access_token}` }, redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new ArchiveError('provider-account-unavailable', 409);
    const accountId = (await response.json()).user?.permissionId;
    if (typeof accountId !== 'string' || !accountId) throw new ArchiveError('provider-account-unavailable', 409);
    const persist = async (store: ArchiveRepository) => {
      const existing = pending.destinationId ? await store.destination(scope.organizationId, pending.destinationId) : undefined;
      if (pending.destinationId && !existing) throw new ArchiveError('destination-not-found', 404);
      if (existing?.accountId !== undefined && existing.accountId !== accountId) throw new ArchiveError('reconnect-account-mismatch');
      const id = existing?.id ?? randomUUID();
      // Existing archives retain their root. Reconnection must not silently switch accounts/folders.
      const rootId = existing?.rootId ?? pending.rootId ?? await adapter.ensurePath('root', ['Door Survey Pro']);
      await adapter.validateRoot(rootId);
      const tokens: Tokens = { access_token: token.access_token, refresh_token: token.refresh_token,
        expiresAt: Date.now() + token.expires_in * 1000, accountId };
      const destination: Destination = { id, organizationId: scope.organizationId, provider: 'google-drive', rootId,
        accountId, active: true, secret: this.secrets.seal(JSON.stringify(tokens), this.binding(scope.organizationId, id)) };
      await store.saveDestination(destination);
      return { id, provider: destination.provider, rootId, active: true };
    };
    return pending.destinationId ? this.repo.locked(scope.organizationId, pending.destinationId, persist) : persist(this.repo);
  }
  adapter(d: Destination, store: ArchiveRepository) {
    return new GoogleDriveDestination(async () => {
      const tokens: Tokens = JSON.parse(this.secrets.open(d.secret, this.binding(d.organizationId, d.id)));
      if (tokens.expiresAt < Date.now() + 60_000) {
        const updated = await this.exchange({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
        tokens.access_token = updated.access_token;
        tokens.refresh_token = updated.refresh_token ?? tokens.refresh_token;
        tokens.expiresAt = Date.now() + updated.expires_in * 1000;
        d.secret = this.secrets.seal(JSON.stringify(tokens), this.binding(d.organizationId, d.id));
        await store.saveDestination(d);
      }
      return tokens.access_token;
    }, this.http);
  }
}
