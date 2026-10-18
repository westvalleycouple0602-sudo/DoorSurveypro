import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { trackProjectEvent } from "../project-analytics";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

function mockWindow(value: object) {
  Object.defineProperty(globalThis, "window", { value, configurable: true });
}

test("tracking is safe outside the browser", () => {
  Reflect.deleteProperty(globalThis, "window");
  assert.doesNotThrow(() => trackProjectEvent("project_created"));
});

test("tracking is safe before the published tracker loads", () => {
  mockWindow({});
  assert.doesNotThrow(() => trackProjectEvent("project_created"));
});

test("passes the event name and categorical properties to the tracker once", () => {
  const calls: unknown[][] = [];
  mockWindow({ umami: { track: (...args: unknown[]) => { calls.push(args); } } });
  trackProjectEvent("plan_selected", { plan: "starter", billing_interval: "annual" });
  assert.deepEqual(calls, [
    ["plan_selected", { plan: "starter", billing_interval: "annual" }],
  ]);
});

test("synchronous tracker failure cannot break the app", () => {
  mockWindow({ umami: { track: () => { throw new Error("Tracker unavailable"); } } });
  assert.doesNotThrow(() => trackProjectEvent("lead_submitted"));
});

test("asynchronous tracker failure cannot break the app", async () => {
  mockWindow({ umami: { track: () => Promise.reject(new Error("Network error")) } });
  trackProjectEvent("lead_submitted");
  await new Promise(resolve => setImmediate(resolve));
});
