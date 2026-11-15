# Phase 3 | Integrate and verify (minutes 40–50)

Implements "46–54 Check the integrated flow" and the "Release checks" in [NASA_DASHBOARD_60_MINUTE_PLAN.md](NASA_DASHBOARD_60_MINUTE_PLAN.md). Requires Phases [2A](NASA_DASHBOARD_PHASE_2A_EVIDENCE_RAIL.md), [2B](NASA_DASHBOARD_PHASE_2B_FIXIT_EARTH.md), [2C](NASA_DASHBOARD_PHASE_2C_BRIEFING_BACKEND.md), [2D](NASA_DASHBOARD_PHASE_2D_BRIEFING_FRONTEND.md).

**Hard stop at minute 40:** a track whose provider or UI is not working ships its stub/fallback.

1. Merge in the order 2A → 2B → 2D → 2C. Each track only added its own files, so conflicts should be limited to the script tags.
2. Check that the record IDs on screen equal the IDs cited in the briefing for the Moon example.
3. Scenario changes: Moon 34% / 8.2 psi / 10 cm/s / PMMA, then free orbit 21% O₂. Old briefing clears; evidence state stays visible. Toggle Fuel droplet.
4. Traceability: open one report from a ranked card and the source for each playbook topic. Missing outcomes never look measured; FLEX mm²/s is distinct from solid mm/s.
5. Live and offline: one valid cited AI response; then backend off, where ranking, the three design checks and the Earth example still render with the **Evidence summary** label. Provider failure is distinct from live AI. No key in client code, request bodies or logs.
6. Commands: from `frontend/`, `npm run build` and `npm run check:evidence`; from the repo root, `backend/.venv/bin/python -m unittest discover -s backend -p 'test_*.py'`. Check desktop and narrow widths.
7. Stop provider debugging at minute 46 and ship the labeled summary if needed.
