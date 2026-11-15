import type { EvidenceDetail, PlaybookTopic, ScenarioDetail } from './dashboardTypes'
import { sourceButton } from '../shared/provenance'
import { EARTH_CARDS, LUNAR_DUST_NOTE, PLAYBOOK_CARDS, type PlaybookCard, type PlaybookSource } from './playbookContent'

// Phase 2B: renders #fixItPanel and #earthCard.
// Listens: flameatlas:scenario, flameatlas:evidence. Dispatches: flameatlas:topic.

// Illustrative display threshold, not a safety limit. The model gives roughly 0.3-3.4 mm/s
// for a PMMA rod in ~0 g, so a higher value would never trigger there.
const HIGH_SPREAD_MM_S = 2.5

const state: {
  topic: PlaybookTopic
  scenario: ScenarioDetail | null
} = { topic: 'detection', scenario: null }

// Evidence keyed by scenarioKey. The rail dispatches evidence for a new scenario
// before this module sees that scenario, so a single "last evidence" slot is not enough.
const evidenceByKey = new Map<string, EvidenceDetail['coverage']>()
function rememberEvidence(e: EvidenceDetail) {
  evidenceByKey.delete(e.scenarioKey)
  evidenceByKey.set(e.scenarioKey, e.coverage)
  if (evidenceByKey.size > 16) evidenceByKey.delete(evidenceByKey.keys().next().value!)
}

const fixIt = document.getElementById('fixItPanel')
const earth = document.getElementById('earthCard')

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (text) node.textContent = text
  return node
}

function injectStyles() {
  if (document.getElementById('playbookStyles')) return
  const style = el('style')
  style.id = 'playbookStyles'
  style.textContent = `
    #fixItPanel { margin-top: 20px; border-top: 1px solid var(--line); padding-top: 16px; }
    #fixItPanel h3 { margin: 6px 0 4px; font-size: 20px; font-weight: 400; }
    .pb-meta { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
    .pb-warn { border: 1px solid var(--orange); color: var(--orange); border-radius: 8px; padding: 8px 10px; margin: 0 0 10px; font-size: 13px; font-weight: 600; }
    .pb-card { display: block; width: 100%; text-align: left; font: inherit; color: inherit; background: transparent; cursor: pointer;
      padding: 10px 12px; margin: 0; border-radius: 8px; border: 1px solid var(--line); }
    .pb-card[aria-pressed="true"] { border-color: currentColor; }
    .pb-card.priority { border: 2px solid var(--orange); }
    .pb-card strong.pb-title { display: block; }
    .pb-tag { display: inline-block; font-size: 11px; color: var(--orange); margin-top: 2px; }
    .pb-card p { margin: 6px 0 0; font-size: 13px; }
    .pb-note { color: var(--orange); }
    .pb-src { font-size: 12px; margin: 4px 0 12px 12px; }
    .pb-src a, #earthCard a { color: inherit; text-decoration: underline; }
    #earthCard { max-width: 1100px; margin: 16px auto; padding: 0 16px; }
    #earthCard .pb-earth { border: 1px solid var(--line); border-radius: 10px; padding: 14px 18px; }
    #earthCard h3 { margin: 4px 0 6px; font-weight: 400; }
    #earthCard p { margin: 4px 0; }
    #earthCard button { font: inherit; color: inherit; background: transparent; border: 1px solid currentColor; border-radius: 6px; padding: 4px 10px; cursor: pointer; margin-top: 6px; }
  `
  document.head.append(style)
}

function sourceLinks(sources: PlaybookSource[]) {
  const p = el('p', 'pb-src')
  sources.forEach((s, i) => {
    if (i) p.append(' · ')
    const a = el('a', undefined, `${s.title}, ${s.locator}`)
    a.href = s.url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    p.append(a)
  })
  return p
}

/** Coverage only counts when it belongs to the scenario on screen (events may arrive in either order). */
function currentCoverage(): EvidenceDetail['coverage'] | null {
  const key = state.scenario?.scenarioKey
  return key == null ? null : evidenceByKey.get(key) ?? null
}

function limitationReason(): string | null {
  const trust = state.scenario?.trustStatus
  const coverage = currentCoverage()
  if (trust === 'CAUTION_EXTRAPOLATING') return 'the model is extrapolating beyond its reference data here'
  if (trust === 'UNVERIFIED_REGIME_DO_NOT_TRUST') return 'the model regime is unverified here'
  if (coverage === 'none' || coverage === 'context_only') return 'no comparable measured NASA outcome for this setup'
  return null
}

