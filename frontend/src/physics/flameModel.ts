// TypeScript port of skills/01-flame-physics-rules.md.
// Used to (a) drive the canvas and (b) provide an offline fallback when the
// FastAPI backend is unavailable. Keep in sync with backend/surrogate.py.

import type { CabinInputs, Prediction, VisualRegime, FuelMaterial, Diluent } from '../types'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface FuelConst {
  phase: 'solid' | 'liquid' | 'gas'
  k_spread: number
  soot_base: number
  L0_mm: number
  melts: boolean
  MOC: number
}

export const FUELS: Record<FuelMaterial, FuelConst> = {
  PMMA_Acrylic: { phase: 'solid', k_spread: 1.1, soot_base: 0.72, L0_mm: 14, melts: true, MOC: 14 },
  Cotton_Fabric: { phase: 'solid', k_spread: 1.6, soot_base: 0.45, L0_mm: 12, melts: false, MOC: 15 },
  Kapton_Wire: { phase: 'solid', k_spread: 0.55, soot_base: 0.55, L0_mm: 8, melts: false, MOC: 19 },
  Heptane_Droplet: { phase: 'liquid', k_spread: 0.9, soot_base: 0.8, L0_mm: 10, melts: false, MOC: 12 },
  Methane_Gas: { phase: 'gas', k_spread: 1.0, soot_base: 0.08, L0_mm: 16, melts: false, MOC: 10 },
}

const DILUENT: Record<Diluent, { rate: number; soot_mult: number }> = {
  N2: { rate: 1.0, soot_mult: 1.0 },
  CO2: { rate: 0.72, soot_mult: 0.85 },
  He: { rate: 1.15, soot_mult: 0.8 },
}

export interface Drivers {
  X: number
  Pr: number
  OPI: number
  g: number
  U: number
}

export function drivers(i: CabinInputs): Drivers {
  const X = i.o2_percent / 100
  const Pr = i.pressure_psi / 14.7
  const OPI = (X * Pr) / 0.21
  return { X, Pr, OPI, g: i.gravity_g, U: i.airflow_cm_s }
}

export function predictLocal(i: CabinInputs): Prediction {
  const f = FUELS[i.fuel_material]
  const d = DILUENT[i.diluent]
  const { X, Pr, OPI, g, U } = drivers(i)

  // --- extinction / flammability (§6) ---
  const g_deficit = Math.max(0, 1 - g)
  const MOC_eff = f.MOC + 2.5 * g_deficit + 0.2 * Math.max(0, U - 18)
  const is_flammable = i.o2_percent >= MOC_eff && OPI >= 0.45

  // --- spread / burn rate (§2) ---
  const Vbase = f.k_spread * Math.pow(OPI, 1.3)
  const f_grav = 0.55 + 0.45 * g
  const f_flow = 1.0 + 0.6 * Math.exp(-Math.pow(U - 12, 2) / (2 * 49))
  let spread = Vbase * f_grav * f_flow * d.rate
  if (U > 25) spread *= Math.max(0, 1 - (U - 25) / 8) // blow-off
  let spread_rate_mm_s = clamp(spread, 0, 12)

  // --- geometry (§3) ---
  let aspect_ratio_LD = clamp(1.0 + 1.8 * g + 0.09 * U, 1.0, 4.5)
  if (g === 0 && U === 0) aspect_ratio_LD = 1.0 // HARD RULE: perfect sphere
  const L_ref = f.L0_mm * Math.pow(OPI, 0.5)
  let flame_length_mm = L_ref * Math.sqrt(aspect_ratio_LD)
  let flame_width_mm = L_ref / Math.sqrt(aspect_ratio_LD)
  const standoff_distance_mm = clamp(2.5 * (1 / OPI) * (1 + 0.4 * g_deficit), 0.3, 6.0)

  // --- soot & flux (§5) ---
  const soot_fraction = clamp(
    f.soot_base *
      d.soot_mult *
      Math.pow(X, 0.8) *
      Math.pow(Pr, 0.5) *
      (1 - 0.015 * Math.max(0, i.o2_percent - 60)),
    0,
    1,
  )
  const radiometric_flux_kw_m2 = clamp(3.0 * OPI * (0.4 + 0.6 * soot_fraction) + 1.5 * g_deficit, 0, 25)

  // --- regime (§5.3 + §6) ---
  let visual_regime: VisualRegime
  if (!is_flammable || spread_rate_mm_s < 0.05) {
    visual_regime = 'QUENCHED_EXTINGUISHED'
    spread_rate_mm_s = Math.min(spread_rate_mm_s, 0.04)
    flame_length_mm *= 0.5
    flame_width_mm *= 0.5
  } else if (i.o2_percent >= 60 && i.pressure_psi <= 7.0 && soot_fraction < 0.15) {
    visual_regime = 'INVISIBLE_COOL_FLAME'
  } else if (i.fuel_material === 'PMMA_Acrylic' && i.o2_percent >= 25) {
    visual_regime = 'BUBBLING_PMMA_STREAKS'
  } else if (soot_fraction >= 0.45) {
    visual_regime = 'SOOTY_YELLOW_CORE'
  } else if (aspect_ratio_LD > 1.25) {
    visual_regime = 'STRETCHED_LAMINAR_TEARDROP'
  } else {
    visual_regime = 'SOOT_FREE_BLUE_SPHERE'
  }

  return {
    spread_rate_mm_s,
    flame_length_mm,
    flame_width_mm,
    standoff_distance_mm,
    aspect_ratio_LD,
    soot_fraction,
    radiometric_flux_kw_m2,
    visual_regime,
  }
}
