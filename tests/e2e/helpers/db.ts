import { db } from '../../../server/db';
import { users, organizations, memberships, projects } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Helper to create a test user and organization for E2E tests
 */
export async function createTestUser(email: string = 'test@example.com') {
  // Check if user exists
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    return existingUser[0];
  }

  // Create organization first
  const [org] = await db.insert(organizations).values({
    name: 'Test Organization',
    slug: 'test-org',
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
  }).returning();

  // Create user
  const [user] = await db.insert(users).values({
    id: `test-user-${Date.now()}`,
    email,
    firstName: 'Test',
    lastName: 'User',
  }).returning();

  // Create membership
  await db.insert(memberships).values({
    userId: user.id,
    organizationId: org.id,
    role: 'owner',
  });

  return { user, organization: org };
}

/**
 * Clean up test data after tests
 */
export async function cleanupTestData(email: string = 'test@example.com') {
  const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user.length === 0) return;

  const userId = user[0].id;

  // Get user's memberships
  const userMemberships = await db.select()
    .from(memberships)
    .where(eq(memberships.userId, userId));

  // Delete projects from user's organizations
  for (const membership of userMemberships) {
    await db.delete(projects).where(eq(projects.organizationId, membership.organizationId));
  }

  // Delete memberships
  await db.delete(memberships).where(eq(memberships.userId, userId));

  // Delete user
  await db.delete(users).where(eq(users.id, userId));
}
