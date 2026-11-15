# Flame in Freefall — Spacecraft Combustion Explorer

> NASA Space Apps Challenge 2026 · *Flame in Freefall*

Explore how an illustrative flame model responds to gravity, oxygen, pressure, airflow,
balance gas and material. The Flame Lab shows oxygen fraction and partial pressure, model
estimates and heuristic spread. The [Phase 4 audit](PHASE_4_VALIDATION_REPORT.md) found zero
eligible independent Saffire benchmarks. The app uses the deterministic physics baseline.

Watch the recorded Saffire-I and BASS-II experiments, then use the research stories to
trace findings and limitations to NASA reports. Each story distinguishes the apparatus and
measurements from the current cabin scenario. See the [demo script](DEMO_SCRIPT.md).

## Challenge objectives → where they live

| Objective (challenge brief) | Implemented in |
|---|---|
| **Predict flame behavior in microgravity** | Deterministic physics in the API and browser, with an illustrative Flame Lab animation |
| **…and communicate uncertainty** | Exploratory status and heuristic spread in the Flame Lab |
| **Summarize PSI investigations** | Reviewed case catalog with source locators, compatibility filters, and replays |
| **Explore fire-safety research and Earth applications** | Research stories covering ventilation, habitats, materials, optics, smoke detection and suppression |

## Architecture (short)

| App path | Backend | Offline |
|---|---|---|
| Prediction and uncertainty | `POST /api/predict` | Local physics and heuristic spread |
| Reviewed evidence and compatibility | `POST /api/evidence` | The same catalog and ranking rules bundled with the app |

Both deterministic physics ports follow the [physics spec](skills/01-flame-physics-rules.md).
Research stories and reviewed evidence use bundled content. See [architecture](ARCHITECTURE.md).

## Run it

**Backend** (Python 3.12):
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate       # macOS/Linux; Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 8000
```

**Frontend** (Node 18+):
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

The Vite dev server proxies `/api` to port 8000. When the API is unavailable, the Flame Lab
computes the same exploratory baseline in the browser and marks the source as offline.
The Evidence page uses the bundled catalog and the shared Phase 4 summary in both modes.
Original reports require internet access.

## Project layout

```
AGENTS.md                          # repository-wide Codex instructions
skills/01-flame-physics-rules.md   # canonical physics specification
skills/02-canvas-animation-spec.md # FlameCanvas rendering contract
backend/
  data/psi_master.json             # 26 records: 2 real_psi, 24 seed (verify citations before submit)
  physics.py                       # deterministic model and synthetic anchor recipe
  surrogate.py                     # experimental Gaussian Process comparator
  ranker.py                        # legacy training-row references
  evidence.py                      # catalog compatibility and condition ranking
  export_evidence.py               # validated catalog and report asset export
  main.py                          # FastAPI prediction and evidence endpoints
frontend/
  src/physics/flameModel.ts        # physics port (TS) — offline fallback
  src/physics/localService.ts      # fallback ranker + uncertainty
  fire-lab.html                    # WebGL flame illustration and model controls
  evidence.html                    # Validation summary, research stories and reviewed cases
  replay.html                      # Saffire-I and BASS-II recorded replays
DEMO_SCRIPT.md                     # 2-minute judge pitch
```

## Collecting NASA experiment evidence

From the repository root, with Python 3.12+ and curl:

```bash
python3 backend/mine_nasa.py --fetch
```

The collector downloads the public LUCI, BASS-II and SoFIE GEL reports once, inventories local
PSI exports, and writes `data_raw/mining/manifest.json` with source links, file hashes, mapped
rows, and missing files. Omit `--fetch` to scan offline. See the [download checklist](DOWNLOAD_CHECKLIST.md)
for the remaining exports. Downloaded originals stay under the ignored `data_raw/` directory by default.

The [canonical evidence catalog](backend/data/mined_evidence.json) carries field status, units,
exact source locators and comparison limits. The legacy `python3 backend/ingest_psi.py` command
rebuilds the two sourced Saffire-I training rows, whose flame outcomes are model estimates.

After a catalog edit, bump its version and regenerate both frontend assets from the repository root.

```bash
python3 backend/export_evidence.py
python3 backend/export_evidence.py --check
backend/.venv/bin/python -m unittest discover -s backend -p 'test_*.py'
```

From `frontend/`, run `npm run check:evidence`, `npm run check:appearance` and `npm run build`. The appearance check accepts `FREEFALL_PYTHON`. The parity check compiles the
TypeScript ranker, runs the shared fixtures through both implementations, and compares distances
within 10⁻¹². It uses `python3` or the interpreter set by `EVIDENCE_PYTHON`.

## Data honesty note

`backend/data/psi_master.json` currently contains **26 rows: 2 `real_psi` rows and 24 `seed` rows**.
For the two real rows, experimental conditions come from Saffire-I; flame outputs are marked as
`physics_estimate` where they are not direct measurements. The seed rows are synthetic examples.
The reviewed catalog is a separate evidence collection. The predictor uses no comparable measured
outcomes. See the [data inventory](DATA_INVENTORY.md) for source access and measurement limits.

Run `python3 backend/validate_model.py --check` to verify the frozen Phase 4 audit and bundled result.
