import { Router, raw, type Request } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { ArchiveError, publicArchive, requireManager, type ArchiveInput, type Scope } from './contracts';
import { CustomerArchiveService, ARCHIVE_CHUNK_SIZE } from './service';
import type { ArchiveRepository } from './contracts';
import type { GoogleArchiveOAuth } from './oauth';

const input = z.object({
  projectId: z.string().min(1).max(200), openingId: z.string().min(1).max(200), sessionId: z.string().min(1).max(200),
  filename: z.string().min(1).max(200).regex(/^[^/\\\x00-\x1f\x7f]+$/),
  contentType: z.string().max(100).regex(/^[\w.+-]+\/[\w.+-]+$/).refine(v => !v.startsWith('application/vnd.google-apps.')),
  size: z.number().int().min(1).max(200 * 1024 * 1024), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export function archiveRouter(deps: { service: CustomerArchiveService; repo: ArchiveRepository; oauth: GoogleArchiveOAuth;
  context: (req: Request) => Promise<Scope | null> }) {
  const router = Router();
  router.use(async (req, res, next) => {
    try {
      const scope = await deps.context(req);
      if (!scope) throw new ArchiveError('unauthorized', 401);
      res.locals.archiveScope = scope;
      res.set('Cache-Control', 'no-store');
      next();
    } catch (e) { next(e); }
  });
  const scope = (res: { locals: Record<string, any> }): Scope => res.locals.archiveScope;
  const run = (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any, next: any) => { fn(req, res).catch(next); };
  router.get('/destinations', run(async (_req, res) => {
    requireManager(scope(res));
    res.json((await deps.repo.listDestinations(scope(res).organizationId)).map(({ id, provider, rootId, active }) => ({ id, provider, rootId, active })));
  }));
  router.post('/google-drive/connect', run(async (req, res) => {
    const body = z.object({ rootId: z.string().optional(), destinationId: z.string().optional() }).strict().parse(req.body);
    res.json({ authorizationUrl: await deps.oauth.begin(scope(res), body.rootId, body.destinationId) });
  }));
  router.get('/google-drive/callback', run(async (req, res) => {
    const query = z.object({ state: z.string().min(20).max(200), code: z.string().min(1).max(4096) }).parse(req.query);
    res.json(await deps.oauth.callback(scope(res), query.state, query.code));
  }));
  router.delete('/destinations/:id', run(async (req, res) => {
    await deps.service.disconnect(scope(res), req.params.id); res.status(204).end();
  }));
  router.post('/destinations/:id/archives', run(async (req, res) => {
    const body: ArchiveInput = input.parse(req.body);
    res.status(201).json(publicArchive(await deps.service.create(scope(res), req.params.id, body)));
  }));
  router.get('/archives/:id', run(async (req, res) => {
    res.json(publicArchive(await deps.service.get(scope(res), req.params.id)));
  }));
  router.put('/archives/:id/content', raw({ type: 'application/octet-stream', limit: ARCHIVE_CHUNK_SIZE }), run(async (req, res) => {
    const offset = z.coerce.number().int().min(0).max(200 * 1024 * 1024).parse(req.query.offset);
    if (!Buffer.isBuffer(req.body)) throw new ArchiveError('binary-content-required', 400);
    res.json(publicArchive(await deps.service.transfer(scope(res), req.params.id, offset, req.body)));
  }));
  router.get('/archives/:id/content', run(async (req, res) => {
    const response = await deps.service.retrieve(scope(res), req.params.id);
    if (!response.body) throw new ArchiveError('provider-empty-response', 502);
    res.set({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="archive"', 'X-Content-Type-Options': 'nosniff' });
    await pipeline(Readable.fromWeb(response.body as any), res);
  }));
  router.use((error: any, _req: any, res: any, _next: any) => {
    if (res.headersSent) return res.destroy();
    const status = error instanceof ArchiveError ? error.status : error instanceof z.ZodError ? 400 : error.type === 'entity.too.large' ? 413 : 503;
    if (status === 503) res.set('Retry-After', '5');
    res.status(status).json({ error: error instanceof ArchiveError ? error.code : status === 400 ? 'invalid-request' : status === 413 ? 'chunk-too-large' : 'archive-service-unavailable' });
  });
  return router;
}
