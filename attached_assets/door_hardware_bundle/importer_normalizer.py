
"""
Distributor Price List Normalizer
---------------------------------
Usage:
  python importer_normalizer.py input.csv output.json --category-map map.json

- Reads a distributor CSV (see provided template columns).
- Normalizes to the standard schema and writes JSON records.
- Performs light validation against function codes and BHMA finishes if provided.

Notes:
  - This script is an example; extend mappings for your brands.
"""

import argparse, json, pandas as pd, sys

STANDARD_COLS = [
    "category","subtype","brand","model","nomenclature","grade",
    "bhma_standard","bhma_certified","msrp","typical_price",
    "material","finish_options","dimensions","door_thickness",
    "power","features","use","fire_rating","ada_compliant",
    "cross_ref","notes"
]

def load_maps(finishes_path=None, functions_path=None):
    finishes = None
    functions = None
    if finishes_path:
        finishes = pd.read_excel(finishes_path, sheet_name="BHMA Finishes")
    if functions_path:
        functions = pd.read_excel(functions_path, sheet_name="Lock Functions")
    return finishes, functions

def normalize_row(row):
    return {
        "category": row.get("category",""),
        "subtype": row.get("subtype",""),
        "brand": row.get("brand",""),
        "model": row.get("model",""),
        "nomenclature": row.get("nomenclature",""),
        "grade": row.get("grade",""),
        "bhma_standard": row.get("bhma_standard",""),
        "bhma_certified": True if str(row.get("bhma_standard","")).strip() else False,
        "msrp": float(row.get("msrp")) if row.get("msrp") not in [None,""] else None,
        "typical_price": float(row.get("cost")) if row.get("cost") not in [None,""] else None,
        "material": row.get("material",""),
        "finish_options": row.get("finish",""),
        "dimensions": row.get("dimensions",""),
        "door_thickness": row.get("door_thickness",""),
        "power": row.get("power",""),
        "features": row.get("features",""),
        "use": row.get("use",""),
        "fire_rating": row.get("fire_rating",""),
        "ada_compliant": row.get("ada_compliant",""),
        "cross_ref": row.get("cross_ref",""),
        "notes": row.get("notes","")
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv")
    parser.add_argument("output_json")
    parser.add_argument("--finishes-xlsx", help="Path to v1.2 workbook to validate finishes")
    parser.add_argument("--functions-xlsx", help="Path to v1.2 workbook to validate functions")
    args = parser.parse_args()

    df = pd.read_csv(args.input_csv)
    finishes, functions = load_maps(args.finishes_xlsx, args.functions_xlsx)

    records = []
    for _, r in df.iterrows():
        rec = normalize_row(r)
        # Light validation: finish codes present in BHMA map (if provided)
        if finishes is not None and rec["finish_options"]:
            # allow comma-separated list
            bad = []
            for token in [t.strip() for t in str(rec["finish_options"]).split(",")]:
                if token and token not in set(finishes["code_us"]).union(set(finishes["code_bhma"])):
                    bad.append(token)
            if bad:
                rec["notes"] = (rec.get("notes","") + f" [WARN unknown finish codes: {bad}]").strip()
        records.append(rec)

    with open(args.output_json, "w") as f:
        json.dump(records, f, indent=2)

    print(f"Normalized {len(records)} records to {args.output_json}")

if __name__ == "__main__":
    main()
