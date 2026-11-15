import catalogJson from '../data/evidence_catalog.json'
import { rankEvidence } from '../evidence/rankEvidence'
import { selectTop } from '../evidence/selectTop'
import { sourceButton } from '../shared/provenance'
import type {
  Compatibility, Dimension, EvidenceCatalog, EvidenceMatch, EvidenceRecord, NumericValue, SourceReference,
} from '../evidence/types'
import type { EvidenceDetail, ScenarioDetail, TopEvidence } from './dashboardTypes'

const catalog = catalogJson as unknown as EvidenceCatalog
const records = new Map<string, EvidenceRecord>(catalog.records.map(r => [r.id, r]))

const GROUP_LABEL: Record<Compatibility, string> = {
  compatible: 'Compatible',
  compatibility_unknown: 'Compatibility unknown',
  incompatible: 'Incompatible · reference only',
}
const DIMENSION_LABEL: Record<Dimension, string> = {
  gravity_g: 'Gravity', o2_percent: 'Oxygen', pressure_psi: 'Pressure', airflow_cm_s: 'Airflow',
}
const STATUS_LABEL: Record<string, string> = {
  measured: 'Measured', derived_from_measurements: 'Derived from measurements',
}
const STATUS_LABEL_TRUST: Record<string, string> = {
  EXPLORATORY: 'Exploratory',
  CAUTION_EXTRAPOLATING: 'Extrapolating',
  UNVERIFIED_REGIME_DO_NOT_TRUST: 'Unverified regime',
}

const humanize = (s: string) => s.replace(/[-_]/g, ' ')
const num = (n: number) => String(Number(n.toPrecision(3)))
function fmtValue(value: unknown): string {
  if (typeof value === 'number') return num(value)
  if (Array.isArray(value)) return value.map(v => (typeof v === 'number' ? num(v) : String(v))).join('–')
  return String(value)
}
const fmtRange = (v: NumericValue) => fmtValue(v)

function conditionDelta(match: EvidenceMatch, record: EvidenceRecord, gravityG: number): Pick<TopEvidence, 'delta' | 'conditionSource'> {
  const { dimensions } = catalog.ranking
  if (!match.compared.length) return { delta: 'No comparable numeric conditions reported for this record' }
  let best: EvidenceMatch['compared'][number] | null = null
  let bestScore = 0
  for (const c of match.compared) {
    const score = Math.abs(c.delta) / dimensions[c.dimension].scale
    if (score > bestScore) { best = c; bestScore = score }
  }
  if (!best) {
    // Gravity is often reported as text (e.g. "ISS microgravity"), so it is not compared numerically.
    const gravity = record.conditions.find(c => c.label === 'Gravity' && typeof c.value === 'string')
    return gravity
      ? { delta: `Gravity: selected ${num(gravityG)} g, record reports ${String(gravity.value)} (not compared numerically)`, conditionSource: gravity.source ?? undefined }
      : { delta: 'Compared numeric conditions fall inside the reported ranges' }
  }
  return {
    delta: `${DIMENSION_LABEL[best.dimension]}: selected ${num(best.selected)} ${best.unit}, record reports ${fmtRange(best.normalized)} ${best.unit}`,
    conditionSource: best.source ?? undefined,
  }
}

function contextGap(match: EvidenceMatch): string | null {
  const unspecified = match.reasons.missing
    .filter(r => r.requested === null && r.reported !== null && r.field !== 'metric')
    .map(r => `${humanize(r.field)} (record: ${humanize(Array.isArray(r.reported) ? r.reported.join(', ') : String(r.reported))})`)
  const conflicts = match.reasons.conflicting
    .map(r => `${humanize(r.field)} (selected ${humanize(String(r.requested))}, record ${humanize(Array.isArray(r.reported) ? r.reported.join(', ') : String(r.reported))})`)
  const parts: string[] = []
  if (unspecified.length) parts.push(`Not specified in the lab: ${unspecified.join('; ')}`)
  if (conflicts.length) parts.push(`Conflicts: ${conflicts.join('; ')}`)
  return parts.length ? parts.join('. ') : null
}

