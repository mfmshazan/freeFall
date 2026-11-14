"""Rebuild the existing PSI-98 Saffire-I rows. Use mine_nasa.py for new studies."""
from __future__ import annotations
import csv
import json
import os
import re

import physics

HERE = os.path.dirname(__file__)
RAW = os.path.join(HERE, "data", "raw")
OUT = os.path.join(HERE, "data", "psi_master.json")
FRONT_COPY = os.path.join(HERE, "..", "frontend", "src", "data", "psi_master.json")

# ---- material name -> app fuel enum (extend as new materials appear) ----
MATERIAL_MAP = [
    (r"sibal|cotton|fabric|cellul|filter paper|paper|wick", "Cotton_Fabric"),
    (r"pmma|acrylic|plexi|nylon|polyethylene|\bpe\b|thermoplast", "PMMA_Acrylic"),
    (r"kapton|wire|insulation|nomex|polyimide|silicone|ptfe|teflon|rubber|aramid", "Kapton_Wire"),
    (r"heptane|dodecane|hexane|octane|butanol|iso-?octane|ethanol|methanol|droplet|liquid fuel", "Heptane_Droplet"),
    (r"methane|propane|ethylene|ethene|hydrogen|syngas|gas|gaseous|burner", "Methane_Gas"),
]


def map_fuel(material: str) -> str:
    m = material.lower()
    for pat, fuel in MATERIAL_MAP:
        if re.search(pat, m):
            return fuel
    return "Cotton_Fabric"  # safe default for solid materials


def parse_number_range(s: str) -> float:
    """'21.5 - 21.7' -> 21.6 ; '~ 21.5' -> 21.5 ; '20' -> 20.0"""
    nums = re.findall(r"[-+]?\d*\.?\d+", s.replace("~", " "))
    nums = [float(n) for n in nums]
    if not nums:
        return float("nan")
    return sum(nums) / len(nums)


def parse_isatab(path: str) -> dict:
    """ISA-Tab: each line is tab-separated 'Key\\tval1\\tval2...'. Returns key->list[str]."""
    out: dict[str, list[str]] = {}
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if not parts or not parts[0].strip():
                continue
            key = parts[0].strip()
            vals = [p.strip() for p in parts[1:] if p.strip()]
            if vals:
                out.setdefault(key, vals)
    return out


def meta_get(meta: dict, key: str, default="") -> str:
    v = meta.get(key)
    return v[0] if v else default


def first_sentence(text: str, maxlen=260) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    cut = text[:maxlen]
    dot = cut.rfind(". ")
    return (cut[: dot + 1] if dot > 60 else cut).strip()


