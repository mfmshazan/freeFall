# Data Inventory

Covers NASA replay data integrated into the app and evidence collected for later model evaluation.

## Data mining and reviewed evidence

The [catalog](backend/data/mined_evidence.json) includes the eight initial Phase 2 cases.
`python3 backend/export_evidence.py` generates the bundled catalog and the Saffire-I report
results. `--check` verifies both exports. Entries retain original conditions and outcomes,
review dates, source versions and locators, and SHA-256 hashes for available originals.

| Initial cases | Originals reviewed | Remaining access or context |
| --- | --- | --- |
| Saffire-I 1-1 and 1-2 | NTRS 20170008805, PDF pp. 14, 20–21 and 29. Confirms both spread rates, run labels, flow, and specimen reuse. | The processed replay carries separate geometry and ignition readings. The original workbook and verification sheet were unavailable for this review. Those fields are provisional. |
| LUCI SIBAL partial g and 1 g | NTRS 20250010653, PDF pp. 4, 12, 16, 19, 25–27, 33 and 42. Confirms the position fits and different oxygen histories. | NASA run IDs for the fits are unavailable. Rotation, the shared chamber and differing oxygen histories limit comparisons. |
| CFI-G 21174 C3 | Normal Flames CSV line 160 and the local final report pp. 43–46, especially Table 3 and Figure 2. | The PSI-159 link and exact report filename are supplied. Download from the online Reports folder remains unconfirmed. Chamber pressure basis is unresolved for numeric comparison. |
| FLEX-018 / 248F001 | PSI-69 CSV line 19 and NASA/TP-2015-216046, Appendix A, Table IX (PDF p. 26, printed p. 20) and Figure 22 (PDF p. 52, printed p. 46). | The mixed balance gas is outside the single-diluent cabin options. Figure 22 discusses possible cool burning without a measured cool-phase duration. |
| BASS-II B1 / 147 and B3 / 148 | PSI-25 CSV lines 2 and 4, both proof sheets, and NASA/TM-20210011385 §2.3.5 (PDF p. 46, printed p. 38). | Pressure is a series range. The duct display has a response lag. The two cases have no assigned spread targets or sensor synchronization. |

The NTRS Saffire-I and FLEX PDFs were retrieved for review, and the LUCI PDF was reachable
online. The BASS-II report and PSI originals were opened from local copies. The PSI routes
returned the portal shell in the remote check. Individual PSI file downloads remain unconfirmed.


`python3 backend/mine_nasa.py --fetch` caches public LUCI, BASS-II and SoFIE GEL reports under
`data_raw/mining/` and builds a local manifest with source URLs, SHA-256 hashes and PSI export
status. The reports are separate from the official PSI experiment table and metadata downloads.
The Saffire-I test matrix contributes published conditions as written, including ranges and
approximate values; the two existing master rows still use modeled flame outcomes.

