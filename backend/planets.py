"""Planetary gravity & orbital altitude parameters (NASA Planetary Fact Sheet).

Used by POST /api/predict and GET /api/planets so the Flame Lab can model:
1. Free-fall orbital spacecraft (default on arrival: cabin gravity = 0 g)
2. Surface / 1-bar reference level (g = g_surface)
3. Continuous altitude profile from Surface (0 km) to Maximum Orbit (Hill sphere / SOI)
   via the inverse-square law: g(h) = g_surface * (R / (R + h))^2.
"""
from __future__ import annotations
import json
from pathlib import Path
from typing import Literal, TypedDict

G0_M_S2 = 9.80665

GravityMode = Literal["free_orbit", "surface", "low_alt", "max_orbit", "altitude", "custom"]


class PlanetSpec(TypedDict):
    id: str
    name: str
    surface_label: str
    g_surface: float
    g_surface_m_s2: float
    radius_km: float
    low_orbit_km: float
    max_orbit_km: float


PLANETS: dict[str, PlanetSpec] = json.loads(Path(__file__).with_name("data").joinpath("planets.json").read_text())


def resolve_planet_gravity(
    world: str | None,
    gravity_g: float | None,
    altitude_km: float | None = None,
    gravity_mode: str | None = None,
) -> dict:
    """Resolve effective cabin gravity (in g) and orbital telemetry for a planet."""
    w_key = (world or "").lower().strip()
    spec = PLANETS.get(w_key)
    if not spec:
        g_val = max(0.0, min(3.0, float(gravity_g or 0.0)))
        return {
            "world": None,
            "gravity_mode": gravity_mode or "custom",
            "altitude_km": max(0.0, float(altitude_km or 0.0)),
            "effective_gravity_g": g_val,
            "local_field_g": g_val,
            "g_surface": 1.0,
            "max_orbit_km": None,
        }

    r_km = spec["radius_km"]
    g_surf = spec["g_surface"]
    max_h = spec["max_orbit_km"]
    low_h = spec["low_orbit_km"]
    mode = gravity_mode or ("free_orbit" if gravity_g == 0 and altitude_km is None else "custom")

    if mode == "free_orbit":
        h = low_h if altitude_km is None else max(0.0, min(max_h, float(altitude_km)))
        local_g = g_surf * ((r_km / (r_km + h)) ** 2)
        eff_g = 0.0
    elif mode == "surface":
        h = 0.0
        local_g = g_surf
        eff_g = g_surf
    elif mode == "low_alt":
        h = low_h
        local_g = g_surf * ((r_km / (r_km + h)) ** 2)
        eff_g = local_g
    elif mode == "max_orbit":
        h = max_h
        local_g = g_surf * ((r_km / (r_km + h)) ** 2)
        eff_g = 0.0
    elif mode == "altitude" or altitude_km is not None:
        h = max(0.0, min(max_h, float(altitude_km or 0.0)))
        local_g = g_surf * ((r_km / (r_km + h)) ** 2)
        eff_g = 0.0 if (h >= max_h * 0.98 or local_g < 0.002) else local_g
    else:
        # Clamp explicit gravity_g to [0, g_surface] for that planet
        eff_g = max(0.0, min(g_surf, float(gravity_g if gravity_g is not None else 0.0)))
        if eff_g <= 0.002:
            eff_g = 0.0
            h = max_h
            local_g = 0.0
        elif eff_g >= g_surf:
            eff_g = g_surf
            h = 0.0
            local_g = g_surf
        else:
            h = min(max_h, max(0.0, r_km * ((g_surf / eff_g) ** 0.5 - 1.0)))
            local_g = eff_g

    return {
        "world": spec["id"],
        "name": spec["name"],
        "surface_label": spec["surface_label"],
        "gravity_mode": mode,
        "altitude_km": round(h, 1),
        "effective_gravity_g": round(eff_g, 4),
        "local_field_g": round(local_g, 4),
        "g_surface": g_surf,
        "radius_km": r_km,
        "low_orbit_km": low_h,
        "max_orbit_km": max_h,
    }

