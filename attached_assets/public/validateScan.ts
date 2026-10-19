export type Country = "US" | "CA";
export type DoorType = "swing" | "sliding" | "revolving" | "folding" | "other";
export type Operation = "manual" | "automatic";
export interface Gaps { top?: number; latch?: number; hinge?: number; meeting_stiles?: number; bottom?: number; }
export interface ManeuveringSide { latch_side_in?: number; perpendicular_depth_in?: number; }
export interface Maneuvering { pull_side?: ManeuveringSide; push_side?: ManeuveringSide; }
export interface DoorInfo { type: DoorType; operation: Operation; fire_rating_minutes?: number; adjacent_swing_door_present?: boolean; has_breakout?: boolean; power_fail_safe_open?: boolean; }
export interface Measurements { clear_opening_in?: number; clear_height_in?: number; threshold_height_in?: number; hardware_height_in?: number; gaps_in?: Gaps; maneuvering?: Maneuvering; breakout_clear_opening_in?: number; clear_opening_in_power_on?: number; clear_opening_in_power_off?: number; }
export interface Payload { country: Country; residential?: boolean; accessible_route?: boolean; egress_required?: boolean; door: DoorInfo; occupant_load?: number; measurements: Measurements; config?: { ca_allow_legacy_800mm?: boolean; measurement_uncertainty_in?: number; }; }
const RULES = require("./app/validation/validation_rules.json");
const withinLower = (m: number, rmin: number, tol: number) => (m + tol) >= rmin;
const withinUpper = (m: number, rmax: number, tol: number) => m <= (rmax + tol);
export function validate(p: Payload) {
  const tol = p.config?.measurement_uncertainty_in ?? RULES.tolerances.measurement_uncertainty_in;
  const cr = RULES.countries[p.country];
  const results: any[] = [];
  const add = (passed: boolean, code: string, message: string, severity: "FAIL"|"WARN"|"INFO"="FAIL", ctx: any = {}) => results.push({ code, passed, severity: passed ? "INFO" : severity, message, context: ctx });
  const accessible = p.accessible_route ?? true; const egress = p.egress_required ?? true; const resi = p.residential ?? false;
  let minCO = cr.accessibility.min_clear_opening_in;
  if (p.country === "CA" && p.config?.ca_allow_legacy_800mm) minCO = Math.min(minCO, cr.accessibility.legacy_min_clear_opening_in);
  if (egress) minCO = Math.max(minCO, cr.egress.min_clear_opening_in);
  const co = p.measurements.clear_opening_in ?? 0;
  add(withinLower(co, minCO, tol), "CLEAR_WIDTH", `Clear opening ${co.toFixed(2)} in ≥ ${minCO.toFixed(2)} in.`, "FAIL", { measured_in: co, required_min_in: minCO, tolerance_in: tol });
  let minH = cr.egress.min_clear_height_in;
  if (p.country === "US" && resi && egress) minH = Math.min(minH, cr.egress.residential_min_clear_height_in);
  const ch = p.measurements.clear_height_in ?? 0;
  add(withinLower(ch, minH, tol), "CLEAR_HEIGHT", `Clear height ${ch.toFixed(2)} in ≥ ${minH.toFixed(2)} in.`, "FAIL", { measured_in: ch, required_min_in: minH, tolerance_in: tol });
  const thReq = accessible ? cr.accessibility.threshold_max_in : cr.sliding_egress.threshold_max_in;
  const th = p.measurements.threshold_height_in ?? 0;
  add(withinUpper(th, thReq, tol), "THRESHOLD", `Threshold ${th.toFixed(2)} in ≤ ${thReq.toFixed(2)} in.`, "FAIL", { measured_in: th, required_max_in: thReq, tolerance_in: tol });
  const [hmin, hmax] = cr.accessibility.hardware_height_in_range;
  const hh = p.measurements.hardware_height_in ?? 0;
  if (hh) add(withinLower(hh, hmin, tol) && withinUpper(hh, hmax, tol), "HARDWARE_HEIGHT", `Hardware height ${hh.toFixed(2)} in within ${hmin}-${hmax} in.`, "FAIL", { measured_in: hh, required_range_in: [hmin, hmax], tolerance_in: tol });
  else add(True, "HARDWARE_HEIGHT", "Hardware height not provided; skipping.", "INFO");
  const fr = p.door.fire_rating_minutes ?? 0;
  const gRules = fr > 0 ? cr.fire_door_gaps_in : cr.non_fire_swing_gaps_in;
  const gaps = p.measurements.gaps_in || {};
  const pairs: [keyof typeof gaps, string][] = [["top","top_max"],["latch","sides_max"],["hinge","sides_max"],["meeting_stiles","meeting_stiles_max"],["bottom","bottom_max"]];
  for (const [k, rk] of pairs) {
    const v = (gaps as any)[k]; if (v != null) { const req = gRules[rk] ?? 0.125; const pass = withinUpper(v, req, tol);
      add(pass, `GAP_${String(k).toUpperCase()}`, `${String(k)} gap ${v.toFixed(3)} in ≤ ${req.toFixed(3)} in.`, fr>0 ? "FAIL" : "WARN", { measured_in: v, required_max_in: req, tolerance_in: tol });
    }
  }
  if (accessible && p.measurements.maneuvering) {
    const needPull = cr.accessibility.maneuvering_clearances_in.pull_side;
    const needPush = cr.accessibility.maneuvering_clearances_in.push_side;
    for (const [side, need] of [["pull_side", needPull], ["push_side", needPush]] as const) {
      const have: any = (p.measurements.maneuvering as any)[side] || {};
      for (const dim of Object.keys(need)) {
        const mv = Number(have[dim] ?? 0), minv = Number((need as any)[dim]);
        add(withinLower(mv, minv, tol), `MANEUVER_${side.toUpperCase()}_${dim.toUpperCase()}`, `${side} ${dim.replace("_"," ")} ${mv.toFixed(1)} in ≥ ${minv.toFixed(1)} in.`, "FAIL", { measured_in: mv, required_min_in: minv, tolerance_in: tol });
      }
    }
  }
  const dtype = (p.door.type || "swing").toLowerCase(); const op = (p.door.operation || "manual").toLowerCase(); const occ = p.occupant_load || 0;
  if (dtype === "sliding") {
    if (op === "manual" && egress && occ > cr.sliding_egress.manual_allowed_if_occupant_load_lte)
      add(false, "SLIDING_MANUAL_EGRESS_OCCUPANT_LOAD", `Manual sliding egress serving ${occ} exceeds allowed ${cr.sliding_egress.manual_allowed_if_occupant_load_lte}.`, "FAIL", { occupant_load: occ });
    if (egress && cr.sliding_egress.requires_breakout_or_push_open) {
      const has = !!p.door.has_breakout;
      add(has, "SLIDING_BREAKOUT", "Sliding egress door must have breakout or push-open on failure.", "FAIL", { has_breakout: has });
    }
    const emerMin = cr.sliding_egress.min_emergency_clear_opening_in;
    const m = p.measurements.clear_opening_in ?? 0;
    add(withinLower(m, emerMin, tol), "SLIDING_EMERGENCY_CLEAR", `Emergency clear opening ${m.toFixed(2)} in ≥ ${emerMin.toFixed(2)} in.`, "FAIL", { measured_in: m, required_min_in: emerMin, tolerance_in: tol });
  }
  if (dtype === "revolving") {
    if (accessible && cr.revolving.not_accessible_route)
      add(false, "REVOLVING_ACCESSIBLE_ROUTE", "Revolving doors are not permitted on accessible routes; provide adjacent swinging/sliding door.", "FAIL");
    const adj = !!p.door.adjacent_swing_door_present;
    add(adj, "REVOLVING_ADJACENT_SWING", "Adjacent swinging door present.", "FAIL", { adjacent_swing_door_present: adj });
    if (p.door.has_breakout != null) {
      const bo = !!p.door.has_breakout;
      add(bo, "REVOLVING_BREAKOUT_PRESENT", "Revolving door provides breakout/collapse feature.", "FAIL", { has_breakout: bo });
    }
    const minBO = cr.revolving.min_breakout_clear_opening_in;
    const mbo = p.measurements.breakout_clear_opening_in ?? p.measurements.clear_opening_in ?? 0;
    if (mbo) add(withinLower(mbo, minBO, tol), "REVOLVING_BREAKOUT_CLEAR", `Breakout clear opening ${mbo.toFixed(2)} in ≥ ${minBO.toFixed(2)} in.`, "FAIL", { measured_in: mbo, required_min_in: minBO, tolerance_in: tol });
  }
  if (op === "automatic") {
    const fs = !!p.door.power_fail_safe_open;
    if (egress && cr.automatic_doors.requires_fail_safe)
      add(fs, "AUTO_FAIL_SAFE", "Automatic door must fail safe for egress (opens or is push-openable on power loss).", "FAIL", { power_fail_safe_open: fs });
    const co_on = p.measurements.clear_opening_in_power_on ?? p.measurements.clear_opening_in ?? 0;
    const co_off = p.measurements.clear_opening_in_power_off ?? p.measurements.clear_opening_in ?? 0;
    add(withinLower(co_on, cr.automatic_doors.min_clear_opening_in_power_on, tol), "AUTO_CLEAR_ON", `Powered clear opening ${co_on.toFixed(2)} in ≥ ${cr.automatic_doors.min_clear_opening_in_power_on.toFixed(2)} in.`, "FAIL");
    add(withinLower(co_off, cr.automatic_doors.min_clear_opening_in_power_off, tol), "AUTO_CLEAR_OFF", `Power-off clear opening ${co_off.toFixed(2)} in ≥ ${cr.automatic_doors.min_clear_opening_in_power_off.toFixed(2)} in.`, "FAIL");
  }
  const failed = results.filter(r => !r.passed && (r.severity === "FAIL" || r.severity === "WARN")).length
  return { summary: { total: results.length, failed }, results };
