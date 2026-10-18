// Development-only CLI fixture for the narrowly scoped legacy-account browser
// regression. Cleanup deletes only the synthetic rows it created.
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../../db";
import { users, organizations, memberships, projects, invitationTokens } from "@shared/schema";

const [action, id] = process.argv.slice(2);
async function main() {
try {
  if (action === "create") {
    const localId = randomUUID();
    const email = `legacy-browser-${localId}@example.com`;
    await db.insert(users).values({ id: localId, email });
    const [org] = await db.insert(organizations).values({
      name: "Legacy migration browser fixture", slug: `legacy-browser-${localId}`,
      subscriptionTier: "free", subscriptionStatus: "trialing",
    }).returning();
    await db.insert(memberships).values({ userId: localId, organizationId: org.id, role: "owner" });
    await db.insert(projects).values({
      organizationId: org.id, name: "Preserved Legacy Survey", location: "Synthetic test fixture",
    });
    const invitationToken = `fixture-${localId}`;
    const columns = await db.execute(sql`select exists(select 1 from information_schema.columns
      where table_schema=current_schema() and table_name='invitation_tokens'
      and column_name='remaining_uses') as legacy`);
    if (columns.rows[0]?.legacy) {
      await db.execute(sql`insert into invitation_tokens
        (id,token,email,status,max_uses,remaining_uses,expires_at,tier_override)
        values (${localId},${invitationToken},${email},'active',1,1,now()+interval '15 minutes','enterprise')`);
    } else {
      await db.execute(sql`insert into invitation_tokens
        (id,token,email,status,max_uses,expires_at,metadata)
        values (${localId},${invitationToken},${email},'active',1,now()+interval '15 minutes',
          '{"tierOverride":"enterprise"}'::jsonb)`);
    }
    console.log(JSON.stringify({ localId, organizationId: org.id, email, invitationToken }));
  } else if (action === "cleanup" && id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user || user.email !== `legacy-browser-${id}@example.com`) {
      throw new Error("Refusing to delete a non-fixture account");
    }
    await db.delete(invitationTokens).where(eq(invitationTokens.id, id));
    await db.delete(organizations).where(eq(organizations.slug, `legacy-browser-${id}`));
    await db.delete(users).where(eq(users.id, id));
    console.log("Synthetic fixture cleaned up");
  } else throw new Error("Usage: clerk-legacy-fixture.ts create | cleanup <fixture-id>");
} finally {
  await pool.end();
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
