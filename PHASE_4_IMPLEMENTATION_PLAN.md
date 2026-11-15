# Phase 4 implementation plan: independent validation and model decisions

**Outcome:** Produce a reproducible assessment of one precisely defined solid-fuel spread prediction, with an explicit decision about whether the GP adds demonstrated value. If comparable observations are unavailable, publish the exclusions and missing measurements, retain exploratory labeling, and choose the simpler illustrative model. A documented evidence gap is a valid Phase 4 outcome.

**Status:** Implemented through the insufficient-evidence path. See the [validation report](PHASE_4_VALIDATION_REPORT.md) and the [frozen protocol](backend/validation/protocol.json). The remaining scoring tasks apply when a revised protocol identifies eligible observations.

## 1. Establish a runnable, identifiable baseline

The planning inspection found unresolved merge entries in the API, local service, replay components, and React UI. The checkout also introduces multipage HTML entry points and a [prediction bridge](frontend/src/flameatlas/predictBridge.ts). Do not assume the older React dashboard is the only prediction surface.

- [ ] Finish the existing integration before executing model evaluation. Preserve both evidence/provenance features and the intended current UI. Resolve the API/fallback contracts, supported input ranges, and gravity resolution against the canonical [physics spec](skills/01-flame-physics-rules.md). This prerequisite is not authorization to discard either side of the merge.
- [ ] Check that previous-phase boundaries survive integration: no cool-flame diagnosis from appearance thresholds, no seed-based claims of experimental confidence, no safety multipliers or response prescriptions, and compatible API/offline responses. The currently conflicted API contains older versions of these claims; a Phase 3 status paragraph is not proof that the integrated version preserves its fixes.
- [ ] Record the resolved revision, dirty-file hashes if applicable, Python/package versions, model source hashes, training JSON hash, reviewed catalog hash/version, and input contract. Do not benchmark an unidentified mixture of revisions.

Current facts verified from repository files:

| Asset | Planning baseline | Consequence |
| --- | --- | --- |
| [Training master](backend/data/psi_master.json) | 26 rows: 24 `seed`/`seed`, two `real_psi`/`physics_estimate`; frontend master is byte-identical | No measured training targets are established by those labels. |
| [GP implementation](backend/surrogate.py) | Fits all 26 rows plus 324 physics-generated anchors to spread, length, and width; scaler and kernel fitting use the training rows; optimizer random state is unset | Existing comments describing ground truth or calibrated uncertainty need correction. Reproducibility and split isolation need explicit support. |
| [Reviewed catalog](backend/data/mined_evidence.json) | Version `2026-11-15.5`, 25 evidence-only records | This supersedes older plan snapshots with four records. Record count is not independent measurement count. |
| Predictor features | Gravity, oxygen fraction, total pressure, scalar flow, one diluent, generic fuel enum | No specimen dimensions, flow direction, confinement, or exact material composition are encoded. Restrict evaluation scope; do not invent coefficients. |
| [UI bridge](frontend/src/flameatlas/predictBridge.ts) | Includes aliases such as candle → `Cotton_Fabric`, plus defaults and input clamping | The evaluator must use reviewed canonical inputs directly. These UI conveniences cannot establish scientific equivalence. |

## 2. Audit one target family before calculating errors

**Initial target:** average linear flame-front spread over SIBAL fabric, in **mm/s**, under concurrent flow in the Saffire apparatus. Review Saffire-I 1-1 first because it connects to the existing demo; review Saffire-II 2-5 and 2-6 as a separate small-sheet stratum. Never pool those geometries to increase the sample count. Treat `Cotton_Fabric` as an explicitly disclosed approximation to SIBAL, not an exact material identity.

This order selects candidates by source traceability and metric definition, not their eventual residuals. If the first candidate is ineligible, document that before considering another. Do not switch families after seeing an unfavorable score.

