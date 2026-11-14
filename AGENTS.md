# Flame in Freefall — Repository Instructions

## Project map

- `frontend/` is the React + TypeScript + Vite dashboard and NASA replay viewer.
- `backend/` is the FastAPI prediction service, physics implementation, PSI ranker, and data ingester.
- `skills/01-flame-physics-rules.md` is the canonical physics specification. Read it before changing predictions, regimes, dimensions, uncertainty assumptions, or flame colors.
- `skills/02-canvas-animation-spec.md` is the canvas rendering contract. Read it before changing `FlameCanvas` or its animation behavior.
- `backend/data/psi_master.json` is the canonical model/ranker dataset. The frontend copy at `frontend/src/data/psi_master.json` must stay in sync when data changes.
- `DATA_INVENTORY.md` records provenance and limits of the downloaded NASA replay data. `DOWNLOAD_CHECKLIST.md` tracks official PSI CSV/metadata still needed for model ingestion.

## Project-specific rules

- Preserve a perfectly spherical flame (`aspect_ratio_LD === 1`) at `gravity_g === 0` and `airflow_cm_s === 0`; the 0g flame has no buoyant flicker.
- Keep flame animation deterministic. Use the seeded PMMA streak behavior and sine pulses described in the canvas spec where applicable.
- Keep confidence bounds and trust status visible in predictions and the canvas.
- Treat data provenance explicitly: current PSI JSON contains 26 records (2 `real_psi`, 24 `seed`). A `real_psi` label describes sourced experimental conditions; outputs marked `physics_estimate` are not measured values. Do not describe seed rows as NASA measurements or unverified DOIs as confirmed citations.
- Keep the frontend fallback response compatible with the backend `/api/predict` response.

## Working and verification

- Follow the existing implementation and package scripts; avoid adding dependencies for features the app does not use.
- For backend changes, run the checks available in `backend/requirements.txt` and the backend package. Report missing test coverage rather than implying it passed.
- For frontend changes, use the checks defined by `frontend/package.json` after dependencies are installed.
- For data changes, validate both JSON files and compare their records for parity.
- For documentation-only changes, check links and claims against the repository files and data. Do not run unrelated builds or tests.
- Keep raw source data read-only and out of the frontend bundle. Update the corresponding inventory when its provenance, derived assets, or known limitations change.
