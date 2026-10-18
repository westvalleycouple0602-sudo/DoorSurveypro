import { db } from "../db";
import { portalShares, type InsertPortalShare, type PortalShare } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

/**
 * Portal Share Service
 * 
 * Handles secure generation and validation of shareable portal links.
 * Security model: Similar to API keys - generate secure token, show once, store only hash.
 */

const TOKEN_LENGTH = 32; // 256 bits of entropy
const BCRYPT_ROUNDS = 10;

interface CreatePortalShareResult {
  share: PortalShare;
  token: string; // Plaintext token - only returned once!
}

/**
 * Generates a cryptographically secure random token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('base64url');
}

/**
 * Generates SHA-256 hash for deterministic O(1) lookups
 */
function generateLookupHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Hashes a token using bcrypt for secure storage
 */
async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, BCRYPT_ROUNDS);
}

/**
 * Verifies a plaintext token against a stored hash
 */
async function verifyToken(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Creates a new portal share with secure token generation
 * @returns The share record and plaintext token (shown only once!)
 */
export async function createPortalShare(
  data: InsertPortalShare & { createdBy: string; password?: string }
): Promise<CreatePortalShareResult> {
  // Generate secure token
  const token = generateSecureToken();
  const tokenLookup = generateLookupHash(token);
  const tokenHash = await hashToken(token);

  // Hash password if provided
  let passwordHash: string | undefined;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  }

  // Create share with hashed token (remove plaintext password)
  const { password: _, ...insertData } = data;
  const [share] = await db.insert(portalShares).values({
    ...insertData,
    shareTokenHash: tokenHash,
    shareTokenLookup: tokenLookup,
    passwordHash,
  }).returning();

  return {
    share,
    token, // Return plaintext token only once
  };
}

/**
 * Validates a portal share token and returns the share if valid
 * @param token - Plaintext token from the URL
 * @param password - Optional password if share is password-protected
 */
export async function validatePortalShare(
  token: string,
  password?: string
): Promise<PortalShare | null> {
  // Generate lookup hash for O(1) database query
  const lookupHash = generateLookupHash(token);

  // Find share by lookup hash (O(1) indexed query)
  const [share] = await db
    .select()
    .from(portalShares)
    .where(
      and(
        eq(portalShares.shareTokenLookup, lookupHash),
        eq(portalShares.isActive, true),
        sql`${portalShares.expiresAt} IS NULL OR ${portalShares.expiresAt} > NOW()`
      )
    )
    .limit(1);

  if (!share) {
    return null; // No matching share found
  }

  // Verify token hash with bcrypt (security layer)
  const isValid = await verifyToken(token, share.shareTokenHash);
  if (!isValid) {
    return null; // Token verification failed
  }

  // Check password if required
  if (share.requiresPassword && share.passwordHash) {
    if (!password) {
      return null; // Password required but not provided
    }
    
    const passwordValid = await bcrypt.compare(password, share.passwordHash);
    if (!passwordValid) {
      return null; // Invalid password
    }
  }

  // Check view limit
  if (share.maxViews && share.viewCount >= share.maxViews) {
    return null; // View limit exceeded
  }

  // Update view count and last accessed timestamp
  await db
    .update(portalShares)
    .set({
      viewCount: sql`${portalShares.viewCount} + 1`,
      lastAccessedAt: new Date(),
    })
    .where(eq(portalShares.id, share.id));

  return share;
}

/**
 * Revokes a portal share by deactivating it
 */
export async function revokePortalShare(shareId: string): Promise<void> {
  await db
    .update(portalShares)
    .set({ isActive: false })
    .where(eq(portalShares.id, shareId));
}

/**
 * Gets all portal shares for a project
 */
export async function getProjectPortalShares(
  projectId: string
): Promise<PortalShare[]> {
  return db
    .select()
    .from(portalShares)
    .where(eq(portalShares.projectId, projectId))
    .orderBy(sql`${portalShares.createdAt} DESC`);
}

/**
 * Gets all portal shares for an organization
 */
export async function getOrganizationPortalShares(
  organizationId: string
): Promise<PortalShare[]> {
  return db
    .select()
    .from(portalShares)
    .where(eq(portalShares.organizationId, organizationId))
    .orderBy(sql`${portalShares.createdAt} DESC`);
}

/**
 * Updates a portal share (cannot update token)
 */
export async function updatePortalShare(
  shareId: string,
  updates: Partial<Omit<InsertPortalShare, 'organizationId' | 'projectId'>> & { password?: string }
): Promise<PortalShare> {
  const updateData: any = { ...updates };
  
  // Hash password if provided
  if (updateData.password) {
    updateData.passwordHash = await bcrypt.hash(updateData.password, BCRYPT_ROUNDS);
    delete updateData.password; // Remove plaintext password
  }

  const [updated] = await db
    .update(portalShares)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(portalShares.id, shareId))
    .returning();

  return updated;
}

/**
 * Deletes a portal share permanently
 */
export async function deletePortalShare(shareId: string): Promise<void> {
  await db
    .delete(portalShares)
    .where(eq(portalShares.id, shareId));
}
