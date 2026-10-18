# Operational Alerting Guidelines

This document provides comprehensive alerting guidelines for DoorSurvey Pro infrastructure monitoring, with specific focus on the 90-second failover timeline for Redis-backed services.

## Table of Contents
1. [Overview](#overview)
2. [Alert Severity Levels](#alert-severity-levels)
3. [Infrastructure Alerts](#infrastructure-alerts)
4. [Application Alerts](#application-alerts)
5. [Alert Response Procedures](#alert-response-procedures)
6. [Monitoring Integration](#monitoring-integration)
7. [On-Call Guidelines](#on-call-guidelines)

---

## Overview

### Alert Philosophy

**Goal:** Minimize false positives while ensuring all critical issues trigger alerts

**Principles:**
- **Actionable**: Every alert should have a clear response procedure
- **Timely**: Alerts should fire before users notice issues
- **Contextual**: Alerts include enough context for quick diagnosis
- **Escalating**: Severity increases if issues persist

### Failover Timeline Awareness

Understanding the 90-second failover timeline is critical for alert tuning:

```
0s  → Redis becomes unavailable
30s → First health check fails (WARNING)
60s → Second health check fails (ERROR)
90s → Third health check fails → Automatic failover (INFO)
```

**Key Insight:** Alerts should allow time for automatic failover before escalating to on-call, while still providing early warning of infrastructure issues.

---

## Alert Severity Levels

### CRITICAL (P1)
**Response Time:** Immediate (5 minutes)  
**Notification:** Page on-call engineer via PagerDuty/Opsgenie  
**Escalation:** If not acknowledged within 5 minutes, escalate to manager

**Examples:**
- Application completely down (/_health/alive returns 503 for >2 minutes)
- Database connection failure (unable to connect for >1 minute)
- Error rate >5% for >2 minutes
- Memory usage >95% for >2 minutes

### HIGH (P2)
**Response Time:** Within 30 minutes  
**Notification:** Slack alert to #ops-alerts channel  
**Escalation:** If not resolved within 2 hours, escalate to CRITICAL

**Examples:**
- Error rate >1% for >5 minutes
- Response time p95 >2 seconds for >5 minutes
- Memory usage >85% for >5 minutes
- Cache failover to in-memory (confirmed for >2 minutes)
- Job queue failover to in-memory (confirmed for >2 minutes)

### MEDIUM (P3)
**Response Time:** Within 4 hours  
**Notification:** Slack notification to #ops-monitoring  
**Escalation:** Review during next business day if not resolved

**Examples:**
- Error rate >0.5% for >10 minutes
- Cache hit rate <80% for >15 minutes
- Job processing rate declining >30% for >10 minutes
- Slow query count increasing >50% for >15 minutes

### LOW (P4)
**Response Time:** Review daily  
**Notification:** Email summary or dashboard only  
**Escalation:** None

**Examples:**
- Cache hit rate <85% for >30 minutes
- Memory usage trending upward
- Job queue depth growing slowly
- Non-critical deprecation warnings

---

## Infrastructure Alerts

### Cache Infrastructure

#### Redis Connection Health

```yaml
Alert: Redis Connection Failed
Severity: HIGH (P2)
Condition: Cache health check fails for >120 seconds
Rationale: Allows 90s for automatic failover + 30s buffer
Query: cache_health_status == "unhealthy" for 120s
Actions:
  - Check Redis service status on provider dashboard
  - Review application logs for connection errors
  - Verify REDIS_URL environment variable
  - Test Redis connection manually: redis-cli -u $REDIS_URL ping
  - Monitor Infrastructure Health Dashboard: /infrastructure
Recovery: Automatic failover to in-memory cache after 90s
```

**Why 120 seconds?**
- Allows 90s for the 3-failure health check cycle
- Provides 30s buffer before alerting
- Prevents alert during normal automatic failover

#### Cache Failover Confirmed

```yaml
Alert: Cache Running in Fallback Mode
Severity: MEDIUM (P3)
Condition: cache_backend == "in-memory" for >5 minutes
Query: cache_stats.backend == "in-memory" for 300s
Actions:
  - Investigate Redis connectivity issue
  - Review recent infrastructure changes
  - Check Redis service metrics (CPU, memory, connections)
  - Plan Redis service recovery
  - Note: Application continues functioning normally
Recovery: Manual investigation required
```

**Why 5 minutes?**
- Confirms this is not a transient failover
- Gives time to investigate root cause
- Low urgency since app functions normally

#### Cache Memory Exhaustion

```yaml
Alert: Redis Memory Usage Critical
Severity: HIGH (P2)
Condition: Redis memory usage >85%
Query: redis_memory_usage_percent > 85 for 300s
Actions:
  - Review cache entry count trends
  - Identify large or stale cache entries
  - Consider increasing Redis instance size
  - Implement more aggressive TTL policies
  - Review cache invalidation patterns
Recovery: Scale Redis instance or adjust cache policies
```

### Job Queue Infrastructure

#### BullMQ Connection Health

```yaml
Alert: Job Queue Connection Failed
Severity: HIGH (P2)
Condition: Queue health check fails for >120 seconds
Rationale: Allows 90s for automatic failover + 30s buffer
Query: queue_health_status == "unhealthy" for 120s
Actions:
  - Check Redis service status (BullMQ requires Redis)
  - Review job queue logs for connection errors
  - Verify REDIS_URL environment variable
  - Monitor Infrastructure Health Dashboard: /infrastructure
  - Note: Critical for background jobs (PDF generation, email)
Recovery: Automatic failover to in-memory queue after 90s
```

#### Job Queue Failover Confirmed

```yaml
Alert: Job Queue Running in Fallback Mode
Severity: HIGH (P2)  # Higher than cache because jobs may be lost
Condition: queue_backend == "in-memory" for >5 minutes
Query: queue_stats.backend == "in-memory" for 300s
Actions:
  - Investigate Redis connectivity issue
  - Review pending job counts
  - Note: In-memory jobs lost on restart
  - Plan Redis service recovery
  - Consider manual job re-queueing if critical
Recovery: Manual investigation and Redis recovery required
```

#### Job Queue Depth Growing

```yaml
Alert: Job Queue Depth Increasing
Severity: MEDIUM (P3)
Condition: Waiting jobs >100 and growing for >10 minutes
Query: queue_stats.totalWaiting > 100 AND rate(queue_stats.totalWaiting[10m]) > 0
Actions:
  - Review job processing rate
  - Check for failing jobs (may be retrying)
  - Investigate worker capacity
  - Consider scaling job workers
  - Review recent job submissions
Recovery: Increase worker capacity or fix failing jobs
```

#### Failed Job Rate High

```yaml
Alert: High Job Failure Rate
Severity: HIGH (P2)
Condition: Failed job rate >10% for >5 minutes
Query: (queue_stats.totalFailed / queue_stats.totalJobs) > 0.1 for 300s
Actions:
  - Review failed job logs
  - Identify common failure patterns
  - Check external service dependencies (email, storage)
  - Investigate worker errors
  - May indicate external API issues
Recovery: Fix underlying cause (API keys, network, code bug)
```

---

## Application Alerts

### Performance Alerts

#### Response Time Degradation

```yaml
Alert: API Response Time Slow
Severity: HIGH (P2)
Condition: p95 response time >2 seconds for >5 minutes
Query: http_request_duration_seconds{quantile="0.95"} > 2 for 300s
Actions:
  - Check cache hit rate (should be >80%)
  - Review slow query logs
  - Investigate database connection pool
  - Check external API latencies
  - Review recent code deployments
Recovery: Optimize queries, increase cache, scale resources
```

#### Error Rate Spike

```yaml
Alert: Application Error Rate High
Severity: CRITICAL (P1)
Condition: Error rate >5% for >2 minutes
Query: (sum(rate(http_requests_total{status=~"5.."}[1m])) / sum(rate(http_requests_total[1m]))) > 0.05 for 120s
Actions:
  - Check application logs immediately
  - Identify error patterns (endpoints, error types)
  - Review recent deployments (consider rollback)
  - Check database and Redis connectivity
  - Verify external service status
Recovery: Rollback deployment or fix critical bug
```

### Resource Alerts

#### Memory Usage Critical

```yaml
Alert: Application Memory Usage Critical
Severity: CRITICAL (P1)
Condition: Memory usage >95% for >2 minutes
Query: (process_resident_memory_bytes / process_virtual_memory_max_bytes) > 0.95 for 120s
Actions:
  - Review memory usage trends
  - Identify memory leaks (heap snapshots)
  - Check for resource-intensive operations
  - Consider restarting application
  - Plan for vertical scaling
Recovery: Restart application or scale instance
```

#### Memory Usage Warning

```yaml
Alert: Application Memory Usage High
Severity: HIGH (P2)
Condition: Memory usage >85% for >5 minutes
Query: (process_resident_memory_bytes / process_virtual_memory_max_bytes) > 0.85 for 300s
Actions:
  - Monitor memory trends
  - Review recent code changes
  - Investigate potential leaks
  - Plan capacity upgrade if trending up
Recovery: Investigate and optimize or scale
```

---

## Alert Response Procedures

### CRITICAL Alert Response

1. **Acknowledge** (Within 5 minutes)
   - Acknowledge alert in PagerDuty/Opsgenie
   - Post status update in #incidents Slack channel

2. **Assess** (Within 10 minutes)
   - Check health endpoints: `/_health/alive`, `/_health/ready`
   - Review Infrastructure Health Dashboard: `/infrastructure`
   - Check recent deployments or changes
   - Identify blast radius (all users or subset?)

3. **Mitigate** (Within 20 minutes)
   - If deployment-related: Rollback immediately
   - If infrastructure: Engage cloud provider support
   - If database: Check connection pool, consider restart
   - Communicate status to stakeholders

4. **Resolve** (As soon as possible)
   - Fix root cause
   - Verify recovery with health checks
   - Monitor for 30 minutes post-recovery
   - Post incident report in #incidents

5. **Post-Mortem** (Within 48 hours)
   - Document timeline of events
   - Identify root cause
   - Create action items to prevent recurrence
   - Update runbooks if needed

### HIGH Alert Response

1. **Acknowledge** (Within 30 minutes)
   - Acknowledge in Slack #ops-alerts
   - Assess severity (could escalate to CRITICAL?)

2. **Investigate** (Within 1 hour)
   - Review relevant logs and metrics
   - Check Infrastructure Health Dashboard
   - Identify trends (getting worse or stable?)

3. **Plan** (Within 2 hours)
   - Determine if immediate action needed
   - Schedule fix during appropriate window
   - Communicate plan to team

4. **Resolve**
   - Implement fix
   - Verify resolution
   - Monitor for regression

### MEDIUM/LOW Alert Response

- Review during business hours
- Investigate trends over time
- Plan proactive improvements
- Update runbooks and documentation

---

## Monitoring Integration

### Recommended Monitoring Stack

#### Option 1: Datadog (Full-Featured)

```yaml
# Install Datadog APM
npm install --save dd-trace

# Enable in application
# server/index.ts
import tracer from 'dd-trace';
tracer.init({
  service: 'doorsurvey-pro',
  env: process.env.NODE_ENV,
  logInjection: true,
});

# Key Metrics:
- http.request.duration (response time)
- http.request.errors (error rate)
- cache.hit_rate (cache performance)
- queue.jobs.waiting (job queue depth)
- nodejs.heap.used (memory usage)
```

**Alerting:**
- Use Datadog Monitors for all alert types
- Integration with PagerDuty/Slack
- Automatic anomaly detection

#### Option 2: Prometheus + Grafana (Open Source)

```yaml
# Expose metrics endpoint
GET /metrics
# Returns Prometheus-formatted metrics

# Key Metrics:
- http_request_duration_seconds (histogram)
- http_requests_total (counter, by status)
- cache_hit_rate (gauge)
- queue_jobs_waiting (gauge)
- nodejs_heap_size_used_bytes (gauge)

# Alerting:
# Use Prometheus Alertmanager for alert routing
# Grafana for dashboards and visualization
```

**Sample Prometheus Alert:**
```yaml
groups:
  - name: doorsurvey_alerts
    rules:
      - alert: CacheUnhealthy
        expr: cache_health_status == 0
        for: 2m
        labels:
          severity: high
        annotations:
          summary: "Cache health check failing"
          description: "Cache has been unhealthy for 2 minutes. Automatic failover may occur soon."
```

#### Option 3: Sentry (Error Tracking)

```yaml
# Already integrated in error-tracking.ts
# Configure Sentry DSN:
SENTRY_DSN=https://your-key@sentry.io/project-id

# Features:
- Error tracking with stack traces
- Performance monitoring
- Release tracking
- User context
```

**Alerting:**
- Configure Sentry alerts for error rates
- Integration with Slack/email
- Automatic issue assignment

### Infrastructure Health Dashboard

Built-in dashboard at `/infrastructure`:

**Real-Time Monitoring:**
- Cache backend status (Redis/in-memory)
- Job queue backend status (BullMQ/in-memory)
- Entry counts and memory usage
- Job processing statistics
- Configuration details

**Use Cases:**
- Quick health check during incidents
- Verify failover status
- Monitor infrastructure metrics
- Validate configuration

---

## On-Call Guidelines

### On-Call Responsibilities

1. **Respond to Alerts**
   - Acknowledge CRITICAL alerts within 5 minutes
   - Acknowledge HIGH alerts within 30 minutes
   - Triage and escalate as needed

2. **Monitor Health**
   - Check Infrastructure Health Dashboard at start of shift
   - Review recent alerts and incidents
   - Verify all systems healthy

3. **Incident Management**
   - Lead incident response for CRITICAL/HIGH alerts
   - Coordinate with team members
   - Communicate with stakeholders
   - Document incidents

4. **Handoff**
   - Brief next on-call engineer
   - Document ongoing issues
   - Share relevant context

### Escalation Paths

```
Level 1: On-Call Engineer
  ↓ (if unresolved in 2 hours)
Level 2: Engineering Manager
  ↓ (if system-wide outage)
Level 3: CTO / Infrastructure Team
  ↓ (if cloud provider issue)
Level 4: Cloud Provider Support
```

### On-Call Tools

**Required Access:**
- Infrastructure Health Dashboard (`/infrastructure`)
- Application logs (CloudWatch/Datadog/etc.)
- Cloud provider console (AWS/Azure/etc.)
- Redis provider dashboard (Upstash/Redis Cloud/etc.)
- PagerDuty/Opsgenie account
- Slack #ops-alerts and #incidents channels

**Useful Commands:**
```bash
# Check application health
curl https://your-domain.com/_health/alive
curl https://your-domain.com/_health/ready

# Check infrastructure status
curl https://your-domain.com/api/infrastructure/health

# Check Redis connection
redis-cli -u $REDIS_URL ping

# View application logs
pm2 logs doorsurvey-pro
# or
kubectl logs -f deployment/doorsurvey-pro

# Restart application (if needed)
pm2 reload doorsurvey-pro
# or
kubectl rollout restart deployment/doorsurvey-pro
```

---

## Runbook: Common Scenarios

### Scenario 1: Cache Failover Alert

**Alert:** "Cache Running in Fallback Mode" (MEDIUM)

**Steps:**
1. Verify status in Infrastructure Health Dashboard: `/infrastructure`
2. Check Redis service status on provider dashboard
3. Review application logs: `grep "Cache health check failed"`
4. Test Redis connection: `redis-cli -u $REDIS_URL ping`
5. If Redis is healthy: Restart application to reconnect
6. If Redis is down: Contact provider support, monitor app performance
7. Document incident and recovery time

**Expected Recovery Time:** 
- If transient: Automatic reconnection within 5 minutes
- If Redis issue: Depends on provider SLA

### Scenario 2: Job Queue Failover Alert

**Alert:** "Job Queue Running in Fallback Mode" (HIGH)

**Steps:**
1. Verify status in Infrastructure Health Dashboard: `/infrastructure`
2. Check pending job count (jobs may be lost if app restarts)
3. Investigate Redis connectivity (same as Cache scenario)
4. Review failed job logs
5. If critical jobs pending: Note them for manual re-queue
6. Coordinate Redis recovery
7. After Redis recovery: Verify jobs resume processing

**Risk:** In-memory jobs lost on application restart

### Scenario 3: High Error Rate

**Alert:** "Application Error Rate High" (CRITICAL)

**Steps:**
1. Check health endpoints immediately
2. Review error logs for patterns (specific endpoint/error type)
3. Check recent deployments (within last 2 hours)
4. Verify database and Redis connectivity
5. If deployment-related: Rollback immediately
6. If external service: Check third-party status pages
7. Communicate status to stakeholders every 15 minutes
8. Implement fix or workaround
9. Monitor for 30 minutes post-resolution

**Communication Template:**
```
[INCIDENT] High error rate detected
Time: [timestamp]
Impact: [% of requests affected]
Status: Investigating / Mitigating / Resolved
ETA: [if known]
Next Update: [time]
```

### Scenario 4: Memory Usage Critical

**Alert:** "Application Memory Usage Critical" (CRITICAL)

**Steps:**
1. Take heap snapshot (if time allows)
2. Restart application to free memory
3. Monitor memory usage post-restart
4. If memory grows rapidly: Identify leak source
5. Review recent code changes
6. Plan capacity upgrade if sustained high usage
7. Create follow-up task for memory investigation

**Immediate Action:** Restart application  
**Long-term:** Fix memory leak or scale instance

---

## Alert Tuning Principles

### Avoid Alert Fatigue

**Problem:** Too many alerts → Alerts ignored  
**Solution:**
- Set appropriate thresholds (based on historical data)
- Use alert aggregation (multiple conditions)
- Implement auto-recovery mechanisms
- Regular alert review and tuning

### Respect Automatic Failover

**Problem:** Alerts fire during normal failover process  
**Solution:**
- Alert delays account for 90s failover timeline
- Differentiate between "failing over" and "failed over"
- Use INFO logs for failover events
- Only alert if failover confirmed (>2 minutes)

### Context-Rich Alerts

**Include in alerts:**
- Current metric value
- Threshold crossed
- Duration of issue
- Link to dashboard
- Suggested first steps

**Example:**
```
[HIGH] Cache Running in Fallback Mode
Backend: in-memory (expected: redis)
Duration: 5m 30s
Dashboard: https://your-domain.com/infrastructure
Action: Investigate Redis connectivity
```

---

## Maintenance Windows

### Planned Maintenance

**Process:**
1. Schedule during low-traffic period (if possible)
2. Notify stakeholders 48 hours in advance
3. Silence non-critical alerts during window
4. Monitor closely during maintenance
5. Restore alerting after completion

**Alert Behavior:**
- CRITICAL alerts: Remain active
- HIGH alerts: Remain active but notify differently
- MEDIUM/LOW alerts: Silence during window

### Emergency Maintenance

**Process:**
1. Declare emergency maintenance
2. Notify stakeholders immediately
3. Adjust alerts as needed
4. Coordinate with team
5. Document afterwards

---

## Appendix: Alert Checklist

### Before Going On-Call

- [ ] Access to Infrastructure Health Dashboard verified
- [ ] Application logs access confirmed
- [ ] Cloud provider console access tested
- [ ] Redis provider dashboard access confirmed
- [ ] PagerDuty/Opsgenie app installed and tested
- [ ] Slack notifications enabled
- [ ] Emergency contacts list reviewed
- [ ] Recent incidents reviewed
- [ ] Runbooks bookmarked
- [ ] On-call phone charged and available

### During On-Call

- [ ] Check Infrastructure Health Dashboard at start of shift
- [ ] Review active alerts and incidents
- [ ] Test critical systems if no recent checks
- [ ] Respond to alerts within SLA
- [ ] Document all actions taken
- [ ] Communicate clearly and frequently during incidents
- [ ] Hand off clearly to next on-call

### After Incident

- [ ] Incident fully resolved and verified
- [ ] Post-incident report drafted
- [ ] Action items created
- [ ] Stakeholders notified of resolution
- [ ] Runbooks updated if needed
- [ ] Team briefed on lessons learned

---

**Last Updated:** October 26, 2025  
**Version:** 1.0.0  
**Review Cycle:** Quarterly  
**Next Review:** January 26, 2026  
**Owner:** Operations Team
