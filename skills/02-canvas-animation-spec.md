# 02 — Canvas Animation Spec (FlameCanvas rendering pipeline)

How `frontend/src/components/FlameCanvas.tsx` turns surrogate-model numbers into an illustrative
microgravity flame. The palette and soot and heat proxies are not calibrated measurements. Pairs with
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
  largest expected flame (incl. the model-spread halo) always fits.
- A **20 mm scale bar** (BASS acrylic sphere) is drawn bottom-left for pixel→mm calibration, matching
  the split-screen NASA reference.

## Regime rendering (`prediction.visual_regime`)
| Regime | Visual |
|---|---|
| `SOOT_FREE_BLUE_SPHERE` | smooth radial blue shell `#1E40AF→#60A5FA→transparent`, dark standoff gap, aspect≈1 |
| `STRETCHED_LAMINAR_TEARDROP` | same shell, ellipse elongated by `aspect_ratio_LD` along flow/gravity axis |
| `SOOTY_YELLOW_CORE` | blue shell + inner `#F59E0B→#FDE047` core, radius ∝ `soot_fraction` |
| `BUBBLING_PMMA_STREAKS` | sooty core + deterministic **seeded** (mulberry32) orange micro-streaks = vapor-bubble ejections |
| `INVISIBLE_COOL_FLAME` | faint violet illustrative palette; the heuristic does not establish cool-flame chemistry |
| `QUENCHED_EXTINGUISHED` | dim shrinking ember with a slow sine radial pulse (not noise) |

## Uncertainty halo (the core twist)
- Mean flame = crisp filled body. A dashed, slowly moving outer ellipse shows one model spread (`std_*`).
- The halo uses a neutral amber color; its spread is model-based in the backend and heuristic offline, not calibrated coverage.

## HUD telemetry (canvas corners)
- Top-left: `L`, `W` (mm), `L/D`. Top-right: spread (mm/s), standoff (mm), `±spread` (mm).
- Bottom-right: regime label + `g` / flow readout.

## Hard rules (audit will flag violations)
1. **No `Math.random()`** on size, outline, or brightness in 0g. Only the seeded PMMA streaks and
   the sine extinction pulse are allowed stochastic-looking effects.
2. `gravity_g == 0 && airflow == 0` ⟹ a true circle (aspect = 1.0).
3. The animation loop must `cancelAnimationFrame` on unmount (no leak).
4. Standoff dark gap must be visible whenever `standoff_distance_mm > 0.2` and not quenched.
