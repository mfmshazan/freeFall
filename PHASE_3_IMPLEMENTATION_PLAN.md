# Phase 3 implementation plan: appearance, atmosphere, and use cases

**Outcome:** Users can distinguish recorded appearance from an illustrative canvas, understand oxygen percentage and partial pressure, and explore six sourced research stories without mistaking them for validated cabin predictions or fire-response advice.

**Status:** Implemented in the working tree. The sections below retain the original plan and release criteria. See the [demo script](DEMO_SCRIPT.md) for the current walkthrough. Desktop and narrow browser checks remain open because local browser automation is disabled.

## Starting point and dependencies

- Phase 1 presentation changes are present: the Saffire report-results card, effective-gravity explainer, uncertainty wording, and removal of the misleading CFI-G preset. This inspection does not certify Phase 1's acceptance checks.
- Both [Python physics](backend/physics.py) and [TypeScript physics](frontend/src/physics/flameModel.ts) still emit `INVISIBLE_COOL_FLAME` from oxygen/pressure thresholds. The UI masks the name, but the classifier remains scientifically misleading.
- [CabinBuilder](frontend/src/components/CabinBuilder.tsx) exposes oxygen, pressure and one diluent without a partial-pressure readout. Some preset names still imply mission-specific configurations.
- [Reviewed evidence](backend/data/mined_evidence.json) contains four observations. The current [EvidencePanel](frontend/src/components/EvidencePanel.tsx) still consumes legacy ranked rows; Phase 2's reviewed catalog and compatibility ranking are not wired into this checkout.
- [App](frontend/src/App.tsx) does not render the existing playbook or spinoff components. Backend and fallback playbook arrays are empty. Research stories should have their own cited content, independent of model-ranked seeds.

Atmosphere and classifier work can proceed immediately. Story integration should reuse the Phase 2 catalog when available. If Phase 2 remains unfinished, link directly to reviewed records, report references and existing replays; display literature-only context explicitly. Do not build a second ranker or count stories as measured coverage. Completion of Phase 3 does not certify Phase 2.

## 1. Show atmosphere without collapsing its meaning

**Files:** [CabinBuilder](frontend/src/components/CabinBuilder.tsx), [physics spec](skills/01-flame-physics-rules.md), and the Phase 2 evidence renderer when available.

- [ ] Add a derived readout beside the oxygen and pressure controls: `pO2_psi = (o2_percent / 100) * pressure_psi`. Label pressure as absolute, and oxygen as volume/mole percentage. Calculate at full precision and round only for display.
- [ ] Show the explanatory pair `21% × 14.7 psi = 3.09 psi` and `32% × 10.2 psi = 3.26 psi`. Explain that similar partial pressures do not establish equivalent combustion behavior or safety; oxygen fraction, total pressure, balance gas, material and apparatus remain distinct.
- [ ] Label the selector **Illustrative balance gas** and disclose the predictor's binary-mixture assumption: oxygen plus one of N2, CO2 or He. Keep `CabinInputs` unchanged; partial pressure is derived display data, not a new independent slider or API input.
- [ ] In evidence, preserve original gas fractions, composition basis, pressure units and absolute/gauge/unknown basis, ranges and field statuses. Derive partial pressure only from compatible oxygen and absolute-pressure values from the same condition/time basis. Preserve missing values; never silently assume pressure or complete an unknown gas mixture. Mark derived values and conversions explicitly.
- [ ] Do not map FLEX's O2/N2/CO2 mixture to a single CO2 diluent, combine CFI-G fuel-stream dilution with its ambient oxidizer, or clamp an out-of-range experimental pressure into the predictor. Such records remain viewable as evidence with an unsupported-model-input explanation.
- [ ] Rename mission-prescriptive examples to **Orbital cabin example**, **Supported lunar habitat example**, and **High-oxygen / low-pressure example**. Preserve their values as illustrative inputs; the existing 85% O2 preset is not an authenticated EMU atmosphere. Match active preset highlighting against all six inputs so edited fuel, flow or diluent cannot retain a misleading exact-preset label.

**Acceptance:** The two readouts are correct, oxygen and pressure remain independently editable, and evidence mixtures never modify the prediction payload merely because a story is opened.

## 2. Remove the cool-flame classifier at its source

