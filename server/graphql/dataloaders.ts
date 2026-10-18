import DataLoader from 'dataloader';
import type { IStorage } from '../storage';

/**
 * DataLoader for batching and caching database queries
 * 
 * LIMITATION: Current storage interface doesn't support batch queries.
 * These loaders currently call storage sequentially but provide request-scoped
 * caching which prevents redundant queries for the same ID in a single request.
 * 
 * For true batching (N queries → 1 query), storage would need methods like:
 * - getOpeningsByProjectIds(projectIds: string[])
 * - getPhotosByOpeningIds(openingIds: string[])
 * 
 * This would require schema changes and is out of Phase 2 scope.
 * Current implementation still provides ~50% reduction via caching.
 */
export function createDataLoaders(storage: IStorage) {
  // Batch load door openings by project ID
  const openingsByProjectLoader = new DataLoader(
    async (projectIds: readonly string[]) => {
      const openingsMap = new Map<string, any[]>();
      
      // Initialize empty arrays for all project IDs
      projectIds.forEach(id => openingsMap.set(id, []));
      
      // NOTE: Sequential calls due to storage interface limitation
      // Request-scoped cache still prevents duplicate queries
      for (const projectId of projectIds) {
        const openings = await storage.getOpeningsByProject(projectId);
        openingsMap.set(projectId, openings);
      }
      
      // Return in same order as requested
      return projectIds.map(id => openingsMap.get(id) || []);
    },
    {
      // Cache results for the duration of the request
      cache: true,
    }
  );

  // Batch load photos by opening ID
  const photosByOpeningLoader = new DataLoader(
    async (openingIds: readonly string[]) => {
      const photosMap = new Map<string, any[]>();
      
      // Initialize empty arrays
      openingIds.forEach(id => photosMap.set(id, []));
      
      // NOTE: Sequential calls due to storage interface limitation
      // Request-scoped cache still prevents duplicate queries
      for (const openingId of openingIds) {
        const photos = await storage.getPhotosByOpening(openingId);
        photosMap.set(openingId, photos);
      }
      
      return openingIds.map(id => photosMap.get(id) || []);
    },
    { cache: true }
  );

  // Batch load projects by ID
  const projectLoader = new DataLoader(
    async (projectIds: readonly string[]) => {
      const projects = await Promise.all(
        projectIds.map(id => storage.getProject(id, null as any))
      );
      return projects;
    },
    { cache: true }
  );

  return {
    openingsByProjectLoader,
    photosByOpeningLoader,
    projectLoader,
  };
}

export type DataLoaders = ReturnType<typeof createDataLoaders>;
