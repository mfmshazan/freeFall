import { useEffect, useMemo, useRef, useState } from 'react'
import type { CabinInputs } from './types'
import { useFlamePrediction } from './hooks/useFlamePrediction'
import { useEvidence } from './hooks/useEvidence'
import type { EvidenceQuery, ReplayLink } from './evidence/types'
import CabinBuilder, { PRESETS } from './components/CabinBuilder'
import FlameCanvas from './components/FlameCanvas'
import TrustGauge from './components/TrustGauge'
import EvidencePanel, { LinkedEvidence } from './components/EvidencePanel'
import ResearchStories from './components/ResearchStories'
import { RESEARCH_STORIES, type EvidenceId } from './data/researchStories'
import { APPEARANCE_LABELS } from './physics/appearance'
import SaffireReplay from './replay/SaffireReplay'
import Bass2Experiment from './replay/Bass2Experiment'

type View = 'predictor' | 'replay' | 'bass2'

function initialReplay(): { view: View; target?: string } {
  const target = window.location.hash.slice(1)
  if (target === 'saffire-report-results') return { view: 'replay', target }
  if (target === 'bass-b1' || target === 'bass-b3') return { view: 'bass2', target }
  return { view: 'predictor' }
}

export default function App() {
  const [inputs, setInputs] = useState<CabinInputs>(PRESETS[0].values)
  const [navigation, setNavigation] = useState(initialReplay)
  const { view, target } = navigation
  const setView = (view: View) => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setNavigation({ view })
  }
  const openReplay = (link: ReplayLink) => setNavigation({ view: link.view, target: link.target })
  const [filters, setFilters] = useState<NonNullable<EvidenceQuery['context']>>({})
  const evidenceQuery = useMemo(() => ({ cabin: inputs, context: filters }), [inputs, filters])
  const [storyId, setStoryId] = useState(RESEARCH_STORIES[0].id)
  const [evidenceIds, setEvidenceIds] = useState<EvidenceId[]>([])
  const researchHeading = useRef<HTMLHeadingElement>(null)
  const replayRegion = useRef<HTMLDivElement>(null)
  const replayRequested = useRef(false)
  const result = useFlamePrediction(inputs)
  const { prediction: p, uncertainty: u } = result

  useEffect(() => {
    if (evidenceIds.length) researchHeading.current?.focus()
  }, [evidenceIds])

  useEffect(() => {
    if (replayRequested.current && view !== 'predictor') {
      replayRegion.current?.focus()
      replayRequested.current = false
    }
  }, [view])

  return (
    <div className="min-h-screen flex flex-col">
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-space-700 bg-space-900/60 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">
            Flame in Freefall <span className="text-slate-400 font-normal">· Spacecraft combustion explorer</span>
          </h1>
          <p className="text-[11px] text-slate-500">
            Illustrative surrogate model using synthetic examples and sourced conditions · NASA Space Apps 2026
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap rounded-md border border-space-600 text-xs">
            <button onClick={() => setView('predictor')}
              className={`px-3 py-1.5 ${view === 'predictor' ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-slate-200'}`}>
              Predictor <span className="opacity-60">(model)</span>
            </button>
            <button onClick={() => setView('replay')}
              className={`px-3 py-1.5 border-l border-space-600 ${view === 'replay' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400 hover:text-slate-200'}`}>
              Saffire-I replay
            </button>
            <button onClick={() => setView('bass2')}
              className={`px-3 py-1.5 border-l border-space-600 ${view === 'bass2' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400 hover:text-slate-200'}`}>
              BASS-II replay
            </button>
          </div>
          {view === 'predictor' && (
            <span className={`text-[11px] font-mono px-2 py-1 rounded-full border ${
              result.source === 'backend'
                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                : 'border-amber-500/40 text-amber-300 bg-amber-500/10'
            }`}>
              {result.source === 'backend' ? '● GP backend' : '○ local physics fallback'}
            </span>
          )}
        </div>
      </header>

      {view !== 'predictor' ? (
        <div ref={replayRegion} tabIndex={-1} aria-label="Recorded experiment replay">
          {view === 'replay' ? <SaffireReplay focusResults={target === 'saffire-report-results'} /> : <Bass2Experiment focusRun={target === 'bass-b1' ? 'b1' : target === 'bass-b3' ? 'b3' : undefined} />}
        </div>
      ) : (
      <div className="flex-1 grid items-start grid-cols-1 gap-3 p-3 md:grid-cols-12">
        {/* LEFT — cabin builder */}
        <aside className="min-w-0 md:col-span-4 xl:col-span-3 rounded-lg border border-space-600 bg-space-850">
          <CabinBuilder inputs={inputs} onChange={setInputs} />
        </aside>

        {/* CENTER */}
        <main className="min-w-0 md:col-span-8 xl:col-span-6 flex flex-col gap-3">
          {/* flame twin + trust gauge */}
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="sm:col-span-3 min-w-0 rounded-lg border border-space-600 bg-space-850 p-2">
              <h2 className="text-xs font-semibold text-sky-300 px-1 pb-1">Illustrative model</h2>
              <FlameCanvas prediction={p} uncertainty={u} gravity_g={inputs.gravity_g} airflow_cm_s={inputs.airflow_cm_s} />
              <p className="px-1 pt-2 text-xs text-slate-400">The palette is selected for illustration. Blue alone cannot establish soot-free combustion. A modeled extinction state cannot establish that a real fire is out.</p>
            </div>
            <div className="sm:col-span-2">
              <TrustGauge u={u} source={result.source} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-space-600 bg-space-850 p-3">
              <div className="text-[11px] text-slate-500 mb-1">Live prediction</div>
              <dl className="grid grid-cols-2 gap-y-1 text-xs">
                <dt className="text-slate-500">Flame length</dt><dd className="font-mono text-slate-200 text-right">{p.flame_length_mm.toFixed(1)} mm</dd>
                <dt className="text-slate-500">Flame width</dt><dd className="font-mono text-slate-200 text-right">{p.flame_width_mm.toFixed(1)} mm</dd>
                <dt className="text-slate-500">Spread rate</dt><dd className="font-mono text-slate-200 text-right">{p.spread_rate_mm_s.toFixed(2)} mm/s</dd>
                <dt className="text-slate-400">Soot proxy</dt><dd className="font-mono text-slate-200 text-right">{p.soot_fraction.toFixed(2)}</dd>
                <dt className="text-slate-400">Heat flux proxy</dt><dd className="font-mono text-slate-200 text-right">{p.radiometric_flux_kw_m2.toFixed(2)} kW/m²</dd>
                <dt className="text-slate-400">Illustrative appearance</dt><dd className="text-sky-300 text-right">{APPEARANCE_LABELS[p.visual_regime]}</dd>
              </dl>
              <p className="mt-2 text-xs text-slate-400">Soot and heat flux are unvalidated proxies. Model spread uses mm/s.</p>
            </div>
            <div className="rounded-lg border border-space-600 bg-space-850 p-3 text-xs text-slate-400">
              No comparable measured outcome used by this model. Predictions and uncertainty estimates are exploratory.
            </div>
          </div>

          {/* evidence ranker */}
          <PredictorEvidence query={evidenceQuery} onChange={setFilters} onReplay={openReplay} />
        </main>

        <aside className="min-w-0 md:col-span-12 xl:col-span-3">
          <ResearchStories storyId={storyId} onSelect={setStoryId} onOpenEvidence={setEvidenceIds} onOpenReplay={id => {
            replayRequested.current = true
            setView(id)
          }} />
          {evidenceIds.length > 0 && <section aria-labelledby="research-evidence" className="mt-3 min-w-0 rounded-lg border border-space-600 bg-space-850 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 id="research-evidence" tabIndex={-1} ref={researchHeading} className="font-semibold text-slate-100">Research evidence</h2>
              <button type="button" className="text-xs text-sky-300 underline" onClick={() => {
                document.getElementById('research-story')?.focus()
                setEvidenceIds([])
              }}>Close evidence</button>
            </div>
            <LinkedEvidence ids={evidenceIds} onReplay={openReplay} />
          </section>}
        </aside>
      </div>

      )}
    </div>
  )
}

function PredictorEvidence({ query, onChange, onReplay }: {
  query: EvidenceQuery & { context: NonNullable<EvidenceQuery['context']> }
  onChange: (filters: NonNullable<EvidenceQuery['context']>) => void
  onReplay: (link: ReplayLink) => void
}) {
  const { result, message } = useEvidence(query)
  return <EvidencePanel filters={query.context} onChange={onChange} result={result} message={message} onReplay={onReplay} />
}
