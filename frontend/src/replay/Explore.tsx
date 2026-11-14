import { useState } from 'react'
import SaffireReplay from './SaffireReplay'
import { Bass2Single } from './Bass2Experiment'
import Bass2Compare from './Bass2Compare'
import { ViewLabel } from '../shared/evidence'

// ---------------------------------------------------------------------------
// Guided "Explore an experiment" flow:
//   1. Choose a recorded NASA dataset (Saffire-I or BASS-II)
//   2. Watch the real experiment and inspect its documented conditions
//   3. (BASS-II only) Compare run B1 vs B3 and explore the documented differences
// Everything shown here is recorded data or a clearly-labelled derived analysis —
// never a synthesised flame for an untested setting.
// ---------------------------------------------------------------------------

type Dataset = 'saffire' | 'bass2'

const DATASETS: { id: Dataset; name: string; blurb: string; tag: string; hasCompare: boolean; img?: string }[] = [
  {
    id: 'saffire', name: 'Saffire-I', tag: 'PSI-98 · Cygnus / ISS',
    blurb: 'A large-scale (0.4 × 0.9 m) SIBAL fabric fire in a flow duct, with a full calibrated sensor time-series (radiometers, thermocouples, O₂/CO₂).',
    hasCompare: false, img: '/reference/saffire-1-flowvis.jpg',
  },
  {
    id: 'bass2', name: 'BASS-II', tag: 'PSI-25 · MSG / ISS',
    blurb: 'Thin PMMA-film flame spread in the Microgravity Science Glovebox. Two runs (B1, B3) differ in ventilation flow — explore what changed.',
    hasCompare: true,
  },
]

const STEPS = ['Choose', 'Watch & inspect', 'Compare'] as const

export default function Explore() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [step, setStep] = useState(1)

  const chosen = DATASETS.find((d) => d.id === dataset)
  const canCompare = !!chosen?.hasCompare

  const go = (s: number) => {
    if (s === 1) { setStep(1); return }
    if (!dataset) return
    if (s === 3 && !canCompare) return
    setStep(s)
  }

  return (
    <div className="flex flex-col">
      {/* stepper */}
      <nav aria-label="Explore steps" className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-space-700 bg-space-900/40">
        {STEPS.map((label, i) => {
          const n = i + 1
          const disabled = (n >= 2 && !dataset) || (n === 3 && !canCompare)
          const active = step === n
          return (
            <div key={label} className="flex items-center gap-2">
              <button onClick={() => go(n)} disabled={disabled} aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-35 disabled:cursor-not-allowed
                  ${active ? 'border-sky-500 bg-sky-500/15 text-sky-200' : 'border-space-600 text-slate-400 hover:text-slate-200'}`}>
                <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-[11px] ${active ? 'bg-sky-500 text-space-900' : 'bg-space-700'}`}>{n}</span>
                {label}
              </button>
              {n < 3 && <span className="text-slate-600" aria-hidden>→</span>}
            </div>
          )
        })}
        {chosen && (
          <span className="ml-auto text-[11px] text-slate-500">
            Dataset: <span className="text-slate-300">{chosen.name}</span> · <span className="text-slate-500">{chosen.tag}</span>
          </span>
        )}
      </nav>

      {/* step 1 — choose */}
      {step === 1 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-200">Step 1 — Choose a recorded experiment</h2>
            <ViewLabel kind="recorded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl">
            {DATASETS.map((d) => (
              <button key={d.id}
                onClick={() => { setDataset(d.id); setStep(2) }}
                className={`text-left rounded-lg border p-4 transition-colors hover:border-sky-500/70
                  ${dataset === d.id ? 'border-sky-500 bg-sky-500/10' : 'border-space-600 bg-space-850'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-100">{d.name}</span>
                  <span className="text-[11px] font-mono text-slate-500">{d.tag}</span>
                </div>
                {d.img && <img src={d.img} alt="" className="w-full h-28 object-cover rounded mt-2 border border-space-700" />}
                <p className="mt-2 text-xs text-slate-400">{d.blurb}</p>
                <div className="mt-2 flex items-center gap-2">
                  <ViewLabel kind="recorded" />
                  {!d.hasCompare && <span className="text-[10px] text-slate-500">single run (no B1/B3 compare)</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* step 2 — watch & inspect */}
      {step === 2 && chosen && (
        <div>
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
            <h2 className="text-sm font-semibold text-slate-200">Step 2 — Watch {chosen.name} and inspect its documented conditions</h2>
            {canCompare && (
              <button onClick={() => go(3)} className="ml-auto text-xs px-3 py-1 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-200">
                Next: compare B1 vs B3 →
              </button>
            )}
          </div>
          {dataset === 'saffire' ? <SaffireReplay /> : <Bass2Single />}
        </div>
      )}

      {/* step 3 — compare (BASS-II only) */}
      {step === 3 && canCompare && (
        <div>
          <div className="flex items-center gap-2 px-4 pt-3">
            <h2 className="text-sm font-semibold text-slate-200">Step 3 — Compare B1 vs B3</h2>
          </div>
          <Bass2Compare />
        </div>
      )}
    </div>
  )
}
