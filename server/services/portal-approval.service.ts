import { db } from "../db";
import { portalShares, type PortalShare } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Portal Approval Service
 * 
 * Handles quote approval workflows for client portal shares.
 * Supports: approve, request changes, reject
 */

export type ApprovalStatus = 'pending' | 'approved' | 'changes_requested' | 'rejected';

interface ApprovalUpdate {
  status: ApprovalStatus;
  feedback?: string;
}

/**
 * Approves a quote via portal share
 * Uses optimistic locking - only updates if status is 'pending'
 * Throws if share not found or already decided (race condition protection)
 */
export async function approveQuote(
  shareId: string,
  feedback?: string
): Promise<PortalShare> {
  const [updated] = await db
    .update(portalShares)
    .set({
      approvalStatus: 'approved',
      approvalFeedback: feedback || null,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(portalShares.id, shareId),
        // CRITICAL: Optimistic locking - only update if still pending
        sql`(${portalShares.approvalStatus} = 'pending' OR ${portalShares.approvalStatus} IS NULL)`
      )
    )
    .returning();

  if (!updated) {
    throw new Error("APPROVAL_CONFLICT");
  }

  return updated;
}

/**
 * Requests changes to a quote via portal share
 * Uses optimistic locking - only updates if status is 'pending'
 * Throws if share not found or already decided (race condition protection)
 */
export async function requestChanges(
  shareId: string,
  feedback: string
): Promise<PortalShare> {
  const [updated] = await db
    .update(portalShares)
    .set({
      approvalStatus: 'changes_requested',
      approvalFeedback: feedback,
      approvedAt: null, // Clear previous approval
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(portalShares.id, shareId),
        // CRITICAL: Optimistic locking - only update if still pending
        sql`(${portalShares.approvalStatus} = 'pending' OR ${portalShares.approvalStatus} IS NULL)`
      )
    )
    .returning();

  if (!updated) {
    throw new Error("APPROVAL_CONFLICT");
  }

  return updated;
}

/**
 * Rejects a quote via portal share
 * Uses optimistic locking - only updates if status is 'pending'
 * Throws if share not found or already decided (race condition protection)
 */
export async function rejectQuote(
  shareId: string,
  feedback?: string
): Promise<PortalShare> {
  const [updated] = await db
    .update(portalShares)
    .set({
      approvalStatus: 'rejected',
      approvalFeedback: feedback || null,
      approvedAt: null, // Clear previous approval
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(portalShares.id, shareId),
        // CRITICAL: Optimistic locking - only update if still pending
        sql`(${portalShares.approvalStatus} = 'pending' OR ${portalShares.approvalStatus} IS NULL)`
      )
    )
    .returning();

  if (!updated) {
    throw new Error("APPROVAL_CONFLICT");
  }

  return updated;
}

/**
 * Resets approval status back to pending
 * Throws if share not found
 */
export async function resetApproval(
  shareId: string
): Promise<PortalShare> {
  const [updated] = await db
    .update(portalShares)
    .set({
      approvalStatus: 'pending',
      approvalFeedback: null,
      approvedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(portalShares.id, shareId))
    .returning();

  if (!updated) {
    throw new Error("Portal share not found");
  }

  return updated;
}

/**
 * Gets approval history for a project (all portal shares with their approval status)
 */
export async function getProjectApprovalHistory(
  projectId: string
): Promise<PortalShare[]> {
  return db
    .select()
    .from(portalShares)
    .where(eq(portalShares.projectId, projectId))
    .orderBy(portalShares.updatedAt);
}

/**
 * Checks if a portal share has approve permission
 */
export function canApprove(share: PortalShare): boolean {
  return share.accessLevel === 'approve' && share.isActive;
}

/**
 * Validates approval action is allowed
 * Enforces state machine: only 'pending' status can be changed by portal users
 */
export async function validateApprovalAction(
  shareId: string
): Promise<{ valid: boolean; error?: string; share?: PortalShare }> {
  const [share] = await db
    .select()
    .from(portalShares)
    .where(eq(portalShares.id, shareId))
    .limit(1);

  if (!share) {
    return { valid: false, error: "Portal share not found" };
  }

  if (!share.isActive) {
    return { valid: false, error: "Portal share is no longer active" };
  }

  if (share.accessLevel !== 'approve') {
    return { valid: false, error: "This portal link does not have approval permissions" };
  }

  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return { valid: false, error: "Portal link has expired" };
  }

  // CRITICAL: Enforce state machine - only 'pending' can be changed
  if (share.approvalStatus !== 'pending' && share.approvalStatus !== null) {
    return { 
      valid: false, 
      error: `This quote has already been ${share.approvalStatus}. Please contact your vendor to reset the approval if needed.` 
    };
  }

  return { valid: true, share };
}
