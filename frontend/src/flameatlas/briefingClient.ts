import catalogJson from '../data/evidence_catalog.json'
import type {
  BriefingField, BriefingRequest, BriefingResponse, EvidenceDetail, ScenarioDetail,
} from './dashboardTypes'

// Phase 2D: fills #briefBtn and #briefingOut.
// Listens: flameatlas:scenario, flameatlas:evidence. No provider logic or keys here.

const sources = (catalogJson as unknown as { sources: Record<string, { title: string; url: string }> }).sources
const ENDPOINT = '/api/briefing'
const CLIENT_TIMEOUT_MS = 25000 // server provider timeout is 20s; leave room for the fallback

const btn = document.getElementById('briefBtn') as HTMLButtonElement | null
const out = document.getElementById('briefingOut')

type State = 'idle' | 'loading' | 'result' | 'error'
let state: State = 'idle'
let scenario: ScenarioDetail | null = (window as unknown as { __flameatlasScenario?: ScenarioDetail }).__flameatlasScenario ?? null
let evidence: EvidenceDetail | null = null
let controller: AbortController | null = null

const GAP_FIELDS = {
  observation: 'No reviewed NASA record near these conditions reports a measured outcome.',
  relevance: 'The closest records only describe test conditions, so the model cannot be checked against data here.',
  limit: 'Evidence gap: more testing is needed before relying on this scenario.',
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, css?: string) {
  const node = document.createElement(tag)
  if (text) node.textContent = text
  if (css) node.style.cssText = css
  return node
}

function setState(next: State) {
  state = next
  if (btn) {
    btn.disabled = next === 'loading'
    btn.textContent = next === 'loading' ? 'Explaining…' : 'Explain NASA evidence'
    btn.setAttribute('aria-busy', String(next === 'loading'))
  }
}

function clearOutput() {
  controller?.abort()
  controller = null
  out?.replaceChildren()
  setState('idle')
}

function safeUrl(url: string | undefined) {
  try {
    const u = new URL(url ?? '')
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

function renderField(name: string, field: BriefingField) {
  const row = el('div', undefined, 'margin:0 0 8px')
  row.append(el('strong', `${name}: `), document.createTextNode(field.text))
  const c = field.citation
  const href = safeUrl(c?.url)
  if (c && href) {
    row.append(' ')
    const a = el('a', `[${c.title}, ${c.locator}]`, 'font-size:12px;text-decoration:underline')
    a.href = href
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    row.append(a)
  } else if (field.record_id) {
    row.append(' ', el('span', `[${field.record_id}]`, 'font-size:12px;opacity:.8'))
  }
  return row
}

function render(res: BriefingResponse) {
  if (!out) return
  const box = el('div')
  box.setAttribute('role', 'status')
  const label = res.mode === 'ai' ? 'AI briefing' : 'Evidence summary'
  const head = el('p', label, 'font-weight:600;margin:0 0 4px')
  box.append(head)
  if (scenario?.paneLabel) box.append(el('p', `Scenario: ${scenario.paneLabel}`, 'font-size:12px;margin:0 0 6px;opacity:.8'))
  box.append(
    renderField('Observation', res.fields.observation),
    renderField('Relevance', res.fields.relevance),
    renderField('Limit', res.fields.limit),
  )
  out.replaceChildren(box)
  setState('result')
}

/** Offline fallback: local top evidence record, or the evidence-gap message. */
function localSummary(key: string): BriefingResponse {
  const top = evidence && evidence.scenarioKey === key ? evidence.top[0] : undefined
  const withOutcome = evidence && evidence.scenarioKey === key ? evidence.top.find(t => t.outcome) : undefined
  const cite = (t: NonNullable<typeof top>) => ({
    source_id: t.source.source_id, title: sources[t.source.source_id]?.title ?? t.source.source_id,
    locator: t.source.locator, url: sources[t.source.source_id]?.url ?? '',
  })
  const mk = (text: string, t?: typeof top): BriefingField =>
    ({ text, record_id: t?.id ?? null, citation: t ? cite(t) : null })
  if (!top || !withOutcome?.outcome) {
    return {
      scenario_key: key, mode: 'summary',
      fields: {
        observation: mk(GAP_FIELDS.observation, top),
        relevance: mk(GAP_FIELDS.relevance, top),
        limit: mk(GAP_FIELDS.limit, top),
      },
    }
  }
  const o = withOutcome.outcome
  const unit = o.unit ? ` ${o.unit}` : ''
  const kind = o.status === 'measured' ? 'Measured' : 'Derived from measurements'
  const t = withOutcome
  return {
    scenario_key: key, mode: 'summary',
    fields: {
      observation: mk(`${kind}: ${o.label} ${o.value}${unit} in ${t.title}.`, t),
      relevance: mk(`${t.title} (${t.group.replace(/_/g, ' ')}). ${t.delta ?? t.gap ?? 'No comparable condition fields were reported.'}`, t),
      limit: mk(t.limitation ?? 'Reported conditions may differ from this scenario.', t),
    },
  }
}

function isResponse(x: unknown): x is BriefingResponse {
  const r = x as BriefingResponse
  return !!r && typeof r.scenario_key === 'string' && (r.mode === 'ai' || r.mode === 'summary') &&
    !!r.fields && ['observation', 'relevance', 'limit'].every(k => typeof (r.fields as any)[k]?.text === 'string')
}

async function explain() {
  if (state === 'loading' || !scenario) return
  const key = scenario.scenarioKey
  // Candle mode has no model fuel, so the evidence rail ranks nothing. Don't ask the server
  // (it ignores that context and would cite a record the rail doesn't show); show the gap summary.
  if (scenario.trustStatus === null && scenario.spreadModeled === null) {
    controller?.abort()
    controller = null
    render(localSummary(key))
    return
  }
  controller?.abort()
  const ctl = new AbortController()
  controller = ctl
  setState('loading')
  out?.replaceChildren(el('p', 'Loading briefing…', 'margin:0'))

  const timer = setTimeout(() => ctl.abort(), CLIENT_TIMEOUT_MS)
  const body: BriefingRequest = { scenario_key: key, cabin: scenario.cabin }
  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: ctl.signal,
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data: unknown = await resp.json()
    if (!isResponse(data)) throw new Error('invalid briefing response')
    if (ctl.signal.aborted || scenario?.scenarioKey !== key || data.scenario_key !== key) return
    render(data)
  } catch {
    // Aborted by a scenario change: the change handler already cleared the panel.
    if (controller !== ctl || scenario?.scenarioKey !== key) return
    render(localSummary(key))
  } finally {
    clearTimeout(timer)
    if (controller === ctl) controller = null
  }
}

window.addEventListener('flameatlas:scenario', e => {
  const detail = (e as CustomEvent<ScenarioDetail>).detail
  const changed = scenario?.scenarioKey !== detail.scenarioKey
  scenario = detail
  if (changed) clearOutput()
  if (btn && !btn.disabled) btn.disabled = false
})

window.addEventListener('flameatlas:evidence', e => {
  evidence = (e as CustomEvent<EvidenceDetail>).detail
})

if (btn) {
  btn.type = 'button'
  setState('idle')
  btn.addEventListener('click', () => { void explain() })
}
