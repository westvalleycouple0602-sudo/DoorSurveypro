
// Simple plan-gating middleware.
// In production, replace the demo header with your real auth layer and subscription lookup.
//
// Usage:
//   import { requirePlan } from "./middleware/planGate.js";
//   app.get("/api/feature/live-pricing", requirePlan("pro"), (req, res) => { ... });
//
const ORDER = ["starter", "pro", "enterprise"];

export function requirePlan(minPlan = "starter") {
  return (req, res, next) => {
    // DEMO ONLY: Read plan from header 'x-demo-plan' or default to 'starter'
    const userPlan = (req.headers["x-demo-plan"] || "starter").toLowerCase();
    if (!ORDER.includes(userPlan)) {
      return res.status(400).json({ ok: false, error: "Unknown plan in x-demo-plan header" });
    }
    const ok = ORDER.indexOf(userPlan) >= ORDER.indexOf(minPlan);
    if (!ok) {
      return res.status(403).json({ ok: false, error: `Requires ${minPlan} plan or higher.` });
    }
    next();
  };
}