**Files:** [Python physics](backend/physics.py), [TypeScript physics](frontend/src/physics/flameModel.ts), [types](frontend/src/types.ts), [FlameCanvas](frontend/src/components/FlameCanvas.tsx), [App](frontend/src/App.tsx), [prediction hook](frontend/src/hooks/useFlamePrediction.ts), and both [physics](skills/01-flame-physics-rules.md) and [canvas](skills/02-canvas-animation-spec.md) specs.

- [ ] Delete the `o2_percent >= 60 && pressure_psi <= 7 && soot < 0.15` branch in both ports. Let those inputs follow the remaining illustrative appearance rules. Do not substitute a differently named faint-flame threshold or infer cool chemistry from a low soot proxy.
- [ ] Remove `INVISIBLE_COOL_FLAME` from newly produced predictions, the active TypeScript enum, the violet rendering branch and HUD special cases. Keep historical dataset strings intact where they are source/legacy data rather than live predictions. Add a narrow response guard so an older backend returning this removed regime leaves the current local prediction in place; do not render it as confirmed chemistry.
- [ ] Present `visual_regime` as **Illustrative appearance**. Keep other wire identifiers for compatibility, but give them neutral display labels such as “blue palette,” “yellow-core palette,” and “modeled extinction.” A blue palette does not establish soot-free combustion; a modeled extinction state does not establish that a real fire is out.
- [ ] Preserve the numerical spread, dimension, soot and flux correlations in this phase; label soot and flux as unvalidated proxies. Removing this categorical branch must not silently change GP training targets or add model coefficients.
- [ ] Correct the specs together: remove the cool-flame threshold, the claim that OPI is a universal danger scale, unconditional diluent/suppression rankings, and mission-atmosphere assertions. Describe OPI as an internal illustrative driver. Remove the incorrect identification of the model's `mm/s` output as a measured droplet d-squared burning rate (`mm²/s`); defer a proper droplet target model to Phase 4.
- [ ] Retain exact equal length/width and `aspect_ratio_LD === 1` at zero gravity/flow, deterministic seeded PMMA streaks, no buoyant flicker at 0g, the permitted sine pulse, and the visible uncertainty halo and trust status.

**Acceptance:** No current API or local prediction diagnoses a cool flame. A high-O2/low-pressure case remains visibly exploratory, and its appearance can change without numerical model retuning.

## 3. Separate observed imagery, palette, and chemistry

**Files:** [App](frontend/src/App.tsx), [SaffireReplay](frontend/src/replay/SaffireReplay.tsx), [Bass2Experiment](frontend/src/replay/Bass2Experiment.tsx), [Bass2Compare](frontend/src/replay/Bass2Compare.tsx), curated evidence metadata.

- [ ] Keep **Recorded experiment** and **Illustrative model** labels visible at the point of viewing. Never recolor recorded footage to match the canvas.
- [ ] Add a compact appearance explanation: recorded brightness/color depend on acquisition conditions; canvas colors are selected for illustration. Do not derive temperature, soot concentration, visibility limits or detector performance from uncalibrated RGB.
- [ ] Show camera type, filter/band, exposure/gain, processing and calibration only where documented for that recording. Use “not documented” for unknowns. In particular, BASS radiometer gain is not camera gain. Do not infer camera settings from filenames or an unrelated run.
- [ ] Explain soot glow or faint emission only with a source supporting the observation. A literature interpretation is distinct from a calibrated measurement in the replay.
- [ ] Give the reviewed CFI-G observation a separate evidence explanation. Before using a confirmed cool-flame label in a new card, verify the report's diagnostic basis and record its page/figure alongside the claim. If that basis is not yet reviewed, attribute the result as **reported by the authors** and identify the remaining review. Never use its gas blend, burner feed or above-model-range pressure as a runnable cabin preset.
- [ ] Preserve existing replay timing and limitations: the Saffire results card is not cursor telemetry, and BASS before/after readings are not a continuous sensor trace. FLEX visible extinction alone does not confirm a measured cool-phase duration.

