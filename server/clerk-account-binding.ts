import { clerkClient } from "@clerk/express";
import { eq, or, sql } from "drizzle-orm";
import { db } from "./db";
import { users, type User } from "@shared/schema";

export interface ProviderProof {
  id: string;
  externalId: string | null;
  username: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification: { status: string } | null;
  }>;
}

export interface AccountClaims {
  clerkId: string;
  legacyId: string;
  email: string | null;
  username: string | null;
}

const proofCache = new Map<string, { proof: ProviderProof; expires: number }>();
let providerEncoding: Promise<string> | undefined;

function linkedProvidersEncoding(): Promise<string> {
  return providerEncoding ??= db.execute(sql`
    select data_type from information_schema.columns
    where table_schema=current_schema() and table_name='users' and column_name='linked_providers'
  `).then(result => {
    const type = String(result.rows[0]?.data_type);
    if (!["ARRAY", "json", "jsonb"].includes(type)) throw new Error("Unsupported provider binding storage type");
    return type;
  }).catch(error => { providerEncoding = undefined; throw error; });
}

async function loadProof(clerkId: string): Promise<ProviderProof> {
  const cached = proofCache.get(clerkId);
  if (cached && cached.expires > Date.now()) return cached.proof;
  // This is a one-time account-link/verification check, NOT identity display
  // or per-request identity synchronization. Basic identity stays in claims.
  // Use the native ID only for Clerk's API, never as a migrated local PK.
  const result = await clerkClient.users.getUserList({ userId: [clerkId], limit: 1 });
  const proof = result.data[0];
  if (!proof || proof.id !== clerkId) throw new Error("Clerk account verification unavailable");
  if (proofCache.size >= 500) proofCache.delete(proofCache.keys().next().value!);
  proofCache.set(clerkId, { proof, expires: Date.now() + 60_000 });
  return proof;
}

export function verifiedEmailFromProof(proof: ProviderProof, claimedEmail: string | null): string | null {
  const primary = proof.emailAddresses.find(email => email.id === proof.primaryEmailAddressId);
  return claimedEmail && primary?.verification?.status === "verified" &&
    primary.emailAddress.toLowerCase() === claimedEmail.toLowerCase()
    ? claimedEmail : null;
}

export async function verifiedClerkEmail(clerkId: string, claimedEmail: string | null): Promise<string | null> {
  if (!claimedEmail) return null;
  return verifiedEmailFromProof(await loadProof(clerkId), claimedEmail);
}

async function existingBinding(clerkId: string): Promise<User | undefined> {
  const rows = await db.select().from(users)
    .where(sql`jsonb_typeof(to_jsonb(${users.linkedProviders})) = 'array' and
      to_jsonb(${users.linkedProviders}) ? ${`clerk:${clerkId}`}`).limit(2);
  if (rows.length > 1) throw new Error("Ambiguous Clerk account binding");
  return rows[0];
}

// The existing linkedProviders app column stores the durable provider-to-local
// relationship. No identity columns, primary keys, or FK declarations change.
export async function bindClerkAccount(
  claims: AccountClaims,
  proofLoader: (id: string) => Promise<ProviderProof> = loadProof,
): Promise<User> {
  const bound = await existingBinding(claims.clerkId);
  if (bound) return bound;

  const proof = await proofLoader(claims.clerkId);
  if (proof.id !== claims.clerkId || (proof.externalId ?? proof.id) !== claims.legacyId) {
    throw new Error("Managed Clerk userId claim does not match its provider subject");
  }
  // Managed provisioning configures userId/email/username/name session claims
  // (see the migration playbook). Missing claims must fail closed, never create
  // a parallel account just because a standard/unconfigured token was supplied.
  if (proof.primaryEmailAddressId && !claims.email) {
    throw new Error("Managed Clerk email session claim is missing");
  }
  const verifiedEmail = verifiedEmailFromProof(proof, claims.email);
  const verifiedUsername = verifiedEmail && proof.username === claims.username ? claims.username : null;
  const providerLink = `clerk:${claims.clerkId}`;
  // The live legacy database stores this app field as JSONB; the preserved
  // declaration uses text[]. Support either without rewriting live schemas.
  const encoding = await linkedProvidersEncoding();
  const initialLinks = encoding === "ARRAY" ? sql`array[${providerLink}]::text[]`
    : encoding === "json" ? sql`jsonb_build_array(${providerLink}::text)::json`
    : sql`jsonb_build_array(${providerLink}::text)`;
  const appendedLinks = encoding === "ARRAY"
    ? sql`array_append(coalesce(${users.linkedProviders}, '{}'::text[]), ${providerLink})`
    : encoding === "json"
      ? sql`(coalesce(to_jsonb(${users.linkedProviders}), '[]'::jsonb) || jsonb_build_array(${providerLink}::text))::json`
      : sql`coalesce(${users.linkedProviders}, '[]'::jsonb) || jsonb_build_array(${providerLink}::text)`;

  return db.transaction(async tx => {
    // Serializes first bindings for this subject across processes, not just
    // within one server's in-memory JIT promise map.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${providerLink}, 0))`);
    const bindings = await tx.select().from(users)
      .where(sql`jsonb_typeof(to_jsonb(${users.linkedProviders})) = 'array' and
        to_jsonb(${users.linkedProviders}) ? ${providerLink}`).limit(2);
    if (bindings.length > 1) throw new Error("Ambiguous Clerk account binding");
    if (bindings[0]) return bindings[0];

    let [user] = await tx.select().from(users).where(eq(users.id, claims.legacyId)).for("update");
    if (!user && verifiedEmail) {
      const candidates = await tx.select().from(users).where(or(
        sql`lower(${users.email}) = lower(${verifiedEmail})`,
        verifiedUsername
          ? sql`lower(${users.replitUsername}) = lower(${verifiedUsername}) and
              (${users.email} is null or lower(${users.email}) = lower(${verifiedEmail}))`
          : sql`false`,
      )).limit(2).for("update");
      if (candidates.length > 1) throw new Error("Ambiguous legacy account match");
      user = candidates[0];
    }
    if (!user) {
      if (claims.legacyId !== claims.clerkId && !verifiedEmail) {
        throw new Error("Legacy account linking requires a verified email");
      }
      [user] = await tx.insert(users).values({
        id: claims.legacyId, authProvider: "clerk", linkedProviders: initialLinks,
      }).onConflictDoNothing().returning();
      if (!user) [user] = await tx.select().from(users).where(eq(users.id, claims.legacyId)).for("update");
    }
    if (!user) throw new Error("Unable to provision local account");
    if (user.linkedProviders !== null && !Array.isArray(user.linkedProviders)) {
      throw new Error("Invalid provider binding data");
    }
    // A reassigned email/username (or altered externalId) must not transfer an
    // account already owned by a different Clerk subject.
    if (user.linkedProviders?.some(link => link.startsWith("clerk:") && link !== providerLink)) {
      throw new Error("Local account already has a different Clerk binding");
    }
    if (user.linkedProviders?.includes(providerLink)) return user;
    const [linked] = await tx.update(users).set({
      linkedProviders: appendedLinks,
    }).where(eq(users.id, user.id)).returning();
    return linked;
  });
}
