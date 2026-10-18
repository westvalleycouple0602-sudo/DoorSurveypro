# Redis Setup Guide

## Overview

DoorSurvey Pro uses Redis for distributed caching across multiple instances. The caching layer automatically falls back to in-memory storage if Redis is unavailable.

## Architecture

- **Primary Backend**: Redis (ioredis client)
- **Fallback Backend**: In-memory Map with TTL expiration
- **Connection**: Localhost on port 6379
- **Memory Limit**: 256MB with LRU eviction policy

## Development Setup

### Manual Start (Temporary)

Start Redis manually for the current session:

```bash
redis-server --daemonize yes --port 6379 --bind 127.0.0.1 \
  --maxmemory 256mb --maxmemory-policy allkeys-lru
```

Verify Redis is running:

```bash
redis-cli ping  # Should return "PONG"
```

### Automated Start (Recommended)

Use the provided startup script that ensures Redis is ready before the app starts:

```bash
bash scripts/start-with-redis.sh
```

This script:
1. Starts Redis in daemon mode
2. Waits for Redis to be ready (up to 5 seconds)
3. Starts the application
4. Falls back to in-memory cache if Redis fails

## Production Deployment

### Option 1: Self-Hosted Redis

For production deployments on Replit, Redis must be started before the application:

1. **Update deployment build script** to start Redis:
   ```json
   {
     "scripts": {
       "start": "redis-server --daemonize yes && node dist/index.js"
     }
   }
   ```

2. **Configure memory limits** based on instance size:
   ```bash
   redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
   ```

### Option 2: External Redis Service (Recommended)

For multi-instance deployments, use a managed Redis service:

#### Upstash (Serverless Redis)
- **Free Tier**: 10K commands/day
- **Setup**:
  1. Create account at [upstash.com](https://upstash.com)
  2. Create a new Redis database
  3. Get connection credentials
  4. Add to Replit Secrets:
     - `REDIS_HOST`
     - `REDIS_PORT`
     - `REDIS_PASSWORD`

#### Redis Cloud
- **Free Tier**: 30MB storage
- **Setup**: Similar to Upstash

#### Railway
- **Free Tier**: $5 credit
- **Setup**: One-click Redis deployment

### Environment Variables

Update `server/utils/cache.ts` to use environment variables:

```typescript
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  // ... other options
});
```

## Cache Configuration

### TTL (Time-To-Live) Settings

```typescript
// Default: 5 minutes
const cache = new CacheManager(5 * 60 * 1000);

// Custom per operation
await cache.set('key', data, 10 * 60 * 1000); // 10 minutes
```

### Memory Policy

Redis is configured with `allkeys-lru` eviction policy:
- Least Recently Used (LRU) keys are evicted when memory limit is reached
- Ensures cache doesn't crash when full
- Optimal for general-purpose caching

## Monitoring

### Cache Statistics

Check cache status via API endpoint:

```bash
GET /_health/metrics
```

Response includes:
```json
{
  "cache": {
    "backend": "redis",
    "totalEntries": 1234,
    "activeEntries": 1234,
    "memoryEstimate": "45.2 MB"
  }
}
```

### Redis Monitoring

```bash
# Check Redis status
redis-cli ping

# Get memory usage
redis-cli info memory

# Get database size
redis-cli dbsize

# Monitor real-time commands
redis-cli monitor

# Get cache keys
redis-cli keys '*'
```

## Troubleshooting

### Redis Connection Refused

**Symptoms**: App logs show "Redis unavailable, using in-memory cache fallback"

**Solution**:
1. Check if Redis is running: `redis-cli ping`
2. Start Redis: `redis-server --daemonize yes`
3. Restart application

### Memory Errors

**Symptoms**: Redis logs show "OOM command not allowed"

**Solution**:
1. Increase memory limit: `redis-server --maxmemory 512mb`
2. Clear cache: `redis-cli FLUSHDB`
3. Review cache TTL settings

### Performance Issues

**Symptoms**: Slow cache responses

**Solutions**:
1. Check Redis memory usage: `redis-cli info memory`
2. Review eviction policy effectiveness
3. Consider upgrading to external Redis service
4. Implement cache key namespacing

## Cache Key Patterns

The application uses structured cache keys:

```typescript
// Product catalog
catalog:item:123
catalog:org:456
catalog:category:doors

// Organization
org:settings:789
org:members:789

// User permissions
user:permissions:101
user:role:101:789

// Manufacturer data
manufacturer:123
manufacturers:all

// Partner pricing
partner:pricing:456
```

## Cache Invalidation

### Automatic Invalidation

```typescript
// Invalidate specific item and related patterns
await InvalidateCache.catalogItem(123);

// Invalidate all organization data
await InvalidateCache.organization(456);

// Invalidate all user data
await InvalidateCache.user(101);

// Clear all cache
await InvalidateCache.all();
```

### Manual Invalidation

```bash
# Clear specific key
redis-cli del catalog:item:123

# Clear pattern
redis-cli keys 'catalog:org:*' | xargs redis-cli del

# Clear all cache
redis-cli flushdb
```

## Best Practices

1. **Always use TTL**: Set appropriate expiration times for all cached data
2. **Pattern-based invalidation**: Use consistent key patterns for easy invalidation
3. **Monitor memory**: Keep Redis memory usage below 80% of limit
4. **Graceful fallback**: App continues working if Redis fails
5. **Structured keys**: Use consistent naming conventions
6. **Test fallback**: Verify in-memory cache works when Redis is unavailable

## Security

### Network Security

- **Development**: Redis binds to 127.0.0.1 (localhost only)
- **Production**: Use Redis AUTH and TLS for external connections

### Authentication

Add password protection for production:

```bash
redis-server --requirepass <strong-password>
```

Update client configuration:

```typescript
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});
```

## Migration Path

### From In-Memory to Redis

1. Install Redis: Already done ✅
2. Update cache.ts: Already done ✅
3. Start Redis server
4. Restart application
5. Verify Redis backend: Check logs for "Using Redis for distributed caching"

### From Redis to External Service

1. Create external Redis instance
2. Add connection credentials to Secrets
3. Update cache.ts with environment variables
4. Test connection
5. Deploy

## Related Documentation

- [Performance Optimization Guide](../IMPLEMENTATION_SUMMARY.md#performance-optimization)
- [Deployment Guide](../A_PLUS_DEPLOYMENT_GUIDE.md)
- [Bull/BullMQ Job Queue Setup](./BULL_SETUP.md) (Coming soon)
