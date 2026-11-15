import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SaffireReplay from './replay/SaffireReplay'
import Bass2Experiment from './replay/Bass2Experiment'

type ReplayTab = 'bass2' | 'saffire'

function initialTab(): ReplayTab {
  const params = new URLSearchParams(window.location.search)
  const exp = params.get('exp')
  if (exp === 'saffire' || window.location.hash === '#saffire-report-results') return 'saffire'
  return 'bass2'
}

function ReplayShell() {
  const [tab, setTab] = useState<ReplayTab>(initialTab)

  return (
    <div className="min-h-screen bg-[#071323] text-slate-100">
      <div className="border-b border-white/15 bg-[#0b1b30] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#ff6a2b]">
            Recorded NASA Flight Data
          </span>
          <h1 className="text-xl font-semibold text-white mt-0.5">
            Actual Spacecraft Burn Replays
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('bass2')}
            className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase border transition ${
              tab === 'bass2'
                ? 'border-[#ff6a2b] bg-[#ff6a2b]/15 text-[#ffb38b]'
                : 'border-white/20 text-slate-300 hover:border-white/40'
            }`}
          >
            BASS-II (B1 vs B3 Videos)
          </button>
          <button
            type="button"
            onClick={() => setTab('saffire')}
            className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase border transition ${
              tab === 'saffire'
                ? 'border-[#ff6a2b] bg-[#ff6a2b]/15 text-[#ffb38b]'
                : 'border-white/20 text-slate-300 hover:border-white/40'
            }`}
          >
            Saffire-I (Camera + Sensors)
          </button>
          <a
            href="fire-lab.html"
            className="px-4 py-2 text-xs font-semibold tracking-wider uppercase border border-white/20 text-slate-200 hover:border-white/50"
          >
            Open Flame Lab →
          </a>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto p-3">
        {tab === 'saffire' ? <SaffireReplay /> : <Bass2Experiment />}
      </main>
    </div>
  )
}

createRoot(document.getElementById('replay-root')!).render(
  <StrictMode>
    <ReplayShell />
  </StrictMode>,
)
