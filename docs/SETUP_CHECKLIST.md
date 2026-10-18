# DoorSurvey Pro - Real-World Testing Setup Checklist

This checklist guides you through configuring DoorSurvey Pro for real-world testing with live services.

## 📋 Overview

The platform requires different levels of configuration:
- **🔴 Critical** - Must have before testing (blocking)
- **🟡 Recommended** - Strongly recommended for full features
- **🟢 Optional** - Nice to have, features gracefully degrade without them

---

## 🔴 CRITICAL SETUP (Required)

### 1. Database Configuration
**Purpose**: Store all application data (users, projects, quotes, subscriptions)

- [ ] **Step 1**: Create or obtain a PostgreSQL database
  - Option A: Use Replit's built-in PostgreSQL
  - Option B: Use Neon (serverless PostgreSQL): https://neon.tech
  - Option C: Use your own managed PostgreSQL service

- [ ] **Step 2**: Set `DATABASE_URL` environment variable
  ```
  DATABASE_URL=postgresql://user:password@host:port/database
  ```

- [ ] **Step 3**: Run database migrations
  ```bash
  npm run db:push
  ```

- [ ] **Step 4**: Verify database connection
  ```bash
  npm run dev
  # Look for success message in logs
  ```

### 2. Stripe Payment Processing
**Purpose**: Accept subscriptions, manage billing, process payments

**Get Stripe Keys**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Sign in or create account (free for testing)
3. Navigate to **Developers** → **API Keys**
4. Copy the following keys:

- [ ] **Step 1**: Set `STRIPE_SECRET_KEY`
  ```
  STRIPE_SECRET_KEY=sk_test_... (from Stripe Dashboard → API Keys → Secret Key)
  ```

- [ ] **Step 2**: Set `VITE_STRIPE_PUBLIC_KEY`
  ```
  VITE_STRIPE_PUBLIC_KEY=pk_test_... (from Stripe Dashboard → API Keys → Publishable Key)
  ```

- [ ] **Step 3**: Set up Webhook Secret
  ```
  1. Go to Stripe Dashboard → Developers → Webhooks
  2. Click "Add endpoint"
  3. URL: https://your-app-url/api/webhooks/stripe
  4. Events: Select "checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"
  5. Copy the Signing Secret
  6. Set STRIPE_WEBHOOK_SECRET in .env
  ```
  ```
  STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Webhooks)
  ```

- [ ] **Step 4**: Test Stripe Integration
  ```bash
  npm run dev
  # Navigate to /billing page
  # Try creating a test subscription (use test card: 4242 4242 4242 4242)
  ```

### 3. Email Service (Resend)
**Purpose**: Send trial notifications, invitations, payment confirmations

