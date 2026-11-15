# Flame in Freefall implementation roadmap

Build the submission around three linked tasks: replay an observed NASA experiment, explain how closely it matches a scenario, and show a model estimate with its limits visible. The [NASA Space Apps challenge](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) asks for a dashboard that summarizes, ranks, and interprets experimental evidence. Favor one comparison that a judge can trace to a source over broad claims of predictor accuracy.

Start with the [Phase 1 implementation plan](PHASE_1_IMPLEMENTATION_PLAN.md). This roadmap describes proposed work; its release gates are acceptance criteria, not completed checks.

## Starting point

- The local collector manifest lists **16 investigations**: 13 catalogued with tables and 3 without an associated experiment table. The **1,808 mapped rows** include test conditions, indexes, and other records, rather than 1,808 independent flame-outcome measurements. [Data inventory](DATA_INVENTORY.md) · [Collector](backend/mine_nasa.py)
- The [reviewed catalog](backend/data/mined_evidence.json) includes the initial cases from Saffire-I, LUCI, CFI-G, FLEX and BASS-II. The app's Saffire-I and BASS-II replays already provide footage; only the Saffire-I replay synchronizes its imagery with continuous measured telemetry. [BASS-II comparison limits](frontend/public/replay/bass-2/compare.json)
- The [training dataset](backend/data/psi_master.json) contains 24 seed rows and two sourced Saffire-I condition rows with estimated outcomes. The Gaussian processes also fit 324 synthetic anchors. Their variance is not a demonstrated experimental error bound. [Training code](backend/surrogate.py)

## Phases and model choices

