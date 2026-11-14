# NASA PSI endpoint status

Checked 2026-11-14 against NASA's current first-party pages.

## BASS-II / PSI-25

The old download note saying that PSI-25 is unavailable is stale. NASA's live PSI investigation route is:

- <https://psi.nasa.gov/physci/repo/data/investigations/PSI-25>

The indexed record identifies **PSI-25, Version 4**, **Burning and Suppression of Solids-II (BASS-II)**, DOI `10.60555/4qc4-de67`, and a 24-Nov-2025 metadata update. The record lists the BASS-II metadata ZIP (`PSI-25_metadata_PSI_metadata_PSI-101_BASS-II.zip`) and raw video files, so this route is the viable source for a new acquisition. The record may require the browser UI to expose the file tree; no stable public per-file API URL was verified here.

## Current NASA entry points

- **BPS Data hub:** <https://science.nasa.gov/biological-physical/data/> — NASA's consolidated entry point; its PSI Explore link currently targets the PSI search UI.
- **PSI data/tools page:** <https://science.nasa.gov/physical-sciences-informatics-psi/history-of-physical-science-informatics/> — NASA documents the repository search and describes PSI as an open-access archive of flight and ground physical-science data.
- **PSI search UI:** <https://psi.nasa.gov/physci/repo/search?data_source=psi&data_type=investigation&q=>
- **PSI submission portal:** <https://psi.nasa.gov/physci/submission-sso-login.html> (for contributors, not needed to download public data).

NASA announced that PSI and OSDR moved into the consolidated BPS Data ecosystem in September 2025. Use the BPS hub or the direct PSI route above rather than assuming a legacy route is authoritative. [NASA announcement](https://science.nasa.gov/science-research/biological-physical-sciences/osdr-and-psi-unveil-new-consolidated-website/)

## Acquisition constraints and replacements

For a small BASS-II artifact, open PSI-25, select the needed file(s), and download them through the file tree. NASA's current process sends requests larger than 1 GB by email as multi-part ZIPs; links expire after seven days. [NASA large-download process](https://science.nasa.gov/uncategorized/new-file-download-process-for-large-requestspsi-new-file-download-process/)

If PSI file transfer cannot be completed, use NASA's **BASS-II Summary Report** in NTRS as the citable replacement for experimental conditions/results while retaining the checked-in BASS-II replay assets for the visual demo: <https://ntrs.nasa.gov/citations/20210011385>. This is a documentation/report fallback, not a substitute for the raw PSI files. Do not label report-derived or replay-derived values as newly downloaded PSI measurements.

