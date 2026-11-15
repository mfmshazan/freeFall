import type { Compatibility, SourceReference } from '../evidence/types'
import type { CabinInputs, Prediction, TrustStatus, Uncertainty } from '../types'

/** Payload of the `flameatlas:scenario` window event dispatched by fire-lab.html. */
export interface ScenarioDetail {
  /** Stable string of the normalized cabin values. In Compare mode it describes pane 1 only. */
  scenarioKey: string
  cabin: CabinInputs
  /** null in candle mode (no model estimate). */
  trustStatus: TrustStatus | null
  spreadModeled: Prediction | null
  /** Optional extension of the Phase 1 contract: model uncertainty, so the rail can show the spread. */
  uncertainty?: Uncertainty | null
  paneLabel: string
}

export interface TopEvidence {
  id: string
  title: string
  group: Compatibility
  /** Largest condition difference between the selected cabin and the record, or null. */
  delta: string | null
  conditionSource?: SourceReference
  /** Context the lab leaves unspecified (geometry, flow configuration, ...) or that conflicts. */
  gap: string | null
  /** First eligible measured/derived outcome from the original experiment, or null. */
  outcome: {
    label: string
    metric: string
    value: string
    unit: string | null
    status: string
  } | null
  source: SourceReference
  limitation: string | null
}

export interface EvidenceDetail {
  scenarioKey: string
  top: TopEvidence[]
  /** measured: a compatible record has a measured outcome; context_only: only partial context; none: nothing ranked. */
  coverage: 'measured' | 'context_only' | 'none'
}

export type PlaybookTopic = 'prevention' | 'detection' | 'suppression'

export interface BriefingRequest {
  scenario_key: string
  cabin: CabinInputs
}

/** Citation resolved server-side from the catalog. */
export interface BriefingCitation {
  source_id: string
  title: string
  locator: string
  url: string
  pdf_page?: number | null
  printed_page?: string | number | null
}

export interface BriefingField {
  text: string
  record_id: string | null
  citation: BriefingCitation | null
}

export interface BriefingResponse {
  scenario_key: string
  mode: 'ai' | 'summary'
  fields: { observation: BriefingField; relevance: BriefingField; limit: BriefingField }
}
