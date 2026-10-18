/**
 * Dashboard Analytics Routes
 * Provides comprehensive analytics, trends, and insights for organization dashboard
 */

import { Router, Request, Response } from 'express';
import { getOrganizationContext } from '../clerkAuth';
import { storage } from '../storage';
import { handleValidationError } from '../utils/error-handler';
import { logError } from '../logger';
import { cache, cacheMiddleware } from '../utils/cache';

const router = Router();

/**
 * Analytics Response Types
 */
export interface DashboardAnalytics {
  metrics: {
    activeProjects: number;
    completedProjects: number;
    totalOpenings: number;
    totalPhotos: number;
    trends: {
      projects: number;
      openings: number;
    };
  };
  charts: {
    projectTrends: Array<{ date: string; count: number }>;
    statusDistribution: Array<{ status: string; count: number }>;
    buildingTypes: Array<{ type: string; count: number }>;
    doorTypes: Array<{ type: string; count: number }>;
  };
  activities: Array<{
    type: 'project_created' | 'opening_added';
    title: string;
    timestamp: Date;
    metadata: Record<string, any>;
  }>;
}

/**
 * GET /api/dashboard/analytics
 * Returns comprehensive dashboard analytics with trends and insights
 * Cached for 10 minutes
 */
router.get('/', cacheMiddleware(10 * 60 * 1000), async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }
    
    // Fetch organization data
    const projects = await storage.getProjects(orgContext.organizationId);
    const projectIds = projects.map(p => p.id);
    
    const [allOpenings, allPhotos] = await Promise.all([
      storage.getOpenings(),
      storage.getPhotos(),
    ]);

    const openings = allOpenings.filter(o => projectIds.includes(o.projectId));
    const openingIds = openings.map(o => o.id);
    const photos = allPhotos.filter(p => openingIds.includes(p.openingId));

    // Calculate project trends (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const projectTrends = projects
      .filter(p => new Date(p.createdAt) >= thirtyDaysAgo)
      .reduce((acc, project) => {
        const date = new Date(project.createdAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Project status distribution
    const statusDistribution = projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Building type distribution
    const buildingTypeDistribution = projects.reduce((acc, p) => {
      const type = p.buildingType || 'unspecified';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Door type distribution
    const doorTypeDistribution = openings.reduce((acc, o) => {
      const type = o.doorType || 'unspecified';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Activity timeline (recent 10 activities)
    const activities = [
      ...projects.slice(0, 5).map(p => ({
        type: 'project_created' as const,
        title: `Project created: ${p.name}`,
        timestamp: p.createdAt,
        metadata: { projectId: p.id, projectName: p.name }
      })),
      ...openings.slice(0, 5).map(o => ({
        type: 'opening_added' as const,
        title: `Opening added: ${o.openingNumber}`,
        timestamp: o.createdAt,
        metadata: { openingId: o.id, openingNumber: o.openingNumber }
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Metrics with trends
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    
    // Calculate week-over-week changes
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const projectsLastWeek = projects.filter(p => 
      new Date(p.createdAt) >= sevenDaysAgo
    ).length;
    const projectsPreviousWeek = projects.filter(p => 
      new Date(p.createdAt) >= fourteenDaysAgo && new Date(p.createdAt) < sevenDaysAgo
    ).length;
    
    const projectTrend = projectsPreviousWeek === 0 
      ? 0 
      : Math.round(((projectsLastWeek - projectsPreviousWeek) / projectsPreviousWeek) * 100);

    const openingsLastWeek = openings.filter(o => 
      new Date(o.createdAt) >= sevenDaysAgo
    ).length;
    const openingsPreviousWeek = openings.filter(o => 
      new Date(o.createdAt) >= fourteenDaysAgo && new Date(o.createdAt) < sevenDaysAgo
    ).length;
    
    const openingsTrend = openingsPreviousWeek === 0 
      ? 0 
      : Math.round(((openingsLastWeek - openingsPreviousWeek) / openingsPreviousWeek) * 100);

    const analytics: DashboardAnalytics = {
      metrics: {
        activeProjects,
        completedProjects,
        totalOpenings: openings.length,
        totalPhotos: photos.length,
        trends: {
          projects: projectTrend,
          openings: openingsTrend,
        }
      },
      charts: {
        projectTrends: Object.entries(projectTrends).map(([date, count]) => ({ date, count })),
        statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({ 
          status: status.charAt(0).toUpperCase() + status.slice(1), 
          count 
        })),
        buildingTypes: Object.entries(buildingTypeDistribution).map(([type, count]) => ({ 
          type: type.charAt(0).toUpperCase() + type.slice(1), 
          count 
        })),
        doorTypes: Object.entries(doorTypeDistribution).map(([type, count]) => ({ type, count })).slice(0, 10),
      },
      activities,
    };

    res.json(analytics);
  } catch (error) {
    handleValidationError(error, res, logError);
  }
});

export default router;
