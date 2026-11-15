# Phase 2D | Briefing frontend (minutes 12–40)

Implements the frontend half of "30–46 Add a live AI briefing" and rule 4 (Fallback) of the "Briefing contract" in [NASA_DASHBOARD_60_MINUTE_PLAN.md](NASA_DASHBOARD_60_MINUTE_PLAN.md). Requires [Phase 1](NASA_DASHBOARD_PHASE_1_FOUNDATION.md). Independent of 2A, 2B, 2C (develops against the fixture and the stub endpoint).

**Owns (new files only):** `frontend/src/flameatlas/briefingClient.ts`
**Listens to:** `flameatlas:scenario`, `flameatlas:evidence`. **Fills:** `#briefBtn`, `#briefingOut`.

## Build

1. **Explain NASA evidence** button posts `{ scenario_key, cabin }` to `/api/briefing` on click only.
2. States: idle, loading (button disabled while a request is active), result, error.
3. Abort the request and clear `#briefingOut` whenever `scenarioKey` changes; also ignore any response whose `scenario_key` differs from the current one.
4. Label by `mode`: **AI briefing** vs **Evidence summary**. If FastAPI is unreachable, build a local summary from the top evidence record, or the evidence-gap message, and label it **Evidence summary**.
5. Render all model output as text (no `innerHTML`); show the citation link per field. In Compare mode, label it with the first pane's scenario (`paneLabel`).
6. No key, no provider logic in client code.

## Done when

- With the stub backend and with the backend off, both paths render with the correct label.
- Changing a slider mid-request clears the stale result.
- First develop against `fixtures/moon-briefing.json`, then switch to the endpoint.
