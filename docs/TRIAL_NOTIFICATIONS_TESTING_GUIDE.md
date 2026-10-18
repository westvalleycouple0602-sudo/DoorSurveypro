# Trial Notifications Testing Guide

This guide provides step-by-step instructions for testing the trial notification system in DoorSurvey Pro.

## Overview

The trial notification system sends automated emails at key milestones during a trial period:
- **7-day warning**: Sent when 7 days or less remain (but more than 1 day)
- **1-day warning**: Sent when 24 hours or less remain
- **Trial expired**: Sent on day 0 when trial expires
- **Grace period**: Sent daily during the 7-day grace period after expiration

## Architecture

- **Notification tracking**: Uses timestamp-based JSONB object in `trialNotificationsSent` field
- **Scheduler**: BullMQ cron job runs daily at 9:00 AM UTC
- **Email delivery**: React Email templates + Resend API + BullMQ queue
- **Grace period**: Automatically activates for 7 days after trial expiration
- **Repeat notifications**: Grace-period emails repeat daily if > 24 hours since last sent

## Test Prerequisites

1. **Development environment** with Redis and PostgreSQL running
2. **Valid Resend API key** configured in environment
3. **Test email address** you can access
4. **Organization with owner/admin role** for API testing

## Manual Testing API Endpoint

A special testing endpoint is available in development/staging environments:

```
POST /api/organizations/:organizationId/trial/test-notifications
```

This endpoint:
- Manually triggers the notification processor
- Only available in non-production environments
- Requires owner/admin role
- Returns statistics about notifications sent

### Example Usage

```bash
# Using curl
curl -X POST http://localhost:5000/api/organizations/YOUR_ORG_ID/trial/test-notifications \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"

# Expected response
{
  "success": true,
  "message": "Trial notifications processed",
  "result": {
    "processed": 1,
    "sent": 1,
    "skipped": 0,
    "errors": 0
  }
}
```

## Test Scenarios

### Scenario 1: 7-Day Warning (Boundary Test)

**Setup:**
1. Create or update an organization with a trial ending exactly 7 days from now
2. Ensure `trialNotificationsSent` is `{}` (empty object)
3. Set `trialTier` to `"professional"` or `"enterprise"`

**SQL Setup:**
```sql
UPDATE organizations
SET 
  trial_tier = 'professional',
  trial_ends_at = NOW() + INTERVAL '7 days',
  trial_notifications_sent = '{}'::jsonb
WHERE id = 'YOUR_ORG_ID';
```

**Expected Behavior:**
- ✅ Should send 7-day warning email
- ✅ Should update `trialNotificationsSent` with `{"7-day-warning": "2025-11-20T12:00:00Z"}`
- ❌ Should NOT send 1-day warning
- ❌ Should NOT send trial-expired

**Verification:**
1. Call the test endpoint
2. Check database: `SELECT trial_notifications_sent FROM organizations WHERE id = 'YOUR_ORG_ID'`
3. Check email inbox for 7-day warning email
4. Verify email contains correct trial end date and tier

---

### Scenario 2: 1-Day Warning (Boundary Test)

**Setup:**
```sql
UPDATE organizations
SET 
  trial_tier = 'professional',
  trial_ends_at = NOW() + INTERVAL '24 hours',
  trial_notifications_sent = '{"7-day-warning": "2025-11-13T12:00:00Z"}'::jsonb
WHERE id = 'YOUR_ORG_ID';
```

**Expected Behavior:**
- ✅ Should send 1-day warning email
- ✅ Should update `trialNotificationsSent` with `{"7-day-warning": "...", "1-day-warning": "2025-11-20T12:00:00Z"}`
- ❌ Should NOT send 7-day warning again

**Verification:**
1. Call test endpoint
2. Verify email received with 24-hour warning message
3. Check database timestamp is recorded

---

### Scenario 3: Trial Expired (Day 0)

**Setup:**
```sql
UPDATE organizations
SET 
  trial_tier = 'professional',
  trial_ends_at = NOW() - INTERVAL '1 hour',  -- Expired 1 hour ago
  grace_period_end_date = NOW() + INTERVAL '7 days',  -- Grace period active
  trial_notifications_sent = '{"7-day-warning": "...", "1-day-warning": "..."}'::jsonb
WHERE id = 'YOUR_ORG_ID';
```

**Expected Behavior:**
- ✅ Should send trial-expired email on day 0
- ✅ Should update `trialNotificationsSent` with `{"trial-expired": "2025-11-20T12:00:00Z"}`
- ❌ Should NOT send grace-period email yet (sent on next scheduler run after trial-expired)

