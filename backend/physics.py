"""Python port of skills/01-flame-physics-rules.md.

Used to (a) generate physics-informed synthetic boundary points that anchor the
Gaussian Process between the sparse real PSI data, and (b) serve as a
deterministic fallback. Keep in sync with frontend/src/physics/flameModel.ts.
"""
from __future__ import annotations
import math
from typing import TypedDict

FUELS = {
    "PMMA_Acrylic":    dict(phase="solid",  k_spread=1.10, soot_base=0.72, L0=14, melts=True,  MOC=14),
    "Cotton_Fabric":   dict(phase="solid",  k_spread=1.60, soot_base=0.45, L0=12, melts=False, MOC=15),
    "Kapton_Wire":     dict(phase="solid",  k_spread=0.55, soot_base=0.55, L0=8,  melts=False, MOC=19),
    "Heptane_Droplet": dict(phase="liquid", k_spread=0.90, soot_base=0.80, L0=10, melts=False, MOC=12),
    "Methane_Gas":     dict(phase="gas",    k_spread=1.00, soot_base=0.08, L0=16, melts=False, MOC=10),
}
DILUENT = {
    "N2":  dict(rate=1.00, soot_mult=1.00),
    "CO2": dict(rate=0.72, soot_mult=0.85),
    "He":  dict(rate=1.15, soot_mult=0.80),
}


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


class Prediction(TypedDict):
    spread_rate_mm_s: float
    flame_length_mm: float
    flame_width_mm: float
    standoff_distance_mm: float
    aspect_ratio_LD: float
    soot_fraction: float
    radiometric_flux_kw_m2: float
    visual_regime: str


def drivers(o2_percent, pressure_psi):
    X = o2_percent / 100.0
    Pr = pressure_psi / 14.7
    OPI = (X * Pr) / 0.21
    return X, Pr, OPI


def predict(gravity_g, o2_percent, pressure_psi, airflow_cm_s, diluent, fuel_material) -> Prediction:
    f = FUELS[fuel_material]
    d = DILUENT[diluent]
    X, Pr, OPI = drivers(o2_percent, pressure_psi)
    g, U = gravity_g, airflow_cm_s

    # extinction (§6)
    g_deficit = max(0.0, 1.0 - g)
    MOC_eff = f["MOC"] + 2.5 * g_deficit + 0.20 * max(0, U - 18)
    is_flammable = (o2_percent >= MOC_eff) and (OPI >= 0.45)

    # spread (§2)
    Vbase = f["k_spread"] * (OPI ** 1.3)
    f_grav = 0.55 + 0.45 * g
    f_flow = 1.0 + 0.6 * math.exp(-((U - 12) ** 2) / (2 * 49))
    spread = Vbase * f_grav * f_flow * d["rate"]
    if U > 25:
        spread *= max(0.0, 1 - (U - 25) / 8)
    spread_rate = clamp(spread, 0.0, 12.0)

    # geometry (§3)
    aspect = clamp(1.0 + 1.8 * g + 0.09 * U, 1.0, 4.5)
    if g == 0 and U == 0:
        aspect = 1.0  # HARD RULE: perfect sphere
    L_ref = f["L0"] * (OPI ** 0.5)
    length = L_ref * math.sqrt(aspect)
    width = L_ref / math.sqrt(aspect)
    standoff = clamp(2.5 * (1.0 / OPI) * (1.0 + 0.4 * g_deficit), 0.3, 6.0)

    # soot & flux (§5)
    soot = clamp(
        f["soot_base"] * d["soot_mult"] * (X ** 0.8) * (Pr ** 0.5)
        * (1.0 - 0.015 * max(0, o2_percent - 60)),
        0.0, 1.0,
    )
    flux = clamp(3.0 * OPI * (0.4 + 0.6 * soot) + 1.5 * g_deficit, 0, 25)

    # regime (§5.3 + §6)
    if (not is_flammable) or spread_rate < 0.05:
        regime = "QUENCHED_EXTINGUISHED"
        spread_rate = min(spread_rate, 0.04)
        length *= 0.5
        width *= 0.5
    elif fuel_material == "PMMA_Acrylic" and o2_percent >= 25:
        regime = "BUBBLING_PMMA_STREAKS"
    elif soot >= 0.45:
        regime = "SOOTY_YELLOW_CORE"
    elif aspect > 1.25:
        regime = "STRETCHED_LAMINAR_TEARDROP"
    else:
        regime = "SOOT_FREE_BLUE_SPHERE"

    return Prediction(
        spread_rate_mm_s=spread_rate, flame_length_mm=length, flame_width_mm=width,
        standoff_distance_mm=standoff, aspect_ratio_LD=aspect, soot_fraction=soot,
        radiometric_flux_kw_m2=flux, visual_regime=regime,
    )
