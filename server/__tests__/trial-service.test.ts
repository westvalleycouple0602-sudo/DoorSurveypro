import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "../db";
import { organizations } from "@shared/schemas/auth.schema";
import { activateTrial, checkTrialEligibility, downgradeToFree, getTrialStatus } from "../services/trial.service";
import { evaluateTrialEligibility, evaluateTrialStatus, shouldExpireTrial, type TrialRecord } from "../services/trial-policy";

const now = new Date("2026-10-09T12:00:00Z");
const before = new Date(now.getTime() - 1);
const later = new Date(now.getTime() + 1);
const base: TrialRecord = {
  subscriptionTier: "free", subscriptionStatus: "active",
  stripeSubscriptionId: null,
  trialEndsAt: null, trialTier: null, gracePeriodEndDate: null,
  isMasterAccount: "no", isBetaTester: "no",
  hasTriedProfessional: false, hasTriedEnterprise: false,
};
const ids: string[] = [];
after(async () => {
  try { if (ids.length) await db.delete(organizations).where(inArray(organizations.id, ids)); }
  finally { await pool.end(); }
});

async function fixture(values: Partial<typeof organizations.$inferInsert> = {}) {
  const id = randomUUID();
  ids.push(id);
  await db.insert(organizations).values({
    id, name: `trial-regression-${id}`, subscriptionTier: "free", subscriptionStatus: "active",
    isMasterAccount: "no", isBetaTester: "no",
    hasTriedProfessional: false, hasTriedEnterprise: false,
    projectLimit: 9, userLimit: 4, ...values,
  });
  return id;
}

test("active trials use positive rounded-up days and the correct tier duration", () => {
  for (const [tier, duration] of [["professional", 14], ["enterprise", 7]] as const) {
    const org = { ...base, subscriptionTier: tier, subscriptionStatus: "trialing", trialTier: tier, trialEndsAt: later };
    assert.deepEqual(evaluateTrialStatus(org, now), {
      isActive: true, isInGracePeriod: false, tier, endsAt: later, daysRemaining: 1, totalDays: duration,
    });
    assert.equal(shouldExpireTrial(org, now), false);
    assert.match(evaluateTrialEligibility(org, now).reason!, /active .* trial/);
  }
});

test("expiration includes the exact boundary but respects an active grace period", () => {
  const expired = { ...base, subscriptionTier: "professional", subscriptionStatus: "trialing", trialTier: "professional", trialEndsAt: now };
  assert.equal(evaluateTrialStatus(expired, now).isActive, false);
  assert.equal(shouldExpireTrial(expired, now), true);
  const grace = { ...expired, subscriptionStatus: "past_due", gracePeriodEndDate: later };
  assert.equal(evaluateTrialStatus(grace, now).isInGracePeriod, true);
  assert.equal(shouldExpireTrial(grace, now), false);
  assert.equal(evaluateTrialEligibility(grace, now).eligible, false);
  assert.equal(shouldExpireTrial({ ...grace, gracePeriodEndDate: now }, now), true);
});

test("paid and protected accounts retain access despite stale trial dates", () => {
  for (const org of [
    { ...base, subscriptionTier: "enterprise", subscriptionStatus: "active", trialEndsAt: before, gracePeriodEndDate: before },
    { ...base, isMasterAccount: "yes", subscriptionTier: "enterprise", subscriptionStatus: "trialing", trialEndsAt: before },
    { ...base, isBetaTester: "yes", subscriptionTier: "enterprise", subscriptionStatus: "trialing", trialEndsAt: before },
  ]) {
    assert.deepEqual(evaluateTrialStatus(org, now), { isActive: false, isInGracePeriod: false });
    assert.equal(shouldExpireTrial(org, now), false);
    assert.equal(evaluateTrialEligibility(org, now).eligible, false);
  }
});

test("eligibility tracks each tier without letting used trials repeat", () => {
  assert.deepEqual(evaluateTrialEligibility(base, now).availableTiers, ["professional", "enterprise"]);
  assert.deepEqual(evaluateTrialEligibility({ ...base, hasTriedProfessional: true }, now).availableTiers, ["enterprise"]);
  assert.equal(evaluateTrialEligibility({ ...base, hasTriedProfessional: true, hasTriedEnterprise: true }, now).eligible, false);
  assert.deepEqual(evaluateTrialEligibility({
    ...base, subscriptionTier: "professional", subscriptionStatus: "trialing",
    trialTier: "professional", trialEndsAt: before,
  }, now).availableTiers, ["enterprise"]);
  assert.throws(() => evaluateTrialStatus({ ...base, subscriptionTier: "professional", trialTier: "professional", subscriptionStatus: "trialing", trialEndsAt: new Date("bad") }, now), /Invalid stored trial date/);
});