export function buildEvidence(detail: ScenarioDetail): EvidenceDetail {
  const response = rankEvidence(catalog, {
    cabin: detail.cabin,
    // Lab sliders do not specify these; pass them through as unknown rather than inventing them.
    context: { material: null, geometry: null, flow_configuration: null, apparatus: null, metric: null },
  })
  const top: TopEvidence[] = selectTop(response).map(({ group, match }) => {
    const record = records.get(match.id)!
    const observation = record.observations.find(o =>
      (o.status === 'measured' || o.status === 'derived_from_measurements') && !o.provisional && o.value !== null)
    const ref = observation?.source ?? record.references[0] ?? record.conditions.find(c => c.source)?.source
    return {
      id: record.id,
      title: record.title,
      group,
      ...conditionDelta(match, record, detail.cabin.gravity_g),
      gap: contextGap(match),
      outcome: observation ? {
        label: observation.label, metric: observation.metric, value: fmtValue(observation.value),
        unit: observation.unit, status: observation.status,
      } : null,
      source: ref ?? { source_id: '', locator: '' },
      limitation: record.limitations[0] ?? null,
    }
  })
  const coverage: EvidenceDetail['coverage'] = top.some(t => t.group === 'compatible' && t.outcome)
    ? 'measured' : top.length ? 'context_only' : 'none'
  return { scenarioKey: detail.scenarioKey, top, coverage }
}

/* ---------- rendering (DOM nodes + textContent only; catalog text is never injected as HTML) ---------- */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function injectStyles() {
  if (document.getElementById('evidenceRailStyles')) return
  const style = document.createElement('style')
  style.id = 'evidenceRailStyles'
  style.textContent = `
    #evidenceRank { margin-top: 12px; }
    #evidenceRank .er-box { background: var(--cream); color: var(--ink); padding: 20px 22px; }
    #evidenceRank h3 { margin: 4px 0 8px; font-size: 20px; font-weight: 500; letter-spacing: -.02em; }
    #evidenceRank p { margin: 0 0 8px; line-height: 1.55; color: var(--muted-ink); font-size: 13px; }
    #evidenceRank .er-model { border: 1px solid var(--ink); padding: 10px 12px; margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: var(--ink); }
    #evidenceRank .er-none { font-weight: 800; color: var(--ink); margin-bottom: 4px; }
    #evidenceRank .er-card { border-top: 1px solid rgba(0,0,0,.18); padding: 12px 0 4px; }
    #evidenceRank .er-group { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; border: 1px solid var(--ink); margin-bottom: 6px; }
    #evidenceRank .er-group.compatible { background: var(--ink); color: white; }
    #evidenceRank .er-group.incompatible { border-style: dashed; }
    #evidenceRank .er-title { font-weight: 700; color: var(--ink); margin: 0 0 6px; }
    #evidenceRank .er-outcome { display: inline-flex; gap: 8px; align-items: baseline; flex-wrap: wrap; padding: 6px 10px; margin: 2px 0 8px; background: rgba(0,0,0,.06); font-size: 13px; color: var(--ink); }
    #evidenceRank .er-outcome.area { background: transparent; border: 1px dashed var(--ink); }
    #evidenceRank .er-chip { font-size: 10px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; }
    #evidenceRank a { color: var(--ink); font-weight: 700; text-decoration: underline; }
  `
  document.head.appendChild(style)
}

function modelLine(detail: ScenarioDetail): HTMLElement {
  const box = el('div', 'er-model')
  const pred = detail.spreadModeled
  if (!pred) {
    box.textContent = 'Model estimate: none for this view (candle illustration).'
    return box
  }
  const std = detail.uncertainty?.std_spread_rate
  const trust = detail.trustStatus ? STATUS_LABEL_TRUST[detail.trustStatus] ?? detail.trustStatus : 'Unknown'
  const spread = `${num(pred.spread_rate_mm_s)}${std != null ? ` ± ${num(std)}` : ''} mm/s`
  box.textContent = `Model estimate (${detail.paneLabel}): spread ${spread} — modeled, not a NASA measurement. Trust: ${trust}.`
  box.append(' ', sourceButton('spread', 'How spread is calculated'))
  return box
}