**Verification:**
1. Call test endpoint
2. Verify trial expiration email received
3. Email should mention grace period availability
4. Check timestamp recorded correctly

---

### Scenario 4: Grace Period - First Reminder (Same Day as Expiration)

**Setup:**
```sql
UPDATE organizations
SET 
  trial_tier = 'professional',
  trial_ends_at = NOW() - INTERVAL '2 hours',
  grace_period_end_date = NOW() + INTERVAL '7 days',
  trial_notifications_sent = '{"trial-expired": "2025-11-20T10:00:00Z"}'::jsonb
WHERE id = 'YOUR_ORG_ID';
```

**Expected Behavior:**
- ✅ Should send first grace-period email
- ✅ Should update `trialNotificationsSent` with `{"grace-period-last-sent": "2025-11-20T12:00:00Z"}`
- ❌ Should NOT send trial-expired again

**Verification:**
1. Call test endpoint
2. Verify grace-period email received
3. Email should contain upgrade CTA and days remaining
4. Check `grace-period-last-sent` timestamp

---

### Scenario 5: Grace Period - Daily Repeat

**Setup:**
```sql
UPDATE organizations
SET 
  trial_tier = 'professional',
  trial_ends_at = NOW() - INTERVAL '2 days',
  grace_period_end_date = NOW() + INTERVAL '5 days',
  trial_notifications_sent = '{"trial-expired": "...", "grace-period-last-sent": "2025-11-19T12:00:00Z"}'::jsonb  -- Last sent 24+ hours ago
WHERE id = 'YOUR_ORG_ID';
```

**Expected Behavior:**
- ✅ Should send grace-period email again (>24 hours since last)
- ✅ Should update timestamp: `{"grace-period-last-sent": "2025-11-20T12:00:00Z"}`
- ✅ Should repeat every day during grace period

**Verification:**
1. Call test endpoint
2. Verify new grace-period email received
3. Check timestamp updated to current time
4. Run again immediately - should NOT send (< 24 hours)

---

### Scenario 6: Grace Period - No Repeat if < 24 Hours

**Setup:**
```sql
UPDATE organizations
SET 
  trial_tier = 'professional',
  trial_ends_at = NOW() - INTERVAL '2 days',
  grace_period_end_date = NOW() + INTERVAL '5 days',
  trial_notifications_sent = '{"trial-expired": "...", "grace-period-last-sent": "2025-11-20T06:00:00Z"}'::jsonb  -- Last sent 6 hours ago
WHERE id = 'YOUR_ORG_ID';
```

**Expected Behavior:**
- ❌ Should NOT send grace-period email (<24 hours since last)
- ❌ Timestamp should remain unchanged

**Verification:**
1. Call test endpoint
2. Response should show `sent: 0, skipped: 1`
3. No new email received
4. Database timestamp unchanged

---

### Scenario 7: No Notifications After Grace Period Ends

**Setup:**
```sql
UPDATE organizations
SET 
  trial_tier = 'professional',
  trial_ends_at = NOW() - INTERVAL '10 days',
  grace_period_end_date = NOW() - INTERVAL '3 days',  -- Grace period ended
  trial_notifications_sent = '{"trial-expired": "...", "grace-period-last-sent": "..."}'::jsonb
WHERE id = 'YOUR_ORG_ID';
```

**Expected Behavior:**
- ❌ Should NOT send any notifications
- ✅ Organization should be auto-downgraded to free tier (separate process)

**Verification:**
1. Call test endpoint
2. Response should show `sent: 0`
3. No emails received
4. Check organization tier is now "free"

---

## Database Transaction Safety Test

**Purpose:** Verify that concurrent notification processing doesn't create duplicate timestamps

**Setup:**
```sql
UPDATE organizations
SET 
  trial_tier = 'professional',
  trial_ends_at = NOW() + INTERVAL '7 days',
  trial_notifications_sent = '{}'::jsonb
WHERE id = 'YOUR_ORG_ID';
```

**Test:**
```bash
# Run 3 parallel requests
for i in {1..3}; do
  curl -X POST http://localhost:5000/api/organizations/YOUR_ORG_ID/trial/test-notifications &
done
wait
```

**Expected Behavior:**
- ✅ Only ONE `7-day-warning` key in `trialNotificationsSent`
- ✅ No duplicate entries or array elements
- ✅ Single timestamp value (not an array)

**Verification:**
```sql
SELECT trial_notifications_sent FROM organizations WHERE id = 'YOUR_ORG_ID';
-- Should return: {"7-day-warning": "2025-11-20T12:00:00Z"}
-- NOT: {"7-day-warning": ["...", "...", "..."]} or similar
```

