import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../db";
import { users, organizations, memberships, projects, invitationTokens } from "@shared/schema";
import { bindClerkAccount, verifiedEmailFromProof, type ProviderProof } from "../clerk-account-binding";
import { storage } from "../storage";

after(async () => { await pool.end(); });

function proof(id: string, externalId: string, email: string, verified = true): ProviderProof {
  return {
    id, externalId, username: null, primaryEmailAddressId: "primary",
    emailAddresses: [{
      id: "primary", emailAddress: email,
      verification: { status: verified ? "verified" : "unverified" },
    }],
  };
}

test("verified legacy UUID bridge retains membership, project and email-restricted invitation; binding is immutable", async () => {
  const localId = randomUUID();
  const subject = randomUUID();
  const clerkId = `user_test_${randomUUID()}`;
  const email = `bridge-${localId}@example.com`;
  let orgId: string | undefined;
  const invitationId = randomUUID();
  const invitationToken = randomUUID();
  try {
    await db.insert(users).values({ id: localId, email, language: "fr" });
    const [org] = await db.insert(organizations).values({
      name: "Auth bridge regression fixture", slug: `auth-test-${localId}`,
      subscriptionTier: "free", subscriptionStatus: "trialing",
    }).returning();
    orgId = org.id;
    await db.insert(memberships).values({ userId: localId, organizationId: org.id, role: "owner" });
    await db.insert(projects).values({
      organizationId: org.id, name: "Retained legacy project", location: "Test fixture",
    });
    const columns = await db.execute(sql`select exists(select 1 from information_schema.columns
      where table_schema=current_schema() and table_name='invitation_tokens'
      and column_name='remaining_uses') as legacy`);
    if (columns.rows[0]?.legacy) {
      await db.execute(sql`insert into invitation_tokens
        (id,token,email,status,max_uses,remaining_uses,expires_at)
        values (${invitationId},${invitationToken},${email},'active',1,1,now()+interval '1 minute')`);
    } else {
      await db.execute(sql`insert into invitation_tokens (id,token,email,status,max_uses,expires_at)
        values (${invitationId},${invitationToken},${email},'active',1,now()+interval '1 minute')`);
    }
    const provider = proof(clerkId, subject, email);
    const claims = { clerkId, legacyId: subject, email: email.toUpperCase(), username: null };
    const [first, concurrent] = await Promise.all([
      bindClerkAccount(claims, async () => provider),
      bindClerkAccount(claims, async () => provider),
    ]);
    assert.equal(first.id, localId);
    assert.equal(concurrent.id, localId);
    assert.equal(first.language, "fr");
    assert.equal(first.email, email); // no identity synchronization
    assert.equal(first.linkedProviders?.filter(p => p === `clerk:${clerkId}`).length, 1);
    assert.equal((await storage.getUserPrimaryMembership(first.id))?.organizationId, org.id);
    assert.equal((await storage.getProjects(org.id))[0]?.name, "Retained legacy project");
    assert.equal((await db.select().from(users).where(eq(users.id, clerkId))).length, 0);
    assert.equal((await db.select().from(users).where(eq(users.id, subject))).length, 0);

    const unverified = verifiedEmailFromProof(proof(clerkId, subject, email, false), email);
    assert.equal(unverified, null);
    assert.equal(await storage.consumeInvitationToken(invitationToken, localId, unverified), undefined);
    const accepted = await storage.consumeInvitationToken(
      invitationToken, localId, verifiedEmailFromProof(provider, email),
    );
    assert.equal(accepted?.usedByUserId, localId);
    assert.equal(accepted?.useCount, 1);
    // Exercise the grant's existing organization update against the real legacy
    // schema too, without replacing the account, membership or project.
    await storage.updateOrganization(org.id, {
      subscriptionTier: "enterprise", subscriptionStatus: "active",
      projectLimit: null, userLimit: null, trialEndsAt: null,
    });
    assert.equal((await storage.getOrganization(org.id))?.subscriptionTier, "enterprise");
    assert.equal((await storage.getUserPrimaryMembership(localId))?.organizationId, org.id);
    assert.equal((await storage.getProjects(org.id))[0]?.name, "Retained legacy project");
    assert.equal(await storage.consumeInvitationToken(invitationToken, localId, email), undefined);

    // Once linked, changing email/username never selects another local account.
    const subsequent = await bindClerkAccount({ ...claims, email: "changed@example.com" }, async () => {
      throw new Error("Bound requests must not call Clerk for basic identity");
    });
    assert.equal(subsequent.id, localId);
    // Reassignment to another verified subject cannot inherit the first binding.
    const otherId = `user_other_${randomUUID()}`;
    await assert.rejects(bindClerkAccount(
      { ...claims, clerkId: otherId },
      async () => proof(otherId, subject, email),
    ), /different Clerk binding/);
  } finally {
    await db.delete(invitationTokens).where(eq(invitationTokens.id, invitationId));
    if (orgId) await db.delete(organizations).where(eq(organizations.id, orgId));
    await db.delete(users).where(eq(users.id, localId));
  }
});

test("unverified email and missing managed claims cannot bind or orphan a migrated account", async () => {
  const localId = randomUUID();
  const legacyId = randomUUID();
  const clerkId = `user_test_${randomUUID()}`;
  const email = `unverified-${localId}@example.com`;
  try {
    await db.insert(users).values({ id: localId, email });
    await assert.rejects(bindClerkAccount(
      { clerkId, legacyId, email, username: null },
      async () => proof(clerkId, legacyId, email, false),
    ), /verified email/);
    await assert.rejects(bindClerkAccount(
      { clerkId, legacyId, email: null, username: null },
      async () => proof(clerkId, legacyId, email),
    ), /email session claim is missing/);
    await assert.rejects(bindClerkAccount(
      { clerkId, legacyId: clerkId, email, username: null },
      async () => proof(clerkId, legacyId, email),
    ), /does not match/);
    assert.equal((await db.select().from(users).where(eq(users.id, legacyId))).length, 0);
    assert.equal((await db.select().from(users).where(eq(users.id, clerkId))).length, 0);
    const [legacy] = await db.select().from(users).where(eq(users.id, localId));
    assert.equal(legacy.linkedProviders?.length ?? 0, 0);
  } finally {
    await db.delete(users).where(eq(users.id, localId));
  }
});
