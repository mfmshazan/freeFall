# Flame in Freefall — Spacecraft Combustion Explorer

> NASA Space Apps Challenge 2026 · *Flame in Freefall*

Explore how an illustrative flame model responds to gravity, oxygen, pressure, airflow,
balance gas and material. The cabin builder shows oxygen fraction and its derived partial
pressure. The canvas uses illustrative palettes and a halo for model spread. Comparable measured
outcome validation remains open in [Phase 4](IMPLEMENTATION_ROADMAP.md#4-validate-one-measurable-prediction-independently).

Watch the recorded Saffire-I and BASS-II experiments, then use the research stories to
trace findings and limitations to NASA reports. Each story distinguishes the apparatus and
measurements from the current cabin scenario. See the [demo script](DEMO_SCRIPT.md).

## Challenge objectives → where they live

| Objective (challenge brief) | Implemented in |
|---|---|
| **Predict flame behavior in microgravity** | GP surrogate (`backend/surrogate.py`) + parametric `FlameCanvas` |
| **…and communicate uncertainty** | Evidence status and a model spread halo |
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
uvicorn main:app --port 8000
```

**Frontend** (Node 18+):
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

The frontend works **with or without** the backend: if `localhost:8000` is unreachable it falls
back to the in-browser physics engine (the header badge shows which mode is live). With the
backend up the app shows Gaussian Process standard deviation. The fallback uses heuristic
spread. Both modes show the same research stories and source locators. Original reports require
internet access.

## Project layout

```
AGENTS.md                          # repository-wide Codex instructions
skills/01-flame-physics-rules.md   # canonical physics specification
skills/02-canvas-animation-spec.md # FlameCanvas rendering contract
backend/
  data/psi_master.json             # 26 records: 2 real_psi, 24 seed (verify citations before submit)
  physics.py                       # physics port (synthetic anchors + fallback)
  surrogate.py                     # multi-output GaussianProcessRegressor
  ranker.py                        # legacy training-row references
  evidence.py                      # catalog compatibility and condition ranking
  export_evidence.py               # validated catalog and report asset export
  main.py                          # FastAPI prediction and evidence endpoints
frontend/
  src/physics/flameModel.ts        # physics port (TS) — offline fallback
  src/physics/localService.ts      # fallback ranker + uncertainty
  src/components/FlameCanvas.tsx    # the parametric digital-twin animation
  src/components/*                 # CabinBuilder, TrustGauge, EvidencePanel, ResearchStories
  src/App.tsx                       # Predictor, research stories and replay views
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

From `frontend/`, run `npm run check:evidence` and `npm run build`. The parity check compiles the
TypeScript ranker, runs the shared fixtures through both implementations, and compares distances
within 10⁻¹². It uses `python3` or the interpreter set by `EVIDENCE_PYTHON`.

## Data honesty note

`backend/data/psi_master.json` currently contains **26 rows: 2 `real_psi` rows and 24 `seed` rows**.
For the two real rows, experimental conditions come from Saffire-I; flame outputs are marked as
`physics_estimate` where they are not direct measurements. The seed rows are synthetic examples.
The reviewed catalog is a separate evidence collection. The predictor uses no comparable measured
outcomes. See the [data inventory](DATA_INVENTORY.md) for source access and measurement limits.
