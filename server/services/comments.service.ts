import { db } from "../db";
import {
  projectComments,
  commentMentions,
  users,
  memberships,
  type ProjectComment,
  type CommentMention,
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { logger } from "../logger";

/**
 * Comments Service
 * Handles project comments, mentions (@username), and comment threads
 */

export interface CreateCommentParams {
  organizationId: string;
  projectId: string;
  authorId?: string; // User ID (for team members)
  authorType: "team" | "client";
  authorName?: string; // Display name (for clients)
  authorEmail?: string; // Email (for clients)
  content: string;
  portalShareId?: string; // If comment is from client via portal
  parentCommentId?: string; // For nested replies
}

export interface UpdateCommentParams {
  commentId: string;
  authorId: string;
  content: string;
  organizationId: string;
}

export interface CommentWithAuthor extends ProjectComment {
  author: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  } | null;
  mentions: Array<{
    userId: string;
    username: string;
  }>;
  replyCount?: number;
}

/**
 * Extract @username mentions from comment text
 * Supports @email format (e.g., @john@example.com)
 */
export function extractMentions(text: string): string[] {
  // Match @email.com or @username patterns
  const mentionRegex = /@([\w.+-]+@[\w.-]+\.\w+|[\w]+)/g;
  const mentions = new Set<string>();
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.add(match[1]); // Extract username/email without @
  }

  return Array.from(mentions);
}

/**
 * Resolve usernames to user IDs
 * Returns map of username/email -> userId
 * CRITICAL: Scoped to organization to prevent cross-tenant mention exploitation
 */
async function resolveUsernames(
  usernames: string[],
  organizationId: string
): Promise<Map<string, string>> {
  if (usernames.length === 0) return new Map();

  // Query users by email (we use email as username in this system)
  const lowercaseUsernames = usernames.map(u => u.toLowerCase());
  
  // CRITICAL: Filter by organizationId to prevent cross-tenant mentions
  const foundUsers = await db
    .select({
      id: users.id,
      email: users.email,
    })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .where(
      and(
        inArray(
          sql`LOWER(${users.email})`,
          lowercaseUsernames
        ),
        eq(memberships.organizationId, organizationId) // Cross-tenant protection
      )
    );

  const usernameMap = new Map<string, string>();
  for (const user of foundUsers) {
    if (user.email) {
      usernameMap.set(user.email.toLowerCase(), user.id);
    }
  }

  return usernameMap;
}

/**
 * Create a new comment with automatic mention detection
 */
export async function createComment(
  params: CreateCommentParams
): Promise<CommentWithAuthor> {
  try {
    // Extract mentions from content
    const mentionedUsernames = extractMentions(params.content);

    // Calculate thread depth if this is a reply
    let threadDepth = 0;
    if (params.parentCommentId) {
      const [parentComment] = await db
        .select({ threadDepth: projectComments.threadDepth })
        .from(projectComments)
        .where(eq(projectComments.id, params.parentCommentId))
        .limit(1);
      
      if (parentComment) {
        threadDepth = parentComment.threadDepth + 1;
      }
    }

    // Create comment
    const [comment] = await db
      .insert(projectComments)
      .values({
        organizationId: params.organizationId,
        projectId: params.projectId,
        authorId: params.authorId,
        authorType: params.authorType,
        authorName: params.authorName,
        authorEmail: params.authorEmail,
        content: params.content,
        portalShareId: params.portalShareId,
        parentCommentId: params.parentCommentId,
        threadDepth,
      })
      .returning();

    // Resolve usernames to user IDs and create mention records
    if (mentionedUsernames.length > 0) {
      const usernameMap = await resolveUsernames(mentionedUsernames, params.organizationId);

      const mentionRecords = Array.from(usernameMap.entries()).map(([username, userId]) => ({
        organizationId: params.organizationId, // CRITICAL: Store organization for tenant isolation
        commentId: comment.id,
        mentionedUserId: userId,
      }));

      if (mentionRecords.length > 0) {
        await db.insert(commentMentions).values(mentionRecords);
      }
    }

    // Fetch complete comment with author and mentions
    return await getCommentById(comment.id, params.organizationId);
  } catch (error) {
    logger.error("Failed to create comment", { error, params });
    throw new Error("Failed to create comment");
  }
}

/**
 * Get a comment by ID with author info and mentions
 * CRITICAL: Requires organizationId for cross-tenant protection
 */