[NASA's cool-flame account](https://www.nasa.gov/missions/station/cool-flames-created-during-a-first-for-international-space-station-research/) supports distinguishing combustion chemistry from a color choice. Run-specific diagnostics must come from the experiment report, not this overview.

## 4. Add six short research stories

Create a small typed content module, proposed `frontend/src/data/researchStories.ts`, and a `ResearchStories` component in the currently unused right-hand area of [App](frontend/src/App.tsx). Each story contains an ID, question, short finding, apparatus/material scope, limitations, source title/URL/locator, review status, and optional catalog/replay references. Use stable Phase 2 IDs when available; do not duplicate its measurement values in story prose.

Show one selected story at a time, with keyboard-accessible selectors and sources available without hover. On narrow screens, put stories below the prediction/evidence panels. Selecting a story changes only the displayed story; explicit **Open evidence** or **Open replay** actions navigate to existing material. It does not load a scenario, imply a match, or modify trust.

| Story | Source and permissible focus | Required limit |
| --- | --- | --- |
| Orbital ventilation | [Saffire-I report](https://ntrs.nasa.gov/citations/20170008805), existing report-results asset and [BASS-II report](https://ntrs.nasa.gov/citations/20210011385): investigate flow direction and ventilation in their apparatuses. | Saffire's opposed pass reused the specimen; BASS B1/B3 differ in more than flow. No recommended cabin airflow. |
| Supported habitats | [LUCI](https://ntrs.nasa.gov/citations/20250010653), reviewed SIBAL base/tip fits: simulated lunar acceleration in a rotating flight experiment. | Do not merge base/tip metrics or call this a lunar-surface experiment. Oxygen histories differ. Mars is an exploratory model scenario with no compatible observation established here. |
| Material screening and oxygen/flow | [SoFIE GEL](https://ntrs.nasa.gov/citations/20240007628): PMMA-sphere quenching and blowoff observations. | Its 4-cm spheres and tested flow range are not BASS thin films or a generic material pass/fail test. Do not add a specimen-size coefficient. |
| Soot and optical appearance | [ACME Flame Design](https://science.nasa.gov/biological-physical/investigations/flame-design/): soot control in gaseous diffusion flames; cleaner burner design as research context. | Literature context is not measured soot for the chosen canvas case. No RGB-to-temperature conversion or guaranteed burner improvement. |
| Smoke detection | [Published SAME aerosol results](https://ntrs.nasa.gov/api/citations/20140006579/downloads/20140006579.pdf), with [vehicle detection tradeoffs](https://ntrs.nasa.gov/citations/20170000248) as separate context. | Particle properties depend on material, transport and aging; the staged SAME/SAME-R tables are conditions, not detector outcomes. Attribute findings to SAME unless a SAME-R publication is separately verified. No detector guarantee. |
| Suppression research | [FLEX report](https://ntrs.nasa.gov/citations/20150023456), reviewed run `PSI-69-248F001`: droplet burning and visible extinction under a reported mixture. | Preserve `mm²/s` and droplet diameter meanings; neither validates the simulator's `mm/s` or flame width. No extinguisher sequence or apparatus-to-room scaling. |

- [ ] Review the primary report section for each quantitative statement before publishing it; record the locator. Where only an abstract/overview was checked, use qualitative context and say so in content metadata.
- [ ] Include Earth relevance inside the ACME or smoke story, with the same source discipline. [Reference-aerosol detector testing](https://ntrs.nasa.gov/citations/20205003817) is an optional additional source, not evidence that the canvas predicts alarms.
- [ ] Use one static story source in both backend-connected and offline modes. Keep legacy `engineering_playbook` and `earth_spinoff` response fields compatible but do not render their uncited content as the new stories. Do not revive seed-triggered recommendations.
- [ ] Keep story text and citation metadata available when the prediction API is offline. Source links can require internet access; do not promise that full reports are cached offline.

## 5. Integrate provenance and documentation

- [ ] Reuse the Phase 2 catalog's measurement and compatibility distinctions. Any new camera/diagnostic fields retain field-level provenance, nulls and source locators. Literature-only cards never increase outcome coverage.
- [ ] Update [DATA_INVENTORY](DATA_INVENTORY.md) for any new curated/derived asset, including reviewed sources and missing optical calibration. Keep raw originals read-only and outside the frontend bundle.
- [ ] Update the relevant [README](README.md), [architecture](ARCHITECTURE.md) and [demo script](DEMO_SCRIPT.md) passages. Existing claims about high trust, calibrated 95% halos, safety multipliers and prescribed response must not contradict the Phase 3 demo. Preserve Phase 4's unresolved validation status.
- [ ] Do not change either master training JSON, promote evidence into GP training, implement gas-mixture physics, or add geometry/direction/confinement coefficients. New scenario controls for those dimensions are deferred; future evidence filters must remain separate from predictor inputs.

## Verification and release gate

Implementation checks passed for the frontend production build, 17 backend tests (including the
in-process `/api/predict` route), 12 Python/TypeScript prediction fixtures, nine evidence parity
fixtures, and the generated catalog. The master JSON files match byte for byte and retain two
sourced-condition rows and 24 seed rows. The built assets contain no raw archives, tables, or
camera originals.

Browser verification remains open for desktop and narrow layouts, keyboard navigation, replay
scrubbing, canvas animation, and switching among the current API, legacy API, and offline modes.
The automated checks cover the appearance guard and still-air geometry at the model boundary.

These are checks to perform during implementation, not results from this planning pass.

| Check | Pass condition |
| --- | --- |
| Atmosphere | Full-precision results are 3.087 and 3.264 psi; display is 3.09 and 3.26. Missing/basis-incompatible evidence does not produce an invented pO2. Reported ranges remain ranges. |
| Classifier regression | Exercise the former trigger with methane at 0g, 85% O2, 4.3 psi, no flow, N2, plus cases around 60% O2 and 7 psi. Both physics ports and `/api/predict` produce no cool-flame diagnosis. |
| Cross-port parity | Use shared input fixtures across representative fuels, all three diluents, still air, flowing cases and modeled extinction. Compare deterministic physics outputs within rounding tolerance; compare API/fallback shapes and appearance semantics, not GP means against local means. |
| Legacy backend | An old response containing `INVISIBLE_COOL_FLAME` leaves the local fallback active; no violet chemistry label or stale confirmed claim appears. |
| Sphere and animation | API/local still-air length and width agree within each response, L/D is exactly 1, settled canvas is circular, 0g has no buoyant flicker, and seeded streaks/pulses and uncertainty remain visible. |
| Evidence boundaries | FLEX mixed gases and CFI-G unsupported conditions remain readable but cannot silently become predictor inputs. No d-squared metric is shown as model spread. |
| Story behavior | All six stories have working primary-source links and explicit scope/limits. Selection leaves cabin inputs and prediction unchanged. Literature context and missing compatible observations remain distinguishable. |
| Replay and UI | Existing replay/scrubbing behavior survives. Check desktop and narrow layouts, keyboard navigation, and the API-connected and API-offline paths. Unknown camera fields remain unknown. |
| Data boundary | Parse and compare both master JSON files; retain the 26-row provenance split unless separately authorized data work changed the baseline. No raw download enters the built assets. |

Run the existing backend suite with the backend environment: `python -m unittest discover -s backend -p 'test_*.py'`. Extend focused regressions for the changed classifier and boundary contract. Run `npm run build` from `frontend/` after dependencies are available. The frontend currently has no test script; add a small dependency-free fixture/parity check if needed, and report browser/manual verification separately from automated tests. A build alone does not verify animation or scientific claims.

**Exit gate demo:** Show the oxygen comparison → open a high-oxygen illustrative case without a cool-flame diagnosis → open the separately sourced CFI-G explanation → explore ventilation and LUCI evidence → identify the unsupported Mars inference → open the smoke and suppression stories with their limits. The audience can tell what was observed, what is modeled, and what remains unverified.

## Delivery order

1. Atmosphere readout, mixture boundaries and preset wording.
2. Classifier removal, response compatibility, canvas labels and both specs in one coordinated change.
3. Review story sources/optical metadata, then build the story UI and evidence links.
4. Reconcile documentation, run targeted regressions/builds, and verify the demo in both modes.

Each change can be reviewed independently; Phase 3 is complete only after all exit gates pass. New model fitting and independent outcome validation remain Phase 4.

## Ready-to-run implementation prompt

> Implement `PHASE_3_IMPLEMENTATION_PLAN.md` in this workspace. Read `AGENTS.md` and both physics/canvas specs first. Preserve existing changes and raw NASA data. Recheck whether Phase 2's catalog is available and reuse it; otherwise use the documented direct-source integration without inventing measurement coverage. Remove the cool-flame classifier in both physics ports, keep API/offline compatibility, add the atmosphere explanation and six sourced stories, and update relevant documentation. Do not change model coefficients or training datasets. Run the specified checks and report passed, failed and unperformed checks separately. Stop at the Phase 3 boundary.