**Get Resend API Key**:
1. Go to [Resend Dashboard](https://resend.com)
2. Sign in or create account (free tier available)
3. Navigate to **Settings** → **API Keys**
4. Create new API key

- [ ] **Step 1**: Set `RESEND_API_KEY`
  ```
  RESEND_API_KEY=re_... (from Resend Settings → API Keys)
  ```

- [ ] **Step 2**: Configure sender email
  ```
  # Default: onboarding@resend.dev (development)
  # Production: your-domain@yourdomain.com (requires domain verification)
  ```

- [ ] **Step 3**: Test email sending
  ```bash
  npm run dev
  # Check server logs for "Email sent successfully"
  # Or trigger trial notification test endpoint
  POST /api/organizations/:organizationId/trial/test-notifications
  ```

---

## 🟡 RECOMMENDED SETUP

### 4. Redis Cache & Job Queue
**Purpose**: Trial notification scheduler, email queue, performance caching

**Options**:

**Option A: Replit Built-in (Easiest)**
- Replit provides Redis automatically
- Just set `REDIS_URL` to your Replit Redis connection string

**Option B: Redis Cloud**
1. Go to [Redis Cloud](https://redis.com/try-free)
2. Create free account and database
3. Copy connection URL

- [ ] **Step 1**: Set `REDIS_URL`
  ```
  REDIS_URL=redis://user:password@host:port
  # or
  REDIS_URL=rediss://user:password@host:port (with TLS)
  ```

- [ ] **Step 2**: Verify Redis connection
  ```bash
  npm run dev
  # Look for logs: "Cache: Using Redis for distributed caching"
  # and "Job Queue: Using BullMQ with Redis backend"
  ```

- [ ] **Step 3**: Test trial notifications
  ```bash
  # Trial notification scheduler runs daily at 9:00 AM UTC
  # For immediate test, use the manual endpoint:
  POST /api/organizations/:organizationId/trial/test-notifications
  ```

### 5. OpenAI API (For AI Features)
**Purpose**: Photo analysis, compliance validation, chat assistant

**Get OpenAI API Key**:
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign in or create account
3. Navigate to **API Keys**
4. Create new secret key

- [ ] **Step 1**: Set `OPENAI_API_KEY`
  ```
  OPENAI_API_KEY=sk-... (from OpenAI Platform → API Keys)
  ```

- [ ] **Step 2**: Verify OpenAI integration
  ```bash
  npm run dev
  # Check logs for OpenAI initialization
  ```

---

## 🟢 OPTIONAL SETUP

### 6. Message Bus (NATS)
**Purpose**: Real-time event distribution for workers

- [ ] Set `NATS_URL`
  ```
  NATS_URL=nats://host:4222
  ```
  *Without this, events use in-memory queue (single process only)*

### 7. Error Tracking (Sentry)
**Purpose**: Production error monitoring and alerts

- [ ] Set `SENTRY_DSN`
  ```
  SENTRY_DSN=https://key@host/project
  ```
  *Without this, errors only logged to console*

---

## ✅ Verification Checklist

After completing setup, verify everything works:

- [ ] **Database**: Can create organizations and projects
- [ ] **Stripe**: Can view billing page and create test subscriptions
- [ ] **Email**: Receives test emails (check spam folder)
- [ ] **Redis** (if configured): Job queue and caching working
- [ ] **Application**: No errors in console or logs

**Run Full Test**:
```bash
npm run dev
# 1. Create user account
# 2. Create organization
# 3. Visit /billing page
# 4. Create test subscription with Stripe test card: 4242 4242 4242 4242
# 5. Check for confirmation email
# 6. Verify trial notifications can be sent
```

---

## 🚀 Quick Start (Minimal Setup)

If you just want to test core functionality:

```bash
# 1. Ensure DATABASE_URL is set
export DATABASE_URL=postgresql://user:password@localhost/doorsurvey

# 2. Set Stripe keys (use test keys from Stripe Dashboard)
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...
export VITE_STRIPE_PUBLIC_KEY=pk_test_...

# 3. Set Resend key (use free tier)
export RESEND_API_KEY=re_...

# 4. Run the app
npm run dev

# 5. Visit http://localhost:5000 and start testing
```

---

## 🔒 Security Notes

### Development vs Production

**Development (Testing)**:
- Use Stripe **test keys** (start with `sk_test_`, `pk_test_`)
- Use test credit cards (4242 4242 4242 4242)
- Use test email service credentials

**Production**:
- Use Stripe **live keys** (start with `sk_live_`, `pk_live_`)
- Use production domain for sender email
- Use production-grade error tracking
- Enable HTTPS and secure headers
- Rotate secrets regularly

### Environment Variable Safety

```bash
# ✅ Good: Use .env file (never commit to git)
echo "STRIPE_SECRET_KEY=sk_test_..." >> .env

# ❌ Bad: Hardcode secrets in code
const stripe = Stripe("sk_test_...");

# ✅ Good: Use environment variable
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
```

---

## 🆘 Troubleshooting

### "Database connection failed"
- Verify `DATABASE_URL` is correct
- Check database is running
- Run `npm run db:push` to create tables

### "Stripe webhook signature verification failed"
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check webhook endpoint is publicly accessible
- Verify webhook is pointing to correct URL

### "Email not sending"
- Check `RESEND_API_KEY` is correct
- Verify sender email is verified in Resend
- Check spam folder
- Look for errors in server logs

### "Redis connection timeout"
- Verify `REDIS_URL` is correct
- Check Redis service is running
- App falls back to in-memory if Redis unavailable

---

## 📖 Related Documentation

- [Stripe Setup Guide](./STRIPE_SETUP.md)
- [Email Notifications Guide](./TRIAL_NOTIFICATIONS_TESTING_GUIDE.md)
- [Database Guide](./DATABASE.md)

---

**Last Updated**: November 2025
