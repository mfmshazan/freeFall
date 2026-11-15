import { useState } from 'react'
import { CONTEXT_FILTERS } from '../evidence/rankEvidence'
import type {
  Compatibility, ContextKey, EvidenceField, EvidenceMatch, EvidenceQuery, EvidenceRecord,
  EvidenceResponse, FieldValue, ReplayLink, SourceReference,
} from '../evidence/types'
import { evidenceCatalog } from '../hooks/useEvidence'
import { AtmosphereNote, EvidenceAppearance } from './EvidenceAppearance'

type Filters = NonNullable<EvidenceQuery['context']>
const { records, sources } = evidenceCatalog
const byId = new Map(records.map(record => [record.id, record]))
const studyNames: Record<string, string> = {
  'saffire-1': 'Saffire-I', 'saffire-2': 'Saffire-II', luci: 'LUCI', 'acme-cfi-g': 'ACME CFI-G',
  flex: 'FLEX', 'bass-ii': 'BASS-II', 'candle-flames': 'Candle Flames in Microgravity',
}
const studies = Array.from(new Set(records.map(record => record.study)))
const labels: Record<string, string> = {
  balance_gas: 'Balance gas', 'mixed-balance-gases': 'Reported mixture of balance gases',
  fuel_phase: 'Fuel phase', cabin_fuel_family: 'Cabin fuel family', material: 'Exact material',
  geometry: 'Specimen geometry', flow_configuration: 'Flow configuration', apparatus: 'Apparatus',
  metric: 'Outcome metric', gravity_g: 'Gravity', o2_percent: 'Oxygen', pressure_psi: 'Pressure',
  airflow_cm_s: 'Air velocity', PMMA_Acrylic: 'PMMA acrylic', Cotton_Fabric: 'Cotton fabric',
  Kapton_Wire: 'Kapton wire', Heptane_Droplet: 'Heptane droplet', Methane_Gas: 'Methane gas',
  'outside-predictor-fuels': 'Outside the predictor fuel options',
  sibal: 'SIBAL cotton/fiberglass', 'cast-pmma': 'Cast PMMA', heptane: 'Heptane',
  'butane30-nitrogen70': '30% n-butane in nitrogen',
  'saffire-full-sheet': 'Saffire full sheet', 'saffire-remnant': 'Saffire sheet remnant',
  'luci-5x30-sheet': 'LUCI 5 × 30 cm sheet', 'porous-sphere-burner': 'Porous sphere burner',
  'free-floating-droplet': 'Free-floating droplet', 'bass-100um-2cm-film': '100 µm × 2 cm film',
  'saffire-duct': 'Saffire duct', 'luci-rotating-chamber': 'LUCI rotating chamber',
  'acme-cfi-g-burner': 'ACME CFI-G burner', 'flex-mdca-cir': 'FLEX droplet apparatus',
  'bass-duct': 'BASS duct', 'normal-diffusion': 'Normal diffusion burner',
  'quiescent-droplet-chamber': 'Quiescent droplet chamber',
}
const metrics = new Map(records.flatMap(record => record.observations.map(obs => [obs.metric, obs.label] as const)))
const statuses: Record<EvidenceField['status'], string> = {
  measured: 'Measured', derived_from_measurements: 'Derived from measurements',
  reported_nominal: 'Reported nominal', assumed: 'Assumed', missing: 'Missing',
}
const groups: [Compatibility, string][] = [
  ['compatible', 'Compatible with selected evidence context'],
  ['compatibility_unknown', 'Partial context'],
  ['incompatible', 'Incompatible with selected context'],
]
const control = 'w-full min-w-0 rounded border border-space-600 bg-space-900 px-2 py-1.5 text-sm text-slate-100 focus-visible:outline focus-visible:outline-sky-300'
const action = 'text-sky-300 underline underline-offset-2 hover:text-sky-100 focus-visible:outline focus-visible:outline-sky-300'
const labelFor = (key: string) => labels[key] ?? metrics.get(key) ?? key
const format = (value: FieldValue): string => {
  if (value === null) return 'Unknown'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join('–')
  return String(value)
}

