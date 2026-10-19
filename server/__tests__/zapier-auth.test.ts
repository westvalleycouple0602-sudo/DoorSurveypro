import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Request, Response } from 'express';
import { PgDialect } from 'drizzle-orm/pg-core';
import { hashApiKey } from '../utils/apiKey';
import { db } from '../db';
import { storage } from '../storage';
import { createHubSpotService } from '../hubspot';
import { atomicRateLimitIncrement } from '../utils/redis';
import { rateLimitWindowSeconds } from '../middleware/apiKeyAuth';
import router from '../routes/zapier.routes';

jest.mock('../db', () => ({ db: { select: jest.fn() } }));
jest.mock('../storage', () => ({ storage: {
  getProjects: jest.fn(), getProject: jest.fn(), getOpeningsByProject: jest.fn(), getProjectCost: jest.fn(),
  createProject: jest.fn(), createOpening: jest.fn(), getCustomer: jest.fn(), getCustomerLocation: jest.fn(),
} }));
jest.mock('../hubspot', () => ({ createHubSpotService: jest.fn() }));
jest.mock('../utils/redis', () => ({ atomicRateLimitIncrement: jest.fn() }));
jest.mock('../logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() }, logError: jest.fn(), logSecurityEvent: jest.fn() }));

const key = 'disposable-test-key';
const projectA = { id: 'project-a', organizationId: 'org-a', name: 'A' };
const projectB = { id: 'project-b', organizationId: 'org-b', name: 'B' };
let record: Record<string, unknown>;
const syncProject = jest.fn();

async function request(method: string, url: string, options: { key?: string | null; header?: string; scopes?: string[]; body?: unknown; query?: unknown } = {}) {
  if (options.scopes) record.scopes = options.scopes;
  const supplied = options.key === undefined ? key : options.key;
  const headers: Record<string, string> = supplied ? options.header === 'x-api-key' ? { 'x-api-key': supplied } : { authorization: `Bearer ${supplied}` } : {};
  const req = { method, url, originalUrl: `/api/zapier${url}`, path: url,
    headers, get: (name: string) => headers[name.toLowerCase()], ip: '127.0.0.1',
    body: options.body ?? {}, query: options.query ?? {},
    // An unrelated browser identity must not override key ownership.
    dbUser: { id: 'different-local-user', organizationId: 'org-b' },
  } as unknown as Request;
  return await new Promise<{ status: number; body: any }>((resolve, reject) => {
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      status(code: number) { this.statusCode = code; return this; },
      json(body: unknown) { resolve({ status: this.statusCode, body }); return this; },
    });
    router(req, res as unknown as Response, (error?: unknown) => error ? reject(error) : reject(new Error('No matching route')));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  record = { id: 'key-a', keyHash: hashApiKey(key), organizationId: 'org-a', createdBy: 'local-a',
    name: 'Fixture', scopes: ['*'], allowedIps: [], revokedAt: null, expiresAt: null,
    rateLimitWindow: 'hour', rateLimit: 1000, requestCount: 0 };
  jest.mocked(db.select).mockImplementation(() => ({ from: () => ({ where: (condition: any) => ({
    limit: async () => new PgDialect().sqlToQuery(condition).params[0] === record.keyHash ? [record] : [],
  }) }) }) as any);
  jest.mocked(atomicRateLimitIncrement).mockResolvedValue(1);
  jest.mocked(storage.getProject).mockImplementation(async (id, org) => [projectA, projectB].find(p => p.id === id && p.organizationId === org) as any);
  jest.mocked(storage.getProjects).mockImplementation(async org => [projectA, projectB].filter(p => p.organizationId === org) as any);
  jest.mocked(storage.getOpeningsByProject).mockResolvedValue([]);
  jest.mocked(storage.getProjectCost).mockResolvedValue(undefined);
  jest.mocked(storage.createProject).mockImplementation(async data => ({ id: 'new', ...data }) as any);
  jest.mocked(storage.createOpening).mockImplementation(async data => ({ id: 'new-opening', ...data }) as any);
  jest.mocked(storage.getCustomer).mockResolvedValue(undefined);
  jest.mocked(storage.getCustomerLocation).mockResolvedValue(undefined);
  syncProject.mockResolvedValue({ id: 'deal-a' });
  jest.mocked(createHubSpotService).mockResolvedValue({ isConfigured: () => true, calculateTotalCost: () => 0, syncProject } as any);
});

