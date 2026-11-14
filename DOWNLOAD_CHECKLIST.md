# PSI Data Download Checklist

Run the collector from the repository root:

```bash
python3 backend/mine_nasa.py --fetch
```

Public reports download automatically. NASA has since moved PSI/OSDR into the consolidated BPS Data site; the current PSI-25 investigation route is [PSI-25](https://psi.nasa.gov/physci/repo/data/investigations/PSI-25). See [NASA PSI endpoint status](NASA_PSI_ENDPOINT_STATUS.md) for the current route, large-download behavior, and NTRS fallback. The collector's legacy-route result may still be `unavailable`; treat that as a collector compatibility issue, not evidence that PSI-25 is unpublished.

For investigations available in the current PSI portal, use the following export flow:

1. In NASA's browser portal, download the **Experimental Table** CSV and the **Metadata** ZIP.
   See the [NASA PSI guide](https://assets.science.nasa.gov/content/dam/science/bps/bps-general/bps-data_osdr_psi/Complete_PSI_Database_Guide.pdf).
2. Put both files in `data_raw/mining/inbox/<study>/` (create the subfolder), or use
   `python3 backend/mine_nasa.py --inbox ~/Downloads` if both filenames include `PSI-25`.
   Keep the original names if they include “experimental table” and “metadata” respectively
   (spaces, hyphens and underscores are accepted). You can also provide `experimental_table.csv`
   and `i_Investigation.txt` in a per-study subfolder. Leave metadata ZIPs compressed.
3. Rerun `python3 backend/mine_nasa.py`. The manifest at `data_raw/mining/manifest.json`
   lists missing files, study ID mismatches, conflicting downloads, and mapped rows.
   `catalogued` means mapped with matching ISA-Tab metadata; `mapped_incomplete` means the
   available table is mapped but an expected file is still missing. `needs_mapping` means
   both files are present but the table still needs study-specific review. File hashes
   identify the reviewed inputs; they do not certify how an export was obtained.

Keep measured outcomes distinct from nominal conditions, model estimates and missing values.
For a new study, check what each column actually measures and where its units are defined.
Record the table, page or run ID for each outcome in [the evidence file](backend/data/mined_evidence.json).
Pick one matched run for later validation once the measured quantity and model inputs agree.
Existing BASS-II replay videos are already in `frontend/public/replay/bass-2/`.

## PSI investigation queue

| ✓ | PSI ID | Investigation | Inbox subfolder |
|---|---|---|---|
| ✅ | PSI-98 | SAFFIRE-I | `saffire-1/` **(done)** |
| ✅ | PSI-25 | BASS-II | `bass-ii/` — CSV mapped; metadata from `download.zip` |
| ✅ | PSI-26 | BASS | `bass/` — 122 rows and matching metadata mapped |
| ✅ | PSI-62 | Concurrent Flame Spread (BASS tomography) | `bass-tomography/` — no associated Experimental Table; metadata catalogued |
| ✅ | PSI-99 | SAFFIRE-II | `saffire-2/` — 15-row table and matching metadata mapped |
| ✅ | PSI-100 | SAFFIRE-III | `saffire-3/` — 2 rows and matching metadata mapped |
| ✅ | PSI-159 | ACME CFI-G (cool flames) | `acme-cfi-g/` — normal and inverse CSVs mapped; matching metadata found separately in the inbox |
| ✅ | PSI-10 | ACME Flame Design (soot inception) | `acme-flame-design/` — normal and inverse tables plus metadata mapped |
| ✅ | PSI-107 | SPICE (smoke point) | `spice/` — 469 rows and matching metadata mapped |
| ✅ | PSI-60 | SPICE analysis (color-ratio pyrometry) | `spice-analysis/` — no associated Experimental Table; metadata catalogued |
| ✅ | PSI-69 | FLEX | `flex/` — CSV and matching ISA-Tab metadata mapped |
| ✅ | PSI-68 | FLEX-2 | `flex-2/` — 8 rows and matching metadata mapped |
| ✅ | PSI-142 | Cool Flame Transitions | `cool-flame-transitions/` — 8-row data index and matching metadata mapped |
| ✅ | PSI-117 | Thermo-Convective Cool Flames | `cool-flame-convective/` — no associated Experimental Table; metadata and analyzed data catalogued |
| ✅ | PSI-102 | SAME | `same/` — 8 rows and matching metadata mapped |
| ✅ | PSI-101 | SAME-R | `same-r/` — 109 rows and matching metadata mapped |

## Browser download procedure

Use the linked PSI page for each remaining investigation. In **Data files and documents**:

1. Open **Experimental table** and download every CSV/table file in that folder.
2. Open **Investigation Metadata Files** and download every `.zip` file in that folder.
3. Leave the downloaded files in the browser's default Downloads folder; do not rename, open-and-save, or execute them.

PSI-60, PSI-62, and PSI-117 have no associated Experimental Table on their NASA pages. Download their metadata ZIPs; PSI-117 also has optional **Analyzed Data** and **Reports** folders. PSI-102 and PSI-107 already have their experimental tables staged, so download only their metadata ZIPs. The other remaining investigations need both folders. The collector will sort, extract, hash, and validate the files after download.

## Collection status

All listed PSI downloads are now staged and validated. Remaining work is scientific review and
deciding which evidence-only rows, if any, should inform a future model update.
