# Architecture

## Prediction and evidence data flow

| Input | Backend | Local result | Display |
|---|---|---|---|
| `CabinInputs` | `POST /api/predict` with deterministic physics | `predictLocalService` with parametric physics | Flame Lab animation, model values and evidence status |
| `EvidenceQuery` with cabin conditions and optional evidence context | `POST /api/evidence` with the reviewed catalog | `rankEvidence` with the bundled catalog | Case compatibility, condition differences and outcome coverage |

The prediction API retains example input references. Both model paths use the same
distance-based spread heuristic and a shared planetary parameter table. A recognized world
and gravity mode resolve effective cabin gravity before prediction. The Flame Lab passes
the active settings to the Evidence page for a condition comparison. Evidence filters and
research stories have their own state.

The evidence hook returns local rankings immediately and requests server results after 150 ms.
It discards outdated requests and checks catalog and ranking versions before accepting a response.
The local catalog stays available when the endpoint fails or returns a different version.

### Case compatibility and numeric ranking

The ranker checks the cabin fuel phase and family, known balance gas constraints, and selected
material, geometry, flow configuration, apparatus and metric. Conflicts take precedence over
missing context. A compatible case agrees with the selected evidence context. Independent
validation of the model requires its own comparable measurements.

Within each group, cases with greater numeric condition coverage rank first. Distance is the
weighted RMS of the normalized residuals for included dimensions. The stable case ID breaks
ties. Gravity, oxygen, absolute pressure and ventilation velocity use scales of 1 g, 70
percentage points, 10.4 psia and 30 cm/s, with respective weights 4, 1, 1 and 1. These are
sorting heuristics. A reported interval contributes zero residual inside its bounds. Changes
over time and values with unresolved bases are excluded. With zero eligible dimensions, the
distance is null.

## Model selection and uncertainty

The [Phase 4 audit](PHASE_4_VALIDATION_REPORT.md) found no eligible independent Saffire
comparison after checking target definition, apparatus, material and gas history. The app
serves the unretuned deterministic model. The experimental GP remains in `backend/surrogate.py`
with its original configuration. Its inputs were seed examples, sourced conditions with
estimated outputs, and 324 physics-generated anchors.

The uncertainty fields describe heuristic spread. Both paths compute it using distance to
example inputs and penalties for elevated oxygen and partial or hypergravity. The score is
an API compatibility field. The multiplier is null and the playbook is empty. The evidence
and prediction pages share the same bundled validation summary. The prediction bridge
accepts the current model and palette IDs from the API, with deterministic offline fallback.

## Correlations and invariants

The [physics spec](skills/01-flame-physics-rules.md) defines the correlations in
`frontend/src/physics/flameModel.ts` and `backend/physics.py`. Exact 0g and still air produce
L/D = 1 and equal model dimensions. The WebGL animation uses time-driven effects, with zero
buoyant flicker in free fall. The API and browser follow the same `PredictResponse` contract.

## Data boundary

The [canonical catalog](backend/data/mined_evidence.json) includes reviewed cases, source
references, and the ranking constants shared by both implementations. Run
`python3 backend/export_evidence.py` from the root to generate the bundled catalog and Saffire-I
report-results card. The collector keeps its manifest, original files and full mapped tables
under `data_raw/`. The Saffire-I and BASS-II replay assets carry their own timing and provenance.

The catalog is outside the model dataset, which contains 24 seed rows and two Saffire-I rows
with sourced conditions and estimated outputs. Outcome coverage counts cases by metric and
retains shared specimen groups. BASS-II B1 and B3 contribute conditions and imagery. See the
[data inventory](DATA_INVENTORY.md) for sources and access limits.
