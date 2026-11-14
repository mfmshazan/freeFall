# Data Inventory

Covers NASA replay data integrated into the app and evidence collected for later model evaluation.

## Data mining and reviewed evidence

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

`frontend/public/replay/saffire-1/report-results.json` is a curated transcription of the [NASA Saffire-I report, page 21](https://ntrs.nasa.gov/api/citations/20170008805/downloads/20170008805.pdf#page=21): video-derived average spread rates for runs 1-1 and 1-2, nominal duct flow, and the reused-specimen caveat. It is separate from the partial concurrent-run replay and is not cursor telemetry or model training data. The report describes 40.6 × 94 cm fabric and 21.7% starting oxygen (ISS reading); replay metadata describes 300 × 800 mm and a separate calibrated ignition reading of about 22.62% oxygen. These different bases are not reconciled or averaged.
