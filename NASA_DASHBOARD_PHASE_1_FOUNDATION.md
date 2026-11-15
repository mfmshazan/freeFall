# Phase 1 | Foundation and interfaces (minutes 0–12, one person)

Part of [NASA_DASHBOARD_60_MINUTE_PLAN.md](NASA_DASHBOARD_60_MINUTE_PLAN.md) (covers its minutes 0–5 "Confirm the demo path" plus the shared wiring that lets Phases 2A–2D run in parallel). Next: [Phase 2A](NASA_DASHBOARD_PHASE_2A_EVIDENCE_RAIL.md), [2B](NASA_DASHBOARD_PHASE_2B_FIXIT_EARTH.md), [2C](NASA_DASHBOARD_PHASE_2C_BRIEFING_BACKEND.md), [2D](NASA_DASHBOARD_PHASE_2D_BRIEFING_FRONTEND.md).

**Goal:** after this phase, every track works only in its own new files against fixed interfaces. Nobody else edits `fire-lab.html` or `main.py` until Phase 3.

## 1a. Make the build work (0–5)

Unresolved merge-conflict markers (`<<<<<<<` / `>>>>>>>`) are in:

- `backend/main.py` (docstring and imports; keep the `umair` side: `physics`, `EvidenceCabinInputs`, `GravityMode`, then check that `/api/predict` still matches `surrogate`/`physics` usage below it)
- `frontend/src/physics/localService.ts`
- `frontend/src/replay/SaffireReplay.tsx`, `Bass2Experiment.tsx`, `Bass2Compare.tsx`

Steps:

1. Resolve the markers. Read both sides of each; do not blanket-accept one side.
2. `cd frontend && npm run build && npm run check:evidence`
3. `backend/.venv/bin/python -m unittest discover -s backend -p 'test_*.py'`
4. Start Vite and FastAPI per [README.md](README.md#run-it); confirm `/api/health` works through the proxy.
5. Pick one AI provider. Nothing in `backend/requirements.txt` or the backend code uses a provider yet, so add the SDK/`httpx` dependency, put the key in the backend environment only, and make one minimal call from the backend environment.

## 1b. Shared contracts (5–12)

These are the only edits to shared files.

1. **Placeholders in `frontend/fire-lab.html`:** empty `#evidenceRank`, `#briefBtn`, `#briefingOut` (left column, near the evidence link at ~line 618), `#fixItPanel` (right column), `#earthCard` (bottom). One `<script type="module">` per track file (they may 404 until created; create empty stubs).
2. **Scenario event.** At the end of `renderModelPanels()` in `fire-lab.html` dispatch:
   ```js
   window.dispatchEvent(new CustomEvent("flameatlas:scenario", { detail: {
     scenarioKey, cabin: resolved, trustStatus: res?.uncertainty.trust_status ?? null,
     spreadModeled: res?.prediction ?? null, paneLabel } }))
   ```
   `scenarioKey` is a stable string of the normalized cabin values. In Compare mode it describes pane 1 only. Candle mode (`res == null`) sends `cabin` with `trustStatus: null`.
3. **Types** in `frontend/src/flameatlas/dashboardTypes.ts`: `ScenarioDetail`, `TopEvidence` (record id, compatibility group, one condition delta or missing field, one outcome with status and unit or null, source id and locator), `EvidenceDetail { scenarioKey, top, coverage: 'measured' | 'context_only' | 'none' }`, `PlaybookTopic`, `BriefingRequest { scenario_key, cabin }`, `BriefingResponse { scenario_key, mode: 'ai' | 'summary', fields: { observation, relevance, limit } }` where each field is `{ text, record_id, citation }`.
4. **One selection rule, written twice.** `frontend/src/evidence/selectTop.ts` and `backend/briefing_packet.py::select_top`: take ranker groups in the order compatible, compatibility_unknown, incompatible (incompatible only as a labelled reference), keep the first three. Write both fully now (about 10 lines each) so screen and briefing cite identical IDs.
5. **Backend stub.** `backend/briefing.py` router with request/response models; `POST /api/briefing` returns a deterministic `mode: 'summary'` response. Register it in `main.py` now so `main.py` is not touched again.
6. **Fixture.** `frontend/src/flameatlas/fixtures/moon-briefing.json`: a valid response for the Moon example (34% O₂, 8.2 psi, 10 cm/s, PMMA) citing `bass-ii-m20`.

## Exit check

- Build and backend tests pass.
- Placeholders render empty; `flameatlas:scenario` appears in the console when sliders move.
- Commit and push; every track branches from this commit.
