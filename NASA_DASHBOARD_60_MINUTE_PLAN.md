# FlameAtlas | 60-minute NASA dashboard implementation plan

## What to ship

Give judges one path through the [Flame Lab](frontend/fire-lab.html). They change a cabin setting, see which NASA experiments are most relevant and where the comparison breaks down, then click **Explain NASA evidence** for a cited AI briefing. A **Fix It** panel turns the findings into three design checks. A **How This Helps on Earth** card connects the selected topic to a documented application or a clearly labeled research analogy.

This is a one-hour sprint for one developer with the existing checkout and dependencies. A live AI demo also needs a working model provider credential, outbound access from FastAPI, and an app URL that reaches that backend. Verify those dependencies in the first five minutes. [The official Flame in Freefall brief](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) asks for an interactive dashboard that uses SI to summarize, rank, and interpret microgravity combustion research. The brief describes the capability. The implementation below is the team's proposed way to deliver it.

| Challenge objective | What the judge can see |
| --- | --- |
| Summarize NASA findings | A short AI briefing identifies what an experiment observed, why it matters to the current cabin, and what remains unknown. |
| Rank NASA evidence | Up to three reviewed records update with the cabin controls. Each shows its compatibility, a condition difference or data gap, and a source locator. |
| Interpret results for exploration | The right panel offers one sourced design check each for prevention, detection, and suppression. Partial gravity or missing evidence makes the applicable limitations prominent. |
| Communicate impact on Earth | One compact card follows the selected playbook topic. The demo shows the documented Earth air quality application of a sensor developed to monitor lunar dust. |

## Build in this order