| Candidate in the catalog | Review task | Initial disposition |
| --- | --- | --- |
| Saffire-I 1-1 / 1-2 | Reconcile report/replay identity, specimen dimensions, oxygen basis, pressure and measurement window. Both passes share `saffire-i-fabric`; 1-2 burned the remnant in opposed flow. | 1-1 is a benchmark candidate. 1-2 is related comparative evidence, outside the primary concurrent-flow target. |
| Saffire-II 2-5 / 2-6 | Resolve run-level atmosphere and independence; both are 5 cm sheets, distinct from Saffire-I's full sheet. | Separate candidate stratum; two entries do not establish two independent studies or replicated conditions. |
| BASS-II M1/M5/M9/M15/M20 | Verify Table 5.1, actual specimen identity, thickness, width, burning sides, and oxygen/pressure at each measured flow stage. | Alternate PMMA-slab target only after its own protocol. Current geometries vary and start/end oxygen is not stage-matched. |
| BASS-II B1/B3 and thin-film summaries | Review whether any measurement can actually be assigned to each recorded run. | Replays have no assigned spread targets. Series maxima/averages and quench velocities cannot be assigned to B1/B3. |
| LUCI | Keep flame-base and flame-tip rates distinct; resolve conditions and apparatus. | Comparative evidence outside the selected target. |
| FLEX, CFI-G, candle, PMMA surface regression | Preserve each measurement's physical meaning and units. | Excluded: droplet D² burning, flame radius, wick-flame size, and surface recession are not the selected flame-front spread target. |