it.each([null, 'legacy-global-key', 'invalid'])('rejects missing/unknown keys (%s) even with a browser identity', async supplied => {
  process.env.ZAPIER_API_KEY = 'legacy-global-key';
  try { expect((await request('GET', '/projects', { key: supplied })).status).toBe(401); }
  finally { delete process.env.ZAPIER_API_KEY; }
  expect(storage.getProjects).not.toHaveBeenCalled();
});

it.each(['revoked', 'expired', 'ip-blocked'])('rejects %s credentials before data access', async reason => {
  if (reason === 'revoked') record.revokedAt = new Date();
  if (reason === 'expired') record.expiresAt = new Date(0);
  if (reason === 'ip-blocked') record.allowedIps = ['192.0.2.1'];
  expect((await request('GET', '/projects')).status).toBe(reason === 'ip-blocked' ? 403 : 401);
  expect(storage.getProjects).not.toHaveBeenCalled();
});

it('requires every detail scope, not any one scope', async () => {
  expect((await request('GET', '/projects/project-a', { scopes: ['projects:read', 'openings:read'] })).status).toBe(403);
  expect(storage.getProject).not.toHaveBeenCalled();
});

it('rejects read-only writes without mutations or provider calls', async () => {
  expect((await request('POST', '/projects', { scopes: ['projects:read'] })).status).toBe(403);
  expect((await request('POST', '/projects/project-a/openings')).status).toBe(403);
  expect((await request('POST', '/hubspot/sync-project/project-a')).status).toBe(403);
  expect(storage.createProject).not.toHaveBeenCalled();
  expect(storage.createOpening).not.toHaveBeenCalled();
  expect(createHubSpotService).not.toHaveBeenCalled();
});

it.each([['GET', '/projects/project-b'], ['POST', '/projects/project-b/openings'], ['POST', '/hubspot/sync-project/project-b']])('denies foreign IDs: %s %s', async (method, url) => {
  const options = { body: { organizationId: 'org-b', projectId: 'project-a' }, query: { organizationId: 'org-b' } };
  expect((await request(method, url, options)).status).toBe(404);
  expect((await request(method, url, options)).status).toBe(404); // retry remains isolated
  expect(storage.getOpeningsByProject).not.toHaveBeenCalled();
  expect(storage.getProjectCost).not.toHaveBeenCalled();
  expect(storage.createOpening).not.toHaveBeenCalled();
  expect(createHubSpotService).not.toHaveBeenCalled();
});

it('lists only key-owned projects despite query/body/session spoofing', async () => {
  const response = await request('GET', '/projects', { query: { organizationId: 'org-b' }, body: { organizationId: 'org-b' } });
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual([projectA]);
  expect(storage.getProjects).toHaveBeenCalledWith('org-a');
});

it('creates projects in the key organization and rejects foreign customer relationships', async () => {
  const body = { name: 'New', location: 'Fixture', organizationId: 'org-b' };
  expect((await request('POST', '/projects', { body })).body.data.organizationId).toBe('org-a');
  jest.mocked(storage.createProject).mockClear();
  expect((await request('POST', '/projects', { body: { ...body, customerId: 'foreign' } })).status).toBe(404);
  expect(storage.getCustomer).toHaveBeenCalledWith('foreign', 'org-a');
  expect(storage.createProject).not.toHaveBeenCalled();
});

