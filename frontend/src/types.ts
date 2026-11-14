// Shared API contract between frontend and the FastAPI /api/predict backend.

export type Diluent = 'N2' | 'CO2' | 'He'

export type FuelMaterial =
  | 'PMMA_Acrylic'
  | 'Cotton_Fabric'
  | 'Kapton_Wire'
  | 'Heptane_Droplet'
  | 'Methane_Gas'

export type VisualRegime =
  | 'SOOT_FREE_BLUE_SPHERE'
  | 'STRETCHED_LAMINAR_TEARDROP'
  | 'SOOTY_YELLOW_CORE'
  | 'BUBBLING_PMMA_STREAKS'
  | 'INVISIBLE_COOL_FLAME'
  | 'QUENCHED_EXTINGUISHED'

export type TrustStatus =
  | 'HIGH_CONFIDENCE'
  | 'CAUTION_EXTRAPOLATING'
  | 'UNVERIFIED_REGIME_DO_NOT_TRUST'

export interface CabinInputs {
  gravity_g: number
  o2_percent: number
  pressure_psi: number
  airflow_cm_s: number
  diluent: Diluent
  fuel_material: FuelMaterial
}

export interface Prediction {
  spread_rate_mm_s: number
  flame_length_mm: number
  flame_width_mm: number
  standoff_distance_mm: number
  aspect_ratio_LD: number
  soot_fraction: number
  radiometric_flux_kw_m2: number
  visual_regime: VisualRegime
}

export interface Uncertainty {
  std_spread_rate: number
  std_length_mm: number
  std_width_mm: number
  trust_score: number // 0..100
  trust_status: TrustStatus
  safety_margin_multiplier: number
  plain_english_explanation: string
}

export type Provenance = 'real_psi' | 'seed'

export interface RankedInvestigation {
  experiment_id: string
  investigation_name: string
  hardware_rack: string
  similarity: number // 0..100
  parameter_diffs: string[]
  summary: string
  doi_url: string
  earth_spinoff_application: string
  provenance?: Provenance
  output_source?: string
  material_real?: string
  flow_direction?: string
  reference_image?: string | null
  publication_dois?: string[]
}

export interface PlaybookAction {
  category: 'PREVENTION' | 'DETECTION' | 'SUPPRESSION'
  headline: string
  detail: string
  triggered: boolean
}

export interface PredictResponse {
  prediction: Prediction
  uncertainty: Uncertainty
  ranked_investigations: RankedInvestigation[]
  engineering_playbook: PlaybookAction[]
  earth_spinoff: string
  source: 'backend' | 'local-fallback'
}
