import { pgTable, serial, text, timestamp, varchar, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tenantIntegrationsHubspot = pgTable('tenant_integrations_hubspot', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull(),
  portalId: varchar('portal_id', { length: 32 }).notNull(),
  accessTokenEnc: text('access_token_enc'),
  refreshTokenEnc: text('refresh_token_enc'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  scopes: text('scopes'),
  status: varchar('status', { length: 24 }).notNull().default('connected'),
  connectedByUserId: varchar('connected_by_user_id', { length: 64 }),
  connectedAt: timestamp('connected_at', { withTimezone: true }).default(sql`now()`),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, t => ({
  byTenantPortal: uniqueIndex('ui_tenant_portal').on(t.tenantId, t.portalId),
  byTenant: index('idx_tih_tenant').on(t.tenantId),
}));

export const hubspotLinks = pgTable('hubspot_links', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull(),
  localTable: varchar('local_table', { length: 64 }).notNull(),
  localId: varchar('local_id', { length: 128 }).notNull(),
  hsObjectType: varchar('hs_object_type', { length: 64 }).notNull(),
  hsObjectId: varchar('hs_object_id', { length: 64 }).notNull(),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastEtag: varchar('last_etag', { length: 256 }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, t => ({
  byTenantLocal: uniqueIndex('ui_hl_tenant_local').on(t.tenantId, t.localTable, t.localId, t.hsObjectType),
  byTenantHs: index('idx_hl_tenant_hs').on(t.tenantId, t.hsObjectType, t.hsObjectId),
}));

export const hubspotHealthLogs = pgTable('hubspot_health_logs', {
  id: serial('id').primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull(),
  level: varchar('level', { length: 16 }).notNull().default('info'),
  code: varchar('code', { length: 64 }),
  message: text('message'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, t => ({ byTenant: index('idx_hhl_tenant').on(t.tenantId) }));
