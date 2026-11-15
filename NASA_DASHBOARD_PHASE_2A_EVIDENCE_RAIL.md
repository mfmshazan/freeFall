# Phase 2A | Ranked evidence rail (minutes 12–40)

Implements "5–18 Rank reviewed evidence in the lab" and the "Ranked evidence and confidence" rules in [NASA_DASHBOARD_60_MINUTE_PLAN.md](NASA_DASHBOARD_60_MINUTE_PLAN.md). Requires [Phase 1](NASA_DASHBOARD_PHASE_1_FOUNDATION.md). Independent of 2B, 2C and 2D.

**Owns (new files only):** `frontend/src/flameatlas/evidenceRail.ts`
**Listens to:** `flameatlas:scenario`. **Dispatches:** `flameatlas:evidence` with `EvidenceDetail`.

## Build

1. Import `frontend/src/data/evidence_catalog.json` and `rankEvidence` from `frontend/src/evidence/rankEvidence.ts`.
2. On each scenario event, build the query from `cabin`. Pass geometry, apparatus, flow configuration and metric as `null` (unknown); do not invent them.
3. Take records through `selectTop`. Render up to three cards in `#evidenceRank`, preserving group and order. Each card shows: group label, one condition delta or missing field, one outcome with status and unit (when any), and the NASA source link using the catalog's source id and locator.
4. If no ranked record has a comparable measured outcome, show **No comparable measured outcome for this setup** and the closest context with its limitation. Never convert `distance` to a probability.
5. Show the model spread and trust badge as model estimates beside evidence coverage. Dispatch `flameatlas:evidence`.
6. Keep FLEX droplet rates (mm²/s) visually distinct from solid spread rates (mm/s); render units from the catalog, never hard-coded.

## Done when

- Moon surface, 34% O₂, 8.2 psi, 10 cm/s, PMMA ranks `bass-ii-m20` (BASS-II run M20, PMMA slab, opposed flow, `bass_pmma_slab_spread`) in **Compatibility unknown**, with the rod/slab mismatch visible. Verified present in the catalog; the "ranks first" claim itself must be confirmed against the live ranker output.
- Changing to free orbit / 21% O₂ updates the cards; Fuel droplet toggles the explanation.
- Works with the backend off (the TypeScript ranker is local).
