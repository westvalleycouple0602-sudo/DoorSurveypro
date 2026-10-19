
"""
Code & AHJ Validator (Lightweight)
Usage:
  python code_validator.py input.json findings.json

Inspects normalized hardware records and flags common issues against rule set.
The input should be a JSON array of records (schema from importer_normalizer).
"""
import json, sys

RULES = [
    {"id":"EG-DC-001","match":{"category":"Locks","subtype":"Deadbolt","features_contains":"double"},"severity":"error","message":"Double-cylinder deadbolt on egress path is typically prohibited."},
    {"id":"EG-ML-002","match":{"category":"Electromagnetic Locks"},"requires":["features_contains:REX","features_contains:manual_release","features_contains:fire_drop"],"severity":"error","message":"Maglock missing REX/micro/motion, manual release, or fire drop."},
    {"id":"FD-HO-003","match":{"category":"Door Closers","features_contains":"hold-open"},"requires":["fire_rating:None"],"severity":"error","message":"Mechanical hold-open on fire-rated door not allowed."}
]

def field_contains(rec, key, token):
    val = (rec.get(key) or "")
    return token.lower() in str(val).lower()

def check_rule(rec, rule):
    # Basic category/subtype check
    m = rule.get("match",{})
    for k,v in m.items():
        if k == "features_contains":
            if not field_contains(rec, "features", v):
                return None
        else:
            if str(rec.get(k,"")) != v:
                return None
    # Requirements
    missing = []
    for req in rule.get("requires",[]):
        if req.startswith("features_contains:"):
            t = req.split(":",1)[1]
            if not field_contains(rec, "features", t):
                missing.append(f"features:{t}")
        elif req.startswith("fire_rating:"):
            # if fire_rating present (not None/'—'), it's a violation for this rule
            fr = rec.get("fire_rating")
            if fr and str(fr).strip() not in ["None","—",""]:
                missing.append("fire_rating should be None for this case")
    if missing:
        return {"rule_id":rule["id"],"severity":rule["severity"],"message":rule["message"],"missing":missing}
    return None

def main():
    if len(sys.argv) < 3:
        print("Usage: python code_validator.py input.json findings.json")
        sys.exit(1)
    input_path, output_path = sys.argv[1], sys.argv[2]
    with open(input_path) as f:
        data = json.load(f)
    # Accept either {"records":[...]} or raw array
    if isinstance(data, dict) and "records" in data:
        records = data["records"]
    else:
        records = data
    findings = []
    for rec in records:
        for rule in RULES:
            finding = check_rule(rec, rule)
            if finding:
                findings.append({"model":rec.get("model"), "category":rec.get("category"), **finding})
    with open(output_path,"w") as f:
        json.dump(findings, f, indent=2)
    print(f"Wrote {len(findings)} findings to {output_path}")

if __name__ == "__main__":
    main()
