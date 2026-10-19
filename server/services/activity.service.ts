import { db } from "../db";
import {
  projectActivities,
  users,
  type ProjectActivity,
  type InsertProjectActivity,
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { logger } from "../logger";

/**
 * Activity Service
 * Tracks all project changes and interactions for audit trail and real-time updates
 */

export interface CreateActivityParams {
  organizationId: string;
  projectId: string;
  activityType: string; // project_created, comment_added, approval_submitted, quote_exported, etc.
  activitySubtype?: string;
  actorId?: string; // User ID (null for system actions)
  actorType: "team" | "client" | "system";
  actorName?: string; // Display name
  description: string; // Human-readable description
  metadata?: Record<string, any>; // Additional structured data
  relatedEntityType?: string; // comment, quote, opening, etc.
  relatedEntityId?: string;
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;
}

export interface ActivityWithActor extends ProjectActivity {
  actor: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
}

/**
 * Log a new project activity
 */
export async function logActivity(params: CreateActivityParams): Promise<ProjectActivity> {
  try {
    const [activity] = await db
      .insert(projectActivities)
      .values({
        organizationId: params.organizationId,
        projectId: params.projectId,
        activityType: params.activityType,
        activitySubtype: params.activitySubtype,
        actorId: params.actorId,
        actorType: params.actorType,
        actorName: params.actorName,
        description: params.description,
        metadata: params.metadata || {},
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        changesBefore: params.changesBefore,
        changesAfter: params.changesAfter,
      })
      .returning();

    logger.info("Activity logged", { 
      activityType: params.activityType,
      projectId: params.projectId,
      actorType: params.actorType,
    });

    return activity;
  } catch (error) {
    logger.error("Failed to log activity", { error, params });
    throw new Error("Failed to log activity");
  }
}

/**
 * Get activities for a project with pagination
 * CRITICAL: Requires organizationId for cross-tenant protection
 */
export async function getProjectActivities(
  projectId: string,
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    activityTypes?: string[]; // Filter by specific activity types
  } = {}
): Promise<{ activities: ActivityWithActor[]; total: number }> {
  const { limit = 50, offset = 0, activityTypes } = options;

  // Build where clause with organization scoping
  const whereConditions = [
    eq(projectActivities.projectId, projectId),
    eq(projectActivities.organizationId, organizationId), // CRITICAL: Cross-tenant protection
  ];
  if (activityTypes && activityTypes.length > 0) {
    whereConditions.push(inArray(projectActivities.activityType, activityTypes));
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectActivities)
    .where(and(...whereConditions));

  // Fetch activities with actor info (ordered by newest first)
  const activities = await db
    .select({
      id: projectActivities.id,
      organizationId: projectActivities.organizationId,
      projectId: projectActivities.projectId,
      activityType: projectActivities.activityType,
      activitySubtype: projectActivities.activitySubtype,
      actorId: projectActivities.actorId,
      actorType: projectActivities.actorType,
      actorName: projectActivities.actorName,
      description: projectActivities.description,
      metadata: projectActivities.metadata,
      relatedEntityType: projectActivities.relatedEntityType,
      relatedEntityId: projectActivities.relatedEntityId,
      changesBefore: projectActivities.changesBefore,
      changesAfter: projectActivities.changesAfter,
      createdAt: projectActivities.createdAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userProfileImageUrl: users.profileImageUrl,
    })
    .from(projectActivities)
    .leftJoin(users, eq(projectActivities.actorId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(projectActivities.createdAt))
    .limit(limit)
    .offset(offset);

  const activitiesWithActors: ActivityWithActor[] = activities.map((activity) => ({
    id: activity.id,
    organizationId: activity.organizationId,
    projectId: activity.projectId,
    activityType: activity.activityType,
    activitySubtype: activity.activitySubtype,
    actorId: activity.actorId,
    actorType: activity.actorType,
    actorName: activity.actorName,
    description: activity.description,
    metadata: activity.metadata,
    relatedEntityType: activity.relatedEntityType,
    relatedEntityId: activity.relatedEntityId,
    changesBefore: activity.changesBefore,
    changesAfter: activity.changesAfter,
    createdAt: activity.createdAt,
    actor: activity.actorId
      ? {
          id: activity.actorId,
          email: activity.userEmail,
          firstName: activity.userFirstName,
          lastName: activity.userLastName,
          profileImageUrl: activity.userProfileImageUrl,
        }
      : null,
  }));

  return {
    activities: activitiesWithActors,
    total: count,
  };
}

/**
 * Get recent activities across all projects in an organization
 */
export async function getOrganizationActivities(
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    activityTypes?: string[];
  } = {}
): Promise<{ activities: ActivityWithActor[]; total: number }> {
  const { limit = 50, offset = 0, activityTypes } = options;

  // Build where clause
  const whereConditions = [eq(projectActivities.organizationId, organizationId)];
  if (activityTypes && activityTypes.length > 0) {
    whereConditions.push(inArray(projectActivities.activityType, activityTypes));
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectActivities)
    .where(and(...whereConditions));

  // Fetch activities with actor info
  const activities = await db
    .select({
      id: projectActivities.id,
      organizationId: projectActivities.organizationId,
      projectId: projectActivities.projectId,
      activityType: projectActivities.activityType,
      activitySubtype: projectActivities.activitySubtype,
      actorId: projectActivities.actorId,
      actorType: projectActivities.actorType,
      actorName: projectActivities.actorName,
      description: projectActivities.description,
      metadata: projectActivities.metadata,
      relatedEntityType: projectActivities.relatedEntityType,
      relatedEntityId: projectActivities.relatedEntityId,
      changesBefore: projectActivities.changesBefore,
      changesAfter: projectActivities.changesAfter,
      createdAt: projectActivities.createdAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userProfileImageUrl: users.profileImageUrl,
    })
    .from(projectActivities)
    .leftJoin(users, eq(projectActivities.actorId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(projectActivities.createdAt))
    .limit(limit)
    .offset(offset);

  const activitiesWithActors: ActivityWithActor[] = activities.map((activity) => ({
    id: activity.id,
    organizationId: activity.organizationId,
    projectId: activity.projectId,
    activityType: activity.activityType,
    activitySubtype: activity.activitySubtype,
    actorId: activity.actorId,
    actorType: activity.actorType,
    actorName: activity.actorName,
    description: activity.description,
    metadata: activity.metadata,
    relatedEntityType: activity.relatedEntityType,
    relatedEntityId: activity.relatedEntityId,
    changesBefore: activity.changesBefore,
    changesAfter: activity.changesAfter,
    createdAt: activity.createdAt,
    actor: activity.actorId
      ? {
          id: activity.actorId,
          email: activity.userEmail,
          firstName: activity.userFirstName,
          lastName: activity.userLastName,
          profileImageUrl: activity.userProfileImageUrl,
        }
      : null,
  }));

  return {
    activities: activitiesWithActors,
    total: count,
  };
}

// ============================================================================
// Activity Type Helpers - Convenience functions for common activity types
// ============================================================================

export async function logCommentAdded(params: {
  organizationId: string;
  projectId: string;
  commentId: string;
  actorId?: string;
  actorType: "team" | "client";
  actorName?: string;
  commentPreview: string; // First 100 chars of comment
}): Promise<ProjectActivity> {
  return logActivity({
    organizationId: params.organizationId,
    projectId: params.projectId,
    activityType: "comment_added",
    actorId: params.actorId,
    actorType: params.actorType,
    actorName: params.actorName,
    description: `${params.actorType === 'team' ? 'Team member' : 'Client'} added a comment`,
    relatedEntityType: "comment",
    relatedEntityId: params.commentId,
    metadata: {
      commentPreview: params.commentPreview,
    },
  });
}

export async function logApprovalSubmitted(params: {
  organizationId: string;
  projectId: string;
  shareId: string;
  approvalStatus: string;
  clientName?: string;
  feedback?: string;
}): Promise<ProjectActivity> {
  const statusDescriptions: Record<string, string> = {
    approved: "approved the quote",
    changes_requested: "requested changes to the quote",
    rejected: "rejected the quote",
  };

  return logActivity({
    organizationId: params.organizationId,
    projectId: params.projectId,
    activityType: "approval_submitted",
    activitySubtype: params.approvalStatus,
    actorType: "client",
    actorName: params.clientName,
    description: `Client ${statusDescriptions[params.approvalStatus] || "updated approval status"}`,
    relatedEntityType: "portal_share",
    relatedEntityId: params.shareId,
    metadata: {
      approvalStatus: params.approvalStatus,
      feedback: params.feedback,
    },
  });
}

export async function logPortalShareCreated(params: {
  organizationId: string;
  projectId: string;
  shareId: string;
  createdBy: string;
  clientEmail?: string;
  accessLevel: string;
}): Promise<ProjectActivity> {
  return logActivity({
    organizationId: params.organizationId,
    projectId: params.projectId,
    activityType: "portal_share_created",
    actorId: params.createdBy,
    actorType: "team",
    description: `Created portal share link${params.clientEmail ? ` for ${params.clientEmail}` : ''}`,
    relatedEntityType: "portal_share",
    relatedEntityId: params.shareId,
    metadata: {
      accessLevel: params.accessLevel,
      clientEmail: params.clientEmail,
    },
  });
}

export async function logQuoteExported(params: {
  organizationId: string;
  projectId: string;
  exportedBy: string;
  exportFormat: string;
  exportType: string;
}): Promise<ProjectActivity> {
  return logActivity({
    organizationId: params.organizationId,
    projectId: params.projectId,
    activityType: "quote_exported",
    actorId: params.exportedBy,
    actorType: "team",
    description: `Exported ${params.exportType} quote as ${params.exportFormat}`,
    metadata: {
      exportFormat: params.exportFormat,
      exportType: params.exportType,
    },
  });
}

export async function logProjectStatusChanged(params: {
  organizationId: string;
  projectId: string;
  changedBy: string;
  oldStatus: string;
  newStatus: string;
}): Promise<ProjectActivity> {
  return logActivity({
    organizationId: params.organizationId,
    projectId: params.projectId,
    activityType: "project_status_changed",
    actorId: params.changedBy,
    actorType: "team",
    description: `Changed project status from "${params.oldStatus}" to "${params.newStatus}"`,
    changesBefore: { status: params.oldStatus },
    changesAfter: { status: params.newStatus },
  });
}
