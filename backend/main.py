"""Flame in Freefall — FastAPI backend.

POST /api/predict  ->  uncertainty-aware flame prediction + ranked PSI evidence
                       + engineering playbook, matching the frontend contract.
"""
from __future__ import annotations
import math
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal

from surrogate import Surrogate
import ranker

app = FastAPI(title="Flame in Freefall API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

SURROGATE = Surrogate()  # train once at startup


class CabinInputs(BaseModel):
    gravity_g: float = Field(ge=0, le=1)
    o2_percent: float = Field(ge=10, le=100)
    pressure_psi: float = Field(ge=3, le=15)
    airflow_cm_s: float = Field(ge=0, le=40)
    diluent: Literal["N2", "CO2", "He"]
    fuel_material: Literal[
        "PMMA_Acrylic", "Cotton_Fabric", "Kapton_Wire", "Heptane_Droplet", "Methane_Gas"
    ]


@app.get("/api/health")
def health():
    return {"status": "ok", "model": "GaussianProcessRegressor (Matern+White)"}


@app.post("/api/predict")
def predict(inp: CabinInputs):
    i = inp.model_dump()
    mean, std, phys, d_nn = SURROGATE.predict(
        i["gravity_g"], i["o2_percent"], i["pressure_psi"],
        i["airflow_cm_s"], i["diluent"], i["fuel_material"],
    )

    prediction = {
        "spread_rate_mm_s": round(mean["spread_rate_mm_s"], 3),
        "flame_length_mm": round(mean["flame_length_mm"], 2),
        "flame_width_mm": round(mean["flame_width_mm"], 2),
        "standoff_distance_mm": round(phys["standoff_distance_mm"], 2),
        "aspect_ratio_LD": round(phys["aspect_ratio_LD"], 3),
        "soot_fraction": round(phys["soot_fraction"], 3),
        "radiometric_flux_kw_m2": round(phys["radiometric_flux_kw_m2"], 2),
        "visual_regime": phys["visual_regime"],
    }

    if i["gravity_g"] == 0 and i["airflow_cm_s"] == 0:
        prediction["flame_length_mm"] = round(phys["flame_length_mm"], 2)
        prediction["flame_width_mm"] = prediction["flame_length_mm"]
        prediction["aspect_ratio_LD"] = 1.0

    ranked, nearest = ranker.rank(i)
    top = ranked[0]

    # --- trust logic: GP std + out-of-distribution penalty ---
    partial_gravity = 0.02 < i["gravity_g"] < 0.95   # model coverage penalty
    high_o2 = i["o2_percent"] >= 30
    extrap_pen = (0.6 if partial_gravity else 0.0) + (0.2 if high_o2 else 0.0)

    # relative GP uncertainty on length, blended with distance-to-data
    rel_std = std["flame_length_mm"] / max(1e-3, mean["flame_length_mm"])
    uncertainty_index = min(1.2, 0.5 * rel_std + 0.9 * d_nn + extrap_pen)
    trust_score = int(max(2, min(99, round(100 * math.exp(-1.4 * uncertainty_index)))))

    if partial_gravity and high_o2:
        trust_status = "UNVERIFIED_REGIME_DO_NOT_TRUST"
    elif trust_score < 55 or partial_gravity:
        trust_status = "CAUTION_EXTRAPOLATING"
    else:
        trust_status = "HIGH_CONFIDENCE"

    margin = {"HIGH_CONFIDENCE": 1.2, "CAUTION_EXTRAPOLATING": 1.8,
              "UNVERIFIED_REGIME_DO_NOT_TRUST": 2.6}[trust_status]

    explanation = _explain(trust_status, top, partial_gravity, high_o2, nearest)

    uncertainty = {
        "std_spread_rate": round(std["spread_rate_mm_s"], 3),
        "std_length_mm": round(std["flame_length_mm"], 2),
        "std_width_mm": round(std["flame_width_mm"], 2),
        "trust_score": trust_score,
        "trust_status": trust_status,
        "safety_margin_multiplier": margin,
        "plain_english_explanation": explanation,
    }

    return {
        "prediction": prediction,
        "uncertainty": uncertainty,
        "ranked_investigations": ranked,
        "engineering_playbook": _playbook(i, prediction),
        "earth_spinoff": top["earth_spinoff_application"],
        "source": "backend",
    }


def _explain(status, top, partial_g, high_o2, nearest):
    return ("No comparable measured outcome used by this model. Its training includes synthetic "
            "examples and estimated outcomes; GP spread is model-based and not a calibrated interval.")


def _playbook(i, p):
    return []
