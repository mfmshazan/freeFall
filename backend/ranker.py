"""Physics-distance ranker: finds the NASA PSI experiments closest to the user's
cabin configuration and explains how they differ (the 'what changed' diff)."""
from __future__ import annotations
import json
import math
import os

DATA = os.path.join(os.path.dirname(__file__), "data", "psi_master.json")
RECORDS = json.load(open(DATA))["records"]

RANGES = dict(gravity_g=1.0, o2_percent=70.0, pressure_psi=10.4, airflow_cm_s=30.0)


def _distance(i, r):
    dg = (i["gravity_g"] - r["gravity_g"]) / RANGES["gravity_g"]
    do2 = (i["o2_percent"] - r["o2_percent"]) / RANGES["o2_percent"]
    dp = (i["pressure_psi"] - r["pressure_psi"]) / RANGES["pressure_psi"]
    df = (i["airflow_cm_s"] - r["airflow_cm_s"]) / RANGES["airflow_cm_s"]
    fuel_pen = 0.0 if i["fuel_material"] == r["fuel_material"] else 0.5
    dil_pen = 0.0 if i["diluent"] == r["diluent"] else 0.25
    return math.sqrt(4 * dg * dg + do2 * do2 + dp * dp + df * df + fuel_pen ** 2 + dil_pen ** 2)


def _diffs(i, r):
    out = []
    sgn = lambda v: "+" if v >= 0 else ""
    if abs(i["o2_percent"] - r["o2_percent"]) >= 1:
        out.append(f"{sgn(i['o2_percent']-r['o2_percent'])}{i['o2_percent']-r['o2_percent']:.0f}% O2")
    if abs(i["gravity_g"] - r["gravity_g"]) >= 0.01:
        out.append(f"{sgn(i['gravity_g']-r['gravity_g'])}{i['gravity_g']-r['gravity_g']:.2f} g")
    if abs(i["pressure_psi"] - r["pressure_psi"]) >= 0.2:
        out.append(f"{sgn(i['pressure_psi']-r['pressure_psi'])}{i['pressure_psi']-r['pressure_psi']:.1f} psi")
    if abs(i["airflow_cm_s"] - r["airflow_cm_s"]) >= 1:
        out.append(f"{sgn(i['airflow_cm_s']-r['airflow_cm_s'])}{i['airflow_cm_s']-r['airflow_cm_s']:.0f} cm/s")
    if i["fuel_material"] != r["fuel_material"]:
        out.append(f"fuel!= ({r['fuel_material'].replace('_',' ')})")
    if i["diluent"] != r["diluent"]:
        out.append(f"diluent {r['diluent']}")
    return out


def rank(inputs, top=4):
    scored = sorted(((r, _distance(inputs, r)) for r in RECORDS), key=lambda x: x[1])
    out = []
    for r, d in scored[:top]:
        out.append(dict(
            experiment_id=r["experiment_id"],
            investigation_name=r["investigation_name"],
            hardware_rack=r["hardware_rack"],
            similarity=round(100 * math.exp(-d)),
            parameter_diffs=_diffs(inputs, r),
            summary=r["summary"],
            doi_url=r["doi_url"],
            earth_spinoff_application=r["earth_spinoff_application"],
            provenance=r.get("provenance", "seed"),
            output_source=r.get("output_source"),
            material_real=r.get("material_real"),
            flow_direction=r.get("flow_direction"),
            reference_image=r.get("reference_image"),
            publication_dois=r.get("publication_dois"),
        ))
    return out, scored[0][1]
