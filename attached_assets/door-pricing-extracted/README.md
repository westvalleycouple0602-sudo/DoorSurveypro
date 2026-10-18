
# Door Survey Pro — Pricing (Replit-ready)

A minimal pricing page + Node server you can drop into Replit. Implements:
- Three pricing tiers (Starter, Pro, Enterprise) with **monthly/annual toggle** (20% annual savings)
- **14-day trial** messaging (configurable)
- **Add-ons** (manufacturer DB, AI diagnostics, offline sync pack)
- Optional **Stripe Checkout** endpoint (with mock mode if no key)
- **Stripe Webhook** handler for subscription lifecycle
- **Plan-gating middleware** to protect routes by tier
- Clean **Tailwind** UI, mobile-friendly

## Quick start (Replit)
1. Create a new **Node.js** Repl.
2. Upload these files or unzip this repo in the Repl.
3. Run `npm install` then `npm start`.
4. Open `/pricing.html` from the webview.

## Configure pricing
Edit the `CATALOG` object in **index.js** to change prices, add-ons, or trial length.

```js
const CATALOG = {
  currency: "usd",
  monthly: { starter: 3900, pro: 12900, enterprise: 39900 },
  annual:  { starter: 31200, pro: 103200, enterprise: 319200 },
  addons:  { manufacturerDb: 4900, aiDiagnostics: 7900, offlineSyncPack: 2000 },
  trialDays: 14
};
```

## Enable Stripe Checkout (optional)
1. Set your **price IDs** in `STRIPE_PRICE_IDS` in `index.js`, e.g.:
   ```js
   const STRIPE_PRICE_IDS = {
     starter_monthly: "price_xxx",
     starter_annual: "price_yyy",
     pro_monthly: "price_aaa",
     pro_annual: "price_bbb",
     // ...enterprise etc.
   };
   ```
2. Add secrets to `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   SUCCESS_URL=https://your-repl-name.yourusername.repl.co/pricing.html#success
   CANCEL_URL=https://your-repl-name.yourusername.repl.co/pricing.html#canceled
   ```
3. Redeploy (or `npm start`) and test a checkout.

## Webhook setup
- Endpoint: `POST /api/stripe-webhook`
- **Important:** The webhook uses `express.raw({ type: "application/json" })` and is mounted **before** JSON parsing.
- Use **Stripe CLI** to test locally:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe-webhook
  ```
- Add the signing secret it prints to `.env` as `STRIPE_WEBHOOK_SECRET`.

The webhook updates a small local store at `./data/subscriptions.json`. Replace this with your DB (e.g., Postgres, DynamoDB).

## Plan-gating routes
See `middleware/planGate.js` and the example routes in `index.js`:
- `/api/feature/basic-export` → requires **starter**
- `/api/feature/live-pricing` → requires **pro**
- `/api/feature/api-access` → requires **enterprise**

**Demo mode:** Send a header to simulate the user’s plan:
```http
GET /api/feature/live-pricing
x-demo-plan: pro
```

In production, replace the header with real auth + a DB lookup for the user’s current plan, derived from Stripe data (kept current via webhooks).

## Production notes
- Map Stripe Price IDs → plan names inside the webhook for accurate tiering.
- Implement `/webhook` event handlers for: `customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed`, etc.
- Use a **JWT** or session with a user ID to associate Stripe `customer` to your user records.
- Gate feature flags server-side (and duplicate light UI gating client-side).
- Consider adding coupon code support and usage-based metering for certain add-ons.

---
Built for your Door Surveying application. Clean, pragmatic, and upgrade-friendly.