it('binds opening creation to the authorized URL project', async () => {
  const response = await request('POST', '/projects/project-a/openings', { scopes: ['openings:write'], body: { openingNumber: '101', location: 'Fixture', projectId: 'project-b' } });
  expect(response.status).toBe(201);
  expect(response.body.data.projectId).toBe('project-a');
});

it('syncs only through the key organization HubSpot configuration', async () => {
  const response = await request('POST', '/hubspot/sync-project/project-a', { scopes: ['projects:read', 'quotes:read', 'integrations:write'] });
  expect(response.status).toBe(200);
  expect(createHubSpotService).toHaveBeenCalledWith('org-a');
  expect(syncProject).toHaveBeenCalledWith({ ...projectA, totalCost: 0 });
});

it('validates pagination before reading data', async () => {
  expect((await request('GET', '/projects', { query: { limit: -1 } })).status).toBe(400);
  expect(storage.getProjects).not.toHaveBeenCalled();
});

it('converts named rate windows and rejects unknown windows', async () => {
  expect(['hour', 'day', 'month'].map(rateLimitWindowSeconds)).toEqual([3600, 86400, 2592000]);
  expect(() => rateLimitWindowSeconds('invalid')).toThrow();
  await request('GET', '/projects');
  expect(atomicRateLimitIncrement).toHaveBeenCalledWith('api_rate_limit:key-a', 3600);
});

it('enforces the key quota before route data access', async () => {
  jest.mocked(atomicRateLimitIncrement).mockResolvedValue(1001);
  expect((await request('GET', '/projects')).status).toBe(429);
  expect(storage.getProjects).not.toHaveBeenCalled();
});

it('supports the X-API-Key header and complete detail scopes', async () => {
  const response = await request('GET', '/projects/project-a', { header: 'x-api-key', scopes: ['projects:read', 'openings:read', 'quotes:read'] });
  expect(response.status).toBe(200);
  expect(response.body.data.project.id).toBe('project-a');
  expect(storage.getProjectCost).toHaveBeenCalledWith('project-a');
});

it('rejects a foreign location even for an owned customer', async () => {
  jest.mocked(storage.getCustomer).mockResolvedValue({ id: 'customer-a' } as any);
  jest.mocked(storage.getCustomerLocation).mockResolvedValue({ id: 'location-b', customerId: 'customer-b' } as any);
  expect((await request('POST', '/projects', { body: { name: 'New', location: 'Fixture', customerId: 'customer-a', locationId: 'location-b' } })).status).toBe(404);
  expect(storage.createProject).not.toHaveBeenCalled();
});

it('maps stored travel and expedited fields into the existing HubSpot calculator', async () => {
  jest.mocked(storage.getProjectCost).mockResolvedValue({ travelTime: 2, travelRate: 25, expeditedCost: 30 } as any);
  const calculateTotalCost = jest.fn().mockReturnValue(80);
  jest.mocked(createHubSpotService).mockResolvedValue({ isConfigured: () => true, calculateTotalCost, syncProject } as any);
  await request('POST', '/hubspot/sync-project/project-a');
  expect(calculateTotalCost).toHaveBeenCalledWith(expect.objectContaining({ travelHours: 2, travelHourlyRate: 25, expeditedDeliveryCost: 30 }));
  expect(syncProject).toHaveBeenCalledWith({ ...projectA, totalCost: 80 });
});

it('mounts the isolated machine router before Clerk with no legacy duplicate or global CSRF exemption', () => {
  const index = readFileSync('server/index.ts', 'utf8');
  const legacy = readFileSync('server/routes.ts', 'utf8');
  const mount = index.indexOf('app.use("/api/zapier", rateLimitZapierApi, zapierRouter,');
  expect(mount).toBeGreaterThan(index.indexOf('app.use(express.json('));
  expect(mount).toBeLessThan(index.indexOf('clerkMiddleware((req)'));
  expect(index).toContain('res.status(404).json({ error: "Zapier endpoint not found" })');
  expect(legacy).not.toContain('"/api/zapier');
});
