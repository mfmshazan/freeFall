# 01 — Flame Physics Rules (Microgravity Combustion Digital Twin)

**Project:** Flame in Freefall — NASA Space Apps 2026
**Purpose:** Single source of truth for mapping cabin/test inputs → microgravity flame
geometry, spread rate, optical appearance, and extinction. These deterministic formulas are
shared by **three** consumers so they never disagree:

1. `frontend/src/components/FlameCanvas.tsx` — the parametric animation + offline fallback.
2. `backend/surrogate.py` — generates physics-informed synthetic boundary points to anchor
   the Gaussian Process between the real PSI data points.
3. `backend/ranker.py` — normalizes the same feature space for similarity scoring.

> These are **engineering surrogate correlations** tuned for real-time 2D rendering and for
> producing physically *plausible, monotonic* trends — **not** validated CFD. The master dataset contains synthetic examples and sourced conditions with estimated outcomes.
> Model predictions and uncertainty are illustrative and are not validated against comparable outcomes.

---

## 0. Canonical Input Schema

| Field | Type | Range | Notes |
|---|---|---|---|
| `gravity_g` | float | 0.0, 0.166, 0.38, 1.0 | ISS=0.0, Lunar=1/6, Mars=0.38, Earth=1.0 |
| `o2_percent` | float | 15 – 85 | Oxygen mole fraction ×100 |
| `pressure_psi` | float | 4.3 – 14.7 in the UI | Absolute total pressure in psi |
| `airflow_cm_s` | float | 0 – 30 | Forced convective flow (ventilation) |
| `diluent` | enum | `N2`, `CO2`, `He` | Illustrative balance gas in a binary mixture with oxygen |
| `fuel_material` | enum | see §1 | Solid / liquid / gaseous fuel |

### Derived drivers (compute once, reuse everywhere)

```
X      = o2_percent / 100                      # O2 mole fraction
Pr     = pressure_psi / 14.7                    # pressure ratio vs sea level
OPI    = (X * Pr) / 0.21                         # Oxygen Partial-pressure Index (air@1atm = 1.0)
g      = gravity_g                               # 0..1
U      = airflow_cm_s                            # cm/s
```

`OPI` is an internal illustrative driver normalized to the oxygen partial pressure at 21% and
14.7 psi. Display partial pressure as `X × pressure_psi` and round only the result shown to the user.
The orbital and supported lunar examples yield 3.087 and 3.264 psi, respectively. Similar partial
pressure does not establish equivalent flame behavior. Oxygen fraction, pressure, balance gas,
specimen and apparatus remain distinct. The presets illustrate model inputs.

---

## 1. Fuel Material Constants

| fuel_material | phase | `k_spread` | `soot_base` | `L0_mm` | `melts` | `MOC` (min O2 %) | notes |
|---|---|---|---|---|---|---|---|
| `PMMA_Acrylic`  | solid  | 1.10 | 0.72 | 14 | yes | 14 | melts → vapor-bubble streaks (BASS-II) |
| `Cotton_Fabric` | solid  | 1.60 | 0.45 | 12 | no  | 15 | fast char spread, moderate soot |
| `Kapton_Wire`   | solid  | 0.55 | 0.55 | 8  | no  | 19 | insulation; slow, hard to ignite |
| `Heptane_Droplet` | liquid | 0.90 | 0.80 | 10 | n/a | 12 | illustrative liquid fuel constants |
| `Methane_Gas`   | gas    | 1.00 | 0.08 | 16 | n/a | 10 | illustrative gas fuel constants |

- `k_spread`  — relative spread/burn-rate multiplier.
- `soot_base` — baseline coefficient for the soot proxy (0–1).
- `L0_mm`     — nominal flame length scale at reference conditions (air, 0g, no flow).
- `MOC`       — minimum oxygen concentration (%) for sustained burning at 1 atm; raised by §6.

**Hardware scale references for pixel→mm calibration:**
`20 mm` BASS acrylic sphere · `6 mm` ACME porous spherical burner · `25 mm` SPICE nozzle.

---

## 2. Spread / Burn Rate

```
# base, driven by oxygen partial pressure and fuel
Vbase = k_spread * (OPI ** 1.3)                 # mm/s, reference-normalized

# gravity: buoyancy ADDS oxidizer transport on Earth. In 0g, spread relies on diffusion/flow.
#   -> normal-gravity flames spread faster for upward spread; microgravity is slower & flow-limited
f_grav = 0.55 + 0.45 * g                         # 0g -> 0.55x, 1g -> 1.0x

# forced airflow: for microgravity, a little flow HELPS (brings O2); too much cools/blows off
#   concurrent-flow peak near ~10-15 cm/s, then decline toward blow-off
f_flow = 1.0 + 0.6 * exp(-((U - 12) ** 2) / (2 * 7 ** 2))   # Gaussian peak at U=12 cm/s

spread_rate_mm_s = clamp(Vbase * f_grav * f_flow * diluent_rate_factor, 0.0, 12.0)
```

For `Heptane_Droplet`, the model still returns an illustrative rate in mm/s. FLEX reports the
slope of droplet diameter squared over time in mm²/s and a droplet extinction diameter in mm.
An independently validated droplet model and target definition are deferred to Phase 4.

`diluent_rate_factor` — see §4.

---

## 3. Flame Geometry — Length, Width, Aspect Ratio, Standoff

### 3.1 Aspect ratio (THE microgravity signature)

```
# Pure microgravity + still air => SPHERE (aspect ~ 1.0). This rule is mandatory.
stretch = 1.0 + 1.8 * g + 0.09 * U               # gravity and flow both elongate the flame
aspect_ratio_LD = clamp(stretch, 1.0, 4.5)
```

