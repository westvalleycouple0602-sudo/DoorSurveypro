import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { cache } from '../../utils/cache';
import { createTestContext, createMultiTenantContexts, delay } from './setup';

/**
 * Integration Tests for Redis Cache with Multi-Tenant Isolation
 * Tests real cache operations with proper authentication context
 */

describe('Cache Integration Tests', () => {
  const testKeys: string[] = [];

  afterEach(async () => {
    // Clean up test keys
    for (const key of testKeys) {
      await cache.delete(key);
    }
    testKeys.length = 0;
  });

  describe('Multi-Tenant Isolation', () => {
    it('should isolate cache data between organizations', async () => {
      const contexts = createMultiTenantContexts(2);
      const [org1, org2] = contexts;

      const key = 'test-data';
      const org1Key = `cache:org:${org1.organizationId}:${key}`;
      const org2Key = `cache:org:${org2.organizationId}:${key}`;

      testKeys.push(org1Key, org2Key);

      // Set different values for each organization
      await cache.set(org1Key, { data: 'org1-data' }, 300);
      await cache.set(org2Key, { data: 'org2-data' }, 300);

      // Verify isolation
      const org1Data = await cache.get(org1Key) as Record<string, unknown> | null;
      const org2Data = await cache.get(org2Key) as Record<string, unknown> | null;

      expect(org1Data).toEqual({ data: 'org1-data' });
      expect(org2Data).toEqual({ data: 'org2-data' });
      expect(org1Data).not.toEqual(org2Data);
    });

    it('should invalidate cache for specific organization without affecting others', async () => {
      const contexts = createMultiTenantContexts(2);
      const [org1, org2] = contexts;

      const org1Keys = [
        `cache:org:${org1.organizationId}:projects`,
        `cache:org:${org1.organizationId}:users`,
      ];
      const org2Keys = [
        `cache:org:${org2.organizationId}:projects`,
        `cache:org:${org2.organizationId}:users`,
      ];

      testKeys.push(...org1Keys, ...org2Keys);

      // Set data for both organizations
      for (const key of org1Keys) {
        await cache.set(key, { org: 'org1' }, 300);
      }
      for (const key of org2Keys) {
        await cache.set(key, { org: 'org2' }, 300);
      }

      // Invalidate org1's cache
      await cache.invalidatePattern(`cache:org:${org1.organizationId}:*`);

      // Verify org1 cache is cleared
      for (const key of org1Keys) {
        const data = await cache.get(key);
        expect(data).toBeNull();
      }

      // Verify org2 cache is intact
      for (const key of org2Keys) {
        const data = await cache.get(key);
        expect(data).toEqual({ org: 'org2' });
      }
    });
  });

  describe('Cache Operations', () => {
    it('should set and get cached data', async () => {
      const context = createTestContext();
      const key = `cache:test:${context.userId}:data`;
      testKeys.push(key);

      const testData = {
        userId: context.userId,
        name: 'Test Data',
        timestamp: Date.now(),
      };

      await cache.set(key, testData, 300);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(testData);
    });

    it('should handle TTL expiration correctly', async () => {
      const context = createTestContext();
      const key = `cache:test:${context.userId}:expiring`;
      testKeys.push(key);

      // Set with 1 second TTL (minimum)
      await cache.set(key, { data: 'expires-soon' }, 1);

      // Should exist immediately
      let data = await cache.get(key);
      expect(data).toEqual({ data: 'expires-soon' });

      // Wait for expiration
      await delay(1100);

      // Should be expired
      data = await cache.get(key);
      expect(data).toBeNull();
    });

    it('should delete cached data', async () => {
      const context = createTestContext();
      const key = `cache:test:${context.userId}:deletable`;
      testKeys.push(key);

      await cache.set(key, { data: 'to-be-deleted' }, 300);
      
      // Verify it exists
      let data = await cache.get(key);
      expect(data).toEqual({ data: 'to-be-deleted' });

      // Delete
      await cache.delete(key);

      // Verify deletion
      data = await cache.get(key);
      expect(data).toBeNull();
    });

    it('should handle complex data structures', async () => {
      const context = createTestContext();
      const key = `cache:test:${context.userId}:complex`;
      testKeys.push(key);

      const complexData = {
        user: {
          id: context.userId,
          profile: {
            name: 'Test User',
            settings: {
              theme: 'dark',
              notifications: ['email', 'sms'],
            },
          },
        },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
        },
        tags: ['test', 'integration', 'cache'],
      };

      await cache.set(key, complexData, 300);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(complexData);
    });
  });

  describe('Pattern Invalidation (SCAN-based)', () => {
    it('should invalidate all keys matching a pattern', async () => {
      const context = createTestContext();
      const baseKey = `cache:test:${context.userId}`;

      const keys = [
        `${baseKey}:item1`,
        `${baseKey}:item2`,
        `${baseKey}:item3`,
        `cache:other:${context.userId}:item4`,
      ];

      testKeys.push(...keys);

      // Set data for all keys
      for (const key of keys) {
        await cache.set(key, { key }, 300);
      }

      // Invalidate pattern
      await cache.invalidatePattern(`${baseKey}:*`);

      // Verify pattern keys are deleted
      for (let i = 0; i < 3; i++) {
        const data = await cache.get(keys[i]);
        expect(data).toBeNull();
      }

      // Verify non-matching key remains
      const otherData = await cache.get(keys[3]);
      expect(otherData).toEqual({ key: keys[3] });
    });

    it('should handle large-scale pattern invalidation', async () => {
      const context = createTestContext();
      const baseKey = `cache:test:${context.userId}:bulk`;

      // Create 100 keys
      const keys = Array.from({ length: 100 }, (_, i) => `${baseKey}:${i}`);
      testKeys.push(...keys);

      // Set data
      for (const key of keys) {
        await cache.set(key, { key }, 300);
      }

      // Invalidate pattern
      await cache.invalidatePattern(`${baseKey}:*`);

      // Verify all deleted
      for (const key of keys) {
        const data = await cache.get(key);
        expect(data).toBeNull();
      }
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      const stats = await cache.getStats();

      expect(stats).toHaveProperty('backend');
      expect(['redis', 'in-memory']).toContain(stats.backend);

      if (stats.backend === 'redis') {
        expect(stats).toHaveProperty('memory');
        expect(stats).toHaveProperty('totalEntries');
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent cache operations safely', async () => {
      const context = createTestContext();
      const keys = Array.from(
        { length: 10 },
        (_, i) => `cache:test:${context.userId}:concurrent:${i}`
      );
      testKeys.push(...keys);

      // Concurrent writes
      await Promise.all(
        keys.map((key, i) => cache.set(key, { index: i }, 300))
      );

      // Concurrent reads
      const results = await Promise.all(
        keys.map(key => cache.get(key))
      );

      // Verify all operations succeeded
      results.forEach((result, i) => {
        expect(result).toEqual({ index: i });
      });
    });
  });

  describe('User-Scoped Caching', () => {
    it('should cache user-specific data correctly', async () => {
      const context = createTestContext();
      const userCacheKey = `cache:user:${context.userId}:profile`;
      testKeys.push(userCacheKey);

      const userProfile = {
        id: context.userId,
        name: `${context.user.firstName} ${context.user.lastName}`,
        email: context.user.email,
        preferences: {
          theme: 'dark',
          language: 'en',
        },
      };

      await cache.set(userCacheKey, userProfile, 3600);
      const cached = await cache.get(userCacheKey) as typeof userProfile | null;

      expect(cached).toEqual(userProfile);
      expect(cached?.id).toBe(context.userId);
    });

    it('should invalidate user cache without affecting organization cache', async () => {
      const context = createTestContext();
      
      const userKey = `cache:user:${context.userId}:data`;
      const orgKey = `cache:org:${context.organizationId}:data`;
      
      testKeys.push(userKey, orgKey);

      await cache.set(userKey, { type: 'user' }, 300);
      await cache.set(orgKey, { type: 'org' }, 300);

      // Invalidate user cache
      await cache.invalidatePattern(`cache:user:${context.userId}:*`);

      // Verify user cache cleared
      const userData = await cache.get(userKey);
      expect(userData).toBeNull();

      // Verify org cache intact
      const orgData = await cache.get(orgKey);
      expect(orgData).toEqual({ type: 'org' });
    });
  });
});
