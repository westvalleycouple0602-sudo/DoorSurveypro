
// Minimal billing service to track subscriptions updated by Stripe webhooks.
// For demo, we keep data in-memory and persist occasionally to a local JSON file.
// Replace with your database in production.
import fs from "fs";
const FILE = "./data/subscriptions.json";

let STORE = {};
try {
  const raw = fs.readFileSync(FILE, "utf-8");
  STORE = JSON.parse(raw);
} catch (_e) {
  STORE = {};
}

function persist() {
  try { fs.mkdirSync("./data", { recursive: true }); } catch {}
  fs.writeFileSync(FILE, JSON.stringify(STORE, null, 2));
}

export function setSubscription(customerId, payload) {
  STORE[customerId] = { ...payload, updatedAt: new Date().toISOString() };
  persist();
}

export function getSubscription(customerId) {
  return STORE[customerId] || null;
}

// Example helper: map active status to plan name
export function planFromStore(customerId) {
  const sub = getSubscription(customerId);
  if (!sub) return "starter";
  if (sub.status !== "active" && sub.status !== "trialing") return "starter";
  return sub.plan || "starter";
}
