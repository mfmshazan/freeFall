# Flame in Freefall — Uncertainty-Aware Spacecraft Fire-Safety Predictor

> NASA Space Apps Challenge 2026 · *Flame in Freefall*

An interactive "fire-safety flight simulator" for spacecraft and lunar habitats. An engineer
describes a cabin (gravity, oxygen, pressure, airflow, material) and the app predicts how a
flame would behave in that environment — **and, crucially, tells the engineer when the AI is
too unsure to be trusted.** It then ranks the real NASA PSI experiments behind the prediction
and recommends concrete fire-safety actions.

![ISS baseline](.shots/final_iss_backend.png)

## Why it's different

Most teams show accuracy numbers. This tool shows **when the model should NOT be trusted** —
the exact concern of safety-critical aerospace engineering. Switch from the ISS preset (trust 93,
clean blue sphere) to the Artemis Lunar preset and watch trust collapse to ~18 **"DO NOT TRUST —
UNVERIFIED"** with the uncertainty halo flaring red: NASA has **no** partial-gravity combustion
data above 30% O₂, and the model says so out loud.

## Challenge objectives → where they live

| Objective (challenge brief) | Implemented in |
|---|---|
| **Predict flame behavior in microgravity** | GP surrogate (`backend/surrogate.py`) + parametric `FlameCanvas` |
| **…and report confidence / safety margin** | Trust gauge + uncertainty halo (the core twist) |
| **Summarize & rank relevant PSI investigations** | `backend/ranker.py` + Evidence panel (Top-4 + DOI links) |
| **Inform fire-safety controls & equipment** | "Fix It" playbook: Prevention / Detection / Suppression |
| **(Add-on) Map to Earth fire-safety spinoffs** | Earth Spinoff banner |

## Architecture (short)

```
Cabin inputs ─▶ useFlamePrediction (debounced, backend-first)
                     │                         ┌────────────────────────────┐
                     ├─ POST /api/predict ────▶│ FastAPI  (backend/main.py) │
                     │                         │  • GP surrogate  (Matérn)  │
                     │                         │  • PSI ranker              │
                     │                         │  • trust + playbook        │
                     │                         └────────────────────────────┘
                     └─ local fallback (frontend/src/physics/*) if backend offline
                     ▼
        FlameCanvas  +  TrustGauge  +  EvidencePanel  +  PlaybookPanel  +  SpinoffBanner
```

The flame animation, the offline fallback, and the GP's synthetic boundary anchors are **all
driven by the same physics spec** (`skills/01-flame-physics-rules.md` ⇄ `backend/physics.py` ⇄
`frontend/src/physics/flameModel.ts`) so nothing disagrees. See `ARCHITECTURE.md`.

## Run it

**Backend** (Python 3.12):
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows;  source .venv/bin/activate on macOS/Linux
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
backend up you get real Gaussian-Process predictive uncertainty.

## Project layout

```
skills/01-flame-physics-rules.md   # single source of truth for the physics
skills/02-canvas-animation-spec.md # how FlameCanvas renders each regime
backend/
  data/psi_master.json             # 25 PSI-grounded seed records (verify DOIs before submit)
  physics.py                       # physics port (synthetic anchors + fallback)
  surrogate.py                     # multi-output GaussianProcessRegressor
  ranker.py                        # physics-distance PSI similarity + diffs
  main.py                          # FastAPI /api/predict
frontend/
  src/physics/flameModel.ts        # physics port (TS) — offline fallback
  src/physics/localService.ts      # fallback ranker + uncertainty
  src/components/FlameCanvas.tsx    # the parametric digital-twin animation
  src/components/*                  # CabinBuilder, TrustGauge, EvidencePanel, Playbook, Spinoff
  src/App.tsx                       # 5-panel dashboard
DEMO_SCRIPT.md                     # 2-minute judge pitch
```

## Adding real PSI data (ingestion pipeline)

The app ships with real **Saffire-I (PSI-98)** data already ingested, plus seed records for
coverage. To add more investigations from the NASA PSI dataset:

1. Drop each investigation into its own folder under `backend/data/raw/<name>/` containing:
   - `i_Investigation.txt` — the ISA-Tab metadata file (has DOI, material, hardware, approach)
   - `experimental_table.csv` — the per-sample test matrix (O₂, airflow, material, burn time)
2. (Optional) put a representative frame in `frontend/public/reference/` for the split-screen.
3. Run the ingester:
   ```bash
   cd backend && python ingest_psi.py
   ```
   It parses every folder, maps real conditions/materials onto the app schema, and **merges**
   with the existing records. Real rows are tagged `provenance: "real_psi"`; conditions come
   straight from NASA, while flame metrics not present in the table are tagged
   `output_source: "physics_estimate"` until you extract them from imagery/publications.
4. Restart the backend (`uvicorn main:app --port 8000`) to retrain the GP on the new rows.

The UI shows a green **REAL PSI** badge on ingested records and a grey **SEED** badge on
placeholders, so judges can always see what's real. The raw 371 MB Saffire image drop lives in
`frontend/public/data/` and is **git-ignored** — only the promoted reference image and the
parsed metadata/CSV in `backend/data/raw/` are committed.

## Data honesty note

`psi_master.json` is a **physically-plausible seed** so the app runs end-to-end today. The input
parameters and output magnitudes follow real investigations (BASS/BASS-II, Saffire, FLEX/FLEX-2,
SAME/SAME-R, DAFT-2, ACME BRE/CFI-G/E-FIELD, SPICE, SLICE), but **per-run numbers and DOIs must be
replaced with verified values from [psi.nasa.gov](https://www.psi.nasa.gov) before final
submission.** The model's job is to interpolate between real data and *flag when it is
extrapolating* — which is exactly what the trust meter surfaces.
