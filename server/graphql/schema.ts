import { makeExecutableSchema } from '@graphql-tools/schema';
import { DateTimeResolver, JSONObjectResolver } from 'graphql-scalars';

// GraphQL Type Definitions
const typeDefs = `#graphql
  scalar DateTime
  scalar JSONObject

  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    role: String
    organizationId: String
  }

  type Photo {
    id: ID!
    url: String!
    filename: String!
    photoType: String!
    annotations: JSONObject
    capturedAt: DateTime!
  }

  type DoorOpening {
    id: ID!
    openingNumber: String!
    location: String
    doorWidth: String
    doorHeight: String
    doorThickness: String
    frameType: String
    frameDepth: String
    fireRating: String
    notes: String
    photos: [Photo!]!
    createdAt: DateTime!
  }

  type Project {
    id: ID!
    projectName: String!
    customerName: String
    projectAddress: String
    status: String!
    openingCount: Int!
    photoCount: Int!
    openings: [DoorOpening!]!
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type ProjectConnection {
    projects: [Project!]!
    totalCount: Int!
    hasMore: Boolean!
  }

  input ProjectFilter {
    status: String
    search: String
  }

  type Query {
    # Efficient single query to get project with all related data
    project(id: ID!): Project
    
    # Paginated projects with filtering
    projects(
      limit: Int = 20
      offset: Int = 0
      filter: ProjectFilter
    ): ProjectConnection!
    
    # Get opening with all photos efficiently
    opening(id: ID!): DoorOpening
  }

  type Mutation {
    # Placeholder for future mutations
    updateProjectStatus(id: ID!, status: String!): Project
  }
`;

// GraphQL Resolvers
export const createResolvers = (storage: any) => ({
  DateTime: DateTimeResolver,
  JSONObject: JSONObjectResolver,

  Query: {
    // Get single project with all openings and photos in one query
    project: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.organizationId) {
        throw new Error('Unauthorized');
      }

      // Use DataLoader for efficient caching
      const project = await context.loaders.projectLoader.load(id);
      if (!project || project.organizationId !== context.organizationId) {
        return null;
      }

      return project;
    },

    // Get paginated projects with filtering
    projects: async (
      _: any,
      { limit, offset, filter }: any,
      context: any
    ) => {
      if (!context.organizationId) {
        throw new Error('Unauthorized');
      }

      const allProjects = await storage.getProjects(context.organizationId);
      
      // SECURITY: Defensive check - verify ALL projects belong to requesting org
      const unauthorized = allProjects.some((p: any) => p.organizationId !== context.organizationId);
      if (unauthorized) {
        throw new Error('Data integrity violation: Projects from multiple organizations detected');
      }
      
      // Apply filtering
      let filtered = allProjects;
      if (filter?.status) {
        filtered = filtered.filter((p: any) => p.status === filter.status);
      }
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        filtered = filtered.filter((p: any) => 
          p.projectName?.toLowerCase().includes(searchLower) ||
          p.customerName?.toLowerCase().includes(searchLower)
        );
      }

      const totalCount = filtered.length;
      const projects = filtered.slice(offset, offset + limit);

      return {
        projects,
        totalCount,
        hasMore: offset + limit < totalCount,
      };
    },

    // Get opening with photos
    opening: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.organizationId) {
        throw new Error('Unauthorized');
      }

      const opening = await storage.getDoorOpening(id);
      if (!opening) {
        return null;
      }

      // Verify ownership through project
      const project = await context.loaders.projectLoader.load(opening.projectId);
      if (!project || project.organizationId !== context.organizationId) {
        return null;
      }

      return opening;
    },
  },

  Project: {
    // Efficiently load openings for a project using DataLoader
    openings: async (project: any, _: any, context: any) => {
      // SECURITY: Verify project belongs to requesting org
      if (project.organizationId !== context.organizationId) {
        throw new Error('Unauthorized access to project openings');
      }
      return context.loaders.openingsByProjectLoader.load(project.id);
    },

    // Calculate counts using DataLoader
    openingCount: async (project: any, _: any, context: any) => {
      // SECURITY: Verify project belongs to requesting org
      if (project.organizationId !== context.organizationId) {
        throw new Error('Unauthorized access to project data');
      }
      const openings = await context.loaders.openingsByProjectLoader.load(project.id);
      return openings.length;
    },

    photoCount: async (project: any, _: any, context: any) => {
      // SECURITY: Verify project belongs to requesting org
      if (project.organizationId !== context.organizationId) {
        throw new Error('Unauthorized access to project data');
      }
      const openings = await context.loaders.openingsByProjectLoader.load(project.id);
      let total = 0;
      // Batch load all photos for all openings
      const photoArrays = await Promise.all(
        openings.map((opening: any) => 
          context.loaders.photosByOpeningLoader.load(opening.id)
        )
      );
      return photoArrays.reduce((sum, photos) => sum + photos.length, 0);
    },
  },

  DoorOpening: {
    // Efficiently load photos for an opening using DataLoader
    photos: async (opening: any, _: any, context: any) => {
      return context.loaders.photosByOpeningLoader.load(opening.id);
    },
  },

  Mutation: {
    updateProjectStatus: async (
      _: any,
      { id, status }: { id: string; status: string },
      context: any
    ) => {
      if (!context.organizationId) {
        throw new Error('Unauthorized');
      }

      const project = await storage.getProject(id);
      if (!project || project.organizationId !== context.organizationId) {
        throw new Error('Project not found');
      }

      const updated = await storage.updateProject(id, { status });
      return updated;
    },
  },
});

export const createGraphQLSchema = (storage: any) => {
  return makeExecutableSchema({
    typeDefs,
    resolvers: createResolvers(storage),
  });
};
