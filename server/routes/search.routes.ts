import { Router } from "express";
import type { RouteDependencies } from "./deps";
import { requireRole } from "../middleware/requireRole";
import { db } from "../db";
import { 
  projects, 
  doorOpenings, 
  hardwareItems,
  searchHistory,
  savedSearches,
  insertSearchHistorySchema,
  insertSavedSearchSchema,
} from "@shared/schema";
import { sql, eq, and, or, desc } from "drizzle-orm";
import { handleValidationError } from "../utils/error-handler";

const router = Router();

interface SearchResult {
  type: 'project' | 'opening' | 'hardware';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export function registerSearchRoutes(app: Router, deps: RouteDependencies) {
  /**
   * Global search endpoint
   * Searches across projects, door openings, and hardware items
   * Returns results grouped by type with relevance scoring
   */
  router.get("/search", requireRole("viewer"), async (req, res) => {
    try {
      const { q, limit = '20' } = req.query;
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const userId = user.id;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.json({
        projects: [],
        openings: [],
        hardware: [],
        total: 0,
      });
    }

    const searchQuery = q.trim();
    const resultLimit = Math.min(parseInt(limit as string, 10) || 20, 100);

    // Get user's organization for multi-tenant isolation
    if (!user.organizationId) {
      deps.logger.warn('User has no organization membership', { userId });
      return res.status(400).json({ error: 'User is not associated with an organization' });
    }

    const organizationId = user.organizationId;

    // For now, use simple ILIKE search instead of full-text search
    // This avoids PostgreSQL syntax issues and provides basic functionality
    const searchPattern = `%${searchQuery}%`;

    // Search projects
    const projectResults = await db
      .select({
        id: projects.id,
        name: projects.name,
        location: projects.location,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          or(
            sql`${projects.name} ILIKE ${searchPattern}`,
            sql`${projects.location} ILIKE ${searchPattern}`,
            sql`${projects.notes} ILIKE ${searchPattern}`
          )
        )
      )
      .limit(Math.floor(resultLimit / 3));

    // Search door openings
    const openingResults = await db
      .select({
        id: doorOpenings.id,
        opening_number: doorOpenings.openingNumber,
        room_number: doorOpenings.roomNumber,
        room_name: doorOpenings.roomName,
        location: doorOpenings.location,
        project_id: doorOpenings.projectId,
      })
      .from(doorOpenings)
      .innerJoin(projects, eq(doorOpenings.projectId, projects.id))
      .where(
        and(
          eq(projects.organizationId, organizationId),
          or(
            sql`${doorOpenings.openingNumber} ILIKE ${searchPattern}`,
            sql`${doorOpenings.roomNumber} ILIKE ${searchPattern}`,
            sql`${doorOpenings.roomName} ILIKE ${searchPattern}`,
            sql`${doorOpenings.location} ILIKE ${searchPattern}`
          )
        )
      )
      .limit(Math.floor(resultLimit / 3));

    // Search hardware items
    const hardwareResults = await db
      .select({
        id: hardwareItems.id,
        item_type: hardwareItems.itemType,
        manufacturer: hardwareItems.manufacturer,
        model: hardwareItems.model,
        description: hardwareItems.description,
        opening_id: hardwareItems.openingId,
      })
      .from(hardwareItems)
      .innerJoin(doorOpenings, eq(hardwareItems.openingId, doorOpenings.id))
      .innerJoin(projects, eq(doorOpenings.projectId, projects.id))
      .where(
        and(
          eq(projects.organizationId, organizationId),
          or(
            sql`${hardwareItems.itemType} ILIKE ${searchPattern}`,
            sql`${hardwareItems.manufacturer} ILIKE ${searchPattern}`,
            sql`${hardwareItems.model} ILIKE ${searchPattern}`,
            sql`${hardwareItems.description} ILIKE ${searchPattern}`
          )
        )
      )
      .limit(Math.floor(resultLimit / 3));

    // Transform and group results by type
    const projectItems = projectResults.map((p) => ({
      type: 'project' as const,
      id: p.id,
      title: p.name,
      subtitle: p.location || '',
      url: `/projects/${p.id}`,
    }));

    const openingItems = openingResults.map((o) => ({
      type: 'opening' as const,
      id: o.id,
      title: o.opening_number,
      subtitle: [o.room_number, o.room_name, o.location].filter(Boolean).join(' - '),
      url: `/projects/${o.project_id}/openings/${o.id}`,
    }));

    const hardwareList = hardwareResults.map((h) => ({
      type: 'hardware' as const,
      id: h.id,
      title: `${h.item_type}${h.manufacturer ? ` - ${h.manufacturer}` : ''}`,
      subtitle: h.model || h.description || '',
      url: `/openings/${h.opening_id}#hardware-${h.id}`,
    }));

    // Return grouped results
    const groupedResults = {
      projects: projectItems,
      openings: openingItems,
      hardware: hardwareList,
      total: projectItems.length + openingItems.length + hardwareList.length,
    };

    deps.logger.info('Global search executed', {
      userId,
      organizationId,
      query: searchQuery,
      resultCount: groupedResults.total,
      breakdown: {
        projects: projectItems.length,
        openings: openingItems.length,
        hardware: hardwareList.length,
      },
    });

    res.json(groupedResults);
    
    // Save search to history
    if (searchQuery && user.organizationId) {
      try {
        await db.insert(searchHistory).values({
          organizationId: user.organizationId,
          userId,
          query: searchQuery,
          entityTypes: JSON.stringify(['projects', 'openings', 'hardware']),
          resultCount: groupedResults.total,
        });
      } catch (err) {
        deps.logger.error('Failed to save search history', { error: err, userId });
      }
    }
  } catch (error) {
    const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
    deps.logger.error('Global search error', { error, userId: user?.id });
    res.status(500).json({ error: 'Search failed' });
  }
});

