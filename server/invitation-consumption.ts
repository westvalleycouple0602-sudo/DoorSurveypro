import { sql } from "drizzle-orm";
import { db } from "./db";
import type { InvitationToken } from "@shared/schema";

let legacyCounters: Promise<boolean> | undefined;

function usesLegacyCounters(): Promise<boolean> {
  return legacyCounters ??= db.execute(sql`
    select exists(select 1 from information_schema.columns
      where table_schema=current_schema() and table_name='invitation_tokens'
      and column_name='remaining_uses') as legacy
  `).then(result => result.rows[0]?.legacy === true)
    .catch(error => { legacyCounters = undefined; throw error; });
}

// Keep the live legacy invitation table and its counters intact. Its columns
// predate the preserved shared declaration; do not db:push to reconcile them.
export async function consumeInvitation(
  token: string, userId: string, verifiedEmail?: string | null,
): Promise<InvitationToken | undefined> {
  const legacy = await usesLegacyCounters();
  const result = legacy
    ? await db.execute(sql`
        update invitation_tokens set
          remaining_uses=remaining_uses-1,
          status=case when remaining_uses<=1 then 'consumed' else 'active' end,
          consumed_by=${userId}, consumed_at=now()
        where token=${token} and status='active' and remaining_uses>0
          and (expires_at is null or expires_at>now())
          and (email is null or lower(email)=lower(${verifiedEmail ?? ""}))
        returning *`)
    : await db.execute(sql`
        update invitation_tokens set
          use_count=coalesce(use_count,0)+1,
          status=case when coalesce(use_count,0)+1>=max_uses then 'consumed' else 'active' end,
          used_by_user_id=${userId}, used_at=now()
        where token=${token} and status='active' and coalesce(use_count,0)<max_uses
          and (expires_at is null or expires_at>now())
          and (email is null or lower(email)=lower(${verifiedEmail ?? ""}))
        returning *`);
  const row = result.rows[0];
  if (!row) return undefined;
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: String(row.id), token: String(row.token),
    email: row.email as string | null, name: row.name as string | null,
    invitedByUserId: (row.invited_by_user_id ?? row.created_by ?? null) as string | null,
    organizationId: (row.organization_id ?? null) as string | null,
    role: String(row.role ?? "technician"), status: String(row.status),
    usedByUserId: (legacy ? row.consumed_by : row.used_by_user_id) as string | null,
    usedAt: (legacy ? row.consumed_at : row.used_at) as Date | null,
    expiresAt: row.expires_at as Date | null,
    maxUses: Number(row.max_uses),
    useCount: legacy ? Number(row.max_uses) - Number(row.remaining_uses) : Number(row.use_count),
    metadata: { ...metadata, ...(row.tier_override ? { tierOverride: row.tier_override } : {}) },
    createdAt: row.created_at as Date,
    updatedAt: (row.updated_at ?? row.created_at) as Date,
  };
}
