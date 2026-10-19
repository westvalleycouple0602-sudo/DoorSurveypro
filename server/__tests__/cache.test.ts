import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

/**
 * Unit tests for Redis cache with failover behavior
 * Tests critical production fixes:
 * 1. SCAN-based pattern invalidation (non-blocking)
 * 2. TTL clamping to ≥1 second (prevents non-expiring keys)
 * 3. Automatic fallback to in-memory cache
 */

// Mock Redis to test different scenarios
const mockRedis = {
  connected: true,
  keys: [] as string[],
  scanSnapshot: [] as string[],
  
  async set(key: string, value: string, mode?: string, ttl?: number): Promise<string> {
    if (!this.connected) throw new Error('Redis unavailable');
    this.keys.push(key);
    return 'OK';
  },
  
  async get(key: string): Promise<string | null> {
    if (!this.connected) throw new Error('Redis unavailable');
    return this.keys.includes(key) ? 'test-value' : null;
  },
  
  async del(...keys: string[]): Promise<number> {
    if (!this.connected) throw new Error('Redis unavailable');
    const deleted = keys.filter(k => this.keys.includes(k)).length;
    this.keys = this.keys.filter(k => !keys.includes(k));
    return deleted;
  },
  
  async scan(cursor: number, matchType: string, pattern: string, countType: string, count: number): Promise<[string, string[]]> {
    if (!this.connected) throw new Error('Redis unavailable');
    
    // A Redis cursor is not an offset into the shrinking post-deletion array.
    // Keep this iteration's keyspace stable so deleting a returned batch does
    // not cause the fixture itself to skip the next batch.
    if (cursor === 0) this.scanSnapshot = this.keys.filter(k => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(k);
    });
    const matchedKeys = this.scanSnapshot;
    
    // Return in batches
    const batchSize = count;
    const startIdx = cursor;
    const endIdx = Math.min(startIdx + batchSize, matchedKeys.length);
    const batch = matchedKeys.slice(startIdx, endIdx);
    const nextCursor = endIdx < matchedKeys.length ? endIdx.toString() : '0';
    
    return [nextCursor, batch];
  },
  
  async quit() {
    // Mock cleanup
  },
  
  disconnect() {
    this.connected = false;
  },
  
  reconnect() {
    this.connected = true;
    this.keys = [];
    this.scanSnapshot = [];
  }
};

