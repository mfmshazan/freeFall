# FlameAtlas | Recording and submission credits

## 30-second recording

Record locally. In `frontend/`, run `npm run dev`. In `backend/`, run `.venv/bin/uvicorn app:app --port 8000`. For a live AI briefing, export `GEMINI_API_KEY` in the backend shell before starting it. Then open `/fire-lab.html` through Vite.

| Time | Shot |
| --- | --- |
| 0–6 s | Open Flame Lab, choose the Moon surface and set the cabin to 34% O₂, 8.2 psi, 10 cm/s and an acrylic (PMMA) rod. |
| 6–15 s | Point to the first ranked record, **BASS-II M20 · PMMA slab** (*Compatibility unknown*), and its condition mismatch: a slab in opposed flow in orbit, compared with a rod on the Moon. Click **Explain NASA evidence**. Show the source locator (Table 5.1, test M20) and the **Limit** line. Cut the wait from the recording. |
| 15–23 s | In **Fix It**, select **Detection · Test smoke and nuisance dust**. |
| 23–30 s | Scroll to **How This Helps on Earth** and show NASA's documented transfer of a lunar dust sensor to air pollution monitoring. |

Before recording, check the briefing label:

- **AI briefing** means the provider returned a valid cited response.
- **Evidence summary** is the deterministic fallback.

Credit only the mode that appears in the recording.

## Submission credit text

> **NASA data.** FlameAtlas ranks a reviewed catalog of 25 records drawn from NASA Physical Sciences Informatics (PSI) experimental tables (PSI-25 BASS-II, PSI-69, PSI-98 Saffire-I and PSI-159 ACME/CFI-G) and NASA Technical Reports Server reports, among them the BASS-II Summary Report (NTRS 20210011385), the Saffire flammability results (20170008805), the FLEX detailed results (20150023456) and the LUCI lunar-gravity flammability results (20250010653). The same ranker, implemented in Python and TypeScript, orders records by compatibility with the cabin settings: compatible, unknown, then incompatible. The dashboard shows the top three with their condition differences, units and source locators. The briefing receives those same records.
>
> **Design checks and Earth impact.** The Fix It cards are curated, cited and outside model control. They draw on Saffire (prevention), SAME smoke-particle results (NTRS 20140006579) and the NASA early fire detection study (20260005612) for detection, and FLEX with ISS fine water mist development (20110012300) for suppression. The Earth card cites NASA Spinoff, *Moon dust sensor for air pollution*.
>
> **AI.** The backend calls Google's Gemini API (`generateContent`) with model `gemini-3.8-flash` (overridable with `BRIEFING_MODEL`). The model's only job is to write three single-sentence qualitative fields: Observation, Relevance and Limit. Each field must cite a record ID from the evidence packet. The server validates every ID and resolves the citations from the catalog. Measurements, rankings and design checks never pass through the model. If the provider fails or exceeds its 20-second timeout, or the evidence includes no measured outcome, the app shows a deterministic **Evidence summary** instead. *[If no live response was recorded, replace this paragraph with: "Live AI briefing is implemented but pending provider access; the demo shows the deterministic Evidence summary."]*
>
> **Limits.** Flame spread, shape and trust values are physics-model estimates, not NASA measurements. The prediction training set has 26 rows: 2 sourced from PSI and 24 seed rows.

## Before submitting

- Check that the challenge **Resources** tab lists the PSI and NTRS resources named above. Remove any that it does not list and that the demo does not use.
- Spinoff variants, live PSI ingestion, chat and retraining are out of scope. Leave them out of the submission.
