# Phase 5 implementation plan — submission and handoff

Ship a public demo that a judge can open without signing in, follow from a scenario to a NASA source, and use to distinguish recorded observations from exploratory predictions. The [Phase 4 audit](PHASE_4_VALIDATION_REPORT.md) found zero eligible independent runs for its Saffire target. Carry that result and the deterministic baseline into the release.

NASA lists the submission deadline as **Sunday, November 15, 2026 at 11:59 p.m. local time**. Check the team’s Project tab and local event instructions for the applicable deadline, required fields, and demo format before recording. The [current two-minute script](DEMO_SCRIPT.md) is the live walkthrough. Prepare a shorter recording or slides if the submission rules call for them. [NASA Space Apps 2026 timeline](https://www.spaceappschallenge.org/2026/)

## 1. Build the judge-facing release

- [ ] Review the current Phase 4 working changes, including the untracked report, validation summary, planetary data, and Evidence entry point. Include the intended Phase 4 files in the release revision. Build and smoke-test that exact revision.
- [ ] Use a **static build at the site root** as the default submission. Vite already builds six HTML entry points, and replay URLs such as `/replay/saffire-1/` resolve from the origin root. Use the existing public host if it supports this layout. If a subpath is required, fix and verify all page, asset, and replay URLs on that subpath before publishing. [Vite configuration](frontend/vite.config.ts) · [Saffire replay](frontend/src/replay/SaffireReplay.tsx) · [BASS-II replay](frontend/src/replay/Bass2Experiment.tsx)
- [ ] Make static mode explicit in Flame Lab and Evidence. Reuse the existing browser prediction and evidence ranking, and bypass `/api` requests in the static build. The current [prediction bridge](frontend/src/flameatlas/predictBridge.ts) and [evidence hook](frontend/src/hooks/useEvidence.ts) attempt same-origin requests before settling on local results. Use a shared build setting and label the release as **local model** or **runs in your browser**. Verify that distinction on the published site. The Simulator loads Three.js from a CDN, and original reports open online. Describe the static release as usable without a backend. [Simulator](frontend/simulator.html)
- [ ] If a public API is part of the release, verify same-origin routing from the published frontend. Confirm `GET /api/health`, `POST /api/predict`, and `POST /api/evidence` return valid JSON and the expected model or catalog version. Check the API badge on a real prediction, then simulate a failed request and check the browser fallback and visible source status. Treat an HTML response from the static host as a routing failure. [FastAPI entry point](backend/main.py)
- [ ] Publish `frontend/dist` with all six pages and the processed replay media. Inventory the release output and confirm raw NASA archives, staging data, and originals are absent. On the host, load the built asset URLs and test the BASS-II videos at multiple seek positions. [Data inventory](DATA_INVENTORY.md)

## 2. Rehearse the judge walkthrough

| Stop | What to show | Acceptance check |
| --- | --- | --- |
| **Earth orbit at 400 km** | Open `fire-lab.html?world=earth`, select **Acrylic rod**, and leave airflow at zero. | The field is about 0.885 g and the effective cabin input is 0 g. Show circular geometry, L/D = 1, zero buoyant flicker, separate oxygen fraction and partial pressure, and the exploratory model status and heuristic spread. |
| **Saffire-I flow comparison** | From the Evidence ventilation story, open the Saffire-I replay and report card. | Scrub synchronized imagery and telemetry. Show 1.8 mm/s concurrent and 1.3 mm/s opposed at nominal 20 cm/s, with the reused-sheet caveat. Label these as video-derived report averages. Open the original PDF at the result or Table I. |
| **LUCI lunar example** | Choose **Supported habitats**, then **Open LUCI evidence** on the Evidence page. | Show the separate flame-base and flame-tip fits. Explain that the rocket’s rotation produced lunar-like effective acceleration and that the comparisons have differing oxygen histories. Open the report at the relevant fit. |
| **Mars scenario** | Open `fire-lab.html?world=mars`, select **Surface** and **Fabric sheet**, and follow the comparison link. | The selected conditions reach Evidence. The Mars scenario stays exploratory and the demo shows why the available cases cannot support a Mars-specific claim. Close with **Validation status** and the Phase 4 report. |

Use [Saffire-I PDF pp. 20–21 and Table I on p. 29](https://ntrs.nasa.gov/api/citations/20170008805/downloads/20170008805.pdf#page=29), [LUCI PDF pp. 19 and 33](https://ntrs.nasa.gov/citations/20250010653), and the [inventory](DATA_INVENTORY.md) to rehearse the sources and limitations. The Phase 4 download should open and its supporting links should be reachable. Check the report page and measurement units from the exact links the judge will use.

BASS-II is a release check and an optional walkthrough extension. Verify playback and seeking for B1/147 and B3/148, the run deep links, before/after labels, and the comparison limitations. Verify that the Saffire-I chart continues through the documented end of the sensor record when the partial imagery ends. [BASS-II report, §2.3.5](https://ntrs.nasa.gov/citations/20210011385) · [Replay timing and scope](DATA_INVENTORY.md)

## 3. Verify and hand off

- [ ] Run the freeze, export, and regression checks below on the release revision. If a dependency or runtime check fails, record the failure and resolve it before marking the relevant gate passed.

  ```sh
  python3 backend/validate_model.py --check
  python3 backend/export_evidence.py --check
  backend/.venv/bin/python -m unittest discover -s backend -p 'test_*.py'
  ```

  From `frontend/`, after installing the locked dependencies:

  ```sh
  freefall_python="$(cd ../backend && pwd)/.venv/bin/python"
  EVIDENCE_PYTHON="$freefall_python" npm run check:evidence
  FREEFALL_PYTHON="$freefall_python" npm run check:appearance
  npm run build
  npm run preview
  ```

- [ ] On the built preview and the public URL, start with a fresh session. Complete the walkthrough on desktop and in a phone-width viewport. Check navigation and direct reloads, keyboard and touch access to controls, readable labels and charts, video and PDF links, and the visible state when WebGL is unavailable. On the static release, confirm prediction, evidence ranking, both replays, and the validation summary work without a backend. For each walkthrough stop, record the tested URL, browser, and any remaining issue.
- [ ] Review release-blocking copy and links in the active pages. The Flame Lab currently describes orbital free fall as gravity being canceled. Use the physical distinction between the local field and effective cabin acceleration. Confirm Research/Safety stories preserve apparatus scope, and that model numbers, palette, and scenario rankings make no operational safety claim. Read the repository physics and canvas specs before changing any of that behavior.
- [ ] Update [README](README.md) with the public link, release mode, and reproduction commands. Update [DEMO_SCRIPT.md](DEMO_SCRIPT.md) with the rehearsed sequence, exact entry points, and source locators. Update [ARCHITECTURE.md](ARCHITECTURE.md) to match the shipped routes and mode. Reconcile the [download checklist](DOWNLOAD_CHECKLIST.md) and README’s remaining-export language with the [inventory](DATA_INVENTORY.md), which already lists staged metadata for SAME and SPICE. Describe the Phase 4 gaps using the published audit.
- [ ] Prepare the project-page summary, public app URL, public demo link, repository URL, and NASA references in the fields requested by the portal. Open the app and demo links in a signed-out session. Hand off those links, the release revision, the check results, and any known limits to the team member submitting the project.

**If time is short**, first ship the static Phase 1 orbit and Saffire-I walkthrough with the completed Evidence and Validation pages. Keep LUCI and Mars in the longer walkthrough when there is time. Use the verified local production preview as the live-demo backup. Prioritize broken paths, misleading claims, and submission access over visual polish.

**Exit gate.** A signed-out judge can open the published URL, reproduce the walkthrough, reach the original sources, and identify which claims remain untested. A teammate can reproduce the release from its recorded revision and has the working links and references needed for the project page.
