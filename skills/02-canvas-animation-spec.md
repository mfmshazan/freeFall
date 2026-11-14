# 02 — Canvas Animation Spec (FlameCanvas rendering pipeline)

How `frontend/src/components/FlameCanvas.tsx` turns surrogate-model numbers into a calibrated
microgravity flame. This is a **digital twin**, not video-game fire. Pairs with
`01-flame-physics-rules.md` (the physics) — this file is the *rendering contract*.

## Render loop (decoupled from React)
- A single `requestAnimationFrame` loop lives in a `useEffect([])` that runs **once**. It never
  restarts when props change.
- Props feed `targetRef`; a separate `curRef` eases toward the target each frame using a
  frame-rate-independent step `k = 1 - exp(-dt / 0.1)` (~300 ms settle). Dragging a slider therefore
  **morphs** the flame smoothly; it never snaps or resets the animation.
- All time-varying effects derive from `performance.now()` → deterministic, no envelope jitter.

## Coordinate / scale
- Flame centered at `(W/2, 0.52H)`. `PX = 0.42H / max(40mm, length+uncertainty)` px per mm, so the
  largest expected flame (incl. the ±95% halo) always fits.
- A **20 mm scale bar** (BASS acrylic sphere) is drawn bottom-left for pixel→mm calibration, matching
  the split-screen NASA reference.

## Regime rendering (`prediction.visual_regime`)
| Regime | Visual |
|---|---|
| `SOOT_FREE_BLUE_SPHERE` | smooth radial blue shell `#1E40AF→#60A5FA→transparent`, dark standoff gap, aspect≈1 |
| `STRETCHED_LAMINAR_TEARDROP` | same shell, ellipse elongated by `aspect_ratio_LD` along flow/gravity axis |
| `SOOTY_YELLOW_CORE` | blue shell + inner `#F59E0B→#FDE047` core, radius ∝ `soot_fraction` |
| `BUBBLING_PMMA_STREAKS` | sooty core + deterministic **seeded** (mulberry32) orange micro-streaks = vapor-bubble ejections |
| `INVISIBLE_COOL_FLAME` | faint violet `#4C1D95→#6D28D9` at ≤0.18 opacity + pulsing **"OPTICAL HAZARD — RADIOMETER REQUIRED"** badge |
| `QUENCHED_EXTINGUISHED` | dim shrinking ember with a slow sine radial pulse (not noise) |

## Uncertainty halo (the core twist)
- Mean flame = crisp filled body. The **±95%** envelope (`std_* × 1.96`) is a dashed, slowly
  rotating outer ellipse.
- Color by trust: `rgba(16,185,129,.45)` green when `HIGH_CONFIDENCE`, else `rgba(239,68,68,.5)` red.
- As the user enters an unverified regime the halo visibly **expands and reddens** — this is the
  single most important visual in the demo.

## HUD telemetry (canvas corners)
- Top-left: `L`, `W` (mm), `L/D`. Top-right: spread (mm/s), standoff (mm), `±margin` (mm).
- Bottom-right: regime label + `g` / flow readout.

## Hard rules (audit will flag violations)
1. **No `Math.random()`** on size, outline, or brightness in 0g. Only the seeded PMMA streaks and
   the sine extinction pulse are allowed stochastic-looking effects.
2. `gravity_g == 0 && airflow == 0` ⟹ a true circle (aspect = 1.0).
3. The animation loop must `cancelAnimationFrame` on unmount (no leak).
4. Standoff dark gap must be visible whenever `standoff_distance_mm > 0.2` and not quenched.
