"""Flame in Freefall — FastAPI backend.

POST /api/predict  ->  uncertainty-aware flame prediction + ranked PSI evidence
                       + engineering playbook, matching the frontend contract.
POST /api/evidence ->  reviewed experiment compatibility, condition differences
                       and outcome coverage (umair's evidence catalog).
"""
from __future__ import annotations
from functools import lru_cache
import logging
import math
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Literal

from surrogate import Surrogate
import ranker
from planets import PLANETS, resolve_planet_gravity
from evidence import rank_evidence
from evidence_api import EvidenceQuery, EvidenceResponse
from export_evidence import load_catalog

app = FastAPI(title="Flame in Freefall API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

SURROGATE = Surrogate()  # train once at startup
evidence_catalog = lru_cache(maxsize=1)(load_catalog)
logger = logging.getLogger(__name__)


@app.post("/api/evidence", response_model=EvidenceResponse)
def evidence(query: EvidenceQuery):
    try:
        catalog = evidence_catalog()
    except (OSError, KeyError, TypeError, ValueError):
        logger.exception("Unable to load the reviewed evidence catalog")
        raise HTTPException(status_code=503, detail="Evidence catalog unavailable") from None
    return rank_evidence(catalog, query.model_dump())


class CabinInputs(BaseModel):
    gravity_g: float = Field(default=0.0, ge=0, le=3.0)
    o2_percent: float = Field(ge=10, le=100)
    pressure_psi: float = Field(ge=3, le=15)
    airflow_cm_s: float = Field(ge=0, le=40)
    diluent: Literal["N2", "CO2", "He"]
    fuel_material: Literal[
        "PMMA_Acrylic", "Cotton_Fabric", "Kapton_Wire", "Heptane_Droplet", "Methane_Gas"
    ]
    world: str | None = None
    altitude_km: float | None = Field(default=None, ge=0)
    gravity_mode: Literal[
        "free_orbit", "surface", "low_alt", "max_orbit", "altitude", "custom"
    ] | None = None


@app.get("/api/health")
def health():
    return {"status": "ok", "model": "GaussianProcessRegressor (Matern+White)"}


@app.get("/api/planets")
def get_planets():
    return {"planets": PLANETS}


@app.post("/api/predict")
def predict(inp: CabinInputs):
    i = inp.model_dump()
    planet_info = resolve_planet_gravity(
        i.get("world"), i.get("gravity_g"), i.get("altitude_km"), i.get("gravity_mode")
    )
    if planet_info["world"] is not None:
        i["gravity_g"] = planet_info["effective_gravity_g"]

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
    partial_gravity = 0.02 < i["gravity_g"] < 0.95   # PSI has NO partial-gravity flames
    hyper_gravity = i["gravity_g"] > 1.05            # PSI has NO hyper-gravity flames (>1g)
    non_standard_g = partial_gravity or hyper_gravity
    high_o2 = i["o2_percent"] >= 30
    extrap_pen = (0.6 if non_standard_g else 0.0) + (0.2 if high_o2 else 0.0)

    # relative GP uncertainty on length, blended with distance-to-data
    rel_std = std["flame_length_mm"] / max(1e-3, mean["flame_length_mm"])
    uncertainty_index = min(1.2, 0.5 * rel_std + 0.9 * d_nn + extrap_pen)
    trust_score = int(max(2, min(99, round(100 * math.exp(-1.4 * uncertainty_index)))))

    if non_standard_g and high_o2:
        trust_status = "UNVERIFIED_REGIME_DO_NOT_TRUST"
    elif trust_score < 55 or non_standard_g:
        trust_status = "CAUTION_EXTRAPOLATING"
    else:
        trust_status = "HIGH_CONFIDENCE"

    margin = {"HIGH_CONFIDENCE": 1.2, "CAUTION_EXTRAPOLATING": 1.8,
              "UNVERIFIED_REGIME_DO_NOT_TRUST": 2.6}[trust_status]

    explanation = _explain(trust_status, top, partial_gravity, hyper_gravity, high_o2, nearest)

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
        "planet_telemetry": planet_info if planet_info["world"] else None,
        "source": "backend",
    }


def _explain(status, top, partial_g, hyper_g, high_o2, nearest):
    if status == "UNVERIFIED_REGIME_DO_NOT_TRUST":
        regime_lbl = "hypergravity (>1g)" if hyper_g else "partial gravity"
        return (f"No spaceflight data exists for {regime_lbl} above 30% O2. The GP is "
                f"extrapolating far from its training set (closest real run: {top['experiment_id']}, "
                f"{top['similarity']}% match). Require a physical test or apply a heavy margin.")
    if status == "CAUTION_EXTRAPOLATING":
        reason = ("you are in partial gravity, which PSI never directly tested (only 0g and 1g)"
                  if partial_g else
                  "you are in hypergravity (>1g), beyond the 0g–1g NASA PSI dataset"
                  if hyper_g else
                  "elevated oxygen pushes beyond the densest part of the dataset" if high_o2 else
                  f"the nearest PSI run is only a {top['similarity']}% match")
        return (f"Moderate confidence: {reason}. The GP predictive variance is elevated; treat the "
                f"number as a bounded estimate anchored by {top['experiment_id']} ({top['similarity']}% match).")
    return (f"High confidence: cabin settings sit close to real NASA data ({top['experiment_id']}, "
            f"{top['similarity']}% match, GP distance {nearest:.2f}). Prediction is interpolated "
            f"within tested conditions.")


def _playbook(i, p):
    dangerous = p["spread_rate_mm_s"] > 1.5 or p["visual_regime"] == "BUBBLING_PMMA_STREAKS"
    invisible = p["visual_regime"] == "INVISIBLE_COOL_FLAME"
    return [
        {"category": "PREVENTION",
         "headline": "Swap to a flame-resistant material" if (i["fuel_material"] == "PMMA_Acrylic" or i["o2_percent"] >= 30) else "Material within tested envelope",
         "detail": (f"At {i['o2_percent']:.0f}% O2, screen cabin polymers — Saffire-II ranked materials at 34% O2. "
                    "Prefer Nomex/PTFE over acrylic and cotton.") if i["o2_percent"] >= 30 else
                   "Current material/atmosphere is near NASA-tested limits. Keep ventilation below the concurrent-flow spread peak (~12 cm/s).",
         "triggered": dangerous},
        {"category": "DETECTION",
         "headline": "Optical detectors will MISS this flame" if invisible else "Tune smoke detector for microgravity particles",
         "detail": ("CFI-G showed high-O2/low-pressure flames emit little visible light. Require radiometric or UV/OH* "
                    "sensing; standard photoelectric alarms are blind here.") if invisible else
                   "SAME/SAME-R: microgravity smoke coagulates into larger particles; DAFT-2 shows lunar dust can mimic smoke. "
                   "Use multi-wavelength scattering to reject dust false-alarms.",
         "triggered": invisible or i["gravity_g"] < 0.95},
        {"category": "SUPPRESSION",
         "headline": "Cut ventilation before discharging agent" if i["airflow_cm_s"] > 0 else "Select the right inert agent",
         "detail": "FLEX-2: CO2 extinguishes at higher residual O2 than N2 (strong per-mole inerting); He requires more O2 "
                   "to quench. BASS-II: in microgravity, airflow can feed a dying flame — shut HVAC first, then flood with CO2.",
         "triggered": p["visual_regime"] != "QUENCHED_EXTINGUISHED"},
    ]


_FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")