export async function getCommentById(
  commentId: string,
  organizationId?: string
): Promise<CommentWithAuthor> {
  const whereConditions = [eq(projectComments.id, commentId)];
  if (organizationId) {
    whereConditions.push(eq(projectComments.organizationId, organizationId));
  }

  const [comment] = await db
    .select({
      id: projectComments.id,
      organizationId: projectComments.organizationId,
      projectId: projectComments.projectId,
      content: projectComments.content,
      contentHtml: projectComments.contentHtml,
      authorId: projectComments.authorId,
      authorType: projectComments.authorType,
      authorName: projectComments.authorName,
      authorEmail: projectComments.authorEmail,
      portalShareId: projectComments.portalShareId,
      parentCommentId: projectComments.parentCommentId,
      threadDepth: projectComments.threadDepth,
      isEdited: projectComments.isEdited,
      editedAt: projectComments.editedAt,
      isDeleted: projectComments.isDeleted,
      deletedAt: projectComments.deletedAt,
      attachments: projectComments.attachments,
      createdAt: projectComments.createdAt,
      updatedAt: projectComments.updatedAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userProfileImageUrl: users.profileImageUrl,
    })
    .from(projectComments)
    .leftJoin(users, eq(projectComments.authorId, users.id))
    .where(and(...whereConditions))
    .limit(1);

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Fetch mentions
  const mentions = await db
    .select({
      userId: commentMentions.mentionedUserId,
      username: users.email,
    })
    .from(commentMentions)
    .innerJoin(users, eq(commentMentions.mentionedUserId, users.id))
    .where(eq(commentMentions.commentId, commentId));

  return {
    ...comment,
    author: comment.authorId
      ? {
          id: comment.authorId,
          email: comment.userEmail,
          firstName: comment.userFirstName,
          lastName: comment.userLastName,
          profileImageUrl: comment.userProfileImageUrl,
        }
      : null,
    mentions: mentions.map((m) => ({
      userId: m.userId,
      username: m.username || "",
    })),
  };
}

/**
 * Get all comments for a project with pagination
 * CRITICAL: Requires organizationId for cross-tenant protection
 */
export async function getProjectComments(
  projectId: string,
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    includeDeleted?: boolean;
  } = {}
): Promise<{ comments: CommentWithAuthor[]; total: number }> {
  const { limit = 50, offset = 0, includeDeleted = false } = options;

  // Build where clause with organization scoping
  const whereConditions = [
    eq(projectComments.projectId, projectId),
    eq(projectComments.organizationId, organizationId), // CRITICAL: Cross-tenant protection
  ];
  if (!includeDeleted) {
    whereConditions.push(eq(projectComments.isDeleted, false));
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectComments)
    .where(and(...whereConditions));

  // Fetch comments with author info (ordered by newest first)
  const comments = await db
    .select({
      id: projectComments.id,
      organizationId: projectComments.organizationId,
      projectId: projectComments.projectId,
      content: projectComments.content,
      contentHtml: projectComments.contentHtml,
      authorId: projectComments.authorId,
      authorType: projectComments.authorType,
      authorName: projectComments.authorName,
      authorEmail: projectComments.authorEmail,
      portalShareId: projectComments.portalShareId,
      parentCommentId: projectComments.parentCommentId,
      threadDepth: projectComments.threadDepth,
      isEdited: projectComments.isEdited,
      editedAt: projectComments.editedAt,
      isDeleted: projectComments.isDeleted,
      deletedAt: projectComments.deletedAt,
      attachments: projectComments.attachments,
      createdAt: projectComments.createdAt,
      updatedAt: projectComments.updatedAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userProfileImageUrl: users.profileImageUrl,
    })
    .from(projectComments)
    .leftJoin(users, eq(projectComments.authorId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(projectComments.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch mentions for all comments in batch
  const commentIds = comments.map((c) => c.id);
  const allMentions = commentIds.length > 0
    ? await db
        .select({
          commentId: commentMentions.commentId,
          userId: commentMentions.mentionedUserId,
          username: users.email,
        })
        .from(commentMentions)
        .innerJoin(users, eq(commentMentions.mentionedUserId, users.id))
        .where(inArray(commentMentions.commentId, commentIds))
    : [];

  // Group mentions by comment ID
  const mentionsByComment = new Map<string, Array<{ userId: string; username: string }>>();
  for (const mention of allMentions) {
    if (!mentionsByComment.has(mention.commentId)) {
      mentionsByComment.set(mention.commentId, []);
    }
    mentionsByComment.get(mention.commentId)!.push({
      userId: mention.userId,
      username: mention.username || "",
    });
  }

  // Combine comments with their mentions
  const commentsWithMentions: CommentWithAuthor[] = comments.map((comment) => ({
    ...comment,
    author: comment.authorId
      ? {
          id: comment.authorId,
          email: comment.userEmail,
          firstName: comment.userFirstName,
          lastName: comment.userLastName,
          profileImageUrl: comment.userProfileImageUrl,
        }
      : null,
    mentions: mentionsByComment.get(comment.id) || [],
  }));

  return {
    comments: commentsWithMentions,
    total: count,
  };
}

/**
 * Update a comment (marks as edited)
 * CRITICAL: Requires organizationId for cross-tenant protection
 */
export async function updateComment(params: UpdateCommentParams): Promise<CommentWithAuthor> {
  try {
    // Extract new mentions
    const mentionedUsernames = extractMentions(params.content);

    // Update comment with organization scoping
    const [updated] = await db
      .update(projectComments)
      .set({
        content: params.content,
        isEdited: true,
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectComments.id, params.commentId),
          eq(projectComments.authorId, params.authorId), // Only author can edit
          eq(projectComments.organizationId, params.organizationId) // CRITICAL: Cross-tenant protection
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Comment not found or unauthorized");
    }

    // Delete old mentions
    await db
      .delete(commentMentions)
      .where(eq(commentMentions.commentId, params.commentId));

    // Create new mention records
    if (mentionedUsernames.length > 0) {
      const usernameMap = await resolveUsernames(mentionedUsernames, params.organizationId);

      const mentionRecords = Array.from(usernameMap.entries()).map(([username, userId]) => ({
        organizationId: params.organizationId, // CRITICAL: Store organization for tenant isolation
        commentId: updated.id,
        mentionedUserId: userId,
      }));

      if (mentionRecords.length > 0) {
        await db.insert(commentMentions).values(mentionRecords);
      }
    }

    return await getCommentById(updated.id, params.organizationId);
  } catch (error) {
    logger.error("Failed to update comment", { error, params });
    throw error;
  }
}

/**
 * Soft delete a comment
 * CRITICAL: Requires organizationId for cross-tenant protection
 */
export async function deleteComment(
  commentId: string,
  authorId: string,
  organizationId: string
): Promise<void> {
  const [deleted] = await db
    .update(projectComments)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectComments.id, commentId),
        eq(projectComments.authorId, authorId), // Only author can delete
        eq(projectComments.organizationId, organizationId) // Cross-tenant protection
      )
    )
    .returning();

  if (!deleted) {
    throw new Error("Comment not found or unauthorized");
  }
}

