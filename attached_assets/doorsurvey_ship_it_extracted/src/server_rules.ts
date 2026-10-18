// server_rules.ts
// Express router to serve merged rules and host the rule editor.
import express from "express";
import fs from "fs";
import path from "path";
import type { MasterRules, AmendmentsDoc } from "./apply_amendments";
import { applyAmendments } from "./apply_amendments";

export const rulesRouter = express.Router();

// Serve the static editor at /rules-editor
rulesRouter.use("/rules-editor", express.static(path.join(process.cwd(), "editor")));

// GET /rules?country=US&state=CA&city=...
rulesRouter.get("/rules", (req, res) => {
  try {
    const j = { country: req.query.country as string|undefined, state: req.query.state as string|undefined, province: req.query.province as string|undefined, city: req.query.city as string|undefined };
    const masterPath = path.join(process.cwd(), "rules_compliance_master.json");
    const amendPath = path.join(process.cwd(), "amendments_local.json");
    const master: MasterRules = JSON.parse(fs.readFileSync(masterPath, "utf8"));
    const amends: AmendmentsDoc = fs.existsSync(amendPath) ? JSON.parse(fs.readFileSync(amendPath, "utf8")) : { overrides: [] };
    const merged = applyAmendments(master, amends, j);
    res.json(merged);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to load rules" });
  }
});

// POST /rules/validate   body: { rules: MasterRules }
rulesRouter.post("/rules/validate", (req, res) => {
  try {
    const payload = req.body;
    const errors: string[] = [];
    if (!payload || typeof payload !== "object") errors.push("Invalid body");
    if (!payload.rules || !Array.isArray(payload.rules)) errors.push("Missing rules[]");
    const ids = new Set<string>();
    for (const r of (payload.rules||[])) {
      if (!r.id) errors.push("Rule missing id");
      if (ids.has(r.id)) errors.push("Duplicate id: " + r.id);
      ids.add(r.id);
      if (!r.category) errors.push(`Rule ${r.id} missing category`);
      if (!r.severity) errors.push(`Rule ${r.id} missing severity`);
      if (!r.check) errors.push(`Rule ${r.id} missing check`);
    }
    if (errors.length) return res.status(400).json({ ok: false, errors });
    return res.json({ ok: true, count: (payload.rules||[]).length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Validation failed" });
  }
});