---

## Production Testing (Cron Job)

### Verify Scheduled Job is Running

**Check BullMQ Dashboard:**
```bash
# If using BullMQ dashboard
http://localhost:5000/admin/queues  # Example URL
```

**Check Logs:**
```bash
# Look for scheduled job execution in logs
grep "Trial notification processing scheduled" logs/app.log
grep "Starting trial notification processing" logs/app.log
```

**Expected Log Pattern (Daily at 9:00 AM UTC):**
```
2025-11-20 09:00:00 [info]: Trial notification processing scheduled
2025-11-20 09:00:00 [info]: Starting trial notification processing
2025-11-20 09:00:05 [info]: Trial notification processing completed
```

### Test with Real Time Simulation

1. **Set trial to expire in 5 minutes:**
```sql
UPDATE organizations
SET trial_ends_at = NOW() + INTERVAL '5 minutes'
WHERE id = 'YOUR_ORG_ID';
```

2. **Manually trigger notification:**
```bash
curl -X POST http://localhost:5000/api/organizations/YOUR_ORG_ID/trial/test-notifications
```

3. **Wait 5 minutes**

4. **Trigger again:**
```bash
# Should now send trial-expired notification
curl -X POST http://localhost:5000/api/organizations/YOUR_ORG_ID/trial/test-notifications
```

---

## Email Template Verification

For each notification type, verify:

### 7-Day Warning Email
- ✅ Subject: "Your [Tier] Trial Expires in 7 Days"
- ✅ Contains trial tier name (Professional/Enterprise)
- ✅ Contains exact expiration date
- ✅ Contains upgrade CTA button
- ✅ Professional branding and formatting

### 1-Day Warning Email
- ✅ Subject: "Your [Tier] Trial Expires Tomorrow"
- ✅ Urgent tone but not alarming
- ✅ Clear upgrade instructions
- ✅ Benefits of upgrading listed

### Trial Expired Email
- ✅ Subject: "Your [Tier] Trial Has Expired"
- ✅ Mentions 7-day grace period
- ✅ Explains grace period limitations
- ✅ Upgrade CTA prominently displayed

### Grace Period Email
- ✅ Subject: "Grace Period Active - [X] Days Until Downgrade"
- ✅ Contains days remaining in grace period
- ✅ Explains downgrade consequences
- ✅ Clear upgrade path

---

## Common Issues & Troubleshooting

### Issue: No emails received

**Check:**
1. Redis is running: `redis-cli ping`
2. Resend API key is configured: `echo $RESEND_API_KEY`
3. Email queue is processing: Check BullMQ dashboard
4. Check email service logs for errors

### Issue: Notifications sent multiple times

**Check:**
1. Verify timestamp is being stored correctly in database
2. Check for race conditions (multiple scheduler instances)
3. Verify transaction logic is working

### Issue: Grace period not repeating

**Check:**
1. Verify `grace-period-last-sent` timestamp is being updated
2. Confirm 24-hour calculation is correct
3. Check timezone consistency (all timestamps should be UTC)

---

## Monitoring in Production

### Key Metrics to Track

1. **Notification Success Rate**
   - Query: Count emails sent vs errors
   - Alert if error rate > 5%

2. **Delivery Timing**
   - Verify 9:00 AM UTC execution
   - Alert if delayed > 1 hour

3. **Grace Period Utilization**
   - Track how many orgs use grace period
   - Monitor conversion rate during grace period

### Recommended Logs to Monitor

```bash
# Successful processing
grep "Trial notification processing completed" logs/app.log

# Errors
grep "ERROR.*trial.*notification" logs/app.log

# Email queue failures
grep "Failed to queue trial notification" logs/app.log
```

---

## Regression Test Checklist

Before deploying changes to trial notification system:

- [ ] Test exact boundary cases (7 days, 24 hours, day 0)
- [ ] Test grace-period daily repeat logic
- [ ] Test transaction safety with concurrent requests
- [ ] Verify all 4 email templates render correctly
- [ ] Test timezone handling (UTC consistency)
- [ ] Verify no notifications after grace period ends
- [ ] Test with Professional and Enterprise tiers
- [ ] Verify notification tracking timestamps are accurate

---

## Additional Resources

- Email Templates: `server/email-templates/trial-*.tsx`
- Notification Service: `server/services/trial-notification.service.ts`
- BullMQ Scheduler: `server/jobs/trialNotificationScheduler.ts`
- Database Schema: `shared/schemas/auth.schema.ts` (organizations table)