[Reviewed LUCI evidence](backend/data/mined_evidence.json) records NASA's camera-based linear
fits for SIBAL flame base and flame tip spread. NASA reports **0.92 / 1.1 mm/s** at simulated
lunar gravity and **1.5 / 2.8 mm/s** at 1 g. See PDF pages 19 and 33 of the
[LUCI presentation](https://ntrs.nasa.gov/api/citations/20250010653/downloads/ASGSR%202025-LUCI-Ferkul-Presentation-v2-20250010653.pdf).
The pressure and airflow inputs are incomplete, the oxygen profiles differ, and the source
distinguishes base spread from tip spread. These rows are evidence for review, outside training.

## NASA.zip archive mapping

The six experiment tables from the supplied `NASA.zip` are staged as original bytes under
`data_raw/mining/inbox/`. The [collector mappings](backend/psi_table_mappings.py) record the
source column meanings; the generated [manifest](data_raw/mining/manifest.json) gives the
source file, SHA-256 and CSV line for each mapped row. Blank cells stay null, and source
qualifiers and repeat rows are preserved. macOS archive sidecars are ignored.

| PSI | Files mapped | Result |
|---|---|---|
| PSI-25 BASS-II | 129 test-matrix rows | Metadata from the separate `download.zip` declares PSI-25 internally despite the filename containing PSI-101. The summary PDF is byte-identical to the existing NASA/TM-20210011385 cache. |
| PSI-159 ACME CFI-G | 179 normal and 154 inverse rows; final report | The inverse CSV also has 861 blank rows. Matching ISA-Tab was already staged separately. Test 21174 C3 matches Table 3, PDF p. 46: cool-phase duration 13.9 s, hot/cool flame radii 17.6/7.6 mm. |
| PSI-69 FLEX | 274 droplet test rows | Windows-1252 export with matching PSI-69/PSI-133 ISA-Tab metadata. [NASA/TP-2015-216046](https://ntrs.nasa.gov/citations/20150023456), Appendix A, documents diameter-squared burning rate in mm²/s and defines the extinction diameter as a droplet measurement. Hardware ID `248F001` matches report test FLEX-018. |
| PSI-102 SAME | 8 test-matrix rows | Four explicit settings and four material rows referring back to those settings. Aging duration is a test condition. The table has no particle or detector results. Matching ISA-Tab metadata is now catalogued. |
| PSI-107 SPICE | 469 coflow rows | Nozzle size, gas and air flows, and event times; no smoke-point or soot measurements. Preserve repeated time keys. Matching ISA-Tab metadata is now catalogued. |
| PSI-99 SAFFIRE-II | 15 experimental rows plus JPEG index workbook and two PDFs | The workbook's `Sample1 - jpeg` through `Sample9 - jpeg` sheets index files by `EpochTime` (ms), `Jpeg File Name` and `Zip File Name`. The referenced frames and sensor data are absent, so the index cannot support a replay. The 15-row table and matching ISA-Tab are catalogued for evidence review. |
| PSI-10 ACME Flame Design | 327 normal/inverse rows | Normal and inverse flame-design exports with matching ISA-Tab metadata. Feed rates, pressures, mixture fractions and Tad remain source-reported quantities; catalogued as evidence only. |
| PSI-26 BASS | 122 test-matrix rows | Date/time, test identifiers and fuel sample material; no flame-outcome measurements in this export. Matching ISA-Tab metadata is catalogued. |
| PSI-100 SAFFIRE-III | 2 sample-matrix rows | Sample geometry, airflow/direction and camera references; no measured flame outcomes in this export. Matching ISA-Tab metadata is catalogued. |
| PSI-68 FLEX-2 | 8 droplet-condition rows | Fuel, droplet diameter, gas composition, pressure, temperature and flow velocity. Conditions only; matching ISA-Tab metadata is catalogued. |
| PSI-142 Cool Flame Transitions | 8 dataset-index rows | Dataset descriptions, publication links and figure IDs; not row-level measurements. Matching ISA-Tab metadata is catalogued. |
| PSI-101 SAME-R | 109 test/aging-condition rows | Sample type, test identifiers, inlet velocity, radius ratio and aging/mixing durations. Preserve reported values; matching ISA-Tab metadata is catalogued. |
| PSI-60 SPICE analysis | Metadata only | NASA lists no associated Experimental Table. The investigation analyzes PSI-107 data; metadata is catalogued for provenance. |
| PSI-62 BASS tomography modeling | Metadata only | NASA lists no associated Experimental or Modeling Table. The investigation links back to BASS/PSI-25 and PSI-26 data; metadata is catalogued for provenance. |
| PSI-117 Thermo-Convective Cool Flames | Metadata plus analyzed CSV/XLSX outputs | NASA lists no associated Experimental Table. Analyzed data and metadata are catalogued as context/evidence, not raw experiment measurements. |

The matched CFI-G and FLEX observations are in [reviewed evidence](backend/data/mined_evidence.json).
They remain outside the predictor dataset. CFI-G feed rates are mass flows, and burner
temperature refers to the hardware. FLEX's diameter-squared rate is a different quantity from
the simulator's mm/s output.

## Reviewed rates and extinction evidence

Five additional NASA reports are copied byte-for-byte to `data_raw/mining/report_inputs/`.
The originals are read-only and the folder is git-ignored.

| File | Evidence added | Limits |
|---|---|---|
| `20170008805.pdf` | Saffire-II SIBAL samples 2-5 and 2-6: 2.1 and 2.6 mm/s at 20 and 25 cm/s; Table I also records silicone and Nomex tests with no meaningful propagation. | 5 cm coupons at about 22.1% initial O₂; distinct from Saffire-I's 40.6 cm fabric sheet. |
| `20150023456.pdf` | Five heptane FLEX runs (14–21% initial O₂): 0.24–0.43 mm²/s diameter-squared burning rates, extinction diameters, and durations. | mm²/s is the droplet D²-law constant, not linear flame spread. Pressure, droplet size, and endpoint vary. |
| `20200000557.pdf` | Documents image-derived flame-tip progress for 10 mm PMMA in Saffire-II and lower-pressure comparison tests. | Flow was 20 cm/s; figures are not transcribed as precise table values. |
| `20160000593.pdf` | BASS-II PMMA flammability chart: stable, quench, and blowoff observations against stretch and final O₂; reports stable spread at 13.6% O₂ for a 1/4-inch rod. | Geometry-specific boundary; 13.6% is not a universal PMMA ignition cutoff. |
| `20030075810.pdf` | USML-1 candle tests: typical 15 mm flame diameter and 40–60 s visible lifetime; one test lasted 105 s. | Candle is a non-propagating wick flame; initial 21.7% O₂ was assumed from Spacelab atmosphere. |

The catalog stores these outcomes as `evidence_only`. BASS-II PMMA slab rates include the
associated flow stage, while start/end oxygen readings are not assigned to that flow stage.
FLEX remains in mm²/s. The reports show quenching and blowoff boundaries, but do not establish
universal oxygen or airflow cutoffs across materials and geometries, so those values do not
change the predictor's training or hard limits.

## Research stories and optical metadata

The [story summaries](frontend/src/data/researchStories.ts) link to the bundled evidence catalog and
existing replays. Source locators include Saffire-I p. 21, BASS-II §2.3.5, LUCI pp. 19 and 33,
SoFIE GEL §§2–3, the ACME Flame Design investigation overview, the SAME results and conclusions,
and FLEX Appendix A and Fig. 22. Literature context adds no model training rows or outcome coverage.

The CFI-G final report describes radiometer and intensified-camera analysis on pp. 43–45 and gives
the values and processed grayscale images for 21174C3 in Table 3 and Fig. 2, p. 46. The blue shown in
Fig. 2 is added during processing. Appendix M describes the filter generally used with the intensified
camera. Run-specific exposure and optical calibration remain undocumented in the figure.

[Replay camera notes](frontend/src/replay/RecordingAppearance.tsx) record Saffire-I's S1C1
frame source and replay downscaling, and the BASS-II side-view color video hardware and overlay
documented in NASA/TM-20210011385, printed pp. 4–5. Filter/band, exposure/gain, and optical calibration
are undocumented for the displayed replay assets. BASS radiometer gain describes an instrument
channel. The replay uses the existing media files without palette changes.

---

## BASS-II (Sample 147 / Test B1) Data Inventory

Source: `data_raw/bass-2/` (original NASA downloads — **read-only, never modified**; git-ignored,
outside the frontend bundle). Processed app assets: `frontend/public/replay/bass-2/`
(`b1.mp4` compressed 1.6 MB, `proofsheet.pdf` 264 KB, `conditions.json`).

**Source files**
| File | Type | Role |
|---|---|---|
| `BASS-II Test Matrix by PI Final.xlsx` | xlsx | 6 PI sheets (Bhattacharjee, Ferkul, Miller, Olson, Fernandez-Pello, T'ien). **Sample 147 / B1 = Bhattacharjee sheet, row 2** |
| `BASS-II Summary Report.pdf` | pdf | NASA/TM-20210011385 (144 pp). §2.3.5 = thin-film apparatus, opposed-flow config, duct 76 mm square, pressure 99.2–99.5 kPa |
| `BASS-II data FAQ.docx` | docx | Column definitions (fan display = V×10, air display = duct cm/s, restrictor 0=high flow/2=low, O₂ MCA calibration, video date +1 day) |
| `BASS_GMT50_SAMPLE_147_TEST_B1.mp4` | mp4 | 720×480, 44.8 s side-view flight video w/ overlay (FUEL/AIR/FAN/RAD). Overlay confirms AIR 5, FAN 61, date 02/20/14 |
| `GMT2014_050_BASS_S147M_TPB1_ProofSheet.pdf` | pdf | Nikon stills iss038e051066–051119, top view, 1 frame/sec |
| `Fan calibration data.xlsx` | xlsx | Fan-voltage → flow calibration by date/restrictor (for cross-checking; not re-derived) |

**Verified B1 fields** (see `frontend/public/replay/bass-2/conditions.json` for sources per field):
100 µm cast PMMA film · 2 cm wide · ~95 mm long (series nominal) · **opposed-flow** · microgravity ·
air display 5 cm/s · fan 62 (6.2 V) · restrictor 2 · O₂ 22.2/22.2 % · CO₂ 0.44/0.44 % · CO 0/6 ppm ·
pressure 99.2–99.5 kPa (series range) · radiometer gain 50 · 57 Nikon frames · date 2014-02-19 (GMT 050).

**Unknown / not documented:** exact per-test sample length, exact per-test pressure, ignition time /
burn duration in seconds, any continuous sensor time-series (only before/after values exist).

**Timing:** no sensor time-series, so **video playback time is NOT sensor time** (shown as playback
only). Still-camera clock = BASS video clock − 1 day 6 min 10 s (per proof sheet); video-display date
is +1 day from actual (leap-year). Temperature is **not** measured and is **not** inferred from flame colour.

**Comparison run:** **Test B3 / Sample 148** — same 100 µm PMMA film, 2 cm, restrictor 2,
initial O₂ 22.2 %, same day (GMT 050); airflow differs (air 2 cm/s, fan 47/4.7 V vs B1's 5 cm/s, 6.2 V).
Confounders: B3 final O₂ 21.8 % (vs 22.2), CO 12→19 ppm (vs 0→6), 253 frames (vs 57),
different specimen. The processed `b3.mp4`, `proofsheet_b3.pdf` and the run comparison in
`compare.json` are already bundled in `frontend/public/replay/bass-2/`. The PSI-25 export
in the inbox cross-checks B1 / 147 at CSV line 2 and B3 / 148 at line 4, including the
duct display, fan setting and before/after gas readings. The table provides no per-run
flame spread rates; the report's series-level values are not assigned to these replays.

---

# Saffire-I Data Inventory

Source: `data_raw/Saffire-I/` (original NASA downloads — **read-only, never modified**; git-ignored
and kept out of the frontend bundle). Processed app assets: `frontend/public/replay/saffire-1/`
(small, generated by `backend/process_replay.py`).

## Source files

| File | Type | What's in it |
|---|---|---|
| `Saffire-I Sample 1 Sensor Data Complete TM graphs.xlsx` | xlsx | **Primary.** `Calibrated Data` (20,000 rows ×73 ch, 30 Hz, unit-labeled) + `Camera Data` (18,124 frame timestamps ×2 cameras) |
| `Saffire-I Telemetry Data Good Process Version.xlsx` | xlsx | Rawer telemetry: `RawData`, `SaffireData`, `CygnusData` (smoke/pressure/temp/attitude), several chart sheets |
| `SAFFIRE_I_S1C1_jpeg_part1.zip` | zip | **5,000** S1C1 burn-camera JPEGs, named `S1C1-<epoch_ms>.jpeg` |
| `SAFFIRE-I Image Directory Nomenclature.pdf` | pdf | Image naming guide (`Xn_jpeg` = on-board jpeg; X=run type, n=run #) |
| `SFSDP-VIS-0295 … Thermocouple Placement.pdf` | pdf | Verification sheet: sample 300×800 mm, **6 flame-zone temperature sensors** |
| (also present) `*_F1C1/F1C2/F2C1*` zips, `PSI-98_Experimental table…csv`, metadata zip | — | Flow-visualization cameras (pre-ignition) + planning table + ISA-Tab metadata |

## Verified measurements used (from `Calibrated Data`, with real units)

| Field (xlsx header) | Unit | Observed range | App key |
|---|---|---|---|
| Elapsed Time (s) | s | 0 … 659.967 | `t` |
| Epoch Time | ms | 1465937043422 … …703389 | `t0_epoch_ms` |
| O2 | % | 22.21 – 22.72 | `o2` |
| CO2 | % | 0.42 – 0.63 | `co2` |
| Ambient Pressure | PSIA | 14.83 – 14.90 | `pressure` |
| Anemometer 1 | cm/s | 0.11 – 21.63 (≈20 nominal) | `flow` |
| Radiometer 1–4 | mW/cm² | ~−17 baseline → **124–139 peak** | `rad1…rad4` |
| Sample Temp 1–6 (TC7–TC12) | °C | 11 → up to **698** | `tc7…tc12` |
| Igniter Current | A | 0 → 4.12 (**ON 60.03–67.98 s**) | `igniter_a` |

Other available (not yet surfaced): Plume Temp TC1–6, 4 Radiometer temps, humidity, fan speed/RPM,
avionics voltages, 20+ digital command channels, Cygnus attitude/accel + FIZ smoke detectors.

## Time formats
- `Elapsed Time (s)`: float seconds from recording start (t=0).
- `Epoch Time`: Unix ms. `Timestamp (ms)` string e.g. `6-14-2016 4:44:03.422 PM` (UTC) — matches epoch.
- Image filenames embed the **same** epoch ms.

## Image ↔ sensor timing — **VERIFIED (not assumed)**
`elapsed = (epoch_from_filename − T0)/1000`, with `T0 = 1465937043422`.
Confirmed exactly against the workbook `Camera Data` sheet (its `Time (s)` equals `(Epoch−T0)/1000`,
e.g. 55.02 s ↔ 1465937098442). So frames and sensors share one real clock → synchronized replay is justified.

- S1C1 frames span elapsed **58.04 – 231.75 s** (epoch 1465937101465 – 1465937275176).
- Sensor record spans **0 – 659.97 s**. Igniter fires 60–68 s; flame growth follows.

## What remains uncertain / not available
- **S1C1 is `part1` only** → burn frames stop at ~232 s; the full burn (to 660 s) is in parts not downloaded. Replay image window is 58–228 s; sensor chart continues to 660 s (shown, images just end).
- **Exact thermocouple XY coordinates**: the VIS PDF confirms 6 sample sensors but points to an external `Table 3.7.4-7 / Figure 3.7.4-1` not included — so per-TC positions on the 800 mm sample are unknown. TC7–12 are used as labeled channels, not mapped to physical spread distance.
- **Flame spread rate / flame length in mm**: not a column in any sheet; must be extracted from imagery or the publications. Not fabricated.
- Radiometers read slightly negative pre-ignition (calibration offset) — kept as-is (real values).
- Two xlsx files are duplicated with a `(1)` suffix (identical content); the non-`(1)` copy is used.

## Processed outputs (`frontend/public/replay/saffire-1/`, ~660 KB)
- `conditions.json` — conditions + measured-at-ignition atmosphere + channel catalog + provenance.
- `sensors.json` — 667 samples @1 Hz, 15 channels, nulls preserved as gaps, igniter markers.
- `frames.json` + `frames/f_<epoch>.jpg` — 80 downscaled (480 px) S1C1 frames with elapsed-time tags.

## Saffire-I report results card

`frontend/public/replay/saffire-1/report-results.json` is generated from the catalog and uses the [NASA Saffire-I report, page 21](https://ntrs.nasa.gov/api/citations/20170008805/downloads/20170008805.pdf#page=21): video-derived average spread rates for runs 1-1 and 1-2, nominal duct flow, and the reused-specimen caveat. It is separate from the partial concurrent-run replay and is not cursor telemetry or model training data. The report describes 40.6 × 94 cm fabric and 21.7% starting oxygen (ISS reading); replay metadata describes 300 × 800 mm and a separate calibrated ignition reading of about 22.62% oxygen. These different bases are not reconciled or averaged.


## Phase 4 eligibility snapshot

The [case ledger](backend/validation/cases.json) references all 25 reviewed catalog
entries by ID and adds the frozen dispositions, source hashes and measurement-basis notes.
It includes the Olson et al. accepted manuscript (Table 1, §3 and Figure 10), the local
PSI-99 Experimental Table, and the PSI-99 Final v5 image index for samples 5 and 6.
The accepted manuscript supplies hatch-close pressure and oxygen. The image index supplies
camera timestamps. The catalog and its two generated evidence assets retain their existing
records and provenance.

The [frozen summary](backend/validation/results/summary.json) is bundled by the Evidence and
Flame Lab pages. It reports zero eligible independent runs and null error metrics.
The [manifest](backend/validation/manifest.json) identifies the resolved revision,
runtime and frozen source hashes. The [validation report](PHASE_4_VALIDATION_REPORT.md)
describes the required measurements and separate specimen strata. Raw downloads remain in
their source locations or temporary review storage and are outside the frontend bundle.
