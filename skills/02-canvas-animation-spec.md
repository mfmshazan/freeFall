# 02 — Canvas Animation Spec (FlameCanvas rendering pipeline)

The parametric canvas rules below describe the rendering contract. The active multipage
Flame Lab uses the WebGL shader in `frontend/fire-lab.html`, with an illustrative flame and
model values shown in its HUD. The palette and the soot and heat proxies have no measured
calibration. See `01-flame-physics-rules.md` for the deterministic model.

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
- A **20 mm model scale bar** is drawn bottom-left using the canvas model dimensions.

## Regime rendering (`prediction.visual_regime`)
| Regime | Visual |
|---|---|
| `SOOT_FREE_BLUE_SPHERE` | blue palette with radial shell and dark standoff gap |
| `STRETCHED_LAMINAR_TEARDROP` | same shell, ellipse elongated by `aspect_ratio_LD` along flow/gravity axis |
| `SOOTY_YELLOW_CORE` | blue shell + inner `#F59E0B→#FDE047` core, radius ∝ `soot_fraction` |
| `BUBBLING_PMMA_STREAKS` | blue shell, a yellow core when the soot proxy exceeds 0.12, and deterministic seeded (mulberry32) orange streaks |
| `QUENCHED_EXTINGUISHED` | modeled extinction palette with a dim ember and a slow sine radial pulse |

The UI displays neutral palette names. Recorded footage keeps its source colors and shows camera
metadata separately. Run-specific chemistry claims belong with the report’s diagnostic evidence.

## Uncertainty halo (the core twist)
- Mean flame = crisp filled body. A dashed, slowly moving outer ellipse shows one model spread (`std_*`).
- The halo uses a neutral amber color; the active HUD shows the heuristic spread returned by either model path. Coverage is uncalibrated.

## HUD telemetry (canvas corners)
- Top-left: `L`, `W` (mm), `L/D`. Top-right: spread (mm/s), standoff (mm), `±spread` (mm).
- Bottom-right: illustrative appearance label and `g` / flow readout. The adjacent uncertainty panel
  states the model’s evidence status and explains the halo.

## Hard rules (audit will flag violations)
1. **No `Math.random()`** on size, outline, or brightness in 0g. Only the seeded PMMA streaks and
   the sine extinction pulse are allowed stochastic-looking effects.
2. `gravity_g == 0 && airflow == 0` ⟹ a true circle (aspect = 1.0).
3. The animation loop must `cancelAnimationFrame` on unmount (no leak).
4. Standoff dark gap must be visible whenever `standoff_distance_mm > 0.2` and not quenched.
