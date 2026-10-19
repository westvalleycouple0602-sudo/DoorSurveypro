
export type HardwareRecord = {
  category?: string;
  subtype?: string;
  brand?: string;
  model?: string;
  features?: string;
  fire_rating?: string | null;
  finish_options?: string | null;
};

export type Finding = { rule_id: string; severity: "error"|"warning"; message: string; model?: string; category?: string };

const FINISH_CODES = new Set([
  "US26D","626","US26","625","US3","605","US4","606","US10","612","US10B","613","US15","619","US15A","620","US32D","630","US32","629","US28","313"
]);

export function validateFinishCodes(rec: HardwareRecord): Finding[] {
  const out: Finding[] = [];
  if (!rec.finish_options) return out;
  const bad: string[] = [];
  for (const token of String(rec.finish_options).split(",").map(s => s.trim()).filter(Boolean)) {
    if (!FINISH_CODES.has(token)) bad.push(token);
  }
  if (bad.length) out.push({ rule_id: "FIN-001", severity: "warning", message: `Unknown finish codes: ${bad.join(", ")}`, model: rec.model, category: rec.category });
  return out;
}

export function validateCodeRules(rec: HardwareRecord): Finding[] {
  const out: Finding[] = [];
  const features = (rec.features || "").toLowerCase();
  // EG-ML-002: maglock release requirements
  if ((rec.category || "").toLowerCase().includes("electromagnetic")) {
    const hasREX = features.includes("rex") || features.includes("motion");
    const hasManual = features.includes("push-to-exit") || features.includes("manual release") || features.includes("egress button");
    const hasFireDrop = features.includes("fire") || features.includes("facp") || features.includes("alarm drop");
    if (!(hasREX && hasManual && hasFireDrop)) {
      out.push({ rule_id: "EG-ML-002", severity: "error", message: "Maglock missing REX/motion, manual release, or fire alarm drop.", model: rec.model, category: rec.category });
    }
  }
  // FD-HO-003: mechanical hold-open on fire-rated door
  if ((rec.category || "").toLowerCase().includes("closer")) {
    const isHoldOpen = features.includes("hold-open");
    const isFireRated = !!(rec.fire_rating && String(rec.fire_rating).trim() not in ["—","None",""]);
  }
  return out;
}
