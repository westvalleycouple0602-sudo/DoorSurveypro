/**
 * Distributed Caching Layer with Redis
 * Falls back to in-memory cache if Redis is unavailable
 * 
 * UPGRADE: Now uses Redis for multi-instance deployments!
 */

import Redis from 'ioredis';
import { logger } from '../logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface ICacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, data: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  invalidatePattern(pattern: string | RegExp): Promise<number>;
  getStats(): Promise<{ totalEntries: number; activeEntries: number; expiredEntries: number; memoryEstimate: string }>;
}

/**
 * Redis-based cache backend
 */
class RedisCacheBackend implements ICacheBackend {
  private redis: Redis;
  private defaultTTL: number;

  constructor(redis: Redis, defaultTTL: number) {
    this.redis = redis;
    this.defaultTTL = defaultTTL;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      const parsed = JSON.parse(value);
      return parsed as T;
    } catch (error) {
      logger.error('Redis get error', { key, error });
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const value = JSON.stringify(data);
      const ttlMs = ttl || this.defaultTTL;
      const ttlSeconds = Math.floor(ttlMs / 1000);
      
      // Clamp TTL to minimum 1 second to prevent non-expiring keys
      // Sub-second TTLs become 0 which never expires
      const finalTTL = Math.max(1, ttlSeconds);
      
      await this.redis.setex(key, finalTTL, value);
    } catch (error) {
      logger.error('Redis set error', { key, error });
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Redis has error', { key, error });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis delete error', { key, error });
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error('Redis clear error', { error });
    }
  }

  async invalidatePattern(pattern: string | RegExp): Promise<number> {
    try {
      const patternStr = pattern instanceof RegExp ? pattern.source : pattern;
      // Convert regex to Redis glob pattern
      const globPattern = patternStr.replace(/\^/g, '').replace(/\$/g, '').replace(/\.\*/g, '*');
      
      // Use SCAN instead of KEYS to avoid blocking Redis
      // SCAN is non-blocking and suitable for production with large keyspaces
      const keysToDelete: string[] = [];
      let cursor = '0';
      
      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH', globPattern,
          'COUNT', 100  // Batch size
        );
        
        cursor = result[0];
        const matchedKeys = result[1];
        
        if (matchedKeys.length > 0) {
          keysToDelete.push(...matchedKeys);
        }
      } while (cursor !== '0');
      
      if (keysToDelete.length === 0) return 0;
      
      // Delete in batches to avoid exceeding max arguments
      const batchSize = 1000;
      for (let i = 0; i < keysToDelete.length; i += batchSize) {
        const batch = keysToDelete.slice(i, i + batchSize);
        await this.redis.del(...batch);
      }
      
      return keysToDelete.length;
    } catch (error) {
      logger.error('Redis invalidatePattern error', { pattern, error });
      return 0;
    }
  }

  async getStats() {
    try {
      const dbSize = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryEstimate = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      
      return {
        totalEntries: dbSize,
        activeEntries: dbSize,
        expiredEntries: 0,
        memoryEstimate,
      };
    } catch (error) {
      logger.error('Redis getStats error', { error });
      return {
        totalEntries: 0,
        activeEntries: 0,
        expiredEntries: 0,
        memoryEstimate: '0 KB',
      };
    }
  }
}

/**
 * In-memory fallback cache backend
 */
class InMemoryCacheBackend implements ICacheBackend {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultTTL: number) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async invalidatePattern(pattern: string | RegExp): Promise<number> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;
    
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  async getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    const values = Array.from(this.cache.values());
    for (const entry of values) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        activeEntries++;
      }
    }
    
    const bytes = JSON.stringify(Array.from(this.cache.entries())).length;
    const memoryEstimate = 
      bytes < 1024 ? `${bytes} B` :
      bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(2)} KB` :
      `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    
    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      memoryEstimate,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

/**
 * Unified cache manager that works with either Redis or in-memory
 */
class CacheManager {
  private backend: ICacheBackend;
  private defaultTTL: number;
  private usingRedis: boolean = false;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
    
    // Start with in-memory cache as default
    this.backend = new InMemoryCacheBackend(defaultTTL);
    
