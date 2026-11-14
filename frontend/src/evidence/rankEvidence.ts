import type {
  Compatibility, ContextKey, Dimension, EvidenceCatalog, EvidenceField, EvidenceMatch,
  EvidenceQuery, EvidenceRecord, EvidenceResponse, MatchReason,
} from './types'

export const CONTEXT_FILTERS: ContextKey[] = ['material', 'geometry', 'flow_configuration', 'apparatus']
function eligibleOutcome(field: EvidenceField) {
  return (field.status === 'measured' || field.status === 'derived_from_measurements')
    && !field.provisional && field.value !== null
}

function compatibility(record: EvidenceRecord, query: EvidenceQuery, ranking: EvidenceCatalog['ranking']) {
  const reasons: EvidenceMatch['reasons'] = { matching: [], missing: [], conflicting: [] }
  const context = record.context
  const filters = query.context
  const fuel = query.cabin.fuel_material
  function compare(field: string, requested: string | null, reported: MatchReason['reported']) {
    const detail = { field, requested, reported }
    const options = Array.isArray(reported) ? reported : reported === null ? [] : [reported]
    if (requested === null || options.length === 0) reasons.missing.push(detail)
    else if (options.includes(requested)) reasons.matching.push(detail)
    else reasons.conflicting.push(detail)
  }
  compare('fuel_phase', ranking.fuel_phases[fuel], context.fuel_phase)
  for (const field of CONTEXT_FILTERS) compare(field, filters?.[field] ?? null, context[field])
  const families = context.material === null ? undefined : ranking.material_families[context.material]
  compare('cabin_fuel_family', fuel, families ? families.length ? families : ['outside-predictor-fuels'] : null)
  const balance = record.balance_gases
  if (balance?.length) compare('balance_gas', query.cabin.diluent, balance.length === 1 ? balance : ['mixed-balance-gases'])
  const metrics = record.observations.filter(eligibleOutcome).map(field => field.metric)
  compare('metric', filters?.metric ?? null, metrics.length ? metrics : null)
  return reasons
}

function conditionDistance(
  record: EvidenceRecord, cabin: EvidenceQuery['cabin'], ranking: EvidenceCatalog['ranking'],
): Pick<EvidenceMatch, 'compared' | 'missing_dimensions' | 'distance'> {
  const { dimensions, comparison_bases } = ranking
  const compared: EvidenceMatch['compared'] = []
  const missing_dimensions: Dimension[] = []
  let weightedSquares = 0
  let weightSum = 0
  for (const dimension of Object.keys(dimensions) as Dimension[]) {
    const config = dimensions[dimension]
    const fields = record.conditions.filter(field =>
      field.dimension === dimension && field.comparison_basis === comparison_bases[dimension]
      && !field.provisional && field.status !== 'missing' && field.status !== 'assumed'
      && (field.time === 'unspecified' || field.time === 'initial')
      && (typeof field.value === 'number' && Number.isFinite(field.value) || Array.isArray(field.value)),
    )
    const field = fields[0]
    const factor = field?.unit ? config.conversions[field.unit] : undefined
    if (fields.length !== 1 || factor === undefined || !field.unit) {
      missing_dimensions.push(dimension)
      continue
    }

    const value = field.value as number | [number, number]
    const normalized: typeof value = Array.isArray(value) ? [value[0] * factor, value[1] * factor] : value * factor
    const [lo, hi] = Array.isArray(normalized) ? normalized : [normalized, normalized]
    const selected = cabin[dimension]
    const delta = selected < lo ? selected - lo : selected > hi ? selected - hi : 0
    weightedSquares += config.weight * (delta / config.scale) ** 2
    weightSum += config.weight
    compared.push({
      dimension, selected, reported: value, original: field.original, original_unit: field.unit,
      normalized, unit: config.unit, factor, delta, status: field.status, basis: field.basis,
      time: field.time, approximate: field.approximate, source: field.source,
    })
  }
  return { compared, missing_dimensions, distance: weightSum ? Math.sqrt(weightedSquares / weightSum) : null }
}

export function rankEvidence(catalog: EvidenceCatalog, query: EvidenceQuery): EvidenceResponse {
  const { ranking } = catalog
  const groups: EvidenceResponse['groups'] = { compatible: [], compatibility_unknown: [], incompatible: [] }
  const coverage: EvidenceResponse['coverage'] = { metrics: {}, condition_only: [], specimen_groups: {} }
  for (const record of catalog.records) {
    const reasons = compatibility(record, query, ranking)
    const group: Compatibility = reasons.conflicting.length ? 'incompatible'
      : reasons.missing.length ? 'compatibility_unknown' : 'compatible'
    groups[group].push({ id: record.id, reasons, ...conditionDistance(record, query.cabin, ranking) })
    if (record.specimen_group) (coverage.specimen_groups[record.specimen_group] ??= []).push(record.id)
    if (!record.observations.length) coverage.condition_only.push(record.id)

    for (const obs of record.observations.filter(eligibleOutcome)) {
      const metric = coverage.metrics[obs.metric] ??= {
        compatible_measured: 0, compatible_derived: 0, partial_context: 0, incompatible: 0,
      }
      if (group === 'compatible' && obs.metric !== query.context?.metric) {
        metric.incompatible += 1
      } else if (group === 'compatible') {
        metric[obs.status === 'measured' ? 'compatible_measured' : 'compatible_derived'] += 1
      } else {
        metric[group === 'compatibility_unknown' ? 'partial_context' : 'incompatible'] += 1
      }
    }
  }
  const distance = (match: EvidenceMatch) => match.distance ?? Infinity
  for (const matches of Object.values(groups)) {
    matches.sort((a, b) => b.compared.length - a.compared.length || distance(a) - distance(b)
      || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }
  return { catalog_version: catalog.catalog_version, ranking_version: ranking.version, groups, coverage }
}