The [Saffire primary report](https://ntrs.nasa.gov/api/citations/20170008805/downloads/20170008805.pdf) identifies different sample widths and reused fabric; its report-level values do not resolve every replay-input mismatch. Review the cited pages and Table I during implementation. The [inventory](DATA_INVENTORY.md) and catalog retain the specific unresolved bases.

Treat [BASS2_REAL_SPREAD_DATA.md](BASS2_REAL_SPREAD_DATA.md) as acquisition notes requiring review. In particular, PMMA film is not a measured fabric proxy, rod recession is not automatically flame-front spread, and report computations are not experimental targets. Use the catalog's source locators and the original [BASS-II report](https://ntrs.nasa.gov/citations/20210011385) to settle discrepancies. The remote BASS PDF exceeded the web reader's size limit during planning; its numeric tables were not independently reverified in this pass.

Create a candidate ledger with an entry for every reviewed case:

- Stable catalog/run ID, source filename/version/hash, page/table/row, original value/unit, measurement definition, averaging window, derivation method, precision, and reported uncertainty if available.
- Exact material and specimen geometry, flow direction, apparatus, atmosphere composition/basis, absolute pressure, effective acceleration basis, and conditions during the measurement window. Preserve nulls, ranges, and time histories.
- Study, campaign, physical specimen, run, and measurement-window identifiers, including suspected duplicate/alias relationships. Unknown grouping is not proof of independence.
- Explicit model mapping and each assumption. Classify as `eligible_benchmark`, `assumption_dependent_comparison`, or `excluded`, with machine-readable reasons and a short explanation.

**Eligibility rules:** Require a measured or traceably measurement-derived target and an exact metric/unit match. Every required input must have a defensible basis for the same run/window. Nominal orbital acceleration may be modeled as 0g only with that approximation recorded. Never fill missing pressure with 14.7 psi, assume N2 from an unspecified mixture, average oxygen endpoints into a stage value, clamp evidence into the model range, or use the target to choose an input. Any justified approximation must be frozen and reported; unresolved material/geometry applicability prevents a claim of validated generalization.

For range-valued inputs, predeclare a source-supported sensitivity grid or propagation method. Do not select the input that minimizes the residual or report the range as repeated observations. Unsupported or incomplete cases stay in the ledger even when no model can be run.

**Audit gate:** If no candidate is eligible, produce the evidence-gap report and proceed to the exploratory-model decision in section 6. Do not build a fitting pipeline merely to obtain a score.

## 3. Freeze the evaluation protocol and leakage controls

Create proposed `backend/validation/protocol.json` and `backend/validation/cases.json`, separate from both the training master and raw originals. Reuse catalog IDs and source metadata; do not create another competing evidence catalog. The cases file is a versioned evaluation snapshot with traceable provenance.

- [ ] Freeze the target, eligible IDs, exclusions, input mapping/range treatment, units, numerical comparison tolerances, grouping, training exclusions, metrics, and decision rule before producing model residuals. Any scientific matching tolerance must cite its basis; exact identity is the default for categorical fields. Avoid unexplained nearest-neighbor tolerances.
- [ ] Record that published outcomes have already been inspected while building the app and plan. This can be an outcome-held-out benchmark, not a claim of blind prospective validation. Audit known coefficient/data tuning against these sources and disclose unknown tuning history.
- [ ] Freeze two models: the unretuned [physics baseline](backend/physics.py), and the current GP algorithm retrained on the permitted training partition. Preserve a snapshot of the original GP configuration for traceability; it is not the leakage-controlled scored model if excluded rows remain in it.
- [ ] Add a narrow construction path accepting explicit records, anchor policy, and fixed random seed (proposed `0`) to `Surrogate`. Keep default application construction compatible. Fit the scaler, kernel optimizer, and target normalization using only permitted training data. Keep kernel/restart settings fixed; do not tune them on the evaluation cases.
- [ ] Exclude all known rows derived from the held-out study/specimen/run, including sourced-condition rows with estimated outputs and seed aliases. For Saffire-I, audit both `SAFFIRE-I-S1` and `SAFFIRE-I-S2`; their names alone do not establish report-run identity. Exclude uncertain related rows conservatively and log the reason.
- [ ] Freeze the generic 324-point anchor recipe. Identify whether any anchors or coefficients were constructed from held-out observations; exclude such derived anchors or disclose that a clean independence claim is unavailable. A generic pre-existing grid is permitted only as a declared modeling prior, never as measured evidence.
- [ ] Keep all measurements from the same physical specimen/run together. Use a campaign/study grouping where shared setup or uncertain reuse requires it. Duplicate publications, video frames, repeated fits and source copies do not create new independent runs.
- [ ] With the current evidence, evaluate frozen models without fitting measured outcomes. If future measured-data fitting is justified, require a separate protocol revision with group-disjoint development and final evaluation data. A benchmark used to choose a model is subsequently selection data, not an untouched test for the next model.

Keep raw downloads read-only and outside the app bundle. Do not run the legacy importer to populate validation targets; it generates estimated outcomes.

## 4. Implement the smallest reproducible evaluator

Proposed files: `backend/validation/` for frozen inputs and manifests, `backend/validate_model.py` for the command, and `backend/test_validation.py` for focused integrity tests. Use the existing Python/NumPy/scikit-learn dependencies and standard-library JSON/CSV output.

The command should validate the protocol and data, check exclusion/group disjointness, construct both models, and export per-case results plus an aggregate summary and provenance manifest. Avoid importing `main.py` to train the global production surrogate as a side effect. Unsupported cases must produce explicit exclusions, never zeros or silent fallback inputs. A zero-eligible-case run must clearly report `insufficient_evidence` with null metrics.

For each eligible case, retain the original observation, unrounded prediction, signed error `prediction - observation`, absolute error, model identity, group ID, source locator and assumptions. Report in **mm/s**. Round only presentation values.

- One independent run: a benchmark residual, with no calibration or general-accuracy claim.
- Multiple comparable runs: descriptive MAE and signed bias for each model, paired absolute-error differences, number of outcomes, number of independent runs/groups, and full residual table. Keep different target/geometry strata separate. If repeated observations occur within groups, report group-balanced summaries so dense sampling does not dominate.
- Do not use MAPE as the primary score near zero, make an accuracy percentage from condition similarity, or hide failed predictions by dropping them from the denominator.
- Log GP standard deviation separately from measurement uncertainty and input sensitivity. A nominal mean ± 1.96σ band is uncalibrated model spread. Any descriptive hit count must state its denominator and cannot establish 95% coverage from this sparse, dependent evidence.
- Interval calibration or claims of improvement require additional independent data and a preregistered sample-size/precision rationale. Do not manufacture a universal minimum sample count or an acceptance error without an intended use and measurement-uncertainty basis.

Verify integrity with deliberately adversarial fixtures: held-out alias leakage, shared specimen across partitions, scaler isolation, modeled target mislabeled as measured, mismatched units/metrics, absent pressure, range/time-basis mismatch, duplicate observations, invalid numeric output, and no eligible cases. Also verify repeat runs with the frozen seed agree within declared numerical tolerances. These tests establish evaluator correctness, not physical accuracy.

## 5. Present results without changing their meaning

Produce `PHASE_4_VALIDATION_REPORT.md` with the protocol version, candidate/exclusion ledger, selected target, reproducible command, manifests, comparison table (when eligible), limitations and model decision. Machine-readable results belong under a small derived-results directory; register new assets and limitations in [DATA_INVENTORY.md](DATA_INVENTORY.md).

Expose a compact static validation summary on the integrated evidence/prediction surface, using the same asset in online and offline modes. Show model name, validation status, supported target scope, independent sample/group counts, observed and predicted values when appropriate, and links to sources/report. A source-matched evidence card must not silently become a validated prediction badge.

Keep uncertainty/trust visible. Preserve API/fallback structure, exact still-air L/D = 1, equal dimensions, deterministic animation, and existing replay timing. If model output selection changes, update both runtime paths and their labels together. Read the [canvas contract](skills/02-canvas-animation-spec.md) before any canvas change; no animation redesign is needed for this phase.

## 6. Make and record the model decision

| Evaluation outcome | Phase 4 decision |
| --- | --- |
| No eligible observations, unresolved input/metric mapping, or independence cannot be established | Publish `insufficient_evidence` and the precise acquisition needs. Use the deterministic physics baseline as the explicit exploratory default; retain observed comparisons separately. |
| One run or a few related runs; GP has lower residuals on them | Publish a limited benchmark. This alone does not demonstrate general improvement or calibrate intervals. Keep the simpler exploratory default. |
| GP fails to improve the prespecified comparison, or results depend on favorable assumptions | Keep the deterministic baseline; retain the GP as a documented experimental comparator if useful. |
| Adequate independent evidence under a separately frozen decision rule demonstrates useful GP improvement | Consider a scoped GP mode only for the evaluated target/domain. Preserve exploratory behavior elsewhere. Publish the supporting evidence and selection limitations. |

Do not promote observations into the existing multi-output master during this initial phase: a measured spread rate does not supply measured length or width. Any later training promotion needs per-target provenance, missing-target handling, dataset versioning, a new independent evaluation partition, and synchronized frontend/backend data. Do not fill absent targets using the physics model and relabel the row measured.

For the current snapshot, the recommended deliverable is an eligibility/exclusion report plus, if inputs can be reconciled, a narrow fixed-model benchmark. New geometry, direction, mixture, extinction, or droplet models and broad coefficient tuning are outside this phase.

## Verification and exit gate

These are implementation checks to run after integration, not results from this planning pass:

1. Confirm no unresolved merge entries or markers remain in runnable source, and record the frozen revision/files.
2. Run the backend environment's `python -m unittest discover -s backend -p 'test_*.py'`, including the new evaluator integrity tests. Report missing dependencies or coverage explicitly.
3. From `frontend/`, run `npm run check:evidence`, `npm run check:appearance`, and `npm run build` after dependencies are installed. Set `FREEFALL_PYTHON` for the appearance script when needed. Recheck the scripts against the integrated entry points; they currently include the older React prediction hook.
4. Run the frozen evaluation twice; compare exclusions, grouping, counts, predictions and aggregates within protocol tolerances. Confirm neither data splitting nor scoring mutates source data.
5. Parse and compare both master JSON files; retain their 26-row provenance split for this scope. Check generated evidence assets using the existing exporter/check workflow if catalog metadata changes.
6. Manually verify the active desktop/narrow UI, API and offline model labels, source navigation, visible uncertainty and validation limits. Check the static multipage bridge as well as any retained React dashboard. Builds do not verify these behaviors.

**Exit gate:** A reviewer can reproduce either a leakage-controlled, explicitly limited observed-versus-predicted comparison or a precise evidence-gap decision. They can identify the runtime model and its validation limits in both modes. No seed, synthetic anchor, modeled output, or incompatible metric enters the held-out observation denominator.

## Delivery order and implementation prompt

1. Resolve integration and freeze the baseline.
2. Audit candidates and write the eligibility ledger/protocol.
3. If eligible, add reproducible model construction and evaluator; otherwise produce the evidence-gap artifact directly.
4. Publish the report, apply the documented runtime-model decision, and expose the shared validation summary.
5. Run applicable checks and update README, architecture and demo wording to reflect the actual outcome.

> Implement `PHASE_4_IMPLEMENTATION_PLAN.md` after reconciling the current integration. Read `AGENTS.md`, the physics spec and current evidence inventory first. Preserve unrelated work and raw NASA originals. Freeze and audit one target before scoring; keep Saffire geometries separate and never substitute modeled outcomes for measurements. If no eligible independent comparison exists, complete the documented insufficient-evidence path instead of inventing inputs or fitting coefficients. Keep model selection, uncertainty and validation limits consistent across API/offline UI paths. Report passed, failed and unperformed checks separately. Stop at the Phase 4 boundary.
