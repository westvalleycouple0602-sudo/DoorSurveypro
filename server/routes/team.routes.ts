import { Router } from "express";
import type { RouteDependencies } from "./deps";
import { requireRole, requireAnyRole } from "../middleware/requireRole";
import { checkUserLimit } from "../feature-gates";
import { db } from "../db";
import { users, memberships, organizations, MEMBERSHIP_ROLES, hrEmployeeInvites } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@shared/subscriptions";
import { z } from "zod";
import { DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS, type FeaturePermission, type MembershipRole } from "@shared/permissions";
import { storage } from "../storage";
import { emailService } from "../email-service";
import crypto from "crypto";

const router = Router();

const VALID_ROLES = Object.values(MEMBERSHIP_ROLES);

export function registerTeamRoutes(app: Router, deps: RouteDependencies) {
  // POST /invite — Invite a team member
  // Creates an hrEmployeeInvite record and sends a setup email with a 7-day token
  // Requires manager+ role and enforces team member limits via middleware
  const inviteSchema = z.object({
    email: z.string().email("Valid email address is required"),
    role: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  });
  
  router.post("/invite", requireRole("manager"), checkUserLimit, async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Validate request body
      const validation = inviteSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }
      
      const { email, role = "viewer", firstName = "", lastName = "" } = validation.data;
      const normalizedEmail = email.toLowerCase();

      // Check if user with this email already exists in the org
      const [existingMember] = await db
        .select()
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(
          and(
            eq(memberships.organizationId, user.organizationId),
            eq(users.email, normalizedEmail)
          )
        );

      if (existingMember) {
        return res.status(409).json({ error: "A user with this email is already a member of your organization" });
      }

      // Check if there's already a pending invite for this email+org
      const [existingInvite] = await db
        .select()
        .from(hrEmployeeInvites)
        .where(
          and(
            eq(hrEmployeeInvites.organizationId, user.organizationId),
            eq(hrEmployeeInvites.email, normalizedEmail),
            or(
              eq(hrEmployeeInvites.status, "pending"),
              eq(hrEmployeeInvites.status, "invited"),
              eq(hrEmployeeInvites.status, "link_clicked"),
              eq(hrEmployeeInvites.status, "setup_started")
            )
          )
        );

      if (existingInvite) {
        return res.status(409).json({ error: "An invitation has already been sent to this email address" });
      }

      // Get inviter details for the email
      const [inviter] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id));

      const inviterName = inviter
        ? `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || inviter.email || "A team manager"
        : "A team manager";

      // Get org name for the email
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      const orgName = organization?.name || "Your Organization";

      // Generate setup token
      const setupToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invite record
      const [invite] = await db
        .insert(hrEmployeeInvites)
        .values({
          organizationId: user.organizationId,
          invitedByUserId: user.id,
          email: normalizedEmail,
          firstName: firstName || normalizedEmail.split("@")[0],
          lastName: lastName || "",
          primaryRole: role,
          setupToken,
          expiresAt,
          status: "invited",
        })
        .returning();

      // Build setup link
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";

      const setupLink = `${baseUrl}/setup-account?token=${setupToken}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>You've been invited to join ${orgName} on DoorSurvey Pro</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; margin: 0;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Welcome to DoorSurvey Pro</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${orgName}</p>
            </div>
            
            <div style="padding: 32px 24px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Hi${firstName ? ` ${firstName}` : ""},</p>
              
              <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ${inviterName} has invited you to join ${orgName} on DoorSurvey Pro. 
                Click the button below to set up your password and access your account.
              </p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${setupLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 16px;">
                  Set Up Your Account
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            
            <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                DoorSurvey Pro - Commercial Door Survey &amp; Estimation Platform
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail({
        to: normalizedEmail,
        subject: `You've been invited to join ${orgName} on DoorSurvey Pro`,
        html,
      });

      // Update invite status and email tracking
      await db
        .update(hrEmployeeInvites)
        .set({
          lastEmailSentAt: new Date(),
          emailSendCount: 1,
        })
        .where(eq(hrEmployeeInvites.id, invite.id));

      deps.logAuditEvent(
        user.id,
        user.organizationId,
        "team.member.invited",
        "team-member",
        invite.id,
        {
          invitedEmail: normalizedEmail,
          invitedBy: user.id,
          role,
        }
      );
      
      res.json({
        success: true,
        message: `Invitation sent to ${normalizedEmail}`,
        email: normalizedEmail,
      });
    } catch (error: any) {
      deps.logError(error, {
        context: 'invite-team-member',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  // GET team member usage stats for organization
  router.get("/usage", requireRole("manager"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }
      
      // Count current team members (memberships)
      const teamMemberships = await db
        .select()
        .from(memberships)
        .where(eq(memberships.organizationId, user.organizationId));
      
      const currentCount = teamMemberships.length;
      
      // Get organization details to retrieve subscription tier
      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));
      
      const tier = (organization?.subscriptionTier as SubscriptionTier) || "free";
      // Get the tier limit - null means unlimited, so only use fallback if tier doesn't exist
      const tierConfig = SUBSCRIPTION_TIERS[tier];
      const limit = tierConfig ? tierConfig.features.userLimit : 1;
      
      res.json({
        current: currentCount,
        limit: limit,
        isUnlimited: limit === null,
        percentUsed: limit === null ? 0 : Math.round((currentCount / limit) * 100),
        remaining: limit === null ? null : Math.max(0, limit - currentCount),
      });
    } catch (error: any) {
      deps.logError(error, {
        context: 'get-team-usage',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to fetch team usage" });
    }
  });

  // Search team members for mentions (accessible to all authenticated users)
  router.get("/members/search", async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(400).json({ error: "User is not associated with an organization" });
      }

      const query = (req.query.q as string || "").toLowerCase();

      // Get all team members in the organization
      const teamMemberships = await db
        .select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(eq(memberships.organizationId, user.organizationId))
        .orderBy(users.firstName, users.lastName);

      // Filter by query if provided
      const filteredMembers = query
        ? teamMemberships.filter(m => {
            const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase();
            const email = (m.email || "").toLowerCase();
            return fullName.includes(query) || email.includes(query);
          })
        : teamMemberships;

      // Return simplified user list
      const searchResults = filteredMembers.map(m => ({
        id: m.userId,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        profileImageUrl: m.profileImageUrl,
        displayName: m.firstName && m.lastName 
          ? `${m.firstName} ${m.lastName}`
          : m.firstName || m.lastName || m.email || "Unknown User",
      }));

      res.json({ users: searchResults });
    } catch (error: any) {
      deps.logError(error, {
        context: 'search-team-members',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to search team members" });
    }
  });

  // Get all team members in the user's organization
  // Managers and above can view team members
  router.get("/members", requireRole("manager"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(400).json({ error: "User is not associated with an organization" });
      }

      // Get all memberships for this organization with user details
      const teamMemberships = await db
        .select({
          id: memberships.id,
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: memberships.role,
          roles: memberships.roles,
          createdAt: memberships.createdAt,
        })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(eq(memberships.organizationId, user.organizationId))
        .orderBy(memberships.createdAt);

      // Transform to match the expected structure with nested user object
      const teamMembers = teamMemberships.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        roles: m.roles || [],
        createdAt: m.createdAt,
        user: {
          id: m.userId,
          email: m.email,
          firstName: m.firstName,
          lastName: m.lastName,
          profileImageUrl: m.profileImageUrl,
        },
      }));

      deps.logger.info('Team members retrieved', {
        userId: user.id,
        organizationId: user.organizationId,
        count: teamMembers.length
      });

      res.json(teamMembers);
    } catch (error: any) {
      deps.logError(error, {
        context: 'get-team-members',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Get organization details (for managers and above)
  router.get("/organization", requireRole("manager"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(400).json({ error: "User is not associated with an organization" });
      }

      const [organization] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, user.organizationId));

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(organization);
    } catch (error: any) {
      deps.logError(error, {
        context: 'get-organization',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Update member roles (multi-role assignment)
  // Requires admin+ role
  const updateRolesSchema = z.object({
    roles: z.array(z.string()).min(1, "At least one role is required"),
  });

  router.patch("/members/:membershipId/roles", requireRole("admin"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const { membershipId } = req.params;
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Validate request body
      const validation = updateRolesSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }

      const { roles } = validation.data;

      // Validate all roles are valid
      const invalidRoles = roles.filter(r => !VALID_ROLES.includes(r as any));
      if (invalidRoles.length > 0) {
        return res.status(400).json({ 
          error: `Invalid roles: ${invalidRoles.join(", ")}` 
        });
      }

      // Check if only owner can assign owner role
      if (roles.includes("owner") && user.role !== "owner") {
        return res.status(403).json({ 
          error: "Only owners can assign the owner role" 
        });
      }

      // Get the membership to update
      const [existingMembership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.id, membershipId),
            eq(memberships.organizationId, user.organizationId)
          )
        );

      if (!existingMembership) {
        return res.status(404).json({ error: "Membership not found" });
      }

      // Cannot modify owner's role if the user is not the owner themselves
      if (existingMembership.role === "owner" && user.role !== "owner") {
        return res.status(403).json({ 
          error: "Cannot modify owner's role" 
        });
      }

      // Determine primary role (first in list, sorted by hierarchy)
      const roleHierarchy: Record<string, number> = {
        owner: 100,
        admin: 80,
        pm_manager: 75,
        manager: 60,
        project_manager: 55,
        engineer: 50,
        sales_rep: 45,
        procurement_officer: 45,
        technician: 40,
        viewer: 10,
      };

      const sortedRoles = [...roles].sort((a, b) => 
        (roleHierarchy[b] || 0) - (roleHierarchy[a] || 0)
      );
      
      const primaryRole = sortedRoles[0];
      const additionalRoles = sortedRoles.slice(1);

      // Update the membership
      const [updatedMembership] = await db
        .update(memberships)
        .set({
          role: primaryRole,
          roles: additionalRoles,
        })
        .where(eq(memberships.id, membershipId))
        .returning();

      deps.logAuditEvent(
        user.id,
        user.organizationId,
        "team.member.roles.updated",
        "membership",
        membershipId,
        {
          previousRole: existingMembership.role,
          previousRoles: existingMembership.roles,
          newRole: primaryRole,
          newRoles: additionalRoles,
          allAssignedRoles: sortedRoles,
        }
      );

      deps.logger.info('Member roles updated', {
        userId: user.id,
        membershipId,
        organizationId: user.organizationId,
        newRoles: sortedRoles
      });

      res.json({
        success: true,
        membership: {
          id: updatedMembership.id,
          role: updatedMembership.role,
          roles: updatedMembership.roles || [],
        }
      });
    } catch (error: any) {
      deps.logError(error, {
        context: 'update-member-roles',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to update member roles" });
    }
  });

  // Legacy single role update (backward compatibility)
  const updateRoleSchema = z.object({
    role: z.string(),
  });

  router.patch("/members/:membershipId/role", requireRole("admin"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const { membershipId } = req.params;
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Validate request body
      const validation = updateRoleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: validation.error.errors 
        });
      }

      const { role } = validation.data;

      // Validate role is valid
      if (!VALID_ROLES.includes(role as any)) {
        return res.status(400).json({ error: `Invalid role: ${role}` });
      }

      // Check if only owner can assign owner role
      if (role === "owner" && user.role !== "owner") {
        return res.status(403).json({ 
          error: "Only owners can assign the owner role" 
        });
      }

      // Get the membership to update
      const [existingMembership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.id, membershipId),
            eq(memberships.organizationId, user.organizationId)
          )
        );

      if (!existingMembership) {
        return res.status(404).json({ error: "Membership not found" });
      }

      // Cannot modify owner's role
      if (existingMembership.role === "owner" && user.role !== "owner") {
        return res.status(403).json({ 
          error: "Cannot modify owner's role" 
        });
      }

      // Update the membership (clear additional roles when using single role update)
      const [updatedMembership] = await db
        .update(memberships)
        .set({
          role: role,
          roles: [],
        })
        .where(eq(memberships.id, membershipId))
        .returning();

      deps.logAuditEvent(
        user.id,
        user.organizationId,
        "team.member.role.updated",
        "membership",
        membershipId,
        {
          previousRole: existingMembership.role,
          newRole: role,
        }
      );

      deps.logger.info('Member role updated', {
        userId: user.id,
        membershipId,
        organizationId: user.organizationId,
        newRole: role
      });

      res.json({
        success: true,
        membership: {
          id: updatedMembership.id,
          role: updatedMembership.role,
          roles: updatedMembership.roles || [],
        }
      });
    } catch (error: any) {
      deps.logError(error, {
        context: 'update-member-role',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to update member role" });
    }
  });

  // Delete team member
  router.delete("/members/:membershipId", requireRole("admin"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const { membershipId } = req.params;
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      // Get the membership to delete
      const [existingMembership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.id, membershipId),
            eq(memberships.organizationId, user.organizationId)
          )
        );

      if (!existingMembership) {
        return res.status(404).json({ error: "Membership not found" });
      }

      // Cannot delete owner
      if (existingMembership.role === "owner") {
        return res.status(403).json({ 
          error: "Cannot remove organization owner" 
        });
      }

      // Cannot delete yourself
      if (existingMembership.userId === user.id) {
        return res.status(403).json({ 
          error: "Cannot remove yourself from the organization" 
        });
      }

      // Delete the membership
      await db
        .delete(memberships)
        .where(eq(memberships.id, membershipId));

      deps.logAuditEvent(
        user.id,
        user.organizationId,
        "team.member.removed",
        "membership",
        membershipId,
        {
          removedUserId: existingMembership.userId,
          removedRole: existingMembership.role,
        }
      );

      deps.logger.info('Member removed', {
        userId: user.id,
        membershipId,
        organizationId: user.organizationId,
        removedUserId: existingMembership.userId
      });

      res.json({ success: true });
    } catch (error: any) {
      deps.logError(error, {
        context: 'delete-team-member',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // ============================================================================
  // ROLE PERMISSIONS ROUTES
  // ============================================================================

  const CUSTOMIZABLE_ROLES = ["pm_manager", "manager", "project_manager", "engineer", "sales_rep", "procurement_officer", "technician", "viewer"] as const;

  const rolePermissionsSchema = z.record(
    z.enum(CUSTOMIZABLE_ROLES),
    z.array(z.string())
  );

  router.get("/role-permissions", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const customPermissions = await storage.getRolePermissions(user.organizationId);

      const effectivePermissions: Record<string, string[]> = {};
      
      for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as MembershipRole[]) {
        if (role === "owner" || role === "admin") {
          effectivePermissions[role] = [...ALL_PERMISSIONS];
        } else if (customPermissions && customPermissions[role]) {
          effectivePermissions[role] = customPermissions[role];
        } else {
          effectivePermissions[role] = DEFAULT_ROLE_PERMISSIONS[role];
        }
      }

      deps.logger.info('Role permissions retrieved', {
        userId: user.id,
        organizationId: user.organizationId,
        hasCustomizations: !!customPermissions
      });

      res.json({
        permissions: effectivePermissions,
        hasCustomizations: !!customPermissions,
        customizedRoles: customPermissions ? Object.keys(customPermissions) : [],
      });
    } catch (error: any) {
      deps.logError(error, {
        context: 'get-role-permissions',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  router.put("/role-permissions", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      const validation = rolePermissionsSchema.safeParse(req.body.permissions);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid permissions format", 
          details: validation.error.errors 
        });
      }

      const permissions = validation.data;

      if (permissions["owner"] || permissions["admin"]) {
        return res.status(400).json({ 
          error: "Owner and Admin roles cannot be customized - they always have full access" 
        });
      }

      for (const [role, perms] of Object.entries(permissions)) {
        const invalidPerms = perms.filter(p => !ALL_PERMISSIONS.includes(p as FeaturePermission));
        if (invalidPerms.length > 0) {
          return res.status(400).json({ 
            error: `Invalid permissions for role ${role}: ${invalidPerms.join(", ")}` 
          });
        }
      }

      await storage.saveRolePermissions(user.organizationId, permissions);

      deps.logAuditEvent(
        user.id,
        user.organizationId,
        "role.permissions.updated",
        "organization",
        user.organizationId,
        {
          updatedRoles: Object.keys(permissions),
          permissions: permissions,
        }
      );

      deps.logger.info('Role permissions updated', {
        userId: user.id,
        organizationId: user.organizationId,
        updatedRoles: Object.keys(permissions)
      });

      res.json({ 
        success: true,
        message: "Role permissions saved successfully",
        updatedRoles: Object.keys(permissions)
      });
    } catch (error: any) {
      deps.logError(error, {
        context: 'save-role-permissions',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to save role permissions" });
    }
  });

  router.delete("/role-permissions/:role", requireAnyRole(["owner", "admin"]), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const { role } = req.params;
      
      if (!user?.organizationId) {
        return res.status(401).json({ error: "Organization context not found" });
      }

      if (role === "owner" || role === "admin") {
        return res.status(400).json({ 
          error: "Owner and Admin roles cannot be reset - they always have full access" 
        });
      }

      if (!CUSTOMIZABLE_ROLES.includes(role as any)) {
        return res.status(400).json({ 
          error: `Invalid role: ${role}. Valid roles are: ${CUSTOMIZABLE_ROLES.join(", ")}` 
        });
      }

      await storage.resetRolePermissions(user.organizationId, role);

      deps.logAuditEvent(
        user.id,
        user.organizationId,
        "role.permissions.reset",
        "organization",
        user.organizationId,
        {
          resetRole: role,
        }
      );

      deps.logger.info('Role permissions reset to default', {
        userId: user.id,
        organizationId: user.organizationId,
        resetRole: role
      });

      res.json({ 
        success: true,
        message: `Permissions for role '${role}' have been reset to defaults`,
        defaultPermissions: DEFAULT_ROLE_PERMISSIONS[role as MembershipRole]
      });
    } catch (error: any) {
      deps.logError(error, {
        context: 'reset-role-permissions',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to reset role permissions" });
    }
  });

  // GET user notification preferences
  router.get("/notification-preferences", async (req, res) => {
    try {
      const user = req.dbUser as { id: string };
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const prefs = await storage.getUserNotificationPreferences(user.id);
      res.json(prefs);
    } catch (error: any) {
      deps.logError(error, {
        context: 'get-notification-preferences',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  // PUT update notification preference
  const updatePreferenceSchema = z.object({
    channel: z.enum(["email", "sms", "slack", "in_app"]),
    eventType: z.string(),
    isEnabled: z.enum(["yes", "no"]),
    settings: z.record(z.any()).optional(),
  });

  router.put("/notification-preferences", async (req, res) => {
    try {
      const user = req.dbUser as { id: string };
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const validation = updatePreferenceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validation.error.errors
        });
      }

      const { channel, eventType, isEnabled, settings } = validation.data;
      const pref = await storage.upsertNotificationPreference(
        user.id,
        channel,
        eventType,
        isEnabled,
        settings
      );

      // Invalidate the cache in the notification service
      const { notificationService } = await import("../services/notification-service.js");
      notificationService.invalidateUserPreferences(user.id);

      res.json(pref);
    } catch (error: any) {
      deps.logError(error, {
        context: 'update-notification-preference',
        userId: (req.dbUser as any)?.id
      });
      res.status(500).json({ error: "Failed to update notification preference" });
    }
  });

  app.use("/api/team", router);
}
