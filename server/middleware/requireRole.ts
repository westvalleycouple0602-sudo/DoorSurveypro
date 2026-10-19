import type { Request, Response, NextFunction } from "express";
import { MEMBERSHIP_ROLES, ROLE_HIERARCHY, type MembershipRole } from "@shared/schema";
import { logger, logSecurityEvent } from "../logger";

export function requireRole(minimumRole: MembershipRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.dbUser as any;
    
    if (!user) {
      logSecurityEvent('role-check-failed', 'medium', { 
        path: req.path,
        reason: 'no-user'
      });
      return res.status(401).json({ error: "Unauthorized" });
    }

    const primaryRole = user.role as MembershipRole;
    const additionalRoles = (user.roles || []) as MembershipRole[];
    const allRoles = [primaryRole, ...additionalRoles].filter(Boolean);
    
    if (allRoles.length === 0) {
      logSecurityEvent('role-check-failed', 'medium', { 
        userId: user.id,
        path: req.path,
        reason: 'no-role'
      });
      return res.status(403).json({ error: "User has no assigned role" });
    }

    const userLevel = Math.max(...allRoles.map(r => ROLE_HIERARCHY[r] ?? -1));
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? Infinity;

    if (userLevel < requiredLevel) {
      logSecurityEvent('role-check-failed', 'medium', {
        userId: user.id,
        userRoles: allRoles,
        requiredRole: minimumRole,
        userLevel,
        requiredLevel,
        path: req.path,
        reason: 'insufficient-role'
      });
      return res.status(403).json({ 
        error: `Requires ${minimumRole} role or higher` 
      });
    }

    logger.debug('Role check passed', {
      userId: user.id,
      userRoles: allRoles,
      effectiveLevel: userLevel,
      requiredRole: minimumRole
    });

    next();
  };
}

export function requireAnyRole(roles: MembershipRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.dbUser as any;
    
    if (!user) {
      logSecurityEvent('role-check-failed', 'medium', { 
        path: req.path,
        reason: 'no-user'
      });
      return res.status(401).json({ error: "Unauthorized" });
    }

    const primaryRole = user.role as MembershipRole;
    const additionalRoles = (user.roles || []) as MembershipRole[];
    const allUserRoles = [primaryRole, ...additionalRoles].filter(Boolean);
    
    const hasMatchingRole = allUserRoles.some(userRole => roles.includes(userRole));
    
    if (!hasMatchingRole) {
      logSecurityEvent('role-check-failed', 'medium', {
        userId: user.id,
        userRoles: allUserRoles,
        allowedRoles: roles,
        path: req.path,
        reason: 'role-not-in-list'
      });
      return res.status(403).json({ 
        error: `Requires one of: ${roles.join(', ')}` 
      });
    }

    logger.debug('Role check passed', {
      userId: user.id,
      userRoles: allUserRoles,
      allowedRoles: roles
    });

    next();
  };
}

export function getEffectiveRoleLevel(user: any): number {
  const primaryRole = user.role as MembershipRole;
  const additionalRoles = (user.roles || []) as MembershipRole[];
  const allRoles = [primaryRole, ...additionalRoles].filter(Boolean);
  
  if (allRoles.length === 0) return -1;
  
  return Math.max(...allRoles.map(r => ROLE_HIERARCHY[r] ?? -1));
}

export function userHasRole(user: any, role: MembershipRole): boolean {
  const primaryRole = user.role as MembershipRole;
  const additionalRoles = (user.roles || []) as MembershipRole[];
  const allRoles = [primaryRole, ...additionalRoles].filter(Boolean);
  
  return allRoles.includes(role);
}

export function getAllUserRoles(user: any): MembershipRole[] {
  const primaryRole = user.role as MembershipRole;
  const additionalRoles = (user.roles || []) as MembershipRole[];
  return [primaryRole, ...additionalRoles].filter(Boolean) as MembershipRole[];
}