function modeledSpread(): number | null {
  const v = state.scenario?.spreadModeled?.spread_rate_mm_s
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function renderCard(card: PlaybookCard, priority: boolean) {
  const btn = el('button', `pb-card${priority ? ' priority' : ''}`)
  btn.type = 'button'
  btn.dataset.topic = card.id
  btn.setAttribute('aria-pressed', String(card.id === state.topic))
  btn.append(el('strong', 'pb-title', card.title))
  if (priority) btn.append(el('span', 'pb-tag', 'Priority at higher modeled spread'))
  for (const [label, text] of [
    ['What NASA observed', card.observed],
    ['What to test next', card.testNext],
    ['Scope limit', card.scopeLimit],
  ] as const) {
    const p = el('p')
    p.append(el('strong', undefined, `${label}: `), text)
    btn.append(p)
  }
  if (card.id === 'detection' && state.scenario?.cabin?.world === 'moon') {
    btn.append(el('p', 'pb-note', LUNAR_DUST_NOTE))
  }
  btn.addEventListener('click', () => setTopic(card.id))
  // Links sit outside the button: interactive content cannot nest inside <button>.
  const wrap = el('div')
  wrap.append(btn, sourceLinks(card.sources))
  return wrap
}

function renderFixIt() {
  if (!fixIt) return
  const spread = modeledSpread()
  const spreadHigh = spread != null && spread >= HIGH_SPREAD_MM_S
  const cards = spreadHigh
    ? [...PLAYBOOK_CARDS].sort((a, b) => Number(b.id === 'prevention') - Number(a.id === 'prevention'))
    : PLAYBOOK_CARDS

  const kids: Node[] = [el('span', 'section-label', 'Fix It'), el('h3', undefined, 'Three design checks')]
  if (state.scenario?.paneLabel) kids.push(el('p', 'pb-meta', `Scenario: ${state.scenario.paneLabel}`))
  const reason = limitationReason()
  if (reason) {
    kids.push(el('p', 'pb-warn', `More testing needed: ${reason}. The checks below are starting points, not conclusions.`))
  }
  if (spreadHigh) {
    const note = el('p', 'pb-meta', `Modeled spread is ${spread!.toFixed(1)} mm/s. `)
    const method = sourceButton('playbook-priority', 'How priority is set')
    method.addEventListener('flameatlas:source', event => {
      (event as CustomEvent).detail.entry = {
        title: 'Playbook display order', type: 'App threshold',
        description: `The lab moves Prevention to the top when the model spread is at least ${HIGH_SPREAD_MM_S} mm/s. This threshold only controls display order.`,
      }
    })
    note.append(sourceButton('spread', 'Calculation'), ' · ', method)
    kids.push(note)
  }
  for (const card of cards) kids.push(renderCard(card, spreadHigh && card.id === 'prevention'))
  fixIt.replaceChildren(...kids)
}

function renderEarth() {
  if (!earth) return
  const c = EARTH_CARDS[state.topic]
  const box = el('div', 'pb-earth')
  box.dataset.topic = state.topic
  box.append(el('span', 'section-label', c.heading), el('p', undefined, c.text))
  if (c.source) box.append(sourceLinks([c.source]))
  if (c.kind === 'none') {
    const jump = el('button', undefined, 'Show the documented Detection example')
    jump.type = 'button'
    jump.addEventListener('click', () => setTopic('detection'))
    box.append(jump)
  }
  earth.replaceChildren(box)
}

function render() {
  renderFixIt()
  renderEarth()
}

function setTopic(topic: PlaybookTopic) {
  state.topic = topic
  render()
  window.dispatchEvent(new CustomEvent('flameatlas:topic', { detail: { topic } }))
}

declare global {
  interface Window {
    __flameatlasScenario?: ScenarioDetail
    __flameatlasEvidence?: EvidenceDetail
  }
  interface WindowEventMap {
    'flameatlas:scenario': CustomEvent<ScenarioDetail>
    'flameatlas:evidence': CustomEvent<EvidenceDetail>
    'flameatlas:topic': CustomEvent<{ topic: PlaybookTopic }>
  }
}

injectStyles()
window.addEventListener('flameatlas:scenario', (e) => {
  state.scenario = e.detail
  render()
})
window.addEventListener('flameatlas:evidence', (e) => {
  rememberEvidence(e.detail)
  render()
})
// Both events may have fired before this module executed.
state.scenario = window.__flameatlasScenario ?? null
if (window.__flameatlasEvidence) rememberEvidence(window.__flameatlasEvidence)
render()