def ingest_investigation(folder: str) -> list[dict]:
    meta = parse_isatab(os.path.join(folder, "i_Investigation.txt"))
    csv_path = os.path.join(folder, "experimental_table.csv")

    study_id = meta_get(meta, "Study Identifier", os.path.basename(folder))
    if study_id != "PSI-98":
        raise ValueError(f"No verified legacy model mapping for {study_id}; use mine_nasa.py")
    name = meta_get(meta, "Study Title", study_id)
    approach = meta_get(meta, "Comment[Approach]")
    impacts = meta_get(meta, "Comment[Research Impacts]")
    hardware = meta_get(meta, "Comment[Experiment Hardware]", "PSI")
    platform = meta_get(meta, "Comment[Flight Platform]", "")
    acronym = meta_get(meta, "Comment[Investigation Acronym]", study_id)
    doi = meta_get(meta, "Comment[DOI]")
    subarea = meta_get(meta, "Comment[SubResearch Area]")
    pub_dois = [d for d in meta.get("Study Publication DOI", []) if d.startswith("10.")]

    doi_url = f"https://doi.org/{doi}" if doi else "https://www.psi.nasa.gov/"
    rack = "Cygnus" if "cygnus" in (hardware + platform).lower() else (
        "CIR" if "cir" in hardware.lower() else
        "MSG" if "glovebox" in hardware.lower() or "msg" in hardware.lower() else "PSI")
    gravity = 0.0  # PSI-98 flight runs only; simulator's nominal microgravity input

    records = []
    with open(csv_path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        reader.fieldnames = [fn.strip() for fn in reader.fieldnames]  # trim header spaces
        for row in reader:
            row = {(k or "").strip(): (v or "").strip() for k, v in row.items()}
            material = row.get("Material", "")
            # skip non-test rows (flow-visualization / notes with no conditions)
            if not material or not row.get("Percent O2") or "visulation" in material.lower() or "visualization" in material.lower():
                continue

            o2 = parse_number_range(row.get("Percent O2", ""))
            flow = parse_number_range(row.get("Air Flow (cm/s)", "") or "0")
            direction = row.get("Flow Direction", "") or row.get("Flow Direction ", "")
            burn_time = parse_number_range(row.get("Burn Time (s)", "") or "")
            fuel = map_fuel(material)
            pressure = 14.7  # cabin default; not in Saffire structured table

            # outputs not in the structured table -> physics estimate (clearly tagged)
            phys = physics.predict(gravity, o2, pressure, flow, "N2", fuel)
            sample = row.get("Sample Number", row.get("Sample Number ", "S?")).strip()

            records.append({
                "experiment_id": f"{acronym}-{sample}",
                "investigation_name": name,
                "hardware_rack": rack,
                "summary": first_sentence(approach) or name,
                "doi_url": doi_url,
                "publication_dois": pub_dois,
                "provenance": "real_psi",
                "output_source": "physics_estimate",  # conditions real, flame metrics modeled
                "material_real": material,
                "flow_direction": direction,
                "burn_time_s": None if burn_time != burn_time else burn_time,
                "reference_image": "/reference/saffire-1-flowvis.jpg" if "saffire" in acronym.lower() else None,
                "gravity_g": gravity,
                "o2_percent": round(o2, 1),
                "pressure_psi": pressure,
                "airflow_cm_s": round(flow, 1),
                "diluent": "N2",
                "fuel_material": fuel,
                "spread_rate_mm_s": round(phys["spread_rate_mm_s"], 3),
                "flame_length_mm": round(phys["flame_length_mm"], 2),
                "flame_width_mm": round(phys["flame_width_mm"], 2),
                "standoff_distance_mm": round(phys["standoff_distance_mm"], 2),
                "visual_regime": phys["visual_regime"],
                "soot_fraction": round(phys["soot_fraction"], 3),
                "safety_control_insight": f"PREVENTION/DETECTION: {subarea or 'Spacecraft fire'} — real large-scale {material} burn at {o2:.1f}% O2, {flow:.0f} cm/s {direction.lower()} flow.",
                "earth_spinoff_application": first_sentence(impacts.split("benefits")[-1] if "benefits" in impacts else impacts, 200) or "Spacecraft and terrestrial fire-safety design.",
            })
    return records


def main():
    with open(OUT, encoding="utf-8") as f:
        base = json.load(f)
    sourced = ingest_investigation(os.path.join(RAW, "saffire-1"))
    by_id = {r["experiment_id"]: r for r in sourced}
    expected = {"SAFFIRE-I-S1", "SAFFIRE-I-S2"}
    existing = {r["experiment_id"] for r in base["records"] if r.get("provenance") == "real_psi"}
    if set(by_id) != expected or len(sourced) != len(expected) or not expected <= existing:
        raise ValueError("Expected the two existing Saffire-I flight rows; no datasets written")
    base["records"] = [by_id.get(r["experiment_id"], r) for r in base["records"]]
    document = json.dumps(base, indent=2, allow_nan=False)
    for path in (OUT, FRONT_COPY):
        with open(path, "w", encoding="utf-8") as f:
            f.write(document)
    print("Rebuilt the two legacy Saffire-I rows in both dataset copies. Use mine_nasa.py for new studies.")


if __name__ == "__main__":
    main()
