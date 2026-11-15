import type { Compatibility, EvidenceMatch, EvidenceResponse } from './types'

export const GROUP_ORDER: Compatibility[] = ['compatible', 'compatibility_unknown', 'incompatible']

export interface SelectedMatch {
  group: Compatibility
  match: EvidenceMatch
}

/**
 * Shared selection rule (mirrored by backend/briefing_packet.py::select_top, once it exists):
 * take ranker groups in the order compatible, compatibility_unknown, incompatible,
 * preserve the ranker's order inside each group, keep the first three.
 * Incompatible records only appear when fewer than three others exist, as a labelled reference.
 */
export function selectTop(response: EvidenceResponse, limit = 3): SelectedMatch[] {
  return GROUP_ORDER
    .flatMap(group => response.groups[group].map(match => ({ group, match })))
    .slice(0, limit)
}
