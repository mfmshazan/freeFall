import type { CabinInputs, FuelMaterial } from '../types'

export type Dimension = 'gravity_g' | 'o2_percent' | 'pressure_psi' | 'airflow_cm_s'
export type ContextKey = 'material' | 'geometry' | 'flow_configuration' | 'apparatus'
export type FieldStatus = 'measured' | 'derived_from_measurements' | 'reported_nominal' | 'assumed' | 'missing'
export type NumericValue = number | [number, number]
export type FieldValue = NumericValue | string | boolean | null

export interface EvidenceQuery {
  cabin: CabinInputs
  context?: Partial<Record<ContextKey | 'metric', string | null>> | null
}

export interface SourceReference {
  source_id: string
  locator: string
  pdf_page: number | null
  printed_page: number | null
}

export interface EvidenceSource {
  title: string
  url: string
  filename: string
  version: string
  reviewed_on: string
  sha256: string | null
  access: string
  note: string | null
}

export interface EvidenceField {
  label: string
  value: FieldValue
  unit: string | null
  original: FieldValue
  status: FieldStatus
  approximate: boolean
  provisional: boolean
  basis: string
  time: string
  source: SourceReference | null
  dimension: Dimension | null
  comparison_basis?: string
}

export interface Observation extends EvidenceField {
  metric: string
  feature: string
  method: string
  definition: string
  source: SourceReference
}

export interface ReplayLink {
  view: 'replay' | 'bass2'
  target: string
  label: string
  video: string | null
  proof_sheet: string | null
}

export interface EvidenceRecord {
  id: string
  study: string
  title: string
  identity: {
    catalog_id_assigned_locally: boolean
    run: string | null
    sample: string | null
    hardware: string | null
    aliases: string[]
  }
  context: Record<ContextKey | 'fuel_phase', string | null>
  balance_gases: string[] | null
  conditions: EvidenceField[]
  observations: Observation[]
  limitations: string[]
  references: SourceReference[]
  related: string[]
  specimen_group: string | null
  replay: ReplayLink | null
  use: 'evidence_only'
}

export interface EvidenceCatalog {
  schema_version: number
  catalog_version: string
  ranking: {
    version: number
    fuel_phases: Record<FuelMaterial, string>
    material_families: Record<string, FuelMaterial[]>
    comparison_bases: Record<Dimension, string>
    dimensions: Record<Dimension, {
      unit: string
      scale: number
      weight: number
      conversions: Record<string, number>
    }>
  }
  availability: string
  sources: Record<string, EvidenceSource>
  records: EvidenceRecord[]
}

export interface MatchReason {
  field: string
  requested: string | null
  reported: string | string[] | null
}

export interface ConditionComparison {
  dimension: Dimension
  selected: number
  reported: NumericValue
  original: FieldValue
  original_unit: string
  normalized: NumericValue
  unit: string
  factor: number
  delta: number
  status: FieldStatus
  basis: string
  time: string
  approximate: boolean
  source: SourceReference | null
}

export interface EvidenceMatch {
  id: string
  reasons: Record<'matching' | 'missing' | 'conflicting', MatchReason[]>
  compared: ConditionComparison[]
  missing_dimensions: Dimension[]
  distance: number | null
}

export type Compatibility = 'compatible' | 'compatibility_unknown' | 'incompatible'
export interface MetricCoverage {
  compatible_measured: number
  compatible_derived: number
  partial_context: number
  incompatible: number
}

export interface EvidenceResponse {
  catalog_version: string
  ranking_version: number
  groups: Record<Compatibility, EvidenceMatch[]>
  coverage: {
    metrics: Record<string, MetricCoverage>
    condition_only: string[]
    specimen_groups: Record<string, string[]>
  }
}
