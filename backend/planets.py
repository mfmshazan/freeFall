"""Planetary gravity & orbital altitude parameters (NASA Planetary Fact Sheet).

Used by POST /api/predict and GET /api/planets so the Flame Lab can model:
1. Free-fall orbital spacecraft (default on arrival: cabin gravity = 0 g)
2. Surface / 1-bar reference level (g = g_surface)
3. Continuous altitude profile from Surface (0 km) to Maximum Orbit (Hill sphere / SOI)
   via the inverse-square law: g(h) = g_surface * (R / (R + h))^2.
"""
from __future__ import annotations
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


PLANETS: dict[str, PlanetSpec] = {
    "mercury": {
        "id": "mercury",
        "name": "Mercury",
        "surface_label": "Surface",
        "g_surface": 0.38,
        "g_surface_m_s2": 3.70,
        "radius_km": 2439.7,
        "low_orbit_km": 200.0,
        "max_orbit_km": 112000.0,
    },
    "venus": {
        "id": "venus",
        "name": "Venus",
        "surface_label": "Surface",
        "g_surface": 0.90,
        "g_surface_m_s2": 8.87,
        "radius_km": 6051.8,
        "low_orbit_km": 250.0,
        "max_orbit_km": 616000.0,
    },
    "earth": {
        "id": "earth",
        "name": "Earth",
        "surface_label": "Surface",
        "g_surface": 1.00,
        "g_surface_m_s2": 9.81,
        "radius_km": 6371.0,
        "low_orbit_km": 400.0,
        "max_orbit_km": 924000.0,
    },
    "moon": {
        "id": "moon",
        "name": "Moon",
        "surface_label": "Surface",
        "g_surface": 0.17,
        "g_surface_m_s2": 1.62,
        "radius_km": 1737.4,
        "low_orbit_km": 100.0,
        "max_orbit_km": 66100.0,
    },
    "mars": {
        "id": "mars",
        "name": "Mars",
        "surface_label": "Surface",
        "g_surface": 0.38,
        "g_surface_m_s2": 3.71,
        "radius_km": 3389.5,
        "low_orbit_km": 250.0,
        "max_orbit_km": 577000.0,
    },
    "jupiter": {
        "id": "jupiter",
        "name": "Jupiter",
        "surface_label": "1-bar cloud top",
        "g_surface": 2.53,
        "g_surface_m_s2": 24.79,
        "radius_km": 69911.0,
        "low_orbit_km": 1000.0,
        "max_orbit_km": 48200000.0,
    },
    "saturn": {
        "id": "saturn",
        "name": "Saturn",
        "surface_label": "1-bar cloud top",
        "g_surface": 1.07,
        "g_surface_m_s2": 10.44,
        "radius_km": 58232.0,
        "low_orbit_km": 1000.0,
        "max_orbit_km": 54500000.0,
    },
    "uranus": {
        "id": "uranus",
        "name": "Uranus",
        "surface_label": "1-bar cloud top",
        "g_surface": 0.89,
        "g_surface_m_s2": 8.69,
        "radius_km": 25362.0,
        "low_orbit_km": 1000.0,
        "max_orbit_km": 51800000.0,
    },
    "neptune": {
        "id": "neptune",
        "name": "Neptune",
        "surface_label": "1-bar cloud top",
        "g_surface": 1.14,
        "g_surface_m_s2": 11.15,
        "radius_km": 24622.0,
        "low_orbit_km": 1000.0,
        "max_orbit_km": 86600000.0,
    },
}


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