    // Try to connect to Redis asynchronously
    this.initializeRedis(defaultTTL);
  }

  private parseRedisUrl(redisUrl: string): any {
    try {
      const url = new URL(redisUrl);
      const useTLS = url.protocol === 'rediss:';
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        tls: useTLS ? {} : undefined,
        connectTimeout: 5000,
        retryStrategy: (times: number) => {
          if (times > 1) return null;
          return 100;
        },
        enableReadyCheck: false,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
        showFriendlyErrorStack: false,
      };
    } catch (error) {
      logger.warn('Failed to parse REDIS_URL for cache', { error });
      return null;
    }
  }

  private async initializeRedis(defaultTTL: number) {
    let redisClient: Redis | null = null;
    try {
      // Support both REDIS_URL and individual connection parameters
      const redisUrl = process.env.REDIS_URL;
      
      if (redisUrl) {
        // Parse the URL to get proper connection config (handles Upstash rediss:// URLs)
        const parsedConfig = this.parseRedisUrl(redisUrl);
        if (parsedConfig) {
          redisClient = new Redis(parsedConfig);
        }
      }
      
      if (!redisClient) {
        // Fall back to individual connection parameters
        const redisHost = process.env.REDIS_HOST || '127.0.0.1';
        const redisPort = parseInt(process.env.REDIS_PORT || '6379');
        const redisPassword = process.env.REDIS_PASSWORD;
        
        // Enable TLS for cloud providers (Upstash, Redis Cloud, etc.)
        // Detect by hostname patterns or presence of password
        const needsTLS = redisHost.includes('upstash.io') || 
                        redisHost.includes('redis.cloud') || 
                        redisHost.includes('amazonaws.com') ||
                        (redisPassword && redisHost !== '127.0.0.1' && redisHost !== 'localhost');
        
        redisClient = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          tls: needsTLS ? {} : undefined,
          connectTimeout: 5000,
          retryStrategy: (times) => {
            if (times > 1) return null;
            return 100;
          },
          enableReadyCheck: false,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
          showFriendlyErrorStack: false,
        });
      }

      // Suppress ALL error events BEFORE attempting connection
      redisClient.on('error', () => {
        // Silent - errors are handled in catch blocks
      });

      // Suppress reconnecting events
      redisClient.on('reconnecting', () => {
        // Silent - we already logged the fallback warning
      });

      // Suppress connect events to prevent connection errors from showing
      redisClient.on('connect', () => {
        // Silent success
      });

      // Attempt connection with timeout
      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      // Test connection
      await redisClient.ping();
      
      this.backend = new RedisCacheBackend(redisClient!, defaultTTL);
      this.usingRedis = true;
      logger.info('✅ Cache: Using Redis for distributed caching');
    } catch (error) {
      // Clean up failed client
      if (redisClient) {
        try {
          await redisClient.quit();
        } catch {
          // Ignore cleanup errors
        }
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn('⚠️  Redis unavailable, using in-memory cache fallback', { error: errorMsg });
      // Already initialized with in-memory backend
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return await this.backend.get<T>(key);
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.backend.set(key, data, ttl);
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    return await this.backend.has(key);
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<boolean> {
    return await this.backend.delete(key);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.backend.clear();
  }

  /**
   * Invalidate all keys matching a pattern
   */
  async invalidatePattern(pattern: string | RegExp): Promise<number> {
    return await this.backend.invalidatePattern(pattern);
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetchFn();
    await this.set(key, data, ttl);
    
    return data;
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const stats = await this.backend.getStats();
    return {
      ...stats,
      backend: this.usingRedis ? 'redis' : 'in-memory',
    };
  }

  /**
   * Check if using Redis
   */
  isUsingRedis(): boolean {
    return this.usingRedis;
  }

  /**
   * Cleanup resources (primarily for in-memory cache intervals)
   * Should be called during graceful shutdown
   */
  destroy(): void {
    if (this.backend instanceof InMemoryCacheBackend) {
      this.backend.destroy();
    }
  }
}

// Singleton instance
export const cache = new CacheManager();

/**
 * Cache key builders for consistent naming
 */
export const CacheKeys = {
  // Product catalog
  catalogItem: (id: number) => `catalog:item:${id}`,
  catalogByOrg: (orgId: number) => `catalog:org:${orgId}`,
  catalogByCategory: (category: string) => `catalog:category:${category}`,
  
  // Organization settings
  orgSettings: (orgId: number) => `org:settings:${orgId}`,
  orgMembers: (orgId: number) => `org:members:${orgId}`,
  
  // User permissions
  userPermissions: (userId: number) => `user:permissions:${userId}`,
  userRole: (userId: number, orgId: number) => `user:role:${userId}:${orgId}`,
  
  // Manufacturer data
  manufacturer: (id: number) => `manufacturer:${id}`,
  manufacturers: () => `manufacturers:all`,
  manufacturersByOrg: (orgId: string) => `manufacturers:org:${orgId}`,
  
  // Distributor data (org-scoped)
  distributors: (orgId: string) => `distributors:org:${orgId}`,
  
  // Partner pricing
  partnerPricing: (itemId: number) => `partner:pricing:${itemId}`,
  
  // Compliance rules
  complianceRules: () => `compliance:rules:all`,
  
  // Door/frame options
  doorOptions: () => `options:doors`,
  frameOptions: () => `options:frames`,
  
  // Hardware components
  hardwareComponents: (type: string) => `hardware:${type}`,
};

/**
 * Cache middleware for Express routes
 */
export function cacheMiddleware(ttl: number = 5 * 60 * 1000) {
  return (req: any, res: any, next: any) => {
    const key = `route:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    
    // Async cache check
    cache.get(key).then((cached) => {
      if (cached) {
        return res.json(cached);
      }
      
      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        cache.set(key, data, ttl).catch(err => logger.error('Cache set error in middleware', { error: err }));
        return originalJson(data);
      };
      
      next();
    }).catch((error) => {
      logger.error('Cache middleware error', { error });
      next();
    });
  };
}

/**
 * Cache invalidation helpers
 */
export const InvalidateCache = {
  catalogItem: async (id: number) => {
    await cache.delete(CacheKeys.catalogItem(id));
    await cache.invalidatePattern(/^catalog:org:/);
    await cache.invalidatePattern(/^catalog:category:/);
  },
  
  organization: async (orgId: number) => {
    await cache.invalidatePattern(new RegExp(`org:.*:${orgId}`));
    await cache.invalidatePattern(new RegExp(`catalog:org:${orgId}`));
  },
  
  user: async (userId: number) => {
    await cache.invalidatePattern(new RegExp(`user:.*:${userId}`));
  },
  
  all: async () => {
    await cache.clear();
  },
};