function SourceLink({ reference }: { reference: SourceReference }) {
  const source = sources[reference.source_id]
  const locator = [
    reference.locator, reference.pdf_page && `PDF page ${reference.pdf_page}`,
    reference.printed_page && `printed page ${reference.printed_page}`,
  ].filter(Boolean).join(' · ')
  const href = source.access === 'direct PDF' && reference.pdf_page
    ? `${source.url}#page=${reference.pdf_page}` : source.url
  return <span className="block break-words">
    <a href={href} target="_blank" rel="noreferrer" className={action}>{source.title}</a>
    {' · '}{source.filename}
    {' · '}{locator}
    {source.note && <span className="block text-slate-400">{source.note}</span>}
  </span>
}

function FieldRow({ field }: { field: EvidenceField }) {
  return <li className="border-t border-space-700 py-1.5">
    <div>
      <span className="text-slate-200">{field.label}</span>{' · '}
      {field.approximate ? '≈' : ''}{format(field.value)}{field.unit ? ` ${field.unit}` : ''}
      {' · '}{field.provisional ? 'Provisional source value' : statuses[field.status]}
      {field.time !== 'unspecified' && ` · ${field.time}`}
    </div>
    <div>{field.basis}</div>
    {field.source && <SourceLink reference={field.source} />}
  </li>
}

