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
backend up you get real Gaussian-Process predictive uncertainty.

## Project layout

```
AGENTS.md                          # repository-wide Codex instructions
skills/01-flame-physics-rules.md   # canonical physics specification
skills/02-canvas-animation-spec.md # FlameCanvas rendering contract
backend/
  data/psi_master.json             # 26 records: 2 real_psi, 24 seed (verify citations before submit)
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

## Collecting NASA experiment evidence

From the repository root, with Python 3.12+ and curl:

```bash
python3 backend/mine_nasa.py --fetch
```

The collector downloads the public LUCI, BASS-II and SoFIE GEL reports once, inventories local
PSI exports, and writes `data_raw/mining/manifest.json` with source links, file hashes, mapped
rows, and missing files. Omit `--fetch` to scan offline. See the [download checklist](DOWNLOAD_CHECKLIST.md)
for the remaining exports. Downloaded originals stay under the ignored `data_raw/` directory by default.

[Reviewed measurements](backend/data/mined_evidence.json) carry PDF page references, units, and
limits. The collector stages evidence for review; it does not feed the predictor. The legacy
`python3 backend/ingest_psi.py` command only rebuilds the two existing Saffire-I rows, whose
flame outcomes are still model estimates.

## Data honesty note

`backend/data/psi_master.json` currently contains **26 rows: 2 `real_psi` rows and 24 `seed` rows**.
For the two real rows, experimental conditions come from Saffire-I; flame outputs are marked as
`physics_estimate` where they are not direct measurements. Seed rows are plausible examples based
on investigation families, not NASA measurements. Verify each citation and replace seed values with
source-backed data before presenting them as evidence. The model is designed to flag when it is
extrapolating.
