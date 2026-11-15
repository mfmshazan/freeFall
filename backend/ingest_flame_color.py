"""Ingest the NASA ACME CFI-G inverse-flame color observations (PSI-159).

The CFI-G inverse-flame experiment is the only PSI table in the FlameColor
dataset that reports an observed flame *color* for each run, alongside the
oxygen mole fraction (XO2) and the adiabatic flame temperature (Tad). That makes
it the ground truth for a small flame-color classifier (see flame_color.py).

This script turns the reviewed CSV into two committed artifacts:

  backend/data/flame_color_master.json
      Training records: oxygen_fraction, flame_temp_k, fuel, sooting_index, color
      (blue / yellow / mixed). Extinction ("limit") rows are kept but flagged so
      the model can learn the flammable envelope without polluting the classes.

  frontend/public/data/flame_color_catalog.json
      Scatter points (XO2, Tad, color) + citation, consumed by the fire-lab
      "flame color map" chart.

Run:  python ingest_flame_color.py
"""
from __future__ import annotations
import csv
import json
import os
import zipfile

HERE = os.path.dirname(__file__)
CSV_NAME = "PSI-159_CFI-G_Inverse_Flames.csv"
CSV_PATH = os.path.join(HERE, "data", "raw", "flame_color", CSV_NAME)
ZIP_FALLBACK = os.path.join(HERE, "..", "data_raw", "FlameColor.zip")
ZIP_MEMBER = "PSI-159_Experimental table_CFI-G_Inverse Flames.csv"

MASTER_OUT = os.path.join(HERE, "data", "flame_color_master.json")
CATALOG_OUT = os.path.join(HERE, "..", "frontend", "public", "data", "flame_color_catalog.json")

CITATION = {
    "study": "PSI-159",
    "investigation": "ACME CFI-G (Coflow Flames of Interest — Gravity), inverse flames",
    "source": "NASA Physical Sciences Informatics",
    "url": "https://www.nasa.gov/combustion-integrated-rack-advanced-combustion-via-microgravity-experiments-acme/",
    "note": "Gaseous hydrocarbon inverse jet flames; observed color recorded per run.",
}

# Laminar-sooting index for the gaseous fuels in this table, on the same 0-1
# scale as physics.FUELS[...]["soot_base"] so the classifier generalises to the
# app's fuel menu. Ordering follows laminar smoke-point data (methane sootiest-
# resistant; butane sootier). These are deliberately well below solid fuels.
FUEL_SOOTING = {"methane": 0.08, "ethane": 0.12, "propane": 0.22, "butane": 0.30}


def _num(s: str):
    s = (s or "").strip().replace("~", "")
    try:
        return float(s)
    except ValueError:
        return None


def normalize_color(raw: str) -> str | None:
    """blue / yellow / mixed for real colors; 'limit' for extinction; None if blank."""
    c = (raw or "").strip().lower()
    if not c or c in {"-", "n/a", "na"}:
        return None
    if "limit" in c:
        return "limit"
    has_y, has_b = "yellow" in c, "blue" in c
    if has_y and has_b:
        return "mixed"
    if has_y:
        return "yellow"
    if has_b:
        return "blue"
    return None


def _open_rows():
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, encoding="utf-8", errors="replace") as f:
            yield from f.read().splitlines()
        return
    with zipfile.ZipFile(ZIP_FALLBACK) as z:  # reproducible from the raw dataset
        with z.open(ZIP_MEMBER) as f:
            yield from f.read().decode("utf-8", "replace").splitlines()


def parse() -> list[dict]:
    lines = list(_open_rows())
    reader = csv.DictReader(lines)
    reader.fieldnames = [fn.strip() for fn in reader.fieldnames]
    out = []
    for row in reader:
        row = {(k or "").strip(): (v or "").strip() for k, v in row.items()}
        color = normalize_color(row.get("Color", ""))
        xo2 = _num(row.get("XO2", ""))
        tad = _num(row.get("Tad (K)", ""))
        if color is None or xo2 is None:
            continue
        fuel = (row.get("Fuel", "") or "").strip().lower() or "ethane"
        out.append({
            "test_id": row.get("Test", "") or row.get("Day", ""),
            "day": row.get("Day", ""),
            "fuel": fuel,
            "oxygen_fraction": round(xo2, 4),
            "flame_temp_k": round(tad, 1) if tad is not None else None,
            "sooting_index": FUEL_SOOTING.get(fuel, 0.18),
            "color": color,
        })
    return out


def main():
    records = parse()
    classified = [r for r in records if r["color"] in ("blue", "yellow", "mixed")]
    with_temp = [r for r in classified if r["flame_temp_k"] is not None]
    if len(with_temp) < 40:
        raise ValueError(f"Too few usable CFI-G color rows ({len(with_temp)}); aborting write")

    master = {
        "citation": CITATION,
        "fuel_sooting_index": FUEL_SOOTING,
        "counts": {
            "total": len(records),
            "blue": sum(r["color"] == "blue" for r in records),
            "yellow": sum(r["color"] == "yellow" for r in records),
            "mixed": sum(r["color"] == "mixed" for r in records),
            "limit": sum(r["color"] == "limit" for r in records),
        },
        "records": records,
    }
    with open(MASTER_OUT, "w", encoding="utf-8") as f:
        json.dump(master, f, indent=2)

    catalog = {
        "citation": CITATION,
        "points": [
            {
                "xo2": r["oxygen_fraction"],
                "tad_k": r["flame_temp_k"],
                "color": r["color"],
                "fuel": r["fuel"],
                "test_id": r["test_id"],
            }
            for r in records if r["flame_temp_k"] is not None
        ],
    }
    os.makedirs(os.path.dirname(CATALOG_OUT), exist_ok=True)
    with open(CATALOG_OUT, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)

    print(f"Wrote {len(records)} rows ({master['counts']}) -> flame_color_master.json")
    print(f"Wrote {len(catalog['points'])} scatter points -> flame_color_catalog.json")


if __name__ == "__main__":
    main()
