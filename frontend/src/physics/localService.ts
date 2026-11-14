// Offline fallback that mirrors the backend /api/predict contract.
// Uses the physics port (flameModel) + a physics-distance ranker + a
// distance-to-nearest-data uncertainty heuristic. When the FastAPI backend is
// online the hook prefers it; this keeps the demo fully working if it isn't.

import psi from '../data/psi_master.json'
import { predictLocal, drivers } from './flameModel'
import type {
  CabinInputs,
  PredictResponse,
  RankedInvestigation,
  TrustStatus,
  PlaybookAction,
} from '../types'

interface Record {
  experiment_id: string
  investigation_name: string
  hardware_rack: string
  summary: string
  doi_url: string
  gravity_g: number
  o2_percent: number
  pressure_psi: number
  airflow_cm_s: number
  diluent: string
  fuel_material: string
  earth_spinoff_application: string
  safety_control_insight: string
  provenance?: 'real_psi' | 'seed'
  output_source?: string
  material_real?: string
  flow_direction?: string
  reference_image?: string | null
  publication_dois?: string[]
}

const RECORDS = (psi as any).records as Record[]

// normalization ranges for feature distance
const RANGES = {
  gravity_g: 1.0,
  o2_percent: 70,
  pressure_psi: 10.4,
  airflow_cm_s: 30,
}

function featureDistance(i: CabinInputs, r: Record): number {
  const dg = (i.gravity_g - r.gravity_g) / RANGES.gravity_g
  const do2 = (i.o2_percent - r.o2_percent) / RANGES.o2_percent
  const dp = (i.pressure_psi - r.pressure_psi) / RANGES.pressure_psi
  const df = (i.airflow_cm_s - r.airflow_cm_s) / RANGES.airflow_cm_s
  const fuelPenalty = i.fuel_material === r.fuel_material ? 0 : 0.5
  const dilPenalty = i.diluent === r.diluent ? 0 : 0.25
  // gravity weighted heavily — it's the dimension PSI data barely covers
  return Math.sqrt(
    4 * dg * dg + do2 * do2 + dp * dp + df * df + fuelPenalty * fuelPenalty + dilPenalty * dilPenalty,
  )
}

function diffs(i: CabinInputs, r: Record): string[] {
  const out: string[] = []
  const sign = (v: number) => (v >= 0 ? '+' : '')
  if (Math.abs(i.o2_percent - r.o2_percent) >= 1)
    out.push(`${sign(i.o2_percent - r.o2_percent)}${(i.o2_percent - r.o2_percent).toFixed(0)}% O₂`)
  if (Math.abs(i.gravity_g - r.gravity_g) >= 0.01)
    out.push(`${sign(i.gravity_g - r.gravity_g)}${(i.gravity_g - r.gravity_g).toFixed(2)} g`)
  if (Math.abs(i.pressure_psi - r.pressure_psi) >= 0.2)
    out.push(`${sign(i.pressure_psi - r.pressure_psi)}${(i.pressure_psi - r.pressure_psi).toFixed(1)} psi`)
  if (Math.abs(i.airflow_cm_s - r.airflow_cm_s) >= 1)
    out.push(`${sign(i.airflow_cm_s - r.airflow_cm_s)}${(i.airflow_cm_s - r.airflow_cm_s).toFixed(0)} cm/s`)
  if (i.fuel_material !== r.fuel_material) out.push(`fuel≠ (${r.fuel_material.replace(/_/g, ' ')})`)
  if (i.diluent !== r.diluent) out.push(`diluent ${r.diluent}`)
  return out
}