test("live-schema activation, expiration, and eligibility preserve organization limits", async () => {
  const id = await fixture();
  assert.equal((await checkTrialEligibility(id)).eligible, true);
  assert.equal((await activateTrial(id, { tier: "professional" })).success, true);
  const active = await getTrialStatus(id);
  assert.equal(active.isActive, true);
  assert.equal(active.totalDays, 14);
  assert.equal((await checkTrialEligibility(id)).eligible, false);
  await db.update(organizations).set({ trialEndsAt: new Date(Date.now() - 60_000) }).where(eq(organizations.id, id));
  const expired = await getTrialStatus(id);
  assert.equal(expired.isActive, false);
  assert.equal(expired.organizationChanged, true);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  assert.equal(org.subscriptionTier, "free");
  assert.equal(org.subscriptionStatus, "active");
  assert.equal(org.hasTriedProfessional, true);
  assert.equal(org.projectLimit, 9);
  assert.equal(org.userLimit, 4);
  assert.deepEqual((await checkTrialEligibility(id)).availableTiers, ["enterprise"]);
  assert.equal((await activateTrial(id, { tier: "enterprise" })).success, true);
  assert.equal((await getTrialStatus(id)).totalDays, 7);
});

test("live grace stays active until its deadline, then expires", async () => {
  const id = await fixture({
    subscriptionTier: "professional", subscriptionStatus: "past_due", trialTier: "professional",
    trialEndsAt: new Date(Date.now() - 60_000), gracePeriodEndDate: new Date(Date.now() + 60_000),
  });
  assert.equal((await getTrialStatus(id)).isInGracePeriod, true);
  await db.update(organizations).set({ gracePeriodEndDate: new Date(Date.now() - 60_000) }).where(eq(organizations.id, id));
  assert.equal((await getTrialStatus(id)).isInGracePeriod, false);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  assert.equal(org.subscriptionTier, "free");
});

test("live paid, master, and beta accounts cannot be accidentally downgraded", async () => {
  for (const values of [
    { subscriptionStatus: "active" },
    { subscriptionStatus: "trialing", isMasterAccount: "yes" },
    { subscriptionStatus: "trialing", isBetaTester: "yes" },
  ]) {
    const id = await fixture({ subscriptionTier: "enterprise", trialTier: "enterprise", trialEndsAt: new Date(Date.now() - 60_000), ...values });
    assert.equal((await getTrialStatus(id)).isActive, false);
    assert.equal((await downgradeToFree(id)).success, false);
    assert.equal((await activateTrial(id, { tier: "professional" })).success, false);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    assert.equal(org.subscriptionTier, "enterprise");
    assert.equal(org.subscriptionStatus, values.subscriptionStatus);
  }
});

test("expiration rejects a stale row version instead of overwriting concurrent changes", async () => {
  const id = await fixture({ subscriptionTier: "professional", trialTier: "professional", subscriptionStatus: "trialing", trialEndsAt: new Date(Date.now() - 60_000) });
  const [snapshot] = await db.select({
    subscriptionTier: organizations.subscriptionTier,
    subscriptionStatus: organizations.subscriptionStatus,
    version: sql<string>`${organizations}.xmin::text`,
  }).from(organizations).where(eq(organizations.id, id));
  await db.update(organizations).set({ name: "changed-after-trial-read" }).where(eq(organizations.id, id));
  assert.equal((await downgradeToFree(id, snapshot)).success, false);
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  assert.equal(org.subscriptionTier, "professional");
});

test("paid subscriptions with past-due or trialing status and residual trial dates retain their tier", async () => {
  for (const subscriptionStatus of ["past_due", "trialing"]) {
    const record: TrialRecord = {
      ...base, subscriptionTier: "professional", trialTier: "professional",
      subscriptionStatus, stripeSubscriptionId: `sub_regression_${randomUUID()}`,
      trialEndsAt: new Date(Date.now() - 60_000), gracePeriodEndDate: new Date(Date.now() - 60_000),
    };
    assert.equal(shouldExpireTrial(record), false);
    assert.equal(evaluateTrialStatus(record).isActive, false);
    assert.equal(evaluateTrialEligibility(record).eligible, false);
    const id = await fixture(record);
    assert.equal((await getTrialStatus(id)).organizationChanged, undefined);
    assert.equal((await downgradeToFree(id)).success, false);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    assert.equal(org.subscriptionTier, "professional");
    assert.equal(org.subscriptionStatus, subscriptionStatus);
    assert.equal(org.stripeSubscriptionId, record.stripeSubscriptionId);
  }
});

test("residual or mismatched trial markers do not prove a current entitlement is a trial", async () => {
  for (const trialTier of [null, "enterprise"]) {
    const record: TrialRecord = {
      ...base, subscriptionTier: "professional", subscriptionStatus: "past_due",
      trialTier, trialEndsAt: new Date(Date.now() - 60_000),
    };
    assert.equal(shouldExpireTrial(record), false);
    const id = await fixture(record);
    assert.equal((await getTrialStatus(id)).organizationChanged, undefined);
    assert.equal((await downgradeToFree(id)).success, false);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    assert.equal(org.subscriptionTier, "professional");
  }
});

test("missing organizations and database failures are not reported as no active trial", async () => {
  await assert.rejects(getTrialStatus(randomUUID()), /Organization not found/);
  await assert.rejects(checkTrialEligibility(randomUUID()), /Organization not found/);
  const original = db.select;
  try {
    db.select = (() => { throw new Error("injected database failure"); }) as typeof db.select;
    await assert.rejects(getTrialStatus("unqueried"), /injected database failure/);
    await assert.rejects(checkTrialEligibility("unqueried"), /injected database failure/);
  } finally { db.select = original; }
});
