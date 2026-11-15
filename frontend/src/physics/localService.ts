import psi from '../data/psi_master.json'
import { predictLocal } from './flameModel'
import { resolvePlanetGravity } from './planets'
import type {
  CabinInputs,
  PredictResponse,
  RankedInvestigation,
  TrustStatus,
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

export const MODEL_NAME = 'Deterministic physics baseline'

export function predictLocalService(inputs: CabinInputs): PredictResponse {
  const planet = resolvePlanetGravity(inputs)
  const i = { ...inputs, gravity_g: planet?.effective_gravity_g ?? inputs.gravity_g }
  const prediction = predictLocal(i)

  // Keep example input matches separate from reviewed experimental evidence.
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

  const nonStandardGravity = (i.gravity_g > 0.02 && i.gravity_g < 0.95) || i.gravity_g > 1.05
  const highO2 = i.o2_percent >= 30
  const extrapPenalty = (nonStandardGravity ? 0.6 : 0) + (highO2 ? 0.2 : 0)

  const sigmaBase = 0.08 + 0.9 * nearest + extrapPenalty
  const std_length_mm = prediction.flame_length_mm * Math.min(0.8, sigmaBase)
  const std_width_mm = prediction.flame_width_mm * Math.min(0.8, sigmaBase)
  const std_spread_rate = prediction.spread_rate_mm_s * Math.min(0.9, sigmaBase)

  let trust_score = Math.round(100 * Math.exp(-1.4 * (nearest + extrapPenalty)))
  trust_score = Math.max(2, Math.min(99, trust_score))

  let trust_status: TrustStatus
  if (nonStandardGravity && highO2) trust_status = 'UNVERIFIED_REGIME_DO_NOT_TRUST'
  else if (trust_score < 55 || nonStandardGravity) trust_status = 'CAUTION_EXTRAPOLATING'
  else trust_status = 'EXPLORATORY'

  return {
    model: MODEL_NAME,
    prediction,
    uncertainty: {
      std_spread_rate,
      std_length_mm,
      std_width_mm,
      trust_score,
      trust_status,
      safety_margin_multiplier: null,
      plain_english_explanation: 'Exploratory prediction. The ± values show heuristic model spread based on scenario distance to example inputs. Coverage has not been calibrated.',
    },
    ranked_investigations: ranked,
    engineering_playbook: [],
    earth_spinoff: ranked[0].earth_spinoff_application,
    planet_telemetry: planet,
    source: 'local-fallback',
  }
}
