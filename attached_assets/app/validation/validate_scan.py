from fastapi import FastAPI, Body
import os
from app.posthog_client import capture as ph_capture
from app.jira import create_issue
from typing import Dict, Any, List
import json, os
app = FastAPI(title="Door & Frame Validator")
rules_path = os.path.join(os.path.dirname(__file__), "validation_rules.json")
with open(rules_path, "r") as f:
    RULES = json.load(f)
def within_lower(measured: float, required_min: float, tol: float) -> bool: return measured + tol >= required_min
def within_upper(measured: float, required_max: float, tol: float) -> bool: return measured <= required_max + tol
def add(result: List[Dict[str, Any]], passed: bool, code: str, msg: str, severity: str = "FAIL", data: Dict[str, Any] = None):
    result.append({"code": code, "passed": passed, "severity": severity if not passed else "INFO", "message": msg, "context": data or {}})
def get_country_block(country: str) -> Dict[str, Any]:
    if country not in RULES["countries"]: raise ValueError(f"Unsupported country '{country}'.")
    return RULES["countries"][country]
@app.post("/validate")
def validate(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    country = payload.get("country", "US"); resi = bool(payload.get("residential", False))
    accessible = bool(payload.get("accessible_route", True)); egress = bool(payload.get("egress_required", True))
    door = payload.get("door", {}); meas = payload.get("measurements", {}); cfg = payload.get("config", {})
    tol = float(cfg.get("measurement_uncertainty_in", RULES["tolerances"]["measurement_uncertainty_in"]))
    country_rules = get_country_block(country); result: List[Dict[str, Any]] = []
    if accessible or egress:
        if country == "CA":
            min_co = country_rules["accessibility"]["min_clear_opening_in"]
            if cfg.get("ca_allow_legacy_800mm", False): min_co = min(min_co, country_rules["accessibility"]["legacy_min_clear_opening_in"])
        else:
            min_co = max(country_rules["accessibility"]["min_clear_opening_in"], country_rules["egress"]["min_clear_opening_in"])
        measured = float(meas.get("clear_opening_in", 0)); passed = within_lower(measured, min_co, tol)
        add(result, passed, "CLEAR_WIDTH", f"Clear opening {measured:.2f} in ≥ required {min_co:.2f} in (±{tol:.2f}).", "FAIL", {"measured_in": measured, "required_min_in": min_co, "tolerance_in": tol})
    min_h = country_rules["egress"]["min_clear_height_in"]
    if resi and country == "US" and egress: min_h = min(min_h, country_rules["egress"]["residential_min_clear_height_in"])
    measured_h = float(meas.get("clear_height_in", 0)); passed = within_lower(measured_h, min_h, tol)
    add(result, passed, "CLEAR_HEIGHT", f"Clear height {measured_h:.2f} in ≥ required {min_h:.2f} in.", "FAIL", {"measured_in": measured_h, "required_min_in": min_h, "tolerance_in": tol})
    th_req = country_rules["accessibility"]["threshold_max_in"] if accessible else country_rules["sliding_egress"]["threshold_max_in"]
    th_meas = float(meas.get("threshold_height_in", 0)); passed = within_upper(th_meas, th_req, tol)
    add(result, passed, "THRESHOLD", f"Threshold {th_meas:.2f} in ≤ max {th_req:.2f} in.", "FAIL", {"measured_in": th_meas, "required_max_in": th_req, "tolerance_in": tol})
    hmin, hmax = country_rules["accessibility"]["hardware_height_in_range"]; hh = float(meas.get("hardware_height_in", 0))
    if hh > 0:
        passed = within_lower(hh, hmin, tol) and within_upper(hh, hmax, tol)
        add(result, passed, "HARDWARE_HEIGHT", f"Hardware height {hh:.2f} in within {hmin:.0f}–{hmax:.0f} in.", "FAIL", {"measured_in": hh, "required_range_in": [hmin, hmax], "tolerance_in": tol})
    else: add(result, True, "HARDWARE_HEIGHT", "Hardware height not provided; skipping.", "INFO", {})
    fr = int(door.get("fire_rating_minutes") or 0); gaps = meas.get("gaps_in", {}) or {}
    gap_rules = country_rules["fire_door_gaps_in"] if fr > 0 else country_rules["non_fire_swing_gaps_in"]
    for key, rule_key in [("top","top_max"),("latch","sides_max"),("hinge","sides_max"),("meeting_stiles","meeting_stiles_max"),("bottom","bottom_max")]:
        if key in gaps and gaps[key] is not None:
            gv = float(gaps[key]); req = float(gap_rules.get(rule_key, 0.125)); passed = within_upper(gv, req, tol)
            sev = "FAIL" if fr>0 else "WARN"; add(result, passed, f"GAP_{key.upper()}", f"{key.capitalize()} gap {gv:.3f} in ≤ max {req:.3f} in.", sev, {"measured_in": gv, "required_max_in": req, "tolerance_in": tol})
    man = (meas.get("maneuvering") or {})
    if accessible and man:
        need_pull = country_rules["accessibility"]["maneuvering_clearances_in"]["pull_side"]; need_push = country_rules["accessibility"]["maneuvering_clearances_in"]["push_side"]
        for side, need in [("pull_side", need_pull), ("push_side", need_push)]:
            have = man.get(side) or {}
            for dim, minv in need.items():
                mv = float(have.get(dim, 0)); passed = within_lower(mv, float(minv), tol)
                add(result, passed, f"MANEUVER_{side.upper()}_{dim.upper()}", f"{side} {dim.replace('_',' ')} {mv:.1f} in ≥ {float(minv):.1f} in.", "FAIL", {"measured_in": mv, "required_min_in": float(minv), "tolerance_in": tol})
    dtype = str(door.get("type","swing")).lower(); op = str(door.get("operation","manual")).lower(); occ = int(payload.get("occupant_load", 0))
    if dtype == "sliding":
        if op == "manual" and egress and occ > country_rules["sliding_egress"]["manual_allowed_if_occupant_load_lte"]:
            add(result, False, "SLIDING_MANUAL_EGRESS_OCCUPANT_LOAD", f"Manual sliding door used for egress serving {occ} occupants exceeds allowed {country_rules['sliding_egress']['manual_allowed_if_occupant_load_lte']}.","FAIL", {"occupant_load": occ})
        if egress and country_rules["sliding_egress"]["requires_breakout_or_push_open"]:
            has_breakout = bool(door.get("has_breakout", False))
            add(result, has_breakout, "SLIDING_BREAKOUT", "Sliding egress door must have breakout or be push-open on failure.", "FAIL", {"has_breakout": has_breakout})
        emer_min = country_rules["sliding_egress"]["min_emergency_clear_opening_in"]; measured = float(meas.get("clear_opening_in", 0)); passed = within_lower(measured, emer_min, tol)
        add(result, passed, "SLIDING_EMERGENCY_CLEAR", f"Emergency clear opening {measured:.2f} in ≥ {emer_min:.2f} in.", "FAIL", {"measured_in": measured, "required_min_in": emer_min, "tolerance_in": tol})
    if dtype == "revolving":
        if accessible and country_rules["revolving"]["not_accessible_route"]:
            add(result, False, "REVOLVING_ACCESSIBLE_ROUTE", "Revolving doors are not permitted on accessible routes; provide adjacent swinging/sliding door.", "FAIL", {})
        adj = bool(door.get("adjacent_swing_door_present", False)); add(result, adj, "REVOLVING_ADJACENT_SWING", "Adjacent swinging door present for egress and accessibility.", "FAIL", {"adjacent_swing_door_present": adj})
        if door.get("has_breakout") is not None:
            bo = bool(door.get("has_breakout")); add(result, bo, "REVOLVING_BREAKOUT_PRESENT", "Revolving door provides breakout/collapse feature.", "FAIL", {"has_breakout": bo})
        min_bo = country_rules["revolving"]["min_breakout_clear_opening_in"]; measured_bo = float(meas.get("breakout_clear_opening_in", meas.get("clear_opening_in", 0)))
        if measured_bo:
            passed = within_lower(measured_bo, min_bo, tol); add(result, passed, "REVOLVING_BREAKOUT_CLEAR", f"Breakout clear opening {measured_bo:.2f} in ≥ {min_bo:.2f} in.", "FAIL", {"measured_in": measured_bo, "required_min_in": min_bo, "tolerance_in": tol})
    if op == "automatic":
        fs = bool(door.get("power_fail_safe_open", False))
        if country_rules["automatic_doors"]["requires_fail_safe"] and egress:
            add(result, fs, "AUTO_FAIL_SAFE", "Automatic door must fail safe for egress (opens or is push-openable on power loss).", "FAIL", {"power_fail_safe_open": fs})
        co_on = float(meas.get("clear_opening_in_power_on", meas.get("clear_opening_in", 0))); co_off = float(meas.get("clear_opening_in_power_off", meas.get("clear_opening_in", 0)))
        req_on = country_rules["automatic_doors"]["min_clear_opening_in_power_on"]; req_off = country_rules["automatic_doors"]["min_clear_opening_in_power_off"]
        add(result, within_lower(co_on, req_on, tol), "AUTO_CLEAR_ON", f"Powered clear opening {co_on:.2f} in ≥ {req_on:.2f} in.", "FAIL", {"measured_in": co_on, "required_min_in": req_on})
        add(result, within_lower(co_off, req_off, tol), "AUTO_CLEAR_OFF", f"Power-off clear opening {co_off:.2f} in ≥ {req_off:.2f} in.", "FAIL", {"measured_in": co_off, "required_min_in": req_off})
    failed = [r for r in result if (not r["passed"] and r["severity"] in ("FAIL","WARN"))]
    summary = {"total": len(result), "failed": len(failed)}
# Emit PostHog event if configured
try:
    ph_capture("validator", "door_validation", total=summary["total"], failed=summary["failed"], country=country, dtype=door.get("type"), op=door.get("operation"))
except Exception:
    pass
# Create Jira issue if any FAILs and env flag is set
if summary["failed"] > 0 and os.getenv("VALIDATION_JIRA_ON_FAIL","false").lower() in {"1","true","yes"}:
    try:
        create_issue("Door validation FAIL detected", f"Summary: {summary}\nPayload country={country} type={door.get('type')} op={door.get('operation')}")
    except Exception:
        pass
return {"summary": summary, "results": result}


@app.get("/rules")
def rules():
    return RULES