export function predictLocalService(i: CabinInputs): PredictResponse {
  const prediction = predictLocal(i)

  // rank PSI investigations by physics distance
  const scored = RECORDS.map((r) => ({ r, d: featureDistance(i, r) })).sort((a, b) => a.d - b.d)
  const nearest = scored[0].d
  const ranked: RankedInvestigation[] = scored.slice(0, 4).map(({ r, d }) => ({
    experiment_id: r.experiment_id,
    investigation_name: r.investigation_name,
    hardware_rack: r.hardware_rack,
    similarity: Math.round(100 * Math.exp(-d)),
    parameter_diffs: diffs(i, r),
    summary: r.summary,
    doi_url: r.doi_url,
    earth_spinoff_application: r.earth_spinoff_application,
    provenance: r.provenance ?? 'seed',
    output_source: r.output_source,
    material_real: r.material_real,
    flow_direction: r.flow_direction,
    reference_image: r.reference_image ?? null,
    publication_dois: r.publication_dois,
  }))

  // --- uncertainty: grows with distance to nearest real datapoint ---
  const { OPI } = drivers(i)
  // epistemic penalty for unverified regimes PSI never covered (partial g + high O2)
  const partialGravity = i.gravity_g > 0.02 && i.gravity_g < 0.95
  const highO2 = i.o2_percent >= 30
  const unverified = partialGravity // NO microgravity-vs-partial data exists
  const extrapPenalty = (partialGravity ? 0.6 : 0) + (highO2 ? 0.2 : 0)

  const sigmaBase = 0.08 + 0.9 * nearest + extrapPenalty
  const std_length_mm = prediction.flame_length_mm * Math.min(0.8, sigmaBase)
  const std_width_mm = prediction.flame_width_mm * Math.min(0.8, sigmaBase)
  const std_spread_rate = prediction.spread_rate_mm_s * Math.min(0.9, sigmaBase)

  let trust_score = Math.round(100 * Math.exp(-1.4 * (nearest + extrapPenalty)))
  trust_score = Math.max(2, Math.min(99, trust_score))

  let trust_status: TrustStatus
  if (unverified && highO2) trust_status = 'UNVERIFIED_REGIME_DO_NOT_TRUST'
  else if (trust_score < 55 || partialGravity) trust_status = 'CAUTION_EXTRAPOLATING'
  else trust_status = 'HIGH_CONFIDENCE'

  const safety_margin_multiplier =
    trust_status === 'HIGH_CONFIDENCE' ? 1.2 : trust_status === 'CAUTION_EXTRAPOLATING' ? 1.8 : 2.6

  const plain_english_explanation = buildExplanation(
    trust_status,
    ranked[0],
    partialGravity,
    highO2,
    nearest,
  )

  const engineering_playbook = buildPlaybook(i, prediction)

  return {
    prediction,
    uncertainty: {
      std_spread_rate,
      std_length_mm,
      std_width_mm,
      trust_score,
      trust_status,
      safety_margin_multiplier,
      plain_english_explanation,
    },
    ranked_investigations: ranked,
    engineering_playbook,
    earth_spinoff: ranked[0].earth_spinoff_application,
    source: 'local-fallback',
  }
}

function buildExplanation(
  status: TrustStatus,
  top: RankedInvestigation,
  partialG: boolean,
  highO2: boolean,
  nearest: number,
): string {
  if (status === 'UNVERIFIED_REGIME_DO_NOT_TRUST') {
    return `No spaceflight data exists for partial gravity above 30% O₂. PSI has 0g results (closest: ${top.experiment_id}, ${top.similarity}% match) and ion-wind partial-gravity proxies from E-FIELD, but nothing validates this exact regime. The model is extrapolating — require a physical test or apply a heavy margin.`
  }
  if (status === 'CAUTION_EXTRAPOLATING') {
    const reason = partialG
      ? 'you are in partial gravity, which PSI never directly tested (only 0g and 1g exist)'
      : highO2
        ? 'elevated oxygen pushes beyond the densest part of the dataset'
        : `the nearest PSI run is only a ${top.similarity}% match`
    return `Moderate confidence: ${reason}. Closest evidence is ${top.experiment_id} (${top.similarity}% match). Treat the prediction as a bounded estimate, not ground truth.`
  }
  return `High confidence: your cabin settings sit close to real NASA data (${top.experiment_id}, ${top.similarity}% match, distance ${nearest.toFixed(2)}). The prediction is interpolated within tested conditions.`
}

function buildPlaybook(i: CabinInputs, p: ReturnType<typeof predictLocal>): PlaybookAction[] {
  const dangerous = p.spread_rate_mm_s > 1.5 || p.visual_regime === 'BUBBLING_PMMA_STREAKS'
  const invisible = p.visual_regime === 'INVISIBLE_COOL_FLAME'
  return [
    {
      category: 'PREVENTION',
      headline:
        i.fuel_material === 'PMMA_Acrylic' || i.o2_percent >= 30
          ? 'Swap to a flame-resistant material'
          : 'Material within tested envelope',
      detail:
        i.o2_percent >= 30
          ? `At ${i.o2_percent}% O₂, screen cabin polymers — Saffire-II ranked materials at 34% O₂. Prefer Nomex/PTFE over acrylic and cotton.`
          : `Current material/atmosphere is near NASA-tested limits. Keep ventilation below the concurrent-flow spread peak (~12 cm/s).`,
      triggered: dangerous,
    },
    {
      category: 'DETECTION',
      headline: invisible
        ? 'Optical detectors will MISS this flame'
        : 'Tune smoke detector for microgravity particles',
      detail: invisible
        ? 'CFI-G showed high-O₂/low-pressure flames emit little visible light. Require radiometric or UV/OH* sensing; standard photoelectric alarms are blind here.'
        : 'SAME/SAME-R: microgravity smoke coagulates into larger particles; DAFT-2 shows lunar dust can mimic smoke. Use multi-wavelength scattering to reject dust false-alarms.',
      triggered: invisible || i.gravity_g < 0.95,
    },
    {
      category: 'SUPPRESSION',
      headline:
        i.airflow_cm_s > 0 ? 'Cut ventilation before discharging agent' : 'Select the right inert agent',
      detail:
        'FLEX-2: CO₂ extinguishes at higher residual O₂ than N₂ (strong per-mole inerting); He requires more O₂ to quench. BASS-II: in microgravity, airflow can feed a dying flame — shut HVAC first, then flood with CO₂.',
      triggered: p.visual_regime !== 'QUENCHED_EXTINGUISHED',
    },
  ]
}
