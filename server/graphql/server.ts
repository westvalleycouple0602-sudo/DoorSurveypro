import { createYoga } from 'graphql-yoga';
import type { Express } from 'express';
import { createGraphQLSchema } from './schema';
import { createDataLoaders } from './dataloaders';
import type { IStorage } from '../storage';
import { getOrganizationContext } from '../clerkAuth';

export function setupGraphQL(app: Express, storage: IStorage) {
  const schema = createGraphQLSchema(storage);

  const yoga = createYoga({
    schema,
    graphqlEndpoint: '/api/graphql',
    // Extract context from Express request and create fresh DataLoaders per request
    context: async ({ request }) => {
      try {
        // Convert Yoga request to Express-like request for getOrganizationContext
        const expressReq = request as any;
        const orgContext = await getOrganizationContext(expressReq);
        
        // Create fresh DataLoaders for this request (important for cache isolation)
        const loaders = createDataLoaders(storage);
        
        return {
          organizationId: orgContext?.organizationId || null,
          userId: orgContext?.userId || null,
          userRole: orgContext?.role || null,
          loaders, // DataLoaders for efficient batching
        };
      } catch (error) {
        // If auth fails, return null context (queries will reject)
        return {
          organizationId: null,
          userId: null,
          userRole: null,
          loaders: createDataLoaders(storage), // Still provide loaders
        };
      }
    },
    // Enable GraphiQL in development for testing
    graphiql: process.env.NODE_ENV === 'development',
  });

  // Mount GraphQL endpoint
  app.use('/api/graphql', yoga as any);

  console.log('✅ GraphQL: Server mounted at /api/graphql');
}