  // ============================================================================
  // SEARCH HISTORY
  // ============================================================================

  // GET /api/search/history - Get recent search history
  router.get("/search/history", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const userId = user.id;
      const organizationId = user.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'User is not associated with an organization' });
      }

      const limit = parseInt(req.query.limit as string) || 10;

      const history = await db
        .select()
        .from(searchHistory)
        .where(and(
          eq(searchHistory.organizationId, organizationId),
          eq(searchHistory.userId, userId)
        ))
        .orderBy(desc(searchHistory.createdAt))
        .limit(Math.min(limit, 50));

      res.json(history);
    } catch (error) {
      deps.logger.error('Failed to fetch search history', { error });
      res.status(500).json({ error: 'Failed to fetch search history' });
    }
  });

  // DELETE /api/search/history - Clear search history
  router.delete("/search/history", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const userId = user.id;
      const organizationId = user.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'User is not associated with an organization' });
      }

      await db
        .delete(searchHistory)
        .where(and(
          eq(searchHistory.organizationId, organizationId),
          eq(searchHistory.userId, userId)
        ));

      deps.logger.info('Search history cleared', { userId, organizationId });

      res.json({ message: 'Search history cleared' });
    } catch (error) {
      deps.logger.error('Failed to clear search history', { error });
      res.status(500).json({ error: 'Failed to clear search history' });
    }
  });

  // ============================================================================
  // SAVED SEARCHES
  // ============================================================================

  // GET /api/search/saved - Get saved searches
  router.get("/search/saved", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const userId = user.id;
      const organizationId = user.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'User is not associated with an organization' });
      }

      const searches = await db
        .select()
        .from(savedSearches)
        .where(and(
          eq(savedSearches.organizationId, organizationId),
          or(
            eq(savedSearches.userId, userId),
            eq(savedSearches.isGlobal, true)
          )
        ))
        .orderBy(desc(savedSearches.createdAt));

      res.json(searches);
    } catch (error) {
      deps.logger.error('Failed to fetch saved searches', { error });
      res.status(500).json({ error: 'Failed to fetch saved searches' });
    }
  });

  // POST /api/search/saved - Create saved search
  router.post("/search/saved", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const userId = user.id;
      const organizationId = user.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'User is not associated with an organization' });
      }

      const validation = insertSavedSearchSchema.safeParse({
        ...req.body,
        organizationId,
        userId,
      });

      if (!validation.success) {
        return handleValidationError(validation.error, res);
      }

      const [savedSearch] = await db
        .insert(savedSearches)
        .values(validation.data)
        .returning();

      deps.logger.info('Saved search created', {
        userId,
        organizationId,
        searchId: savedSearch.id,
        name: savedSearch.name,
      });

      res.status(201).json(savedSearch);
    } catch (error) {
      deps.logger.error('Failed to create saved search', { error });
      res.status(500).json({ error: 'Failed to create saved search' });
    }
  });

  // PUT /api/search/saved/:id - Update saved search
  router.put("/search/saved/:id", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const userId = user.id;
      const organizationId = user.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'User is not associated with an organization' });
      }

      const { id } = req.params;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(savedSearches)
        .where(and(
          eq(savedSearches.id, id),
          eq(savedSearches.organizationId, organizationId),
          eq(savedSearches.userId, userId)
        ));

      if (!existing) {
        return res.status(404).json({ error: 'Saved search not found' });
      }

      const [updated] = await db
        .update(savedSearches)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(savedSearches.id, id))
        .returning();

      deps.logger.info('Saved search updated', {
        userId,
        organizationId,
        searchId: id,
      });

      res.json(updated);
    } catch (error) {
      deps.logger.error('Failed to update saved search', { error });
      res.status(500).json({ error: 'Failed to update saved search' });
    }
  });

  // DELETE /api/search/saved/:id - Delete saved search
  router.delete("/search/saved/:id", requireRole("viewer"), async (req, res) => {
    try {
      const user = req.dbUser as { id: string; organizationId: string | null; role: string | null };
      const userId = user.id;
      const organizationId = user.organizationId;

      if (!organizationId) {
        return res.status(400).json({ error: 'User is not associated with an organization' });
      }

      const { id } = req.params;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(savedSearches)
        .where(and(
          eq(savedSearches.id, id),
          eq(savedSearches.organizationId, organizationId),
          eq(savedSearches.userId, userId)
        ));

      if (!existing) {
        return res.status(404).json({ error: 'Saved search not found' });
      }

      await db
        .delete(savedSearches)
        .where(eq(savedSearches.id, id));

      deps.logger.info('Saved search deleted', {
        userId,
        organizationId,
        searchId: id,
      });

      res.json({ message: 'Saved search deleted' });
    } catch (error) {
      deps.logger.error('Failed to delete saved search', { error });
      res.status(500).json({ error: 'Failed to delete saved search' });
    }
  });

  app.use("/api", router);
}

export default router;
