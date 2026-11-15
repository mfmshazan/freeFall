# Phase 4 validation report

**Protocol 2026-11-15.1 · Insufficient evidence.** The audited target is average linear flame-front spread in mm/s for SIBAL fabric in concurrent flow in the Saffire duct. The primary candidate was the full-size Saffire-I sheet. Saffire-II small-sheet runs were reviewed separately. Zero observations, independent runs and groups passed the eligibility gate. The deterministic physics baseline serves exploratory predictions through the API and offline. Neither model was scored, and there are no residuals, accuracy estimates or interval-coverage estimates.

## Candidate audit

The reviewed [catalog](backend/data/mined_evidence.json) supplies the source locators, original values and units, condition histories, specimen relationships and methods. The frozen [case ledger](backend/validation/cases.json) joins on its case IDs and records exclusions and supplemental sources for all 25 entries. The table below gives the Saffire assessments in review order. Reported spread precision is 0.1 mm/s for these four runs. The sources reviewed did not provide a spread uncertainty or exact fit endpoints for these passes. Burn duration is a separate field. [NASA report, pages 14–21 and Table I on page 29](https://ntrs.nasa.gov/api/citations/20170008805/downloads/20170008805.pdf#page=29)

| Catalog run | Geometry and published observation | Disposition |
| --- | --- | --- |
| Saffire-I 1-1 | 40.6 × 94 cm, 0.37 mm SIBAL. Concurrent nominal duct flow 20 cm/s. Video-derived average 1.8 mm/s. Burn duration 420 s. | Excluded. The air mixture and spread-window oxygen cannot be aligned. The model has no validated SIBAL or geometry mapping. |
| Saffire-I 1-2 | 40.6 cm wide, about 10 cm available length from the same sheet. Opposed flow 20 cm/s. Video-derived 1.3 mm/s. Burn duration 70 s. | Excluded by direction and grouped with the first pass as `saffire-i-fabric`. |
| Saffire-II 2-5 | 5 × 29 cm, 0.37 mm SIBAL. Concurrent duct flow 20 cm/s. Video-derived 2.1 mm/s. Burn duration 145 s. | Excluded. The spread-window composition and material/geometry mapping are unresolved. |
| Saffire-II 2-6 | Same small-sheet specification, separate specimen on the same flight. Concurrent duct flow 25 cm/s. Video-derived 2.6 mm/s. Burn duration 115 s. | Excluded for the same reasons. The two small-sheet cases share a campaign and use different flow settings. |

Olson et al. give hatch-close conditions of 102 kPa and 21.7 vol% O₂ for I-1, and 103 kPa and 22.1 vol% O₂ for II-5 and II-6. They report no discernible pressure variation during the SIBAL tests. The values are preserved with the hatch-close basis. The manuscript cross-lists the three rates in cm/s and plots the flame-base and tip tracks. Those entries describe the same runs as the NASA report. The Saffire-I end O₂ estimate of 21.5% and the processed replay’s ignition values of 22.6242% O₂ and 14.8496 psia use different bases. The replay also lists 300 × 800 mm where the report describes 406 × 940 mm. The staged PSI-99 sample 5 and 6 workbook sheets index camera files and times. [Olson et al., Table 1 and §§3 and 3.3](https://discovery.ucl.ac.uk/id/eprint/10164340/1/SIBAL-cotton%20revised%20Sept%20per%20review%20track%20changes%20accepted.pdf#page=9) · [NASA PSI-99](https://psi.nasa.gov/physci/repo/data/investigations/PSI-99)

The candidate mapping would use nominal 0g, the reported duct velocity and a generic cotton approximation for the 75% cotton/25% fiberglass material. Confinement and geometry matter to the measurement and are absent from the predictor. No pressure default, balance-gas assignment, input clamp or range average entered a prediction. A follow-up needs the exact flame-base fit windows, time-aligned absolute pressure and upstream gas composition, a reconciled specimen and duct record, and an independently justified material/geometry mapping with repeat runs. The other flights mentioned in the Olson paper fall outside the frozen candidate set.

### Other reviewed cases

- BASS-II M1, M5, M9, M15 and M20 report tracked PMMA slab rates of 0.071, 0.071, 0.025, 0.045 and 0.012 mm/s. Section 5.3 and Table 5.1 were verified against the local report. Tests differ in thickness, width, burning sides and opposed flow conditions. Initial/final oxygen is test-level, and fit-window gas composition and pressure were not established. The B1/147 and B3/148 replay records have no assigned per-run spread rate. The thin-film 2.0 mm/s ground average and approximately 2.2 mm/s microgravity maximum are series results, and the 0.044 mm/s thick-PMMA value describes downward spread over a slab. The reported 0.0385 mm/s rod value is tip recession. BASS/BASS-II SIBAL Fig. 7.4 gives steady-rate data in smaller ducts, with separate geometry and sample-reuse caveats. These are outside the selected stratum. [NASA/TM-20210011385, §§2.3.7, 5.3, 6 and 7](https://ntrs.nasa.gov/citations/20210011385)
- LUCI supplies distinct flame-base and flame-tip speeds in different apparatus and acceleration conditions. FLEX supplies diameter-squared burning rates and extinction diameters. CFI-G supplies diagnostic burner observations. Candle diameter and duration, critical quench airflow and PMMA surface recession have their own metric definitions. The case ledger retains their exclusions and links through the reviewed catalog.

## Reproduce the decision

From the repository root, run:

```sh
python3 backend/validate_model.py
python3 backend/validate_model.py --check
```

The command verifies the [frozen files and environment manifest](backend/validation/manifest.json), requires one disposition per catalog case and emits the same [summary](backend/validation/results/summary.json) used by the Flame Lab and Evidence pages. It does not import the model service or write to source data. The hash check identifies the reviewed files. Python and dependency versions are recorded for reproduction.

Published outcomes were already available to the application and planning work. Local Git history places the original physics coefficients and the GP grid before this catalog expansion, but earlier calibration history is unknown. The two Saffire-I master records contain estimated outcomes and possible aliases of the report passes. The protocol also excludes the related Saffire-II and Saffire-III seed rows from any future comparison under this target definition. The 324 generic physics-generated anchors represent a modeling prior. No GP partition was fitted and disjointness of a future training partition remains to be verified. A revised protocol and frozen eligible inputs must precede any error calculation.

## Runtime decision and limits

The API and offline fallback use the same deterministic correlations, with no coefficient fit. The UI shows tentative prediction values and heuristic spread based on distance to example inputs. The numeric score in the response is a legacy scenario-distance signal. The compatibility playbook is empty and the safety multiplier field is null. The candle view remains a qualitative animation. Source observations and replay metadata remain available through the evidence explorer. Claims of GP improvement and calibrated coverage require a future eligible evaluation.
