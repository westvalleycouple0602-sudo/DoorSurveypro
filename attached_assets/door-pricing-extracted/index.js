
// Express server for pricing, Stripe checkout, webhook, and plan-gated feature routes
// Run with: npm install && npm start
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";

import { requirePlan } from "./middleware/planGate.js";
import { setSubscription } from "./services/billing.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
// Serve static first
app.use(express.static(path.join(__dirname, "public")));

// ---- Stripe setup (optional) ----
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const STRIPE_PRICE_IDS = {
  // Map your Stripe Price IDs here if using real checkout
  // e.g. starter_monthly: "price_123", starter_annual: "price_456"
};

let stripe = null;
if (STRIPE_SECRET) {
  const Stripe = (await import("stripe")).default;
  stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" });
}

// ---- Catalog (editable) ----
const CATALOG = {
  currency: "usd",
  monthly: {
    starter: 3900,
    pro: 12900,
    enterprise: 39900
  },
  annual: {
    starter: 31200,    // 20% off
    pro: 103200,       // 20% off
    enterprise: 319200 // 20% off
  },
  addons: {
    manufacturerDb: 4900,
    aiDiagnostics: 7900,
    offlineSyncPack: 2000
  },
  trialDays: 14
};

// ---- Webhook must receive raw body BEFORE json parsing! ----
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(200).send("Webhook mock (no Stripe key/secret)");
  }
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        // Attach initial subscription state
        setSubscription(s.customer, {
          status: "trialing",
          plan: "starter",
          source: "checkout.session.completed",
          subscriptionId: s.subscription
        });
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object;
        setSubscription(inv.customer, {
          status: "active",
          plan: "starter", // map from price if you use multiple
          source: "invoice.paid",
          subscriptionId: inv.subscription
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object;
        // TODO: map sub.items[0].price.id -> your plan name ("starter" | "pro" | "enterprise")
        setSubscription(sub.customer, {
          status: sub.status,
          plan: "starter",
          source: event.type,
          subscriptionId: sub.id
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        setSubscription(sub.customer, {
          status: "canceled",
          plan: "starter",
          source: "customer.subscription.deleted",
          subscriptionId: sub.id
        });
        break;
      }
      default:
        // Ignore unhandled events
        break;
    }
  } catch (err) {
    console.error("Webhook handling error:", err);
    return res.status(500).send("Webhook handler error");
  }
  res.json({ received: true });
});

// After webhook route, enable JSON parsing for regular API routes
app.use(express.json());

// ---- Public API ----
app.get("/api/catalog", (_req, res) => {
  res.json({ ok: true, catalog: CATALOG });
});

// Create a checkout session (mock if no Stripe key present)
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { plan, interval, addons = [], email } = req.body || {};
    if (!plan || !interval) {
      return res.status(400).json({ ok: false, error: "Missing plan or interval." });
    }

    if (!stripe) {
      // Mock response for demo/testing without Stripe credentials
      return res.json({
        ok: true,
        mode: "mock",
        checkoutUrl: "/pricing.html#mock-checkout-success"
      });
    }

    // If using Stripe, you should pre-create Price IDs and map them
    const baseKey = `${plan}_${interval}`; // e.g. "starter_monthly"
    const basePriceId = STRIPE_PRICE_IDS[baseKey];
    if (!basePriceId) {
      return res.status(400).json({ ok: false, error: `Missing Stripe price mapping for ${baseKey}.` });
    }

    const lineItems = [{ price: basePriceId, quantity: 1 }];

    for (const add of addons) {
      const addKey = `${add}_${interval}`; // optionally separate monthly vs annual add-on prices
      const addPriceId = STRIPE_PRICE_IDS[addKey];
      if (!addPriceId) continue;
      lineItems.push({ price: addPriceId, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: CATALOG.trialDays
      },
      line_items: lineItems,
      success_url: process.env.SUCCESS_URL || "http://localhost:3000/pricing.html#success",
      cancel_url: process.env.CANCEL_URL || "http://localhost:3000/pricing.html#canceled"
    });

    res.json({ ok: true, mode: "stripe", checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error creating checkout session." });
  }
});

// ---- Example plan-gated feature routes ----
app.get("/api/feature/basic-export", requirePlan("starter"), (req, res) => {
  res.json({ ok: true, feature: "basic-export", message: "Starter and up can export basic reports." });
});

app.get("/api/feature/live-pricing", requirePlan("pro"), (req, res) => {
  res.json({ ok: true, feature: "live-pricing", message: "Pro and Enterprise can access live distributor pricing." });
});

app.get("/api/feature/api-access", requirePlan("enterprise"), (req, res) => {
  res.json({ ok: true, feature: "api-access", message: "Enterprise users can access the external API." });
});

// ---- Health check ----
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Open /pricing.html to view the pricing page.");
});
