# Production Deployment Guide

This guide covers deploying DoorSurvey Pro with external Redis services for distributed caching and job queue management.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [External Redis Services](#external-redis-services)
4. [Environment Configuration](#environment-configuration)
5. [Database Migration](#database-migration)
6. [Health Monitoring](#health-monitoring)
7. [Operational Procedures](#operational-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Overview

DoorSurvey Pro uses Redis for:
- **Distributed Cache**: High-performance caching with SCAN-based invalidation
- **Job Queue (BullMQ)**: Production-grade background job processing

Both components feature **automatic in-memory fallback** when Redis is unavailable, ensuring zero downtime.

### Production-Ready Features
✅ **SCAN-based Pattern Invalidation**: Non-blocking cache invalidation  
✅ **TTL Clamping (≥1s)**: Prevents non-expiring keys from sub-second TTLs  
✅ **Runtime Health Monitoring**: Automatic failover after 3 consecutive failures (≈90s)  
✅ **Handler Re-registration**: Zero data loss during failover  
✅ **Graceful Degradation**: Automatic in-memory fallback

---

## Prerequisites

### Required Services
- **PostgreSQL Database**: Primary data store (Neon serverless recommended)
- **Node.js 20+**: Application runtime
- **Redis (Optional)**: Distributed cache and job queue backend

### Production Environment
- **Memory**: Minimum 512MB RAM (1GB+ recommended)
- **CPU**: 1+ vCPU
- **Storage**: 10GB+ available disk space
- **Network**: Stable connection to Redis and PostgreSQL

---

## External Redis Services

### Recommended Redis Providers

#### 1. Upstash Redis (Recommended for Replit)
**Why Upstash?**
- Serverless Redis with REST API
- Pay-per-request pricing (free tier: 10,000 requests/day)
- Global edge network for low latency
- Built-in persistence and replication

**Setup:**
```bash
# 1. Create account at https://upstash.com
# 2. Create Redis database (select closest region)
# 3. Copy the Redis connection URL
# 4. Add to environment:
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
```

#### 2. Redis Cloud (Enterprise Option)
**Why Redis Cloud?**
- Fully managed by Redis Labs
- High availability and automatic failover
- Advanced features (search, JSON, time series)
- Dedicated resources

**Setup:**
```bash
# 1. Create account at https://redis.com/try-free
# 2. Create subscription and database
# 3. Copy connection details
# 4. Add to environment:
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT:PORT
```

#### 3. AWS ElastiCache (AWS Ecosystem)
**Why ElastiCache?**
- Integrated with AWS services
- Multi-AZ deployment for high availability
- Automatic backups and snapshots
- VPC network isolation

**Setup:**
```bash
# 1. Create ElastiCache cluster in AWS Console
# 2. Configure security groups (allow port 6379)
# 3. Note the primary endpoint
# 4. Add to environment:
REDIS_URL=redis://YOUR_CLUSTER_ENDPOINT:6379
```

#### 4. Azure Cache for Redis (Azure Ecosystem)
**Why Azure Cache?**
- Fully managed Redis service
- Zone redundancy and geo-replication
- Integration with Azure services
- Enterprise features available

**Setup:**
```bash
# 1. Create Azure Cache for Redis in Azure Portal
# 2. Select appropriate pricing tier
# 3. Copy connection string
# 4. Add to environment:
REDIS_URL=redis://:YOUR_ACCESS_KEY@YOUR_NAME.redis.cache.windows.net:6380?ssl=true
```

---

## Environment Configuration

### Required Environment Variables

```bash
# PostgreSQL Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis Configuration (Optional - falls back to in-memory)
REDIS_URL=redis://default:password@host:port

# Session Management (Required)
SESSION_SECRET=your-secure-random-string-min-32-chars

# Stripe Integration (Optional)
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# OpenAI Integration (Optional)
OPENAI_API_KEY=sk-...

# Email Service (Optional)
RESEND_API_KEY=re_...

# Admin Account (Required)
ADMIN_USER=admin@example.com
ADMIN_PASS=secure-admin-password
```

### Redis URL Format

```bash
# Standard Redis
REDIS_URL=redis://username:password@host:port/database

# Redis with TLS (Upstash, Redis Cloud)
REDIS_URL=rediss://username:password@host:port/database

# Examples:
# Local development
REDIS_URL=redis://localhost:6379

# Upstash (with TLS)
REDIS_URL=rediss://default:abc123@region.upstash.io:6379

# Redis Cloud
REDIS_URL=redis://default:password@cluster.cloud.redislabs.com:12345
```

### Cache Configuration (Optional)

Advanced cache tuning via environment variables (defaults shown):

```bash
# Cache TTL settings (seconds)
CACHE_DEFAULT_TTL=300      # Default cache entry lifetime
CACHE_MIN_TTL=1            # Minimum TTL to prevent non-expiring keys

# Cache invalidation settings
CACHE_SCAN_BATCH_SIZE=100     # SCAN batch size for pattern invalidation
CACHE_DELETE_BATCH_SIZE=1000  # Delete batch size for cleanup

# Health monitoring
CACHE_HEALTH_CHECK_INTERVAL=30  # Seconds between health checks
CACHE_FAILURE_THRESHOLD=3       # Failures before failover (≈90s)
```

---

## Database Migration

### Using Drizzle ORM

```bash
# 1. Ensure DATABASE_URL is set
echo $DATABASE_URL

# 2. Generate migration files (if schema changed)
npm run db:generate

# 3. Apply migrations to production database
npm run db:migrate

# 4. Or use force push (development/staging only)
npm run db:push --force
```

### Production Migration Checklist

- [ ] Backup production database before migration
- [ ] Review migration SQL files in `server/migrations/`
- [ ] Test migrations on staging environment first
- [ ] Schedule migration during low-traffic window
- [ ] Monitor application logs during migration
- [ ] Verify database indexes are created
- [ ] Test critical application workflows post-migration

---

## Health Monitoring

### Built-in Health Endpoints

The application provides comprehensive health endpoints:

```bash
# Liveness probe (is the server alive?)
GET /_health/alive
# Returns: 200 OK

# Readiness probe (is the server ready to serve traffic?)
GET /_health/ready
# Returns: 200 OK (ready) or 503 Service Unavailable (not ready)

# Application metrics
GET /_health/metrics
# Returns: JSON with application, cache, and queue metrics

# Infrastructure health dashboard
GET /api/infrastructure/health
# Returns: JSON with cache and queue status

# Cache statistics
GET /api/infrastructure/cache
# Returns: JSON with cache backend, entries, memory usage

# Job queue statistics
GET /api/infrastructure/queue
# Returns: JSON with queue backend, job counts, processing stats
```

### Integration with Load Balancers

**Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /_health/alive
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /_health/ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

**AWS Application Load Balancer:**
```
Health Check Path: /_health/ready
Healthy Threshold: 2
Unhealthy Threshold: 3
Timeout: 5 seconds
Interval: 10 seconds
Success Codes: 200
```

### Infrastructure Health Dashboard

Access the real-time infrastructure dashboard at:
```
https://your-domain.com/infrastructure
```

**Features:**
- Overall infrastructure status (healthy/degraded)
- Cache backend status (Redis/in-memory)
- Job queue backend status (BullMQ/in-memory)
- Real-time metrics (entries, jobs, memory usage)
- Configuration details
- Production readiness indicators

---

## Operational Procedures

### Deployment Workflow

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Run database migrations
npm run db:migrate

# 4. Build frontend
npm run build

# 5. Start application
npm start
```

### Zero-Downtime Deployment

**Using Process Manager (PM2):**
```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start npm --name "doorsurvey-pro" -- start

# Deploy updates without downtime
pm2 reload doorsurvey-pro

# Monitor application
pm2 logs doorsurvey-pro
pm2 monit
```

### Scaling Considerations

#### Horizontal Scaling (Multiple Instances)

When running multiple instances:

1. **Session Management**: Uses PostgreSQL-backed session store (already configured)
2. **Cache Consistency**: Redis ensures cache consistency across instances
3. **Job Processing**: BullMQ prevents duplicate job processing
4. **Static Assets**: Serve via CDN or shared storage

**Load Balancer Configuration:**
```
- Sticky Sessions: Not required (session store is shared)
- Health Check: Use /_health/ready endpoint
- Connection Draining: 30-60 seconds recommended
```

#### Vertical Scaling (Instance Size)

**Memory Guidelines:**
- **Small** (512MB): Up to 100 concurrent users
- **Medium** (1GB): Up to 500 concurrent users
- **Large** (2GB+): 500+ concurrent users

**CPU Guidelines:**
- **1 vCPU**: Light workloads, development
- **2 vCPU**: Standard production workloads
- **4+ vCPU**: Heavy AI/OCR processing

---

## Troubleshooting

### Redis Connection Issues

**Symptom:** Application logs show "Redis connection failed, using in-memory fallback"

**Solutions:**
1. Verify `REDIS_URL` is set correctly
2. Check Redis service is running and accessible
3. Verify network connectivity (firewall, security groups)
4. Test connection manually:
   ```bash
   redis-cli -u $REDIS_URL ping
   # Should return: PONG
   ```
5. Check Redis service status on provider dashboard
6. Application will continue working with in-memory fallback

### Cache Failover (90-Second Timeline)

**What Happens:**
1. **0s**: Redis becomes unavailable
2. **30s**: First health check fails (logged as warning)
3. **60s**: Second health check fails (logged as error)
4. **90s**: Third health check fails → Automatic failover to in-memory
5. **90s+**: Application continues with in-memory cache

**Monitoring:**
```bash
# Watch application logs for health check failures
grep "Cache health check failed" logs/application.log

# Check infrastructure health dashboard
curl https://your-domain.com/api/infrastructure/health
```

**Recovery:**
- When Redis becomes available again, health checks will succeed
- Application automatically reconnects to Redis
- No manual intervention required

### Job Queue Issues

**Symptom:** Background jobs not processing

**Solutions:**
1. Check job queue backend status:
   ```bash
   curl https://your-domain.com/api/infrastructure/queue
   ```
2. Verify Redis connection (BullMQ requires Redis)
3. Check job queue logs:
   ```bash
   grep "Job queue" logs/application.log
   ```
4. Inspect failed jobs in BullMQ dashboard (if installed)
5. If using in-memory fallback, jobs will process but may be lost on restart

### Performance Degradation

**Symptom:** Slow response times, high memory usage

**Solutions:**
1. Check application metrics:
   ```bash
   curl https://your-domain.com/_health/metrics
   ```
2. Review cache hit rates (should be >80% for optimal performance)
3. Monitor database query performance:
   ```sql
   -- Check slow queries (if PostgreSQL)
   SELECT query, calls, mean_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```
4. Scale Redis instance if cache operations are slow
5. Consider vertical scaling if memory usage is high
6. Review application logs for errors or warnings

### Database Connection Pool Exhaustion

**Symptom:** "Too many database connections" errors

**Solutions:**
1. Increase connection pool size (if resources allow):
   ```javascript
   // In server/db.ts
   max: 20, // Increase from default 10
   ```
2. Review long-running queries
3. Check for connection leaks (unreleased connections)
4. Consider connection pooling proxy (PgBouncer)

---

## Monitoring Best Practices

### Key Metrics to Track

**Application Health:**
- Uptime percentage (target: 99.9%+)
- Request response time (p50, p95, p99)
- Error rate (target: <0.1%)
- Memory usage (target: <80% of available)

**Cache Performance:**
- Hit rate (target: >80%)
- Entry count (monitor growth)
- Memory usage (prevent exhaustion)
- Backend status (Redis vs in-memory)

**Job Queue:**
- Processing rate (jobs/second)
- Queue depth (waiting jobs)
- Failed job count (investigate failures)
- Average job duration

**Database:**
- Connection pool usage
- Query response time
- Slow query count
- Replication lag (if applicable)

### Alerting Strategy

**Critical Alerts (Immediate Response):**
- Application down (/_health/alive returns 503)
- Database connection failure
- Error rate >1%
- Memory usage >90%

**Warning Alerts (Review Within Hours):**
- Cache failover to in-memory
- Job queue failover to in-memory
- Error rate >0.5%
- Slow query count increasing

**Info Alerts (Review Daily):**
- Cache hit rate <80%
- Job processing rate declining
- Memory usage trending up

### Logging Strategy

**Structured Logging (Winston):**
```javascript
// Logs include:
- timestamp
- level (error, warn, info, debug)
- message
- context (userId, orgId, requestId)
- performance metrics
```

**Log Retention:**
- **Production**: 30 days minimum
- **Staging**: 7 days
- **Development**: 1 day

**Log Aggregation:**
Consider using:
- **Datadog**: Full-featured observability platform
- **Sentry**: Error tracking and performance monitoring
- **LogDNA**: Log aggregation and search
- **CloudWatch Logs**: AWS-native logging (if on AWS)

---

## Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use secret management service (AWS Secrets Manager, Azure Key Vault)
- Rotate credentials regularly (quarterly minimum)
- Use different credentials for production/staging

### Redis Security
- Enable authentication (password required)
- Use TLS/SSL for connections (rediss://)
- Restrict network access (firewall rules)
- Disable dangerous commands (FLUSHDB, FLUSHALL)

### Database Security
- Use connection pooling to prevent exhaustion
- Enable SSL/TLS for database connections
- Implement row-level security for multi-tenancy
- Regular security audits and patches

---

## Disaster Recovery

### Backup Strategy

**Database Backups:**
- Automated daily backups (Neon provides this)
- Point-in-time recovery capability
- Test restore procedure quarterly
- Store backups in different region/availability zone

**Redis Backups:**
- Enable RDB snapshots (if supported by provider)
- AOF persistence for durability (if supported)
- Note: Cache can be rebuilt from database if lost

### Recovery Procedures

**Database Failure:**
1. Application will show errors (database connection failed)
2. Restore from latest backup
3. Replay transaction logs (if available)
4. Update DATABASE_URL to restored instance
5. Restart application

**Redis Failure:**
1. Application automatically falls back to in-memory
2. No immediate action required
3. Investigate and fix Redis service
4. Application reconnects automatically
5. Cache rebuilds from database queries

**Complete Outage:**
1. Spin up new infrastructure
2. Restore database from backup
3. Configure environment variables
4. Deploy application
5. Verify health endpoints
6. Update DNS/load balancer

---

## Checklist: Production Launch

- [ ] External Redis configured and tested
- [ ] Database migrations applied and verified
- [ ] Environment variables set (all required secrets)
- [ ] Health endpoints tested (/_health/alive, /_health/ready)
- [ ] Infrastructure dashboard accessible (/infrastructure)
- [ ] Load balancer health checks configured
- [ ] SSL/TLS certificates installed
- [ ] DNS records configured
- [ ] Monitoring and alerting set up
- [ ] Backup procedures tested
- [ ] Disaster recovery plan documented
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Runbook created for on-call team

---

## Additional Resources

- [Redis Setup Guide](./REDIS_SETUP.md)
- [BullMQ Setup Guide](./BULLMQ_SETUP.md)
- [Infrastructure Upgrades Summary](./INFRASTRUCTURE_UPGRADES.md)
- [Replit Deployment Docs](https://docs.replit.com/hosting/deployments/about-deployments)

---

**Last Updated:** October 26, 2025  
**Version:** 1.0.0  
**Maintainer:** DoorSurvey Pro Team
