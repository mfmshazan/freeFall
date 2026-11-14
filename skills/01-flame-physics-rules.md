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
| `pressure_psi` | float | 4.3 – 14.7 | 14.7 = sea level; 10.2 = Artemis; 4.3 = EMU suit |
| `airflow_cm_s` | float | 0 – 30 | Forced convective flow (ventilation) |
| `diluent` | enum | `N2`, `CO2`, `He` | Inert balance gas |
| `fuel_material` | enum | see §1 | Solid / liquid / gaseous fuel |

### Derived drivers (compute once, reuse everywhere)

```
X      = o2_percent / 100                      # O2 mole fraction
Pr     = pressure_psi / 14.7                    # pressure ratio vs sea level
OPI    = (X * Pr) / 0.21                         # Oxygen Partial-pressure Index (air@1atm = 1.0)
g      = gravity_g                               # 0..1
U      = airflow_cm_s                            # cm/s
```

`OPI` (Oxygen Partial-pressure Index) is the master flammability driver. `OPI = 1.0` is
normal sea-level air. Artemis cabin (32% O2, 10.2 psi) → `OPI ≈ (0.32*0.694)/0.21 ≈ 1.06`.
EMU suit (85% O2, 4.3 psi) → `OPI ≈ (0.85*0.293)/0.21 ≈ 1.19`. Higher `OPI` = more dangerous.

---

## 1. Fuel Material Constants

| fuel_material | phase | `k_spread` | `soot_base` | `L0_mm` | `melts` | `MOC` (min O2 %) | notes |
|---|---|---|---|---|---|---|---|
| `PMMA_Acrylic`  | solid  | 1.10 | 0.72 | 14 | yes | 14 | melts → vapor-bubble streaks (BASS-II) |
| `Cotton_Fabric` | solid  | 1.60 | 0.45 | 12 | no  | 15 | fast char spread, moderate soot |
| `Kapton_Wire`   | solid  | 0.55 | 0.55 | 8  | no  | 19 | insulation; slow, hard to ignite |
| `Heptane_Droplet` | liquid | 0.90 | 0.80 | 10 | n/a | 12 | d²-law regression, sooty yellow (FLEX) |
| `Methane_Gas`   | gas    | 1.00 | 0.08 | 16 | n/a | 10 | clean blue, soot-free (ACME/BRE) |

- `k_spread`  — relative spread/burn-rate multiplier.
- `soot_base` — intrinsic sooting propensity (0–1) before O2/pressure modulation.
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

For `Heptane_Droplet` interpret `spread_rate_mm_s` as the **d²-law regression rate**
(droplet diameter shrink rate), not surface spread.

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

Diluent changes heat capacity and transport. Relative to N2 baseline:

| diluent | `diluent_rate_factor` | `soot_mult` | thermal note |
|---|---|---|---|
| `N2` | 1.00 | 1.00 | baseline |
| `CO2` | 0.72 | 0.85 | high heat capacity → strong suppressant (FLEX-2) |
| `He` | 1.15 | 0.80 | high conductivity → hotter small flame, but raises extinction limit |

CO2 is the most effective inert suppressant per mole (chemical + thermal). He conducts heat
away fast — it both intensifies a healthy flame and quenches a marginal one sooner.

---

## 5. Optical Regime, Soot & Radiometric Flux

### 5.1 Soot fraction

```
soot_fraction = clamp(
    soot_base * soot_mult * (X ** 0.8) * (Pr ** 0.5) * (1.0 - 0.015 * max(0, o2_percent - 60)),
    0.0, 1.0)
```

Note the high-O2 *suppression* term: very high O2 + low pressure (suit/cool-flame regimes)
burns hot and **clean/blue** — soot drops, flame can become near-invisible.

### 5.2 Radiometric heat flux (proxy, illustrative only)

```
radiometric_flux_kw_m2 = clamp(3.0 * OPI * (0.4 + 0.6 * soot_fraction) + 1.5 * (1 - g), 0, 25)
```

This proxy is not a measurement and does not establish visibility, chemistry, or detector requirements.

### 5.3 Visual regime decision (evaluate top-to-bottom, first match wins)

```
if OPI < (MOC/100)/0.21  OR  spread_rate_mm_s < 0.05:
        -> "QUENCHED_EXTINGUISHED"

elif o2_percent >= 60 and pressure_psi <= 7.0 and soot_fraction < 0.15:
        -> "INVISIBLE_COOL_FLAME"        # hot, clean, low visible light (CFI-G like)

elif fuel == "PMMA_Acrylic" and o2_percent >= 25:
        -> "BUBBLING_PMMA_STREAKS"       # melting plastic vapor-bubble ejections

elif soot_fraction >= 0.45:
        -> "SOOTY_YELLOW_CORE"           # yellow blackbody soot core inside blue shell

elif aspect_ratio_LD > 1.25:
        -> "STRETCHED_LAMINAR_TEARDROP"  # elongated by flow/gravity

else:
        -> "SOOT_FREE_BLUE_SPHERE"       # the canonical 0g still-air blue ball
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
- Allowed stochastic effects: only `BUBBLING_PMMA_STREAKS` micro-sparks (deterministic seeded
  PRNG, not `Math.random()`), and a slow **rhythmic radial pulse** near extinction
  (`spread_rate` low AND `is_flammable` marginal) — a sine pulse, not noise.
- Color stops by regime:
  - Blue chemiluminescence shell: `#1E40AF → #60A5FA → transparent`
  - Soot/yellow core: `#F59E0B → #FDE047`, radius ∝ `soot_fraction`
  - Cool/invisible: violet-blue `#4C1D95 → #6D28D9` at ≤ 0.18 opacity; illustrative only
- **Uncertainty halo:** amber dashed contour showing model spread, not calibrated coverage.

---

## 8. Worked Reference Values (sanity targets for the audit in Step 5)

| Scenario | g | O2% | psi | U | fuel | expect |
|---|---|---|---|---|---|---|
| ISS candle baseline | 0.0 | 21 | 14.7 | 0 | Methane_Gas | perfect blue **sphere**, aspect=1.00, low soot |
| ISS acrylic + draft | 0.0 | 21 | 14.7 | 10 | PMMA_Acrylic | teardrop, bubbling streaks, moderate soot |
| Artemis lunar base | 0.166 | 32 | 10.2 | 5 | Cotton_Fabric | stretched, faster spread, **extrapolating** regime |
| EMU suit fire | 0.0 | 85 | 4.3 | 0 | PMMA_Acrylic | heuristic faint palette; chemistry unconfirmed |
| CO2 suppression test | 0.0 | 18 | 14.7 | 0 | Heptane_Droplet | near MOC, slow pulse → **QUENCHED** |

These are the trend checkpoints — exact numbers come from the GP trained on `psi_master.json`.
```

## Phase 1 presentation contract

At zero effective gravity and zero airflow, the API uses the physical model's equal length and width rather than independent GP dimension estimates. The offline path has the same boundary. The visual-regime classifier and soot and heat proxies are heuristic; palette colors do not confirm cool-flame chemistry or instrument requirements. Model spread is not a calibrated interval.
