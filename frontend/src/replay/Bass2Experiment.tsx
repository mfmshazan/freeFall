import { useEffect, useRef, useState } from 'react'
import Bass2Compare from './Bass2Compare'
import { ViewLabel, CategoryTag } from '../shared/evidence'

const CAT_ORDER: { id: string; label: string }[] = [
  { id: 'start', label: 'Starting conditions — set before / at ignition' },
  { id: 'outcome', label: 'Observations & outcomes — recorded after the burn' },
  { id: 'meta', label: 'Recording metadata — not physical conditions' },
]

// Container: sub-toggle between the single B1 detail page and the B1-vs-B3 comparison.
export default function Bass2View() {
  const [mode, setMode] = useState<'compare' | 'single'>('compare')
  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-3">
        <span className="text-[11px] text-slate-500 uppercase tracking-widest mr-1">BASS-II view:</span>
        <button onClick={() => setMode('compare')}
          className={`text-xs px-3 py-1 rounded border ${mode === 'compare' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200' : 'border-space-600 text-slate-400'}`}>
          B1 vs B3 compare
        </button>
        <button onClick={() => setMode('single')}
          className={`text-xs px-3 py-1 rounded border ${mode === 'single' ? 'border-sky-500 bg-sky-500/10 text-sky-200' : 'border-space-600 text-slate-400'}`}>
          B1 detail
        </button>
      </div>
      {mode === 'compare' ? <Bass2Compare /> : <Bass2Single />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BASS-II Sample 147 / Test B1 — REAL NASA data experiment page.
// Shows the actual flight video (playback only — NOT sensor time), the verified
// recorded conditions, the matching proof sheet, source filenames, the NASA
// investigation link, documented limitations, and the B3 comparison run.
// No measurement is inferred from video colour; illustrative animation lives
// only in the separate "Predictor" view.
// ---------------------------------------------------------------------------

interface VField { field: string; value: string; source: string; qualifier?: string; category?: string }
interface Conditions {
  investigation: string; psi_id: string; nasa_report: string; investigation_link: string
  pi: string; platform: string
  test: { test_no: string; sample_no: string; proof_sheet_title: string; actual_date: string; video_display_date: string; gmt_day_2014: number }
  verified_conditions: VField[]
  unknown_or_not_documented: string[]
  video: { file: string; source_file: string; duration_s: number; note: string; camera_clock_note: string }
  proof_sheet: { file: string; source_file: string; content: string }
  sources: string[]
  limitations: string[]
  comparison_second_run: {
    test_no: string; sample_no: string; why: string; airflow_difference: string
    other_differences_that_could_affect_comparison: string[]
    files: { video: string; proof_sheet: string; status: string }
  }
}

const BASE = '/replay/bass-2'
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 10))}`

export function Bass2Single() {
  const [cond, setCond] = useState<Conditions | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch(`${BASE}/conditions.json`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setCond).catch((e) => setErr(String(e)))
  }, [])

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }
  const seek = (val: number) => { const v = videoRef.current; if (v) { v.currentTime = val; setT(val) } }

  if (err) return <div className="p-6 text-red-400" role="alert">Couldn’t load BASS-II data ({err}). The file <code>conditions.json</code> may be missing.</div>
  if (!cond) return <div className="p-6 text-slate-400">Loading recorded BASS-II data…</div>

  return (
    <div className="p-3 grid grid-cols-12 gap-3">
      {/* header */}
      <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2">
        <div>
          <span className="text-sm font-semibold text-slate-100">{cond.investigation} — Sample {cond.test.sample_no}, Test {cond.test.test_no}</span>
          <span className="ml-2 text-[11px] font-mono text-slate-500">{cond.psi_id} · {cond.nasa_report} · {cond.test.actual_date}</span>
        </div>
        <ViewLabel kind="recorded" />
      </div>

      {/* LEFT: actual video */}
      <div className="col-span-12 md:col-span-7 rounded-lg border border-space-600 bg-space-850 p-3">
        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
          <span className="text-[11px] text-slate-500">Flight video (side view, on-board data overlay)</span>
          <div className="flex items-center gap-2">
            <ViewLabel kind="recorded" />
            <span className="text-[11px] font-mono text-amber-300/80">playback time — not sensor time</span>
          </div>
        </div>
        {failed ? (
          <div className="w-full aspect-video rounded bg-black flex items-center justify-center text-center text-xs text-amber-300 px-4" role="alert">
            Video asset “{cond.video.file}” failed to load — the recording may be missing.
          </div>
        ) : (
          <video ref={videoRef} src={`${BASE}/${cond.video.file}`} className="w-full rounded bg-black" preload="metadata"
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)} onError={() => setFailed(true)} playsInline />
        )}
        <div className="mt-2 flex items-center gap-3">
          <button onClick={toggle} disabled={failed} aria-label={playing ? 'Pause video' : 'Play video'}
            className="px-3 py-1.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-200 text-sm w-20 disabled:opacity-40">
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <input type="range" min={0} max={dur || cond.video.duration_s} step={0.05} value={t} disabled={failed}
            onChange={(e) => seek(parseFloat(e.target.value))} className="flex-1" aria-label="Seek video" />
          <span className="font-mono text-[11px] text-slate-400 w-24 text-right">{fmt(t)} / {fmt(dur || cond.video.duration_s)}</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">{cond.video.note}</p>
        <p className="text-[10px] text-slate-600">{cond.video.camera_clock_note}</p>
      </div>

      {/* RIGHT: verified conditions, grouped */}
      <div className="col-span-12 md:col-span-5 rounded-lg border border-space-600 bg-space-850 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase">Documented Conditions</h3>
          <ViewLabel kind="recorded" />
        </div>
        <div className="text-[11px] text-slate-500 mb-2">PI {cond.pi} · {cond.platform}</div>
        <table className="w-full text-xs">
          <tbody>
            {CAT_ORDER.map((cat) => {
              const rows = cond.verified_conditions.filter((f) => (f.category ?? 'start') === cat.id)
              if (!rows.length) return null
              return (
                <tr key={cat.id} className="align-top">
                  <td colSpan={2} className="pt-2 pb-2">
                    <div className="mb-1"><CategoryTag category={cat.id} /> <span className="text-[10px] text-slate-600">{cat.label}</span></div>
                    <table className="w-full">
                      <tbody>
                        {rows.map((f) => (
                          <tr key={f.field} className="border-b border-space-700/60">
                            <td className="py-1 pr-2 text-slate-500 align-top">{f.field}</td>
                            <td className="py-1 text-slate-200 text-right">
                              {f.value}
                              {f.qualifier && <span className="block text-[9px] text-amber-400/70">{f.qualifier}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-amber-400/90 mb-1">Unknown / not documented</div>
          <ul className="text-[10px] text-slate-500 list-disc list-inside space-y-0.5">
            {cond.unknown_or_not_documented.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      </div>

      {/* proof sheet */}
      <div className="col-span-12 md:col-span-7 rounded-lg border border-space-600 bg-space-850 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase">Matching Proof Sheet</h3>
          <a href={`${BASE}/${cond.proof_sheet.file}`} target="_blank" rel="noreferrer" className="text-[11px] text-sky-300 hover:underline">open full PDF ↗</a>
        </div>
        <div className="text-[10px] text-slate-500 mb-2">{cond.proof_sheet.content}</div>
        <iframe src={`${BASE}/${cond.proof_sheet.file}#toolbar=0`} title="BASS-II B1 proof sheet"
          className="w-full rounded border border-space-700 bg-white" style={{ height: 360 }} />
        <div className="mt-1 text-[9px] font-mono text-slate-600">source: {cond.proof_sheet.source_file}</div>
      </div>

      {/* sources + limitations */}
      <div className="col-span-12 md:col-span-5 flex flex-col gap-3">
        <div className="rounded-lg border border-space-600 bg-space-850 p-3">
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-2">Sources & Link</h3>
          <a href={cond.investigation_link} target="_blank" rel="noreferrer"
            className="inline-block text-[11px] text-sky-300 hover:underline mb-2">NASA PSI investigation {cond.psi_id} ↗</a>
          <ul className="text-[10px] font-mono text-slate-500 space-y-0.5">
            {cond.sources.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <h3 className="text-xs font-semibold tracking-widest text-amber-400/90 uppercase mb-2">Limitations</h3>
          <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-0.5">
            {cond.limitations.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      </div>

      {/* second-run comparison */}
      <div className="col-span-12 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
        <h3 className="text-xs font-semibold tracking-widest text-sky-300 uppercase mb-2">
          Suggested Comparison Run — Test {cond.comparison_second_run.test_no} / Sample {cond.comparison_second_run.sample_no} (different airflow)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-300">{cond.comparison_second_run.why}</p>
            <p className="mt-2 text-xs text-slate-200"><span className="text-slate-500">Airflow difference: </span>{cond.comparison_second_run.airflow_difference}</p>
            <div className="mt-2 text-[11px] font-mono text-emerald-300/90 border border-emerald-500/30 rounded p-2 bg-emerald-500/5">
              Files ({cond.comparison_second_run.files.status}):<br />
              video: {cond.comparison_second_run.files.video}<br />
              proof: {cond.comparison_second_run.files.proof_sheet}
              <div className="mt-1 text-[9px] text-slate-500">See the “B1 vs B3 compare” sub-view above for the full side-by-side.</div>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 mb-1">Other differences that could affect the comparison</div>
            <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
              {cond.comparison_second_run.other_differences_that_could_affect_comparison.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
