/**
 * Integration Test Setup and Fixtures
 * Provides authenticated context for integration tests
 */

import type { User, Organization } from '@shared/schema';

export interface TestContext {
  user: Partial<User>;
  organization: Partial<Organization>;
  userId: string;
  organizationId: string;
}

/**
 * Create test context with authenticated user and organization
 */
export function createTestContext(): TestContext {
  // Generate UUIDs for IDs (matching database schema)
  const organizationId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    userId,
    organizationId,
    user: {
      id: userId,
      email: `test-user-${Math.random().toString(36).substr(2, 6)}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
    },
    organization: {
      id: organizationId,
      name: `Test Organization ${Math.random().toString(36).substr(2, 6)}`,
      slug: `test-org-${Math.random().toString(36).substr(2, 6)}`,
      subscriptionTier: 'professional',
      subscriptionStatus: 'active',
    },
  };
}

/**
 * Create multiple test contexts for multi-tenant testing
 */
export function createMultiTenantContexts(count: number): TestContext[] {
  return Array.from({ length: count }, () => createTestContext());
}

/**
 * Mock job types for testing
 */
export enum TestJobType {
  SEND_EMAIL = 'send-email',
  GENERATE_REPORT = 'generate-report',
  PROCESS_UPLOAD = 'process-upload',
  ANALYZE_PHOTO = 'analyze-photo',
}

/**
 * Create test job data
 */
export function createTestJobData(
  type: TestJobType,
  context: TestContext,
  additionalData: Record<string, any> = {}
) {
  return {
    type,
    userId: context.userId,
    organizationId: context.organizationId,
    ...additionalData,
  };
}

/**
 * Wait for condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Delay helper for testing
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