export function renderEvidence(root: HTMLElement, detail: ScenarioDetail, evidence: EvidenceDetail) {
  root.replaceChildren()
  const box = el('div', 'er-box')
  box.append(el('span', 'section-label', 'Reviewed NASA evidence'))
  box.append(el('h3', undefined, 'Most relevant experiments'))
  box.append(sourceButton('evidence-ranking', 'How experiments are ranked'))
  box.append(modelLine(detail))

  const coverageText = {
    measured: 'Evidence coverage: a compatible record reports a measured outcome.',
    context_only: 'Evidence coverage: context only — no compatible measured outcome.',
    none: 'Evidence coverage: no reviewed record ranked.',
  }[evidence.coverage]
  box.append(el('p', undefined, coverageText))

  if (evidence.coverage !== 'measured') {
    box.append(el('div', 'er-none', 'No comparable measured outcome for this setup'))
    box.append(el('p', undefined, evidence.top.length
      ? 'Closest context is shown below with its limitation. Outcomes listed belong to the original experiment, not to your cabin.'
      : 'Choose a fabric sheet, acrylic rod or droplet to rank reviewed records against a model fuel.'))
  }

  if (detail.cabin.fuel_material === 'Heptane_Droplet' && evidence.top.length) {
    box.append(el('p', undefined,
      'Fuel droplet selected: droplet records are ranked, but their apparatus and gas mixture can still differ from this cabin.'))
  }

  for (const item of evidence.top) {
    const card = el('div', 'er-card')
    card.append(el('span', `er-group ${item.group}`, GROUP_LABEL[item.group]))
    card.append(el('p', 'er-title', item.title))
    if (item.delta) {
      const delta = el('p', undefined, item.delta)
      if (item.conditionSource) appendCitation(delta, item.conditionSource, 'Condition source')
      card.append(delta)
    }
    if (item.gap) card.append(el('p', undefined, item.gap))

    if (item.outcome) {
      const o = item.outcome
      const area = !!o.unit && o.unit.includes('²')
      const row = el('div', `er-outcome${area ? ' area' : ''}`)
      row.append(el('span', 'er-chip', STATUS_LABEL[o.status] ?? o.status))
      row.append(el('span', undefined, `${o.label}: ${o.value}${o.unit ? ` ${o.unit}` : ''}`))
      if (o.unit && /\/s$/.test(o.unit)) {
        row.append(el('span', 'er-chip', area ? 'area rate' : 'linear rate'))
      }
      card.append(row)
    } else {
      card.append(el('p', undefined, 'No measured outcome in this record (conditions only).'))
    }
    if (item.limitation) card.append(el('p', undefined, `Limit: ${item.limitation}`))

    const citation = el('p')
    appendCitation(citation, item.source, item.outcome ? 'Outcome source' : 'Record source')
    if (citation.hasChildNodes()) card.append(citation)
    box.append(card)
  }
  root.append(box)
}

function appendCitation(parent: HTMLElement, ref: SourceReference, label: string) {
  const source = catalog.sources[ref.source_id]
  if (!source) return
  const anchor = el('a', undefined, `${label} · ${ref.locator}`)
  anchor.href = source.access === 'direct PDF' && ref.pdf_page ? `${source.url}#page=${ref.pdf_page}` : source.url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.title = source.title
  if (parent.textContent) parent.append(' · ')
  parent.append(anchor)
}

function handle(detail: ScenarioDetail) {
  const root = document.getElementById('evidenceRank')
  const candle = detail.trustStatus === null && detail.spreadModeled === null
  const evidence: EvidenceDetail = candle
    ? { scenarioKey: detail.scenarioKey, top: [], coverage: 'none' }
    : buildEvidence(detail)
  if (root) renderEvidence(root, detail, evidence)
  // Late-loading listeners (e.g. playbook.ts) read the last evidence, like __flameatlasScenario.
  window.__flameatlasEvidence = evidence
  window.dispatchEvent(new CustomEvent<EvidenceDetail>('flameatlas:evidence', { detail: evidence }))
}

declare global {
  interface Window { __flameatlasScenario?: ScenarioDetail; __flameatlasEvidence?: EvidenceDetail }
  interface WindowEventMap { 'flameatlas:scenario': CustomEvent<ScenarioDetail> }
}

injectStyles()
window.addEventListener('flameatlas:scenario', e => handle(e.detail))
// The lab may have dispatched before this module executed.
if (window.__flameatlasScenario) handle(window.__flameatlasScenario)