These are **Codex models for doing the development work**. They do not change the models the app uses at runtime. Use the closest available option in your model picker. The effort levels below are project recommendations based on the [official Codex model guide](https://learn.chatgpt.com/docs/models) and [OpenAI's model selection guidance](https://developers.openai.com/api/docs/guides/model-selection).

| Phase | Planning | Implementation | Why |
| --- | --- | --- | --- |
| 1. Evidence and gravity | GPT-6.1 Sol · High | GPT-6.1 Sol · High | The replay, frontend fallback, API, and canvas need a coordinated change. The checklist is ready, so a separate planning run is optional. |
| 2. Evidence catalog and ranking | GPT-6 Astra · High | GPT-6.1 Sol · High | Use Astra to resolve source and compatibility rules. Use Sol for the schema, ranking, and offline parity. |
| 3. Appearance, atmosphere, and use cases | GPT-6 Astra · High | GPT-6.1 Sol · High | Separate verified combustion claims from illustrative behavior. Use GPT-6.1 Terra · Medium for optional screenshot and footage QA. |
| 4. Independent validation and model decisions | GPT-6 Astra · Extra High | GPT-6.1 Sol · High | Define the measurement, holdout, leakage controls, and scoring before coding. Ask Astra to review the protocol or results when they are ready. |
| 5. Submission and handoff | GPT-6.1 Sol · Medium | GPT-6.1 Sol · Medium | Use Sol for the release pass. GPT-6.1 Terra · Medium is useful for visual QA and demo copy. |

If you want to use one model throughout, use **GPT-6.1 Sol at High** and keep the Phase 4 evaluation protocol explicit. Extra reasoning cannot replace missing measurements or sources.

## 1. Ship one evidence-backed comparison and fix gravity

- Add a Saffire-I results card beside the existing replay: 1.8 mm/s concurrent and 1.3 mm/s opposed, both at nominal 20 cm/s, with the reused specimen caveat and the report source. Keep those observations separate from telemetry and estimates.
- Separate Earth's gravitational field from effective cabin gravity. Wire only the latter to the simulator. Fix the zero-gravity, zero-airflow sphere across the API, fallback, and canvas.
- Remove the immediate misleading claims: seed matches presented as NASA evidence, high confidence without outcome validation, fixed safety multipliers, and color or scenario controls that claim to diagnose a cool flame or prescribe an emergency action. Keep model uncertainty visible.

**Release gate:** an offline demo reproduces the first cited observation, the 400 km field readout is about 0.885 g while the orbital input stays at 0 g, and the settled still-air model shows a circle. [Implementation checklist and verification](PHASE_1_IMPLEMENTATION_PLAN.md)

## 2. Put the reviewed downloads into an evidence catalog

See the [Phase 2 implementation plan](PHASE_2_IMPLEMENTATION_PLAN.md) for the catalog contract, initial cases, compatibility rules, implementation sequence and verification gates.

- Extend the small reviewed evidence set from Phase 1. Use run IDs, source version when known, citation, report page or table, metric and units, hardware and specimen details, and a field-level status: measured, derived from measurements, reported nominal, assumed, or missing. Keep pressure units and measurement basis, gas fractions, flow orientation, and gravity source. Preserve nulls and ranges.
- Surface LUCI's separate base and tip fits, the CFI-G hot/cool radii and duration, and FLEX's droplet-specific rate and extinction diameter. Cross-link BASS-II B1/B3 to the mapped rows and display the limitations already in the replay. Keep Saffire-II's frame index as an index until referenced imagery and timing are available.
- Separate condition similarity from measured outcome coverage. Rank within compatible fuel phase, material and specimen geometry, flow configuration, and measurement type first; then compare known numeric conditions. Show mismatches, missing dimensions, and a no-comparable-measurement state. Exclude seeds from NASA evidence results. Keep the backend and offline presentation in sync from one reviewed source.
- Keep raw originals read-only and out of the app bundle. Continue using the collector for staging; leave the legacy importer limited to the two legacy records until model-ready ingestion is justified. Skip the browser extension unless repeated acquisition becomes a demonstrated bottleneck.

**Exit gate:** a user can open the original source for each displayed measurement, understand why a case matched, and see why a different metric or incomplete case cannot validate the model. Metadata-only and condition-only records never count as outcome coverage.

## 3. Make appearance and use cases evidence-led

See the [Phase 3 implementation plan](PHASE_3_IMPLEMENTATION_PLAN.md) for its scope and acceptance checks and the [demo script](DEMO_SCRIPT.md) for the implemented walkthrough.

- Display oxygen partial pressure `pO2 = (O2% / 100) × total pressure`, with `21% × 14.7 psi = 3.09 psi` and `32% × 10.2 psi = 3.26 psi` as an explanatory comparison. Preserve oxygen fraction, total pressure, and balance-gas composition as separate data. Keep the single-diluent model explicitly illustrative; represent reported gas mixtures in evidence without feeding unsupported mixtures into the predictor.
- Distinguish observed footage from the canvas palette. Describe soot glow and faint emission where the source supports them. Show camera/filter details where known; don't derive temperature, soot concentration, or visibility limits from uncalibrated RGB. Remove the general `high O₂ + low pressure → cool flame` classifier and misleading CFI-G preset. Reserve confirmed cool-flame labels for observations with supporting diagnostics. Update both physics implementations and the physics and canvas specs together.
- Add short, sourced stories: **orbital ventilation** (Saffire-I, BASS-II); **supported habitats** (LUCI simulated lunar gravity, Mars exploratory); **material screening and oxygen/flow effects** (SoFIE GEL PMMA spheres); **soot and optical appearance** (ACME); **smoke detection** (SAME/SAME-R published aerosol results, since the staged tables largely give conditions); **suppression research** (FLEX droplet observations). For Earth applications, connect ACME to cleaner burner research or SAME to detector testing as research context. Do not infer room-fire, suit-fire, or flight-system performance from these apparatuses.
- If specimen geometry, direction, or confinement are introduced as scenario choices ahead of validation, use them to filter evidence or mark unsupported inputs. Apply model coefficients only after the Phase 4 checks justify them.

**Exit gate:** a demo distinguishes faint appearance from cool-flame chemistry, shows both oxygen percentage and partial pressure, and links each interpretation to a compatible observation. No generic detector guarantee, extinguisher sequence, or safety multiplier is derived from the animation. [NASA cool-flame results](https://www.nasa.gov/missions/station/cool-flames-created-during-a-first-for-international-space-station-research/) · [SoFIE GEL](https://ntrs.nasa.gov/citations/20240007628) · [ACME Flame Design](https://science.nasa.gov/biological-physical/investigations/flame-design/) · [NASA detector research](https://ntrs.nasa.gov/citations/20170000248) · [FLEX](https://ntrs.nasa.gov/citations/20150023456)

## 4. Validate one measurable prediction independently

Completed through the insufficient-evidence path. The [Phase 4 report](PHASE_4_VALIDATION_REPORT.md) records zero eligible independent runs and the decision to serve the deterministic physics baseline. See the [implementation plan](PHASE_4_IMPLEMENTATION_PLAN.md) for the review gates.

1. Start with one solid-fuel family and geometry, one metric definition, and runs with comparable direction, atmosphere, apparatus, and effective acceleration. Look for a published series with run-level conditions and repeated measurements. The Saffire-I replay is a useful benchmark candidate after reconciling run identity and measurement basis. LUCI remains comparative evidence unless inputs and metric definitions can be matched. CFI-G flame radii and FLEX droplet rates are different targets.
2. Freeze a baseline and an evaluation protocol before fitting. Group by specimen, run, study, or apparatus as appropriate to prevent related observations from crossing splits. Hold out the associated synthetic or estimated row for any held-out observed run if its presence would leak setup or outcome information. Record expected units, match tolerances, and exclusions before looking at errors.
3. Compare the current GP with the plain physics baseline on the held-out runs and report signed and absolute errors in the original units, sample count, and assumptions. Report MAE and bias when there are multiple comparable observations. Check interval coverage only when there are enough independent observations to support it. One run is a benchmark, not a calibration study.
4. Promote data into training only after this review, with measured targets per metric and a reproducible dataset version. Keep anchors labeled separately. If the evidence is inadequate or the GP adds no demonstrated value for the selected family, ship the simpler illustrative baseline and keep the observed comparison visible. Label the measured coverage and limits of any model improvement.

**Exit gate:** either a reproducible held-out comparison with stated limits, or a documented decision to leave predictions exploratory with the missing measurements named. Never substitute modeled fields into held-out targets.

## 5. Package the submission

See the [Phase 5 implementation plan](PHASE_5_IMPLEMENTATION_PLAN.md) for the release mode, judge walkthrough, verification checklist, and handoff.

- Lead the demo with **Earth orbit at 400 km → Saffire-I flow comparison → LUCI lunar example → one unsupported Mars scenario**. Show a path from a claim to the original report. Distinguish what was recorded, derived, and estimated throughout.
- Verify mobile and desktop layouts, replay timing and media, and every citation used in the demo. The [prediction bridge](frontend/src/flameatlas/predictBridge.ts) uses a same-origin `/api` route. If shipping a public backend, verify that route from the deployed frontend. If shipping only the static demo, make local physics the explicit mode and verify both replays there. Reconcile outdated acquisition notes against the inventory. Keep large original downloads out of deployable assets.
- Update [README](README.md), [demo script](DEMO_SCRIPT.md), and [architecture notes](ARCHITECTURE.md) to match the finished behavior. For a time-limited submission, ship the Phase 1 demo plus the completed evidence cards and explicitly describe which validation work remains.

**Exit gate:** a judge can reproduce the demo from the project link, inspect the supporting NASA evidence, and tell which scenario claims are still untested.