/**
 * Get all comments where a user was mentioned
 * CRITICAL: Directly filters by commentMentions.organizationId for tenant isolation
 */
export async function getUserMentions(
  userId: string,
  organizationId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<{ comments: CommentWithAuthor[]; total: number }> {
  const { limit = 50, offset = 0, unreadOnly = false } = options;

  // CRITICAL: Filter mentions directly by organizationId for cross-tenant protection
  const whereConditions = [
    eq(commentMentions.mentionedUserId, userId),
    eq(commentMentions.organizationId, organizationId), // CRITICAL: Direct organization filter on mentions table
  ];
  if (unreadOnly) {
    whereConditions.push(eq(commentMentions.isRead, false));
  }

  // Get comment IDs where user was mentioned (scoped by organization)
  const mentionedComments = await db
    .select({
      commentId: commentMentions.commentId,
      createdAt: commentMentions.createdAt,
    })
    .from(commentMentions)
    .where(and(...whereConditions))
    .orderBy(desc(commentMentions.createdAt))
    .limit(limit)
    .offset(offset);

  const commentIds = mentionedComments.map((m) => m.commentId);

  if (commentIds.length === 0) {
    return { comments: [], total: 0 };
  }

  // Fetch full comment details
  const comments = await db
    .select({
      id: projectComments.id,
      organizationId: projectComments.organizationId,
      projectId: projectComments.projectId,
      content: projectComments.content,
      contentHtml: projectComments.contentHtml,
      authorId: projectComments.authorId,
      authorType: projectComments.authorType,
      authorName: projectComments.authorName,
      authorEmail: projectComments.authorEmail,
      portalShareId: projectComments.portalShareId,
      parentCommentId: projectComments.parentCommentId,
      threadDepth: projectComments.threadDepth,
      isEdited: projectComments.isEdited,
      editedAt: projectComments.editedAt,
      isDeleted: projectComments.isDeleted,
      deletedAt: projectComments.deletedAt,
      attachments: projectComments.attachments,
      createdAt: projectComments.createdAt,
      updatedAt: projectComments.updatedAt,
      userEmail: users.email,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userProfileImageUrl: users.profileImageUrl,
    })
    .from(projectComments)
    .leftJoin(users, eq(projectComments.authorId, users.id))
    .where(inArray(projectComments.id, commentIds));

  // Get total count (with direct organization scoping)
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commentMentions)
    .where(and(...whereConditions));

  const commentsWithMentions: CommentWithAuthor[] = comments.map((comment) => ({
    ...comment,
    author: comment.authorId
      ? {
          id: comment.authorId,
          email: comment.userEmail,
          firstName: comment.userFirstName,
          lastName: comment.userLastName,
          profileImageUrl: comment.userProfileImageUrl,
        }
      : null,
    mentions: [], // Can populate if needed
  }));

  return {
    comments: commentsWithMentions,
    total: count,
  };
}

/**
 * Mark a mention as read
 * CRITICAL: Directly filters by commentMentions.organizationId for tenant isolation
 */
export async function markMentionAsRead(
  commentId: string,
  userId: string,
  organizationId: string
): Promise<void> {
  // CRITICAL: Update only mentions matching all three: commentId, userId, AND organizationId
  // This ensures complete cross-tenant protection
  await db
    .update(commentMentions)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(commentMentions.commentId, commentId),
        eq(commentMentions.mentionedUserId, userId),
        eq(commentMentions.organizationId, organizationId) // CRITICAL: Direct organization filter
      )
    );
}
