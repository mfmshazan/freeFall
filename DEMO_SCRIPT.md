# Flame in Freefall — 2-Minute Judge Demo

**One-liner:** *"Most teams show you an accuracy number. We show you when the AI should not be
trusted — because astronauts' lives depend on knowing the difference."*

---

### 0:00 — The problem (talk over the ISS preset on screen)
> "On Earth, fire rises into a teardrop. In space there's no 'up' — flames become slow, ghostly
> spheres that behave unpredictably. NASA ran 24 combustion investigations on the ISS and buried
> **12 terabytes** of fire data in spreadsheets. Future Moon bases will run **elevated oxygen**,
> which makes everyday materials far more flammable. An engineer designing a cabin can't test a
> fire in orbit — they need to predict it, and know how much to trust that prediction."

**On screen:** ISS Standard preset — clean blue sphere, Trust **93 · HIGH CONFIDENCE**, margin 1.2×.
> "Here's a baseline ISS ignition. The flame is a perfect blue sphere — our sim refuses to fake
> Earth-style flicker. Trust is 93: this sits right on top of NASA's ACME burner data."

### 0:30 — The core twist (click **Artemis Lunar Base**)
**On screen:** flame stretches, uncertainty halo flares **red**, Trust crashes to **~18 · DO NOT
TRUST — UNVERIFIED**, margin jumps to 2.6×.
> "Now I switch to an Artemis lunar cabin — one-sixth gravity, 32% oxygen. Watch the trust meter
> **collapse** and the red uncertainty halo balloon. The model is telling me the truth: NASA has
> **zero** partial-gravity flame data above 30% oxygen. It has 0g results and ion-wind proxies from
> E-FIELD, but nothing that validates *this* regime. So it says *do not trust me — run a physical
> test or carry a 2.6× safety margin.* That honesty is the whole point."

### 1:05 — Show the evidence (scroll to Ranked PSI Evidence + split-screen)
> "Every prediction is backed by real experiments. Here are the Top-4 closest NASA investigations,
> ranked by physics similarity, with the exact parameter differences — '+11% O₂ vs BASS-II' — and
> one-click DOI links. The split-screen pins our live sim against the closest real run on a shared
> 20 mm scale bar. No black box."

### 1:30 — The invisible-flame hazard (click **High-O₂ Gas Leak (CFI-G)**)
**On screen:** flame nearly vanishes to faint violet, purple **"OPTICAL HAZARD — RADIOMETER
REQUIRED"** badge pulses; Detection card lights up.
> "This one's subtle but deadly. High-oxygen cool flames burn hot while emitting almost no visible
> light — your cameras and smoke alarms are blind. Notice trust is actually *high* here (CFI-G flew
> this at 0g) — but the Detection playbook still fires: *use radiometric sensing.* Trusted
> prediction, critical hazard. That's the nuance safety engineering needs."

### 1:45 — Controls + Earth spinoff
> "The Fix-It playbook turns physics into action — swap acrylic for Nomex, cut ventilation before
> flooding CO₂ (FLEX-2), reject lunar-dust false alarms (SAME/DAFT). And every insight maps back to
> Earth: cleanroom sensors, aircraft cargo suppression, firefighter gear."

### 1:55 — Close
> "Flame in Freefall answers four questions on one screen: *What will happen? How sure are we?
> Which NASA test proves it? How do we prevent it?* — and it's brave enough to say 'don't trust me
> yet.'"

---

## Demo checklist
- [ ] Backend running (`uvicorn main:app --port 8000`) — header badge shows **● GP backend**
- [ ] Frontend running (`npm run dev`)
- [ ] Preset click order: **ISS → Artemis Lunar → High-O₂ Gas Leak**
- [ ] Optional: drag the **Gravity** slider from 0 → 0.166 live to show the halo grow in real time
