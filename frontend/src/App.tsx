import { useState } from 'react'
import type { CabinInputs } from './types'
import { useFlamePrediction } from './hooks/useFlamePrediction'
import CabinBuilder, { PRESETS } from './components/CabinBuilder'
import FlameCanvas from './components/FlameCanvas'
import TrustGauge from './components/TrustGauge'
import EvidencePanel from './components/EvidencePanel'
import PlaybookPanel from './components/PlaybookPanel'
import SpinoffBanner from './components/SpinoffBanner'
import SaffireReplay from './replay/SaffireReplay'
import Bass2Experiment from './replay/Bass2Experiment'

export default function App() {
  const [inputs, setInputs] = useState<CabinInputs>(PRESETS[0].values)
  const [view, setView] = useState<'predictor' | 'replay' | 'bass2'>('predictor')
  const result = useFlamePrediction(inputs)
  const { prediction: p, uncertainty: u } = result

  return (
    <div className="min-h-screen flex flex-col">
      {/* header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-space-700 bg-space-900/60 backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">
            Flame in Freefall <span className="text-slate-500 font-normal">— Spacecraft Fire-Safety Predictor</span>
          </h1>
          <p className="text-[11px] text-slate-500">
            Uncertainty-aware surrogate model over NASA PSI combustion data · NASA Space Apps 2026
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-space-600 overflow-hidden text-xs">
            <button onClick={() => setView('predictor')}
              className={`px-3 py-1.5 ${view === 'predictor' ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-slate-200'}`}>
              Predictor <span className="opacity-60">(model)</span>
            </button>
            <button onClick={() => setView('replay')}
              className={`px-3 py-1.5 border-l border-space-600 ${view === 'replay' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400 hover:text-slate-200'}`}>
              Saffire-I Replay <span className="opacity-60">(real data)</span>
            </button>
            <button onClick={() => setView('bass2')}
              className={`px-3 py-1.5 border-l border-space-600 ${view === 'bass2' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400 hover:text-slate-200'}`}>
              BASS-II B1 <span className="opacity-60">(real data)</span>
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

      {view === 'replay' ? (
        <SaffireReplay />
      ) : view === 'bass2' ? (
        <Bass2Experiment />
      ) : (
      <>

      <div className="flex-1 grid grid-cols-12 gap-3 p-3">
        {/* LEFT — cabin builder */}
        <aside className="col-span-3 rounded-lg border border-space-600 bg-space-850">
          <CabinBuilder inputs={inputs} onChange={setInputs} />
        </aside>

        {/* CENTER */}
        <main className="col-span-6 flex flex-col gap-3">
          {/* flame twin + trust gauge */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 rounded-lg border border-space-600 bg-space-850 p-2">
              <div className="text-[11px] text-slate-500 px-1 pb-1">Parametric Flame Digital Twin</div>
              <FlameCanvas prediction={p} uncertainty={u} gravity_g={inputs.gravity_g} airflow_cm_s={inputs.airflow_cm_s} />
            </div>
            <div className="col-span-2">
              <TrustGauge u={u} />
            </div>
          </div>

          {/* split-screen: live sim vs top-ranked reference */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-space-600 bg-space-850 p-3">
              <div className="text-[11px] text-slate-500 mb-1">Live prediction</div>
              <dl className="grid grid-cols-2 gap-y-1 text-xs">
                <dt className="text-slate-500">Flame length</dt><dd className="font-mono text-slate-200 text-right">{p.flame_length_mm.toFixed(1)} mm</dd>
                <dt className="text-slate-500">Flame width</dt><dd className="font-mono text-slate-200 text-right">{p.flame_width_mm.toFixed(1)} mm</dd>
                <dt className="text-slate-500">Spread rate</dt><dd className="font-mono text-slate-200 text-right">{p.spread_rate_mm_s.toFixed(2)} mm/s</dd>
                <dt className="text-slate-500">Soot fraction</dt><dd className="font-mono text-slate-200 text-right">{p.soot_fraction.toFixed(2)}</dd>
                <dt className="text-slate-500">Regime</dt><dd className="font-mono text-sky-300 text-right">{p.visual_regime.replace(/_/g, ' ').toLowerCase()}</dd>
              </dl>
            </div>
            <div className="rounded-lg border border-space-600 bg-space-850 p-3">
              <div className="text-[11px] text-slate-500 mb-1">Closest NASA reference</div>
              {result.ranked_investigations[0] && (() => {
                const top = result.ranked_investigations[0]
                return (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm text-sky-300">{top.experiment_id}</span>
                      {top.provenance === 'real_psi' && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">REAL PSI</span>
                      )}
                    </div>
                    <div className="text-[11px] text-emerald-300 mb-1">
                      {top.similarity}% match{top.material_real ? ` · ${top.material_real}` : ''}
                    </div>
                    {top.reference_image ? (
                      <figure className="mb-1">
                        <img src={top.reference_image} alt={`NASA ${top.experiment_id} reference`}
                          className="w-full h-24 object-cover rounded border border-space-600" />
                        <figcaption className="text-[9px] text-slate-500 mt-0.5">
                          NASA PSI {top.experiment_id} — flow-visualization frame (F1C1)
                        </figcaption>
                      </figure>
                    ) : (
                      <p className="text-xs text-slate-400 line-clamp-3">{top.summary}</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* evidence ranker */}
          <EvidencePanel items={result.ranked_investigations} />
        </main>

        {/* RIGHT — playbook */}
        <aside className="col-span-3">
          <PlaybookPanel actions={result.engineering_playbook} />
        </aside>
      </div>

      {/* BOTTOM — earth spinoff */}
      <footer className="px-3 pb-3">
        <SpinoffBanner text={result.earth_spinoff} />
      </footer>
      </>
      )}
    </div>
  )
}