**HARD RULE:** when `gravity_g == 0` **and** `airflow_cm_s == 0`, `aspect_ratio_LD` MUST be
`1.00` (perfect sphere). No exceptions — this is the visual proof the sim understands space.

### 3.2 Length & width

```
L_ref = L0_mm * (OPI ** 0.5)                      # higher O2 -> longer/brighter flame
base_radius = L_ref / 2

flame_length_mm = L_ref * sqrt(aspect_ratio_LD)
flame_width_mm  = L_ref / sqrt(aspect_ratio_LD)
```

### 3.3 Standoff distance (dark gap between fuel surface and reaction zone)

```
# standoff shrinks with higher O2/pressure (reaction zone pulled toward fuel),
# grows slightly in still microgravity (diffusion-controlled)
standoff_distance_mm = clamp(2.5 * (1.0 / OPI) * (1.0 + 0.4 * (1 - g)), 0.3, 6.0)
```

---

## 4. Diluent Effects (N2 / CO2 / He)

The model applies heuristic factors for a single balance gas.

| diluent | `diluent_rate_factor` | `soot_mult` |
|---|---|---|
| `N2` | 1.00 | 1.00 |
| `CO2` | 0.72 | 0.85 |
| `He` | 1.15 | 0.80 |

These factors define model behavior only. Experimental mixtures and pressure outside the
predictor’s limits remain research evidence.

---

## 5. Optical Regime, Soot & Radiometric Flux

### 5.1 Soot fraction

```
soot_fraction = clamp(
    soot_base * soot_mult * (X ** 0.8) * (Pr ** 0.5) * (1.0 - 0.015 * max(0, o2_percent - 60)),
    0.0, 1.0)
```

The numeric result is an unvalidated proxy. The oxygen term does not diagnose chemistry or visibility.

### 5.2 Radiometric heat flux (proxy, illustrative only)

```
radiometric_flux_kw_m2 = clamp(3.0 * OPI * (0.4 + 0.6 * soot_fraction) + 1.5 * (1 - g), 0, 25)
```

This proxy is not a measurement and does not establish visibility, chemistry, or detector requirements.

### 5.3 Visual regime decision (evaluate top-to-bottom, first match wins)

```
if not is_flammable (§6)  OR  spread_rate_mm_s < 0.05:
        -> "QUENCHED_EXTINGUISHED"

elif fuel == "PMMA_Acrylic" and o2_percent >= 25:
        -> "BUBBLING_PMMA_STREAKS"       # seeded PMMA streak palette

elif soot_fraction >= 0.45:
        -> "SOOTY_YELLOW_CORE"           # yellow-core palette

elif aspect_ratio_LD > 1.25:
        -> "STRETCHED_LAMINAR_TEARDROP"  # elongated by flow/gravity

else:
        -> "SOOT_FREE_BLUE_SPHERE"       # blue palette (legacy wire name)
```

---

## 6. Extinction / Flammability Limits

```
# effective minimum oxygen concentration rises in reduced gravity and under strong flow (blow-off)
MOC_eff = MOC + 2.5 * (1 - g) + 0.20 * max(0, U - 18)     # percent O2

is_flammable = (o2_percent >= MOC_eff) and (OPI >= 0.45)
```

If `not is_flammable` → force `visual_regime = "QUENCHED_EXTINGUISHED"`, `spread_rate ≈ 0`,
and geometry collapses to a faint shrinking ember.

**Blow-off:** at `U > 25 cm/s` on small flames, multiply `spread_rate` by
`max(0, 1 - (U-25)/8)` to model convective blow-off / liftoff toward extinction.

---

## 7. Animation Rules (consumed by `02-canvas-animation-spec.md`)

- **NO random Earth-style flicker in 0g.** Buoyant turbulence does not exist in microgravity.
  The envelope must be *eerily smooth and steady*. Any `Math.random()` applied to the flame
  outline, size, or brightness jitter in `gravity_g == 0` is a **bug**.
- Allowed motion: deterministic seeded PMMA streaks and a slow sine pulse for modeled extinction.
- Color stops by regime:
  - Illustrative blue shell: `#1E40AF → #60A5FA → transparent`
  - Soot/yellow core: `#F59E0B → #FDE047`, radius ∝ `soot_fraction`
- **Uncertainty halo:** amber dashed contour showing model spread, not calibrated coverage.

---

## 8. Worked Reference Values (sanity targets for the audit in Step 5)

| Scenario | g | O2% | psi | U | fuel | expect |
|---|---|---|---|---|---|---|
| Orbital cabin example | 0.0 | 21 | 14.7 | 0 | Methane_Gas | blue sphere, aspect=1.00 |
| Acrylic with airflow | 0.0 | 25 | 14.7 | 10 | PMMA_Acrylic | stretched flame with seeded streaks |
| Supported lunar habitat example | 0.166 | 32 | 10.2 | 5 | Cotton_Fabric | stretched palette, extrapolation |
| High-oxygen / low-pressure example | 0.0 | 85 | 4.3 | 0 | PMMA_Acrylic | streak palette, aspect=1.00 |
| Modeled extinction example | 0.0 | 15 | 4.3 | 0 | Heptane_Droplet | dim circular ember with a sine pulse |

These checkpoints describe the deterministic appearance and physical boundary behavior.

## Presentation contract

At zero effective gravity and zero airflow, the API uses the physical model's equal length and width rather than independent GP dimension estimates. The offline path has the same boundary. The visual-regime classifier and soot and heat proxies are heuristic; palette colors do not confirm cool-flame chemistry or instrument requirements. Model spread is not a calibrated interval.
