import Redis from 'ioredis';
import { logger } from '../logger';

let redisClient: Redis | null = null;
let connectionErrorLogged = false;

function parseRedisUrl(redisUrl: string): any {
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
        if (times > 3) {
          if (!connectionErrorLogged) {
            connectionErrorLogged = true;
            logger.warn('Redis unavailable after retries - features disabled');
          }
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    };
  } catch (error) {
    logger.warn('Failed to parse REDIS_URL');
    return null;
  }
}

function initializeRedis(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  try {
    const parsedConfig = parseRedisUrl(redisUrl);
    if (!parsedConfig) {
      return null;
    }
    
    redisClient = new Redis(parsedConfig);

    redisClient.on('error', () => {
      if (!connectionErrorLogged) {
        connectionErrorLogged = true;
        logger.warn('Redis connection error - caching disabled');
      }
    });

    redisClient.on('connect', () => {
      connectionErrorLogged = false;
      logger.info('Redis connected');
    });

    return redisClient;
  } catch (error) {
    logger.warn('Failed to initialize Redis');
    return null;
  }
}

export function getRedisClient(): Redis | null {
  if (!redisClient) {
    redisClient = initializeRedis();
  }
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

export async function atomicRateLimitIncrement(
  key: string,
  ttlSeconds: number
): Promise<number | null> {
  const client = getRedisClient();
  
  if (!client) {
    return null;
  }

  try {
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      return current
    `;

    const result = await client.eval(
      luaScript,
      1,
      key,
      ttlSeconds.toString()
    );

    return result as number;
  } catch (error) {
    if (!connectionErrorLogged) {
      connectionErrorLogged = true;
      logger.warn('Redis rate limit operation failed', { key });
    }
    return null;
  }
}