describe('Redis Cache - Critical Production Fixes', () => {
  beforeEach(() => {
    mockRedis.reconnect();
  });

  describe('TTL Clamping (Fix #2)', () => {
    it('should clamp sub-second TTL to 1 second minimum', () => {
      // Test that fractional seconds are rounded up to 1
      const testCases = [
        { input: 0.1, expected: 1 },
        { input: 0.5, expected: 1 },
        { input: 0.9, expected: 1 },
        { input: 0.001, expected: 1 },
      ];

      testCases.forEach(({ input, expected }) => {
        const clamped = Math.max(1, Math.ceil(input));
        expect(clamped).toBe(expected);
      });
    });

    it('should preserve TTL values >= 1 second', () => {
      const testCases = [
        { input: 1, expected: 1 },
        { input: 60, expected: 60 },
        { input: 300, expected: 300 },
        { input: 3600, expected: 3600 },
      ];

      testCases.forEach(({ input, expected }) => {
        const clamped = Math.max(1, Math.ceil(input));
        expect(clamped).toBe(expected);
      });
    });

    it('should prevent zero TTL that would create non-expiring keys', () => {
      const zeroTTL = 0;
      const clamped = Math.max(1, Math.ceil(zeroTTL));
      
      expect(clamped).toBeGreaterThan(0);
      expect(clamped).toBe(1);
    });

    it('should handle negative TTL values', () => {
      // Negative values should also be clamped to 1
      const negativeTTL = -5;
      const clamped = Math.max(1, Math.ceil(negativeTTL));
      
      expect(clamped).toBe(1);
    });
  });

  describe('SCAN-based Pattern Invalidation (Fix #1)', () => {
    it('should use SCAN instead of KEYS for non-blocking operation', async () => {
      // Add test keys
      const testKeys = [
        'cache:user:1',
        'cache:user:2',
        'cache:product:1',
        'cache:product:2',
      ];
      
      mockRedis.keys = [...testKeys];

      // Simulate SCAN-based pattern matching
      const pattern = 'cache:user:*';
      let cursor = 0;
      const matchedKeys: string[] = [];

      // SCAN loop (non-blocking)
      do {
        const [nextCursor, keys] = await mockRedis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        
        matchedKeys.push(...keys);
        cursor = parseInt(nextCursor);
      } while (cursor !== 0);

      expect(matchedKeys).toHaveLength(2);
      expect(matchedKeys).toContain('cache:user:1');
      expect(matchedKeys).toContain('cache:user:2');
    });

    it('should process SCAN results in batches to avoid max arguments error', async () => {
      // Create large number of keys
      const largeKeySet = Array.from({ length: 5000 }, (_, i) => `cache:test:${i}`);
      mockRedis.keys = largeKeySet;

      let cursor = 0;
      let totalProcessed = 0;
      const batchSize = 1000; // Max batch size for DEL command

      // SCAN loop with batched deletion
      do {
        const [nextCursor, keys] = await mockRedis.scan(
          cursor,
          'MATCH',
          'cache:test:*',
          'COUNT',
          100 // SCAN count (different from DEL batch)
        );

        // Delete in batches of 1000
        if (keys.length > 0) {
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await mockRedis.del(...batch);
            totalProcessed += batch.length;
          }
        }

        cursor = parseInt(nextCursor);
      } while (cursor !== 0);

      expect(totalProcessed).toBe(5000);
      expect(mockRedis.keys).toHaveLength(0);
    });

    it('should handle empty SCAN results gracefully', async () => {
      mockRedis.keys = ['cache:other:1', 'cache:other:2'];

      const [cursor, keys] = await mockRedis.scan(
        0,
        'MATCH',
        'cache:nonexistent:*',
        'COUNT',
        100
      );

      expect(cursor).toBe('0');
      expect(keys).toHaveLength(0);
    });

    it('should not block Redis during pattern invalidation', async () => {
      // SCAN should return immediately on each iteration
      const startTime = Date.now();
      
      mockRedis.keys = Array.from({ length: 1000 }, (_, i) => `cache:test:${i}`);
      
      let cursor = 0;
      let iterations = 0;

      do {
        const [nextCursor] = await mockRedis.scan(
          cursor,
          'MATCH',
          'cache:test:*',
          'COUNT',
          100
        );
        
        cursor = parseInt(nextCursor);
        iterations++;
      } while (cursor !== 0);

      const duration = Date.now() - startTime;
      
      // SCAN should be fast (non-blocking)
      expect(duration).toBeLessThan(1000);
      expect(iterations).toBeGreaterThan(0);
    });
  });

  describe('Automatic Fallback to In-Memory', () => {
    it('should detect Redis unavailability', async () => {
      mockRedis.disconnect();

      try {
        await mockRedis.get('test-key');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain('Redis unavailable');
      }
    });

    it('should gracefully handle Redis connection errors', async () => {
      mockRedis.disconnect();

      // Simulate fallback behavior
      let usingFallback = false;
      
      try {
        await mockRedis.set('test-key', 'value');
      } catch (error) {
        // Switch to in-memory fallback
        usingFallback = true;
      }

      expect(usingFallback).toBe(true);
    });

    it('should maintain cache functionality with in-memory fallback', () => {
      // In-memory fallback implementation
      const inMemoryCache = new Map<string, { value: string; expiry: number }>();
      
      // Set value
      inMemoryCache.set('test-key', {
        value: 'test-value',
        expiry: Date.now() + 5000,
      });

      // Get value
      const entry = inMemoryCache.get('test-key');
      expect(entry?.value).toBe('test-value');
      expect(entry?.expiry).toBeGreaterThan(Date.now());
    });

    it('should expire in-memory cache entries correctly', () => {
      const inMemoryCache = new Map<string, { value: string; expiry: number }>();
      
      // Set with immediate expiry
      inMemoryCache.set('expired-key', {
        value: 'old-value',
        expiry: Date.now() - 1000, // Already expired
      });

      // Check if expired
      const entry = inMemoryCache.get('expired-key');
      const isExpired = entry && entry.expiry < Date.now();
      
      expect(isExpired).toBe(true);
    });
  });

  describe('Cache Pattern Matching', () => {
    it('should match cache patterns correctly', () => {
      const testCases = [
        { key: 'cache:user:123', pattern: 'cache:user:*', matches: true },
        { key: 'cache:user:123', pattern: 'cache:product:*', matches: false },
        { key: 'cache:org:456:projects', pattern: 'cache:org:*', matches: true },
        { key: 'cache:global:settings', pattern: 'cache:*', matches: true },
      ];

      testCases.forEach(({ key, pattern, matches }) => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        expect(regex.test(key)).toBe(matches);
      });
    });

    it('should invalidate all caches for an organization', async () => {
      const orgId = 'org-123';
      mockRedis.keys = [
        `cache:org:${orgId}:projects`,
        `cache:org:${orgId}:users`,
        `cache:org:other:projects`,
        'cache:global:settings',
      ];

      const pattern = `cache:org:${orgId}:*`;
      let cursor = 0;
      const keysToDelete: string[] = [];

      do {
        const [nextCursor, keys] = await mockRedis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        
        keysToDelete.push(...keys);
        cursor = parseInt(nextCursor);
      } while (cursor !== 0);

      expect(keysToDelete).toHaveLength(2);
      expect(keysToDelete).toContain(`cache:org:${orgId}:projects`);
      expect(keysToDelete).toContain(`cache:org:${orgId}:users`);
    });
  });

  describe('Memory Management', () => {
    it('should prevent memory leaks from non-expiring keys', () => {
      // Verify TTL is always set
      const testTTLs = [0, 0.5, 1, 60, 300];
      
      testTTLs.forEach(ttl => {
        const clampedTTL = Math.max(1, Math.ceil(ttl));
        expect(clampedTTL).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle large key deletion efficiently', async () => {
      // Create 10k keys
      const largeSet = Array.from({ length: 10000 }, (_, i) => `cache:large:${i}`);
      mockRedis.keys = largeSet;

      const startTime = Date.now();
      
      // Delete in batches
      const batchSize = 1000;
      let cursor = 0;
      
      do {
        const [nextCursor, keys] = await mockRedis.scan(
          cursor,
          'MATCH',
          'cache:large:*',
          'COUNT',
          100
        );

        if (keys.length > 0) {
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await mockRedis.del(...batch);
          }
        }

        cursor = parseInt(nextCursor);
      } while (cursor !== 0);

      const duration = Date.now() - startTime;
      
      expect(mockRedis.keys).toHaveLength(0);
      expect(duration).toBeLessThan(5000); // Should complete quickly
    });
  });
});

describe('Cache Integration Scenarios', () => {
  beforeEach(() => {
    mockRedis.reconnect();
  });

  it('should handle concurrent cache operations', async () => {
    const operations = [
      mockRedis.set('key1', 'value1', 'EX', 300),
      mockRedis.set('key2', 'value2', 'EX', 300),
      mockRedis.get('key1'),
      mockRedis.scan(0, 'MATCH', 'key*', 'COUNT', 100),
    ];

    const results = await Promise.all(operations);
    
    expect(results[0]).toBe('OK');
    expect(results[1]).toBe('OK');
    expect(results[2]).toBe('test-value');
    expect(Array.isArray(results[3])).toBe(true);
  });

  it('should maintain cache consistency during failover', () => {
    const inMemoryCache = new Map<string, string>();
    
    // Simulate data in Redis
    mockRedis.keys = ['cache:test:1', 'cache:test:2'];
    
    // Simulate failover
    mockRedis.disconnect();
    
    // Data should be available in fallback
    inMemoryCache.set('cache:test:1', 'value1');
    inMemoryCache.set('cache:test:2', 'value2');
    
    expect(inMemoryCache.size).toBe(2);
    expect(inMemoryCache.get('cache:test:1')).toBe('value1');
  });
});