function EvidenceCard({ record, match, onReplay }: {
  record: EvidenceRecord
  match?: EvidenceMatch
  onReplay: (link: ReplayLink) => void
}) {
  const { identity, replay } = record
  return <article className="min-w-0 rounded-md border border-space-600 bg-space-800 p-3 text-xs text-slate-300">
    <h4 className="text-sm font-semibold text-slate-100">{record.title}</h4>
    <p className="mt-1 flex flex-wrap gap-x-2">
      {identity.run && <span>Run {identity.run}</span>}
      {identity.sample && <span>Sample {identity.sample}</span>}
      {identity.hardware && <span>{identity.hardware}</span>}
      {!identity.run && <span>Local catalog ID {record.id}. NASA run ID unavailable.</span>}
      {identity.aliases.length > 0 && <span>Also listed as {identity.aliases.join(', ')}</span>}
    </p>
    <div className="mt-2">
      {record.observations.length > 0 ? <ul>{record.observations.map(obs => <li key={obs.metric}
        className="border-t border-space-700 py-1.5">
        <span className="text-slate-100">{obs.metric === 'cool_diffusion_flame_observed' ? 'Cool diffusion flame reported by the authors' : obs.label}</span>{' · '}
        {obs.approximate ? '≈' : ''}{format(obs.value)}{obs.unit ? ` ${obs.unit}` : ''}
        {' · '}{obs.provisional ? 'Provisional' : statuses[obs.status]}
        <div className="text-slate-400">{obs.feature} · {obs.method}</div>
        <SourceLink reference={obs.source} />
      </li>)}</ul> : <p>Conditions and imagery only. No per-run outcome is cataloged.</p>}
    </div>
    <EvidenceAppearance id={record.id} />
    {replay && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      <a href={`replay.html#${replay.target}`} className={action} onClick={event => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
        event.preventDefault()
        onReplay(replay)
      }}>{replay.label}</a>
      {replay.video && <a className={action} href={replay.video} target="_blank" rel="noreferrer">Video file</a>}
      {replay.proof_sheet && <a className={action} href={replay.proof_sheet} target="_blank" rel="noreferrer">Proof sheet</a>}
    </div>}
    <details className="mt-3">
      <summary className="cursor-pointer font-semibold text-slate-200">{match ? 'Match details, conditions and limitations' : 'Original conditions and sources'}</summary>
      <div className="mt-2 grid gap-2">
        {match && <>
        <p>{match.compared.length} of 4 numeric conditions compared
          {match.distance === null ? ' · distance unavailable' : ` · normalized distance ${match.distance.toFixed(3)}`}</p>
        {match.compared.length > 0 && <ul className="list-disc pl-4">
          {match.compared.map(item => <li key={item.dimension}>
            {labelFor(item.dimension)}: selected {item.selected} {item.unit}, source {format(item.original)} {item.original_unit}
            {item.factor !== 1 && ` (× ${item.factor} = ${Array.isArray(item.normalized)
              ? item.normalized.map(bound => Number(bound.toPrecision(5))).join('–')
              : Number(item.normalized.toPrecision(5))} ${item.unit})`}
            {' · '}{statuses[item.status]} · {item.basis}
          </li>)}
        </ul>}
        {match.missing_dimensions.length > 0 &&
          <p>Numeric comparison unavailable for {match.missing_dimensions.map(labelFor).join(', ')}.</p>}
        {(['conflicting', 'missing', 'matching'] as const).map(kind => match.reasons[kind].length > 0 &&
          <div key={kind}>
            <h5 className="font-semibold text-slate-200">{{ conflicting: 'Conflicts', missing: 'Missing context', matching: 'Agrees' }[kind]}</h5>
            <ul className="list-disc pl-4">
              {match.reasons[kind].map(reason => <li key={reason.field}>
                {labelFor(reason.field)} · selected {reason.requested ? labelFor(reason.requested) : 'unknown'}, source{' '}
                {Array.isArray(reason.reported) ? reason.reported.map(labelFor).join(', ')
                  : reason.reported ? labelFor(reason.reported) : 'unknown or unavailable'}
              </li>)}
            </ul>
          </div>)}
        </>}
        <div>
          <h5 className="font-semibold text-slate-200">Reported conditions</h5>
          <AtmosphereNote record={record} />
          <ul className="mt-1">{record.conditions.map(field =>
            <FieldRow key={`${field.label}-${field.time}`} field={field} />)}</ul>
        </div>
        {match && <ul className="list-disc pl-4">{record.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>}
        {record.specimen_group && <p>Shared specimen group {record.specimen_group}</p>}
        {record.related.length > 0 && <p>Related cases: {record.related.map(id => byId.get(id)?.title ?? id).join(', ')}</p>}
        <div>{record.references.map(ref => <SourceLink key={`${ref.source_id}-${ref.locator}`} reference={ref} />)}</div>
      </div>
    </details>
    {!match && <ul className="mt-2 list-disc pl-4">{record.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>}
  </article>
}

export function LinkedEvidence({ ids, onReplay }: { ids: string[]; onReplay: (link: ReplayLink) => void }) {
  return <div className="grid gap-3">{ids.map(id => {
    const record = byId.get(id)
    return record && <EvidenceCard key={id} record={record} onReplay={onReplay} />
  })}</div>
}

function contextOptions(key: ContextKey): string[] {
  return Array.from(new Set(records.flatMap(({ context }) => context[key] ? [context[key]] : [])))
    .sort((a, b) => labelFor(a).localeCompare(labelFor(b)))
}

export default function EvidencePanel({ filters, onChange, result, message, onReplay }: {
  filters: Filters
  onChange: (filters: Filters) => void
  result: EvidenceResponse
  message?: string | null
  onReplay: (link: ReplayLink) => void
}) {
  const [study, setStudy] = useState('')
  const visible = (match: EvidenceMatch) => {
    const record = byId.get(match.id)
    return record && (!study || record.study === study)
      && (!filters.metric || record.observations.some(obs => obs.metric === filters.metric))
  }
  const counts = result.coverage.metrics
  const metricRows = Array.from(metrics).filter(([metric]) => (!filters.metric || metric === filters.metric) && counts[metric])
  const card = (match: EvidenceMatch) => <EvidenceCard key={match.id} record={byId.get(match.id)!} match={match} onReplay={onReplay} />
  // The study and metric controls narrow the list; the browser always exposes the full catalog.
  const found = groups.some(([group]) => result.groups[group].some(visible))
  return <section className="grid min-w-0 gap-3 rounded-lg border border-space-600 bg-space-850 p-4"
    aria-labelledby="evidence-heading">
    <h2 id="evidence-heading" className="text-base font-semibold text-slate-100">NASA evidence catalog</h2>
    <p className="text-xs text-slate-300">
      Cases with more comparable conditions appear first within each group, followed by smaller condition differences.
      Evidence filters leave the prediction and its uncertainty unchanged.
    </p>
    {message && <p className="text-xs text-amber-300" role="status">{message}</p>}
    <fieldset className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-semibold text-slate-200">Evidence filters</legend>
      <label className="grid gap-1 text-xs text-slate-300">Study
        <select className={control} value={study} onChange={event => setStudy(event.target.value)}>
          <option value="">All studies</option>
          {studies.map(id => <option key={id} value={id}>{studyNames[id] ?? id}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-slate-300">Outcome metric
        <select className={control} value={filters.metric ?? ''} onChange={event =>
          onChange({ ...filters, metric: event.target.value || null })}>
          <option value="">Any metric (comparison unknown)</option>
          {Array.from(metrics, ([metric, label]) => <option key={metric} value={metric}>{label}</option>)}
        </select>
      </label>
      {CONTEXT_FILTERS.map(key => <label key={key} className="grid gap-1 text-xs text-slate-300">
        {labels[key]}
        <select className={control} value={filters[key] ?? ''} onChange={event =>
          onChange({ ...filters, [key]: event.target.value || null })}>
          <option value="">Unknown</option>
          {contextOptions(key).map(value => <option key={value} value={value}>{labelFor(value)}</option>)}
        </select>
      </label>)}
    </fieldset>
    {!result.groups.compatible.some(visible) &&
      <p className="text-sm text-amber-300">No comparable measured outcome established for this model.</p>}
    {!found && <p className="text-sm text-slate-300" role="status">
      No catalog case has the selected study and metric. Try another filter or open the full catalog.
    </p>}
    {groups.map(([group, heading]) => {
      const matches = result.groups[group].filter(visible)
      if (!matches.length) return null
      return group === 'incompatible'
        ? <details key={group}><summary className="cursor-pointer text-sm text-slate-300">{heading} ({matches.length})</summary>
            <div className="mt-2 grid gap-2">{matches.map(card)}</div>
          </details>
        : <section key={group} className="grid gap-2">
            <h3 className="text-sm font-semibold text-slate-200">{heading} ({matches.length})</h3>
            {matches.map(card)}
          </section>
    })}
    <details>
      <summary className="cursor-pointer text-sm text-slate-300">Outcome coverage across the catalog</summary>
      <p className="mt-2 text-xs text-slate-400">Counts are per case and metric. Cases can share a specimen.
        The predictor uses no comparable measured targets from this catalog.</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-300">
        {metricRows.map(([metric, label]) => <li key={metric}>
          {label} · {counts[metric].compatible_measured} measured and {counts[metric].compatible_derived} derived with
          compatible context · {counts[metric].partial_context} partial · {counts[metric].incompatible} incompatible
        </li>)}
      </ul>
      <p className="mt-2 text-xs text-slate-300">Condition-only cases: {result.coverage.condition_only.length}</p>
    </details>
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-sky-300">Browse all {records.length} catalog cases</summary>
      <div className="mt-2 grid gap-3">{groups.map(([group, heading]) => result.groups[group].length > 0 &&
        <div key={group} className="grid gap-2"><h3 className="text-xs text-slate-300">{heading}</h3>
          {result.groups[group].map(card)}</div>)}</div>
      <p className="mt-3 text-xs text-slate-400">{evidenceCatalog.availability}</p>
    </details>
  </section>
}
