# PSI Data Download Checklist

I can't download these (NASA PSI requires an authenticated login I don't have). **You** download
them logged in; **the ingester** does the rest. For each investigation you only need **two small
files** — skip the gigabytes of raw video.

## Per-investigation steps (2 min each)
1. Open `https://psi.nasa.gov/physci/repo/data/investigations/<PSI-ID>`
2. Left nav → **Experimental Table** → download the CSV. Save it into the matching folder below as
   **`experimental_table.csv`**.
3. Left nav → **Metadata** (or the `..._metadata_....zip`) → unzip, take **`i_Investigation.txt`**
   into the same folder.
4. (Optional) grab one clear flame JPEG → `frontend/public/reference/<folder>.jpg`.

Then once (after dropping any number of them):
```bash
cd backend && python ingest_psi.py && uvicorn main:app --port 8000   # restart to retrain GP
```

## The 16 required investigations → target folder

| ✓ | PSI ID | Investigation | Folder (`backend/data/raw/`) |
|---|---|---|---|
| ✅ | PSI-98 | SAFFIRE-I | `saffire-1/` **(done)** |
| ☐ | PSI-25 | BASS-II | `bass-ii/` |
| ☐ | PSI-26 | BASS | `bass/` |
| ☐ | PSI-62 | Concurrent Flame Spread (BASS tomography) | `bass-tomography/` |
| ☐ | PSI-99 | SAFFIRE-II | `saffire-2/` |
| ☐ | PSI-100 | SAFFIRE-III | `saffire-3/` |
| ☐ | PSI-159 | ACME CFI-G (cool flames) | `acme-cfi-g/` |
| ☐ | PSI-10 | ACME Flame Design (soot inception) | `acme-flame-design/` |
| ☐ | PSI-107 | SPICE (smoke point) | `spice/` |
| ☐ | PSI-60 | SPICE analysis (color-ratio pyrometry) | `spice-analysis/` |
| ☐ | PSI-69 | FLEX | `flex/` |
| ☐ | PSI-68 | FLEX-2 | `flex-2/` |
| ☐ | PSI-142 | Cool Flame Transitions | `cool-flame-transitions/` |
| ☐ | PSI-117 | Thermo-Convective Cool Flames | `cool-flame-convective/` |
| ☐ | PSI-102 | SAME | `same/` |
| ☐ | PSI-101 | SAME-R | `same-r/` |

### Optional extras (extra training rows)
`slice/` · `acme-bre/` · `acme-efield/` · `daft/`

## Priority order (if short on time)
Do these 6 first — they drive the most dashboard modules:
**PSI-25 (BASS-II)** → speed/teardrop · **PSI-159 (CFI-G)** → invisible flame ·
**PSI-69 (FLEX)** → suppression · **PSI-102 (SAME)** → detection ·
**PSI-99 (SAFFIRE-II)** → material screening · **PSI-10 (ACME Flame Design)** → soot color.

## Notes
- The ingester already maps the materials you'll hit (PMMA, cotton/SIBAL, Nomex, silicone, Kapton,
  heptane/droplet, methane/gaseous). If it sees an unknown material it defaults to a solid and logs
  nothing fatal — tell me and I'll add the mapping.
- Real conditions (O₂, airflow, material) come straight from the CSV. Flame metrics missing from the
  table are tagged `physics_estimate` until extracted from imagery/publications.
- If a CSV has different column headers than Saffire's, just paste me one header row and I'll adapt
  the parser — formats vary slightly between investigations.
