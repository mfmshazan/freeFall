# Phase 2 implementation plan: evidence catalog and ranking

**Outcome:** A user can browse reviewed NASA observations, open their sources, and understand which cases share relevant conditions and which measurements cannot be compared with the simulator. The catalog works with the prediction API offline. Condition similarity never implies model validation.

This is proposed work, not a record of completed checks. It implements [Phase 2 of the roadmap](IMPLEMENTATION_ROADMAP.md#2-put-the-reviewed-downloads-into-an-evidence-catalog). Existing workspace changes must be preserved. Phase 1 code is present in several areas, but its acceptance checklist is still unchecked; this plan does not certify Phase 1 completion.

## 1. Establish one reviewed catalog

- [ ] Evolve [backend/data/mined_evidence.json](backend/data/mined_evidence.json) into a versioned catalog with `schema_version`, `catalog_version`, `sources`, and `records`. Update [the collector](backend/mine_nasa.py) and its tests for the new envelope. Collection remains staging only: it must not automatically promote mapped rows into reviewed observations.
- [ ] Add a small standard-library validation/export script, proposed as `backend/export_evidence.py`. Generate `frontend/src/data/evidence_catalog.json` from the canonical catalog, with a `--check` mode that fails on stale output. Do not hand-edit the frontend copy. Keep all reviewed records and source locators available offline; opening remote originals still requires connectivity.
- [ ] Generate the existing [Saffire-I results asset](frontend/public/replay/saffire-1/report-results.json) from the same catalog, preserving its consumer contract. This removes duplicate manual transcription while keeping the Phase 1 card and playback intact.
- [ ] Export only curated metadata, observations, and source references. Exclude raw workbooks, reports, imagery, the collector manifest, and the full mapped tables from the frontend bundle. Do not change either `psi_master.json` or the legacy ingestion scope.

Use this minimum contract; avoid forcing records into predictor input fields:

| Object | Required information |
| --- | --- |
| Source | Stable source ID, title/citation, original URL, exact filename where applicable, source version or explicit unknown, and hash of the reviewed local original when available. Record review date separately from publication/version dates. |
| Record identity | Stable catalog ID, investigation, source run/sample/hardware IDs and aliases, and whether the catalog ID is assigned locally. LUCI's current descriptive IDs must not be presented as NASA run identifiers. |
| Experimental context | Fuel phase, exact reported material/composition, specimen geometry/dimensions, apparatus, flow configuration/orientation, gravity description and its basis. Unknown context stays explicit. |
| Field value | Scalar, interval, categorical value, boolean, or null; original units/text; approximation flag; measurement basis/time; source ID and page/table/row/figure locator. Distinguish PDF page from printed page. |
| Field status | `measured`, `derived_from_measurements`, `reported_nominal`, `assumed`, or `missing`. A reported value with an unresolved measurement basis remains provisional, with that uncertainty recorded; do not silently upgrade it to measured. |
| Conditions | Oxygen and balance-gas fractions with fraction basis; pressure with unit and absolute/gauge/unknown basis; velocity distinct from feed mass flow; gravity source; start/end or time-varying values where reported. |
| Observation | Metric ID, definition, measured object/feature, method, units, value/status and source locator. A qualitative observation needs its own metric; it is not a numeric target. |
| Limits and links | Missing/conflicting fields, specimen reuse/grouping, related records, replay link if available, and `use: evidence_only`. |

Keep original values alongside any normalized numeric values and record the conversion used. A unit conversion does not change a nominal value into a measurement. Do not convert gauge/unknown pressure into absolute pressure, assume zero airflow from a blank cell, replace a range with its midpoint, or turn “ISS microgravity” into a measured exact zero. Source-reported categorical descriptions retain their source basis without invented numeric precision.

## 2. Curate a bounded first release

Start with eight case records, drawn from material already reviewed or used in replays. Recheck each transcription against its original before publication; the values below describe the current repository, not a new independent source verification.

| Cases | Display and preserve | Comparison boundary |
| --- | --- | --- |
| Saffire-I 1-1 and 1-2 | Report-derived average spread of 1.8 and 1.3 mm/s; nominal 20 cm/s; concurrent/opposed direction; reused specimen. | Report and replay geometry/oxygen have different bases. Preserve both with separate sources; do not merge them into a reconciled scenario or treat rates as cursor telemetry. |
| LUCI SIBAL partial-g and 1g | Separate base/tip position-fit rates: 0.92/1.1 and 1.5/2.8 mm/s; oxygen histories; simulated-gravity setup; missing pressure/flow inputs. | Different tracked features stay distinct. Neither pair establishes a gravity-only effect or directly validates the model's generic spread output. |
| CFI-G 21174 C3 | Hot/cool radii 17.6/7.6 mm; cool-phase duration 13.9 s; reported observation and diagnostics/source context. | Radius is not model flame length/width; 35 s CSV burn time is not cool-phase duration; feed mass flow is not cabin airflow. The app does not represent this burner/fuel blend. |
| FLEX 248F001 / FLEX-018 | Diameter-squared burning rate 0.61 mm²/s; droplet extinction diameter 1.77 mm; burn time and mixed-gas conditions. | Neither the rate nor droplet diameter is the simulator's spread rate or flame dimension. Do not invent a measured cool-phase duration. |
| BASS-II B1/147 and B3/148 | Cross-links to PSI-25 CSV lines 2 and 4, existing conditions, videos and proof sheets; before/after gases; series-level pressure range. | Conditions and imagery only for this release: no assigned per-run spread targets or sensor-time synchronization. Preserve specimen and oxygen-history confounders. |

- [ ] Read the source files and locators recorded in [the inventory](DATA_INVENTORY.md), [reviewed observations](backend/data/mined_evidence.json), and [BASS-II comparison](frontend/public/replay/bass-2/compare.json). Verify CFI-G's original report link rather than leaving its measurement supported only by an investigation landing page. If a direct file URL is unavailable, show the official investigation link plus exact report filename and locator, and confirm that the original is reachable there.
- [ ] Give every displayed observation a source action and exact locator. Flag unresolved identity, units, source access or measurement basis; keep unresolved observations out of comparable-outcome results until reviewed. Catalog review can continue for the other records.
- [ ] Include a compact availability note for the remaining staged investigations. Saffire-II's workbook remains a frame index with missing referenced imagery/timing assets; SAME/SPICE conditions and metadata-only studies do not count as measured outcome coverage. Do not turn all mapped rows into evidence cards in this phase.

## 3. Define compatibility before numeric ranking

The current six-field `CabinInputs` does not describe specimen geometry, exact composition, flow direction, apparatus or metric definition. A matching fuel dropdown alone cannot establish experimental compatibility.

- [ ] Add a separate `EvidenceQuery`: existing cabin conditions plus optional evidence-only context for exact material, geometry, flow configuration and target metric. Default unknown fields to unknown. Expose these as **Evidence filters**; they do not change predictions or add model coefficients. A preset/replay may supply context only when its source supports it.
- [ ] Implement pure ranking functions in proposed `backend/evidence.py` and `frontend/src/evidence/rankEvidence.ts`. Share the reviewed catalog, normalization constants and acceptance fixtures across implementations.
- [ ] Classify each case before sorting: `compatible`, `compatibility_unknown`, or `incompatible`. Compare fuel phase, exact material/composition, specimen geometry, flow configuration, measurement definition and relevant apparatus constraints. Return explicit matching, missing and conflicting fields. A known conflict takes precedence over unknowns.
- [ ] Keep unknown cases in a clearly labeled partial-match section. Incompatible cases remain discoverable in the catalog, with reasons, but cannot occupy the comparable-results list. PMMA film is not a PMMA sphere; generic cotton is not automatically SIBAL; a gas burner is not a droplet or solid specimen.
- [ ] Within a compatibility group, compare only commensurate numeric conditions. Start with the current normalizers (`gravity_g: 1`, `o2_percent: 70`, `pressure_psi: 10.4`, `airflow_cm_s: 30`) and weights (`4, 1, 1, 1`) as documented UI heuristics, not experimentally fitted tolerances. For eligible dimensions, use weighted RMS normalized distance, dividing by the sum of included weights. Preserve each field's status in the explanation.
- [ ] For a genuine reported interval, use distance to the nearest interval boundary, zero within it, while showing the interval. Start/end readings remain separate observations of a changing condition; do not assume an unobserved trajectory or treat their span as a constant operating range. Exclude ambiguous bases and assumed values from numeric matching. Categorical microgravity can establish context but contributes no invented numerical residual.
- [ ] Sort compatible before unknown cases, then by greater known-condition coverage, then numeric distance, then stable catalog ID. Return compared/missing dimensions and their values; return null distance when none are comparable. Never let an empty or sparse record win because missing dimensions were treated as exact matches. Show ordering and differences rather than a percentage labeled confidence or probability.
- [ ] Report outcome availability separately: per-metric observed/derived counts for compatible cases, partial-context observations, and condition-only records. Count distinct cases, not source duplicates; retain shared-specimen groups. Observations available in the catalog are not independent validation samples or measurements used by the model.

The default predictor view should state **No comparable measured outcome established for this model** whenever metric definition or required experimental context is unresolved. Keep the existing statement that the model uses no comparable measured targets. Browsing or filtering evidence must not raise model trust, narrow uncertainty or imply a validated prediction.

## 4. Connect API, offline mode and the interface

- [ ] Add `POST /api/evidence` accepting `EvidenceQuery`, returning catalog/ranking versions, grouped matches, field-level explanations and per-metric coverage. Define matching TypeScript and Pydantic contracts. Keep `/api/predict` compatible and retain its legacy ranking fields for now; stop using them as the displayed NASA evidence source.
- [ ] Keep model-distance calculations independent from catalog ranking. [The offline service](frontend/src/physics/localService.ts) uses training-row distance in its heuristic uncertainty, and [the backend](backend/main.py) reads the first legacy result. Do not replace those arrays with filtered evidence and accidentally change uncertainty or introduce empty-result crashes. Renaming/documenting the internal training-distance helper is in scope; changing its mathematics is not.
- [ ] Add an evidence hook with immediate local results from the generated catalog and optional backend results. Ignore responses for an older query; cancel requests and clear timeout handles on cleanup. Accept backend evidence only when catalog and ranking versions match the bundled versions; otherwise retain local evidence and explain the version mismatch. An unavailable evidence endpoint must not disable predictions or replays.
- [ ] Replace [EvidencePanel](frontend/src/components/EvidencePanel.tsx)'s training-row cards with reviewed cards and an expandable catalog browser. Each card shows source/run identity, reported conditions, observation names/units/status, match reasons, missing inputs and limitations. Provide metric/study filters and a clear empty state with reasons.
- [ ] Update [App](frontend/src/App.tsx) to pass evidence query state independently from prediction state. Link BASS-II cards to the corresponding replay and Saffire-I cards to the report results; avoid implying the opposed Saffire run has local footage. Keep unsupported CFI-G/FLEX cases browsable without loading them as supported predictor presets.
- [ ] Preserve visible model uncertainty and trust limitations. Make cards and filters keyboard-accessible and usable on narrow screens. The offline catalog remains usable when external source links cannot be opened.

## 5. Verification and documentation

Add focused checks for the new scientific/data boundary; do not rely on a successful build as evidence that rankings are correct.

| Check | Acceptance criterion |
| --- | --- |
| Schema and provenance | Unique catalog IDs; source references resolve; units and field statuses are valid; nulls/ranges survive export; every displayed observation has a locator; unresolved fields cannot become measured targets. |
| Source audit | Reopen all eight cases' originals and check values, units, identities and locators. Verify remote source actions; record any access failure instead of claiming it passed. |
| Data separation | No seeds or `physics_estimate` outcomes enter evidence results. Canonical and generated catalog versions/content agree. Both master datasets remain unchanged and mutually identical. Raw files remain untouched and absent from the build. |
| Compatibility | Different phase, material, geometry, flow configuration or metric produces an explicit conflict. Missing context produces unknown compatibility. Generic cabin inputs never silently acquire specimen details. |
| Missingness and units | Null airflow differs from zero; incomplete pressure basis is excluded; normalized equivalent units match; intervals retain bounds; before/after oxygen stays time-dependent; no numeric distance when all dimensions are missing. |
| Outcome coverage | BASS-II contributes no per-run spread target. LUCI base/tip, CFI-G radius and FLEX mm²/s remain separate quantities. Metadata/index rows contribute no outcome coverage. Shared or duplicate sources do not inflate counts. |
| Backend/offline parity | Run identical fixtures through Python and compiled TypeScript; compare ordered IDs, groups, reasons, counts and versions exactly, numeric distances within a documented small tolerance. Include empty catalog/results, ties, unknown context and every initial case family. |
| UI and request lifecycle | With API on/off, users get the same evidence ordering and limitations. Rapid query changes cannot show stale results. A version mismatch uses bundled evidence. Source/replay actions work; empty results remain understandable. |
| Phase 1 regression | Still-air sphere, deterministic canvas, report results card and replay timing retain their behavior. Catalog filtering leaves prediction and uncertainty values unchanged for unchanged cabin inputs. |

- [ ] Use existing backend `unittest` discovery with the backend environment: `python -m unittest discover -s backend -p 'test_*.py'` from the repository root. Add catalog/ranker tests and update collector tests. This does not imply the currently unchecked Phase 1 suite has passed.
- [ ] The frontend currently has only `dev`, `build`, and `preview` scripts. Add a small parity/fixture check using the existing TypeScript compiler and Node assertions, without a new test framework; document its command. Run it and `npm run build` from `frontend/`, plus the exporter's `--check` mode from the root. Report unavailable environments/checks explicitly.
- [ ] Update [DATA_INVENTORY.md](DATA_INVENTORY.md), [DOWNLOAD_CHECKLIST.md](DOWNLOAD_CHECKLIST.md), [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for the catalog pipeline, source access, limitations and checks. Replace stale statements that ranking training rows means ranking measured NASA outcomes. Reconcile existing README/architecture claims about high confidence, safety multipliers and validated intervals with the implemented Phase 1 behavior; do not promise new physics here.

## Implementation order and completion gate

1. Review sources, normalize the eight cases, and validate/export the catalog.
2. Implement compatibility, ranking and shared acceptance fixtures.
3. Add the evidence endpoint and offline hook, keeping prediction calculations independent.
4. Build the catalog UI and source/replay navigation.
5. Run parity, source, data-boundary and UI checks; update documentation and mark completed items with evidence.

**Complete when:** every displayed measurement can be traced to its original; users can distinguish comparable, partial-context and incompatible cases; no metadata-only case counts as outcome coverage; and backend/offline evidence behavior agrees. Missing scientific context is an explicit supported result, not a reason to fabricate inputs or claim validation.

**Out of scope:** training-data promotion, GP fitting changes, calibrated uncertainty, prediction coefficients for geometry/direction, atmosphere/color changes, new replay extraction, full-catalog ingestion, browser download tooling and deployment. Phase 3 owns appearance/use cases; Phase 4 owns independent model validation.

## Ready-to-run implementation prompt

> Implement `PHASE_2_IMPLEMENTATION_PLAN.md` in this workspace. Read `AGENTS.md` first and preserve existing changes and raw NASA assets. Build the reviewed evidence catalog, compatibility-aware ranking, API/offline parity and source-linked UI without changing model training or prediction physics. Verify original sources before publishing transcriptions. Keep unresolved context explicit and predictions exploratory. Run the specified checks, update documentation, and report passed checks and remaining limits. Stop at the Phase 2 boundary in `IMPLEMENTATION_ROADMAP.md`.