| Minutes | Deliverable | Implementation |
| --- | --- | --- |
| 0–5 | Confirm the demo path | Open [Flame Lab](frontend/fire-lab.html) and start Vite and FastAPI using the [README](README.md#run-it). Confirm the browser can reach the API through the [Vite proxy](frontend/vite.config.ts). Pick one provider the team can call and make a minimal request from the backend environment. Confirm the NASA resource to credit from the challenge's Resources tab if it loads. |
| 5–18 | Rank reviewed evidence in the lab | Import the [bundled catalog](frontend/src/data/evidence_catalog.json) and [existing TypeScript ranker](frontend/src/evidence/rankEvidence.ts) through [predictBridge.ts](frontend/src/flameatlas/predictBridge.ts). Reuse the normalized input snapshot from `runPrediction()`. Replace the legacy training-row list in the lab with the first three relevant records, preserving the ranker's group and order. Render one useful condition delta or missing field, one outcome with its status and units when available, and the NASA source link with its locator. |
| 18–30 | Put the playbook on the right and Earth card below | Reuse the lab's existing right column and responsive layout. Place three short cards below the controls and make the selected topic drive the bottom banner. Base the cards on the [reviewed research stories](frontend/src/data/researchStories.ts) and sources below. Use the existing trust status to highlight extrapolation and evidence coverage to highlight missing comparisons. Keep a visible design check when evidence is thin. |
| 30–46 | Add a live AI briefing | Add `POST /api/briefing` in [backend/main.py](backend/main.py) or a small router. Reuse the [Python evidence ranker](backend/evidence.py) and reviewed catalog, then call the provider on demand from the backend. Wire one **Explain NASA evidence** button next to the ranked results and a labeled deterministic fallback. At minute 46, stop provider debugging and preserve the working demo. |
| 46–54 | Check the integrated flow | Start the existing frontend build and backend checks. Exercise Moon surface, orbit, missing evidence, a successful live response, a provider failure, and a scenario change while a request is pending. Check the right panel at a narrow viewport. |
| 54–60 | Record and credit | Record the walkthrough below. Name the NASA dataset and report actually used, how they power ranking and the briefing, and the AI provider/model and its role. Use the team's working demo URL or record locally through Vite and FastAPI if hosting is unavailable. |

### Ranked evidence and confidence

- Keep the order **Compatible → Compatibility unknown → Incompatible**. Display compatible and unknown records when they have useful evidence. An incompatible result may appear as a separately labeled reference when it explains a gap. Show measured outcomes, values derived from measurements, and conditions with their original status and units. Use the catalog's stored source ID and locator for links.
- Ordinary lab sliders leave geometry, apparatus, flow direction, and target metric unspecified. Pass that context through as unknown. If none of the ranked records supports a comparable measured outcome, say **No comparable measured outcome for this setup** and show the closest context with its limitation. Avoid converting the ranker's distance into a probability. With the lunar inputs below, the current Python ranker places BASS-II run M20 first in **Compatibility unknown**. It reports spread over a PMMA slab in opposed flow in orbit, while the lab example uses a rod on the Moon. Use that distinction in the demo. [BASS-II Summary Report, Table 5.1, PDF p. 65](https://ntrs.nasa.gov/citations/20210011385)
- Keep the model's spread and trust indicator visible. Present them as model estimates, with evidence coverage beside them. Replace the legacy explanation in this view if it describes a seed match as real NASA data or presents a model margin as an engineering recommendation. In Compare mode, label the briefing and panel with the first pane's scenario.

### Fix It and How This Helps on Earth

Each card gets one **what NASA observed**, one **what to test next**, and one **scope limit**. Keep those statements curated so they are available offline and verifiable against the linked reports.

| Card | Copy and source to implement |
| --- | --- |
| **Prevention · Screen a material substitute** | Saffire-II sample 2-7 reported that the flame from its PMMA igniter did not ignite the Nomex fabric used in the test. Put that fabric on a shortlist for screening, then test the actual material and thickness at the selected oxygen fraction, pressure, and airflow. The result applies to that specimen and setup. [NASA Saffire results, slide 25](https://ntrs.nasa.gov/citations/20170008805) |
| **Detection · Test smoke and nuisance dust** | SAME measured smoke particles from heated materials aboard the ISS. For a Moon surface scenario, surface the need to test whether the candidate detector can distinguish smoke from lunar dust simulant under representative ventilation. Detector thresholds require results for the chosen device and aerosols. [SAME results, PDF pp. 7–12](https://ntrs.nasa.gov/api/citations/20140006579/downloads/20140006579.pdf), [NASA early fire detection study, abstract](https://ntrs.nasa.gov/citations/20260005612) |
| **Suppression · Compare hardware at the right scale** | FLEX measured visible extinction of a heptane droplet in a reported gas mixture. Show it as evidence about droplet extinction, and link NASA's ISS fine water mist extinguisher as a separate hardware example for evaluation. Cabin scale and fuel type matter when evaluating suppression options. [FLEX-018, Appendix A and Figure 22](https://ntrs.nasa.gov/citations/20150023456), [ISS fine water mist development](https://ntrs.nasa.gov/citations/20110012300) |
| **Earth card · Follow the selected topic** | For Detection, feature NASA's documented transfer of a lunar dust monitoring sensor to terrestrial air quality monitoring. For Suppression or Prevention, use a one-line **Related Earth research** analogy only if its source supports the connection. The minimum demo needs the Detection example. [NASA Spinoff on lunar dust and air pollution](https://spinoff.nasa.gov/moon-dust-sensor-pollution) |

Show **More testing needed** when the model extrapolates or no comparable measurement exists. At higher illustrative fire spread, give the prevention card visual priority and label the spread as modeled. Use the lunar design context to show the dust concern, with no claim that lunar dust caused a particular Artemis alarm. Keep agent discharge, fan operation, and numeric alarm settings outside this prototype. Replace the lab's current uncited playbook and seed-derived Earth text in the visible flow. If [the Safety page](frontend/safety.html) is linked in the demo, point it to the new panel or remove its rendering of legacy recommendations.

### Briefing contract

1. **Request.** Send the current normalized cabin scenario on click, with optional evidence context only where the UI supplies it. Keep the provider key in the FastAPI environment. Configure one provider and model. The existing NASA data and report links need no new NASA API key. [Repository PSI access notes](NASA_PSI_ENDPOINT_STATUS.md)
2. **Evidence.** Have FastAPI rerank the canonical reviewed catalog. Give the model a compact packet of the same top records displayed in the lab, including IDs, observations and units, condition differences, and limitations. Use the same selection rule in both paths and check the displayed and cited IDs for the demo scenario. A reported observation from a partial match can support a briefing about the original experiment and the gap. When the packet contains only conditions or missing outcomes, return the evidence-gap template.
3. **Response.** Request three short fields, **Observation**, **Relevance**, and **Limit**, each with a supplied record ID. Validate the response shape and each ID against the packet. Resolve citations on the server from the catalog and render output as text. Keep measurements in the structured evidence list and ask the model for qualitative synthesis. Keep the curated design checks and coverage status outside model control.
4. **Fallback.** Use a short provider timeout, around eight seconds, and label the result **Evidence summary** if the key, provider, or valid response is unavailable. The browser can build that summary from the local top record or evidence-gap message when FastAPI is offline. Label a successful response **AI briefing**. Show a loading state, prevent repeat clicks while one request is active, and clear or ignore any response for a scenario the user has since changed. If the deployed frontend is static, provide an existing route to FastAPI for the live demo before claiming live AI there.

## Release checks

- **Scenario changes.** Use Moon surface with 34% O₂, 8.2 psi, 10 cm/s and PMMA as an illustrative case. Change to free orbit and 21% O₂. The ranker uses the updated snapshot, the evidence state remains visible, and the old briefing clears. Toggle **Fuel droplet** to confirm the comparison explains why a droplet run may still differ in apparatus or gas mix.
- **Evidence traceability.** Open at least one report from a ranked card and the source for each playbook topic. Check that a missing outcome does not appear as measured, and that FLEX droplet burning rates in mm²/s are kept distinct from solid spread rates in mm/s.
- **Live and offline.** Generate one valid cited AI response, then repeat without the API. Ranking, the three design checks, and the documented Earth example still render. The offline response has the **Evidence summary** label. A provider failure is distinct from verified live AI. Verify that no key appears in client code, request bodies, or logs.
- **Existing checks.** From `frontend/`, run `npm run build` and `npm run check:evidence`. From the repository root, run `backend/.venv/bin/python -m unittest discover -s backend -p 'test_*.py'` after changing the backend. Check desktop and narrow widths manually.

## 30-second walkthrough

1. **0–6 sec.** Open the Moon surface example in Flame Lab and set the illustrative high oxygen cabin.
2. **6–15 sec.** Show a ranked NASA record and its condition mismatch. Click **Explain NASA evidence**, then point to the source and the visible limitation. Cut the wait from the recorded demo if needed.
3. **15–23 sec.** Select Detection in **Fix It** and show the proposed smoke-and-dust test.
4. **23–30 sec.** Show the documented lunar sensor transfer in **How This Helps on Earth**.

If time runs short, keep the ranked results, one live briefing, three short playbook cards, and the Detection Earth example. Leave extra spinoff variants, live PSI ingestion, chat, prediction retraining, and new hosting for a later pass. If provider access is still unavailable at minute 46, ship the labeled evidence summary and describe live AI as pending in the submission.
