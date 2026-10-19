# DoorSurvey Pro - Deployment Guide
**Last Updated:** February 7, 2026
**Platform Version:** v2.0

---

## Overview

This guide covers deploying DoorSurvey Pro to production. The platform runs on Replit with Neon PostgreSQL, and supports Redis and NATS for production-scale workloads.

---

## Architecture

```
                    +------------------+
                    |   Load Balancer  |
                    |   (Replit Edge)  |
                    +--------+---------+
                             |
                    +--------+---------+
                    |   Express Server |
                    |   (Port 5000)    |
                    |   + Vite SPA     |
                    +--------+---------+
                             |
            +----------------+----------------+
            |                |                |
   +--------+------+  +-----+------+  +------+-------+
   |  PostgreSQL   |  |   Redis    |  |    NATS      |
   |  (Neon)       |  |  (Cache)   |  |  (Events)    |
   +---------------+  +------------+  +--------------+
```

### Component Responsibilities
- **Express + Vite SPA:** Serves both API and frontend SPA from a single port (5000)
- **PostgreSQL (Neon):** Primary data store with Drizzle ORM, 169 tables/enums
- **Redis:** Distributed cache, BullMQ job queue backend, session store
- **NATS:** Event-driven async processing for webhooks, notifications, sync

---

## Prerequisites

### Required Services
| Service | Purpose | Required? |
|---|---|---|
| Neon PostgreSQL | Primary database | Yes (provided by Replit) |
| Redis | Cache, job queue | Recommended (graceful fallback to in-memory) |
| NATS | Event bus | Optional (async processing) |

### Required Secrets
| Secret | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-provisioned on Replit) |
| `SESSION_SECRET` | Express session encryption key |

### Optional Secrets (Enable Features)
| Secret | Purpose |
|---|---|
| `REDIS_URL` | Redis connection for cache/queue |
| `NATS_URL` | NATS connection for event bus |
| `OPENAI_API_KEY` | AI chat, compliance RAG, photo analysis |
| `STRIPE_SECRET_KEY` | Subscription billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `RESEND_API_KEY` | Email delivery |
| `HUBSPOT_ACCESS_TOKEN` | CRM synchronization |
| `SENTRY_DSN` | Error tracking |
| `VITE_SENTRY_DSN` | Frontend error tracking |

---

## Deployment Steps

### 1. Database Setup

The Replit PostgreSQL database is automatically provisioned. Push the schema:

```bash
npm run db:push
```

If schema conflicts exist:

```bash
npm run db:push --force
```

### 2. Seed Data (Optional)

Load initial reference data. Available seed scripts:

```bash
npx tsx server/seed-lock-data.ts
npx tsx server/seed-compliance.ts
npx tsx server/seed-door-frame-options.ts
npx tsx server/seed-taxonomy.ts
npx tsx server/seed-reference-library.ts
npx tsx server/seed-access-control.ts
npx tsx server/seed-bom-templates.ts
npx tsx server/seed-integrations.ts
npx tsx server/seed-sample-openings.ts
```

### 3. Environment Configuration

Set required secrets through the Replit Secrets panel:

1. `SESSION_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Configure optional services as needed (Stripe, OpenAI, etc.)

### 4. Start the Application

The application starts via the configured workflow:

```bash
npm run dev
```

This starts both the Express API server and Vite frontend on port 5000.

### 5. Publish

Use Replit's built-in publishing to make the application publicly accessible. The platform handles TLS, health checks, and domain configuration.

---

## Infrastructure Configuration

### Redis Setup

Redis provides distributed caching and BullMQ job queue support. If unavailable, the platform automatically falls back to in-memory implementations.

**Failover behavior:**
- 3-failure threshold triggers fallback (approximately 90 seconds)
- Automatic reconnection when Redis becomes available
- TTL management clamped to 1 second minimum to prevent memory leaks
- SCAN-based cache invalidation (non-blocking)

**Recommended providers:** Upstash (serverless), Redis Cloud, Railway

### NATS Setup

NATS enables event-driven async processing for:
- Webhook delivery with retry logic
- Email notification queuing
- HubSpot sync events
- Background LiDAR processing

The platform operates without NATS but webhook delivery and async tasks run synchronously.

---

## Health Checks

The platform exposes three health endpoints:

| Endpoint | Purpose | Expected Response |
|---|---|---|
| `/_health/alive` | Liveness probe | `200 OK` |
| `/_health/ready` | Readiness probe (checks DB) | `200 OK` with service status |
| `/_health/metrics` | Performance metrics | JSON metrics payload |

### Infrastructure Dashboard

Access the real-time infrastructure monitoring dashboard at `/infrastructure` for:
- Cache hit/miss rates
- Job queue depth and processing rates
- Database connection pool status
- 5-second auto-refresh

---

## Security Checklist

- [ ] `SESSION_SECRET` set to a strong random value (64+ bytes)
- [ ] CSRF protection enabled (automatic in production)
- [ ] Rate limiting active on all endpoints
- [ ] Helmet.js security headers configured
- [ ] Multi-tenant isolation middleware active
- [ ] Webhook signatures verified (HMAC-SHA256)
- [ ] No secrets in client-side code
- [ ] Database connection uses SSL

---

## Performance Considerations

### Database
- 50+ indexes defined in schema for query optimization
- Connection pooling via Neon serverless driver
- No N+1 query patterns (verified via code audit)

### Caching Strategy
- Redis distributed cache for frequently accessed data
- In-memory fallback with TTL management
- Cache invalidation via SCAN-based pattern matching

### Frontend
- Vite code splitting and lazy loading
- TanStack Query with stale-while-revalidate
- Skeleton loading states for perceived performance
- Web Vitals monitoring via RUM

### Background Processing
- BullMQ for email queuing, report generation, data imports
- NATS for event-driven webhook delivery
- Automatic retry with exponential backoff

---

## Monitoring & Alerting

### Logging
- Winston structured logging with configurable levels
- Request/response logging with correlation IDs
- Sensitive data redaction in logs

### Error Tracking
- Sentry integration (backend and frontend)
- Error boundary fallback UI
- Unhandled rejection and exception capture

### Metrics
- Real User Monitoring (RUM) via web-vitals
- Infrastructure health API (`/api/infrastructure/*`)
- Cache, queue, and database health monitoring

---

## Troubleshooting

### Common Issues

**Database connection failures:**
- Verify `DATABASE_URL` is set correctly
- Check Neon dashboard for connection limits
- Run `npm run db:push` to verify schema sync

**Redis connection failures:**
- Platform falls back to in-memory automatically
- Check `REDIS_URL` format: `redis://user:password@host:port`
- Verify network access from Replit to Redis host

**Stripe webhook failures:**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check webhook endpoint URL: `/api/webhooks/stripe`
- Review webhook delivery logs in Stripe dashboard

**Session issues:**
- Ensure `SESSION_SECRET` is consistent across deployments
- Check PostgreSQL session store connectivity
- Clear stale sessions if schema changed

---

## Scaling Notes

The platform is designed for horizontal scaling with:
- Stateless Express servers (sessions in PostgreSQL)
- Distributed Redis cache (shared across instances)
- NATS event bus (pub/sub across instances)
- Atomic nonce verification (prevents replay in multi-instance)
- Neon serverless auto-scaling for database

For high-traffic deployments, consider:
- Multiple Replit instances behind load balancer
- Dedicated Redis instance (not shared)
- NATS cluster for event reliability
- CDN for static asset delivery
