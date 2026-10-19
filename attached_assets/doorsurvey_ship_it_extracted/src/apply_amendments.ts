// apply_amendments.ts
// Utility to merge local/AHJ amendments into the master rules file.

export type CodeRef = { standard: string; section: string };
export type Rule = {
  id: string;
  title: string;
  category: string;
  severity: "info"|"warning"|"error";
  code_refs?: CodeRef[];
  applies_if?: any;
  check: any;
  message_pass?: string;
  message_fail?: string;
  fix?: string[];
  tags?: string[];
};

export type MasterRules = { meta: any; engine: any; rules: Rule[] };

type Jurisdiction = { country?: string; state?: string; province?: string; city?: string };

type AmendmentChange =
  | { rule_id: string; action: "replace"; check?: any; message_pass?: string; message_fail?: string; title?: string; severity?: Rule["severity"]; category?: string }
  | { rule_id: string; action: "merge"; patch: Partial<Rule> }
  | { rule_id: string; action: "note"; note: string }
  | { rule_id: string; action: "todo"; todo: string };

export type AmendmentsDoc = {
  meta?: any;
  overrides: Array<{ jurisdiction: Jurisdiction; reference?: string; changes: AmendmentChange[] }>;
};

function matchesJurisdiction(target: Jurisdiction, j: Jurisdiction): boolean {
  if (!j) return true;
  if (j.country && target.country && j.country !== target.country) return false as any;
  if (j.state && target.state && j.state !== target.state) return false as any;
  if (j.province && target.province && j.province !== target.province) return false as any;
  if (j.city && target.city && j.city !== target.city) return false as any;
  return true;
}

function deepMerge<T extends Record<string, any>>(a: T, b: Partial<T>): T {
  const out: any = Array.isArray(a) ? [...(a as any)] : { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof (out as any)[k] === "object") {
      (out as any)[k] = deepMerge((out as any)[k], v as any);
    } else {
      (out as any)[k] = v as any;
    }
  }
  return out;
}

export function applyAmendments(master: MasterRules, doc: AmendmentsDoc, j: Jurisdiction): MasterRules {
  const out: MasterRules = { ...master, rules: master.rules.map(r => ({ ...r, fix: r.fix ? [...r.fix] : [], tags: r.tags ? [...r.tags] : [] })) };
  const relevant = (doc.overrides || []).filter(o => matchesJurisdiction(j, o.jurisdiction));
  for (const ov of relevant) {
    for (const ch of ov.changes) {
      const idx = out.rules.findIndex(r => r.id === (ch as any).rule_id);
      if (idx < 0) {
        // If rule missing and change is not replace/merge, skip silently.
        continue;
      }
      const rule = out.rules[idx];
      switch (ch.action) {
        case "replace":
          out.rules[idx] = {
            ...rule,
            check: ch.check ?? rule.check,
            message_pass: ch.message_pass ?? rule.message_pass,
            message_fail: ch.message_fail ?? rule.message_fail,
            title: (ch as any).title ?? rule.title,
            severity: (ch as any).severity ?? rule.severity,
            category: (ch as any).category ?? rule.category
          };
          break;
        case "merge":
          out.rules[idx] = deepMerge(rule, ch.patch);
          break;
        case "note":
          out.rules[idx].fix = [...(out.rules[idx].fix || []), `NOTE (${ov.reference||"local"}): ${ch.note}`];
          break;
        case "todo":
          out.rules[idx].fix = [...(out.rules[idx].fix || []), `TODO (${ov.reference||"local"}): ${ch.todo}`];
          break;
      }
    }
  }
  return out;
}