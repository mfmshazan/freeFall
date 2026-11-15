# Phase 2B | Fix It and How This Helps on Earth (minutes 12–40)

Implements "18–30 Put the playbook on the right and Earth card below" plus the "Fix It and How This Helps on Earth" table in [NASA_DASHBOARD_60_MINUTE_PLAN.md](NASA_DASHBOARD_60_MINUTE_PLAN.md). Requires [Phase 1](NASA_DASHBOARD_PHASE_1_FOUNDATION.md). Independent of 2A, 2C, 2D (it degrades gracefully without evidence events).

**Owns (new files only):** `frontend/src/flameatlas/playbook.ts`, `frontend/src/flameatlas/playbookContent.ts`
**Listens to:** `flameatlas:scenario` (trust status, modeled spread), `flameatlas:evidence` (coverage). **Dispatches:** `flameatlas:topic`.

## Build

1. `playbookContent.ts`: curated, offline text for three cards, each with **what NASA observed**, **what to test next**, **scope limit**, and source links, copied from the plan's table and checked against the reports:
   - Prevention: Saffire-II sample 2-7 / Nomex (NTRS 20170008805, slide 25)
   - Detection: SAME smoke particles + dust-vs-smoke test (NTRS 20140006579 pp. 7–12; 20260005612 abstract)
   - Suppression: FLEX-018 heptane extinction + ISS fine water mist (NTRS 20150023456; 20110012300)
   - Earth card: NASA Spinoff lunar dust sensor → air quality. Detection gets this example; other topics show a one-line analogy only if its source supports it.
2. `playbook.ts`: render into `#fixItPanel` and `#earthCard`; a selected topic drives the Earth card. Show **More testing needed** when trust is extrapolating/unverified or coverage is `none`/`context_only`. At higher modeled spread, give Prevention visual priority and label spread as modeled.
3. No claims that lunar dust caused an Artemis alarm. No discharge, fan, or numeric alarm settings.
4. Remove or hide any remaining legacy/uncited playbook text on the pages you link in the demo. I found no `playbook` or `similar_experiments` strings in `fire-lab.html`, `safety.html` or `index.html`, so grep `frontend/src` and `evidence.html` for the legacy text first.

## Done when

- Three cards render offline with working source links; switching topic updates the Earth card.
- Thin or extrapolated scenarios show the limitation prominently while keeping at least one design check visible.
