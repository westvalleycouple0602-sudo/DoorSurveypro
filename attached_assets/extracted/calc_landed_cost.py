
import sys
import pandas as pd
import numpy as np
from pathlib import Path

def to_float(x, default=0.0):
    try:
        if x is None or (isinstance(x, float) and np.isnan(x)):
            return float(default)
        if isinstance(x, str) and x.strip() == "":
            return float(default)
        return float(x)
    except Exception:
        return float(default)

def calc_row(row):
    # Pull fields with safe defaults
    qty = to_float(row.get("qty"), 1.0)
    unit_cost = to_float(row.get("unit_cost"), 0.0)
    discount_pct = to_float(row.get("discount_pct"), 0.0)
    net_unit_cost = row.get("net_unit_cost")
    if net_unit_cost in (None, "", np.nan):
        net_unit_cost = unit_cost * (1.0 - discount_pct/100.0)
    else:
        net_unit_cost = to_float(net_unit_cost, unit_cost * (1.0 - discount_pct/100.0))

    # Duties
    tariff_rate_pct = to_float(row.get("tariff_rate_pct"), 0.0)
    anti_dumping_pct = to_float(row.get("anti_dumping_pct"), 0.0)
    other_duties_pct = to_float(row.get("other_duties_pct"), 0.0)

    customs_value = net_unit_cost * qty
    tariff_cost = to_float(row.get("tariff_cost"), np.round(customs_value * (tariff_rate_pct/100.0), 2))
    anti_dumping_cost = to_float(row.get("anti_dumping_cost"), np.round(customs_value * (anti_dumping_pct/100.0), 2))
    other_duties_cost = to_float(row.get("other_duties_cost"), np.round(customs_value * (other_duties_pct/100.0), 2))

    # Freight
    base_freight_cost = to_float(row.get("base_freight_cost"), 0.0)
    fuel_surcharge_pct = to_float(row.get("fuel_surcharge_pct"), 0.0)
    accessorials_cost = to_float(row.get("accessorials_cost"), 0.0)
    insurance_cost = to_float(row.get("insurance_cost"), 0.0)
    customs_brokerage_cost = to_float(row.get("customs_brokerage_cost"), 0.0)
    freight_cost_total = to_float(row.get("freight_cost_total"),
                                  np.round(base_freight_cost + base_freight_cost*(fuel_surcharge_pct/100.0)
                                           + accessorials_cost + insurance_cost + customs_brokerage_cost, 2))

    # Landed
    per_unit_duties = (tariff_cost + anti_dumping_cost + other_duties_cost) / max(qty, 1.0)
    per_unit_freight = freight_cost_total / max(qty, 1.0)
    landed_unit_cost = to_float(row.get("landed_unit_cost"),
                                np.round(net_unit_cost + per_unit_duties + per_unit_freight, 2))
    landed_line_total = to_float(row.get("landed_line_total"),
                                 np.round(landed_unit_cost * qty, 2))

    # Write back
    row["net_unit_cost"] = np.round(net_unit_cost, 2)
    row["tariff_cost"] = np.round(tariff_cost, 2)
    row["anti_dumping_cost"] = np.round(anti_dumping_cost, 2)
    row["other_duties_cost"] = np.round(other_duties_cost, 2)
    row["freight_cost_total"] = np.round(freight_cost_total, 2)
    row["landed_unit_cost"] = np.round(landed_unit_cost, 2)
    row["landed_line_total"] = np.round(landed_line_total, 2)
    return row

def summarize(df):
    cols_present = [c for c in ["landed_line_total","tariff_cost","anti_dumping_cost","other_duties_cost","freight_cost_total"] if c in df.columns]
    summary = {}
    for c in cols_present:
        summary[c] = float(np.nansum(pd.to_numeric(df[c], errors="coerce").fillna(0.0)))
    return summary

def main(argv=None):
    argv = argv or sys.argv[1:]
    if len(argv) < 1:
        print("Usage: python calc_landed_cost.py <input.csv> [output.csv]")
        sys.exit(1)
    inp = Path(argv[0])
    outp = Path(argv[1]) if len(argv) > 1 else inp.with_name(inp.stem + "_calc.csv")
    df = pd.read_csv(inp)

    # Compute for each line
    df = df.apply(calc_row, axis=1)

    # Sort (optional) by project/opening/line_no if present
    for col in ["project_id","opening_id","line_no"]:
        if col in df.columns:
            if col == "line_no":
                df[col] = pd.to_numeric(df[col], errors="coerce")
    sort_cols = [c for c in ["project_id","opening_id","line_no"] if c in df.columns]
    if sort_cols:
        df = df.sort_values(sort_cols, kind="stable")

    df.to_csv(outp, index=False)

    # Print a simple summary to stdout
    summary = summarize(df)
    print("Wrote:", outp)
    print("Summary:", summary)

if __name__ == "__main__":
    main()
