"""Flame in Freefall — FastAPI backend.

POST /api/predict  ->  deterministic exploratory prediction and example input matches
POST /api/evidence ->  reviewed experiment compatibility, condition differences and outcome coverage.
"""
from __future__ import annotations
from functools import lru_cache
import logging
import math
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import Field

import physics
from flame_color import FlameColorModel
import ranker
from briefing import router as briefing_router
from evidence import rank_evidence
from evidence_api import CabinInputs as EvidenceCabinInputs, EvidenceQuery, EvidenceResponse
from export_evidence import load_catalog
from planets import PLANETS, GravityMode, resolve_planet_gravity

app = FastAPI(title="Flame in Freefall API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)
app.include_router(briefing_router)

MODEL = "Deterministic physics baseline"
FLAME_COLOR = FlameColorModel()  # CFI-G color classifier, trained once at startup
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


class CabinInputs(EvidenceCabinInputs):
    gravity_g: float = Field(default=0.0, ge=0, le=3, allow_inf_nan=False)
    world: str | None = None
    altitude_km: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    gravity_mode: GravityMode | None = None


@app.get("/api/health")
def health():
    return {"status": "ok", "model": MODEL}


@app.get("/api/planets")
def get_planets():
    return {"planets": PLANETS}


@app.post("/api/predict")
def predict(inp: CabinInputs):
    i = inp.model_dump(exclude={"world", "altitude_km", "gravity_mode"})
    raw = inp.model_dump()
    planet = resolve_planet_gravity(raw.get("world"), inp.gravity_g, raw.get("altitude_km"), raw.get("gravity_mode"))
    if planet["world"]:
        i["gravity_g"] = planet["effective_gravity_g"]
    prediction = physics.predict(**i)
    flame_color = FLAME_COLOR.predict(i["o2_percent"], i["fuel_material"])

    ranked, nearest = ranker.rank(i)

    non_standard_g = 0.02 < i["gravity_g"] < 0.95 or i["gravity_g"] > 1.05
    high_o2 = i["o2_percent"] >= 30
    penalty = (0.6 if non_standard_g else 0.0) + (0.2 if high_o2 else 0.0)
    spread_fraction = 0.08 + 0.9 * nearest + penalty
    legacy_score = max(2, min(99, math.floor(100 * math.exp(-1.4 * (nearest + penalty)) + 0.5)))
    trust_status = "EXPLORATORY"
    if non_standard_g and high_o2:
        trust_status = "UNVERIFIED_REGIME_DO_NOT_TRUST"
    elif non_standard_g or legacy_score < 55:
        trust_status = "CAUTION_EXTRAPOLATING"

    return {
        "model": MODEL,
        "prediction": prediction,
        "uncertainty": {
            "std_spread_rate": prediction["spread_rate_mm_s"] * min(0.9, spread_fraction),
            "std_length_mm": prediction["flame_length_mm"] * min(0.8, spread_fraction),
            "std_width_mm": prediction["flame_width_mm"] * min(0.8, spread_fraction),
            "trust_score": legacy_score,
            "trust_status": trust_status,
            "safety_margin_multiplier": None,
            "plain_english_explanation": (
                "Exploratory prediction. The ± values show heuristic model spread based on "
                "scenario distance to example inputs. Coverage has not been calibrated."
            ),
        },
        "flame_color": flame_color,
        "ranked_investigations": ranked,
        "engineering_playbook": [],
        "earth_spinoff": ranked[0]["earth_spinoff_application"],
        "planet_telemetry": planet if planet["world"] else None,
        "source": "backend",
    }


_FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")
