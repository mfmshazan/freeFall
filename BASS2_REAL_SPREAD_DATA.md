# BASS-II — Real quantitative spread/extinction data (extracted)

Source: `data_raw/bass-2/BASS-II Summary Report.pdf` — **NASA/TM-20210011385** (Oct 2021),
text-extracted. Every value below is tagged by provenance so the flame lab can show real
measured numbers where they exist and a clearly-labelled estimate elsewhere.

**Provenance tags:** `MEASURED` = experimental result · `MODEL` = computation/simulation in the
report · `THEORY` = closed-form estimate. Figures (plots) can't be read precisely from the PDF;
only numbers stated in the text/tables are captured here.

---

## PMMA (acrylic) — thin film, opposed flow
| Quantity | Value | Provenance | Notes (TM section) |
|---|---|---|---|
| Spread rate, 100 µm film, **1 g** | **2.0 mm/s** (avg) | MEASURED | §2.3.7, Fig 2.19b |
| Spread rate, 100 µm film, **microgravity** | **~2.2 mm/s** (max) | MEASURED | §2.3.7 — ~flow-independent from 40→1 cm/s |
| Spread rate vs thickness @ 21% O₂ (1 g, downward) | **2.8 / 1.6 / 1.2 / 0.9 mm/s** for 100 / 200 / 300 / 400 µm | MODEL | §2.2 (computational, Fig 2.11); inverse-with-thickness (thermally thin) |
| High-flow limit | kinetic **blowoff** at very high flow | MEASURED | §2.3.7 |
| Low-flow limit | **radiative extinction at ~1 cm/s** opposed flow | MEASURED | §2.3.7 |

### Extinction velocity Vg,cr (critical opposed flow, 1 atm) — Table 2.1
| O₂ % | Experiment | Computation | Theory (Eq 2.5) |
|---|---|---|---|
| 21 | **10 ± 5 mm/s** | 15 | 7.5 |
| 16 | **30 ± 5 mm/s** | 35 | 10 |
Independent of fuel thickness. (Below Vg,cr the flame extinguishes radiatively.)

### Flammability limit
- **Opposed-flow spread was NOT observed below 16.4% O₂ at any flow** (MEASURED, §… "opposed-flow
  flame spread was not observed below 16.4 percent O2 at any flow").

---

## PMMA (acrylic) — thick rod / slab
| Quantity | Value | Provenance | Notes |
|---|---|---|---|
| Spread rate Vf,thick (2 cm wide) | **0.044 mm/s** (0.042 at 10 cm) | MEASURED | §2 (≈50× slower than thin film) |
| Rod tip regression rate | **0.0385 mm/s** | MEASURED | §… steady-state |
| Thick slab (1 cm, slow flow, appendix) | **0.037 mm/s** (15 mm flame) | MEASURED | Appendix D.7 |
| 1-cm PMMA sphere burning rate | ~0.005 mm/s (0.3 mm/min) | MEASURED | Appendix D.7 |
| Low-flow spread limit (6.35 & 9.525 mm rods) | no opposed-flow spread below **~4 mm/s** | MEASURED | §4 |

### Rod test envelope — Table 4.1 / 4.2
- Diameters tested: **6.35, 9.525, 12.7 mm** (clear & black PMMA).
- O₂ range by diameter: 16.8–18.9% (6.35 mm) · 17.5–20.9% (9.525 mm) · 17.6–20.7% (12.7 mm).
- Forced-flow range: **4.1–75 mm/s** (0.0041–0.075 m/s), i.e. well below the ~0.5 m/s buoyant
  velocity at 1 g — the point of the µg campaign.

---

## SIBAL fabric (75% cotton / 25% fiberglass) — concurrent flow
- **No measured spread-rate number is stated in this report** for SIBAL; only "flame spread rate is
  relatively **large**" (qualitative, §7.1). A numeric SIBAL/Saffire spread rate would need the
  Saffire journal paper (Urban et al., *Combust. Flame* 2018) or the Zhao/Liao concurrent-fabric paper.
- **Table 7.1** gives real *conditions* for flat SIBAL fabrics in concurrent flow (BASS/BASS-II):
  sample width ~2.2 cm; flow 2–29 cm/s (often ramped, e.g. "10→2.2"); O₂ 18.5–18.8%; outcomes noted
  as Quenched / No blowoff. (Pairs with our Saffire-I point: SIBAL, 20 cm/s, ~21.6% O₂.)

---

## How this maps to the flame-lab materials
| Flame-lab fuel | Real anchor data we now have |
|---|---|
| **Acrylic rod (PMMA)** | thick spread ~0.044 mm/s; regression 0.0385 mm/s; diameters/O₂/flow envelope (Table 4.2); low-flow limit ~4 mm/s |
| **Fabric sheet** | PMMA **thin-film** 2.0–2.2 mm/s + extinction Vg,cr + 16.4% O₂ limit (strong proxy); real SIBAL *conditions* (Table 7.1) + Saffire-I point |
| **Candle / droplet** | not in this report — CFM & FLEX numbers live in their own papers (already linked in `fire-lab.html`) |

## What's still needed for full quantitative coverage
1. **SIBAL/fabric measured spread rate (mm/s)** — from the Saffire / concurrent-fabric papers.
2. **FLEX droplet burning-rate constant K (mm²/s)** vs O₂/diluent — Dietrich et al.
3. **CFM candle** burn/standoff numbers — Dietrich/Ross candle papers.
These upgrade candle & droplet from qualitative to quantitative; PMMA (rod + film) is already
well-anchored by the table above.
