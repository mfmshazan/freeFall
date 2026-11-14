import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// BASS-II B1 (Sample 147) vs B3 (Sample 148) — REAL NASA data comparison.
// Two independent flight videos with their own playback controls, an optional
// "link playback" toggle (playback-position alignment ONLY — not synchronized
// scientific time), a documented field-by-field difference table, sources, and
// comparison limitations. No measurement is inferred from flame colour, and
// differences are NOT attributed to airflow alone.
// ---------------------------------------------------------------------------

interface Run { test_no: string; sample_no: string; video: string; proof_sheet: string; video_source: string; proof_source: string }
interface Field { field: string; b1: string; b3: string; status: 'same' | 'different' | 'unknown'; note?: string }
interface Compare {
  title: string; investigation: string; psi_id: string; investigation_link: string; nasa_report: string; pi: string
  runs: { b1: Run; b3: Run }
  fields: Field[]
  comparison_limitations: string[]
}

const BASE = '/replay/bass-2'
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const STATUS: Record<string, { label: string; cls: string }> = {
  same: { label: 'same', cls: 'text-slate-500' },
  different: { label: 'DIFFERENT', cls: 'text-amber-300' },
  unknown: { label: 'unknown', cls: 'text-violet-300' },
}

export default function Bass2Compare() {
  const [data, setData] = useState<Compare | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [linked, setLinked] = useState(false)

  const b1Ref = useRef<HTMLVideoElement>(null)
  const b3Ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch(`${BASE}/compare.json`).then((r) => r.json()).then(setData).catch((e) => setErr(String(e)))
  }, [])

  if (err) return <div className="p-6 text-red-400">Failed to load comparison data: {err}</div>
  if (!data) return <div className="p-6 text-slate-400">Loading B1 vs B3 data…</div>

  return (
    <div className="p-3 grid grid-cols-12 gap-3">
      {/* header */}
      <div className="col-span-12 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2">
        <div>
          <span className="text-sm font-semibold text-slate-100">{data.title}</span>
          <span className="ml-2 text-[11px] font-mono text-slate-500">{data.psi_id} · {data.nasa_report} · PI {data.pi}</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 tracking-wide">REAL NASA DATA — NOT A MODEL</span>
      </div>

      {/* link-playback control */}
      <div className="col-span-12 flex items-center gap-3 rounded-lg border border-space-600 bg-space-850 px-4 py-2">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} />
          Link playback
        </label>
        <span className="text-[11px] text-amber-300/80">
          Playback-position alignment only — these are independent recordings with no documented scientific time synchronization.
        </span>
      </div>

      {/* side-by-side videos */}
      <VideoCard ref={b1Ref} run={data.runs.b1} other={b3Ref} linked={linked} accent="sky" />
      <VideoCard ref={b3Ref} run={data.runs.b3} other={b1Ref} linked={linked} accent="emerald" />

      {/* difference table */}
      <div className="col-span-12 rounded-lg border border-space-600 bg-space-850 p-3">
        <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-2">
          Documented Conditions — Verified Differences & Unknowns
        </h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-space-600">
              <th className="text-left py-1 font-medium">Field</th>
              <th className="text-left py-1 font-medium">B1 · Sample 147</th>
              <th className="text-left py-1 font-medium">B3 · Sample 148</th>
              <th className="text-right py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.fields.map((f) => {
              const s = STATUS[f.status]
              const diff = f.status === 'different'
              return (
                <tr key={f.field} className={`border-b border-space-700/50 ${diff ? 'bg-amber-500/5' : ''}`}>
                  <td className="py-1 pr-2 text-slate-400 align-top">{f.field}</td>
                  <td className={`py-1 pr-2 align-top ${diff ? 'text-amber-200' : 'text-slate-300'}`}>{f.b1}</td>
                  <td className={`py-1 pr-2 align-top ${diff ? 'text-amber-200' : 'text-slate-300'}`}>
                    {f.b3}
                    {f.note && <span className="block text-[9px] text-slate-500">{f.note}</span>}
                  </td>
                  <td className={`py-1 text-right align-top font-semibold ${s.cls}`}>{s.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* sources + limitations */}
      <div className="col-span-5 rounded-lg border border-space-600 bg-space-850 p-3">
        <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-2">Sources & Link</h3>
        <a href={data.investigation_link} target="_blank" rel="noreferrer"
          className="inline-block text-[11px] text-sky-300 hover:underline mb-2">NASA PSI investigation {data.psi_id} ↗</a>
        <ul className="text-[10px] font-mono text-slate-500 space-y-0.5">
          <li>• {data.runs.b1.video_source}</li>
          <li>• {data.runs.b1.proof_source}</li>
          <li>• {data.runs.b3.video_source}</li>
          <li>• {data.runs.b3.proof_source}</li>
          <li>• BASS-II Test Matrix by PI Final.xlsx → Bhattacharjee (B1, B3)</li>
          <li>• PSI-25 Experimental Table → CSV lines 2 (B1) and 4 (B3)</li>
          <li>• BASS-II Summary Report.pdf ({data.nasa_report}, §2.3.5)</li>
        </ul>
        <div className="mt-2 flex gap-3">
          <a href={`${BASE}/${data.runs.b1.proof_sheet}`} target="_blank" rel="noreferrer" className="text-[11px] text-sky-300 hover:underline">B1 proof sheet ↗</a>
          <a href={`${BASE}/${data.runs.b3.proof_sheet}`} target="_blank" rel="noreferrer" className="text-[11px] text-sky-300 hover:underline">B3 proof sheet ↗</a>
        </div>
      </div>
      <div className="col-span-7 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <h3 className="text-xs font-semibold tracking-widest text-amber-400/90 uppercase mb-2">Comparison Limitations</h3>
        <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1">
          {data.comparison_limitations.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
    </div>
  )
}

import { forwardRef } from 'react'

const VideoCard = forwardRef<HTMLVideoElement, {
  run: Run; other: React.RefObject<HTMLVideoElement>; linked: boolean; accent: 'sky' | 'emerald'
}>(function VideoCard({ run, other, linked, accent }, ref) {
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const self = ref as React.RefObject<HTMLVideoElement>

  const toggle = () => {
    const v = self.current; if (!v) return
    if (v.paused) {
      v.play(); setPlaying(true)
      if (linked && other.current) other.current.play()
    } else {
      v.pause(); setPlaying(false)
      if (linked && other.current) other.current.pause()
    }
  }
  const seek = (val: number) => {
    const v = self.current; if (!v) return
    v.currentTime = val; setT(val)
    if (linked && other.current) other.current.currentTime = val // playback-position alignment only
  }

  const ring = accent === 'sky' ? 'border-sky-500/40' : 'border-emerald-500/40'
  const chip = accent === 'sky' ? 'bg-sky-500/15 text-sky-300' : 'bg-emerald-500/15 text-emerald-300'

  return (
    <div className={`col-span-6 rounded-lg border ${ring} bg-space-850 p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${chip}`}>Test {run.test_no} · Sample {run.sample_no}</span>
        <span className="text-[11px] font-mono text-amber-300/80">playback time — not sensor time</span>
      </div>
      <video ref={ref} src={`${BASE}/${run.video}`} className="w-full rounded bg-black"
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)} playsInline />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={toggle} className="px-3 py-1.5 rounded bg-space-700 border border-space-600 text-slate-200 text-sm w-20">
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <input type="range" min={0} max={dur || 1} step={0.05} value={t}
          onChange={(e) => seek(parseFloat(e.target.value))} className="flex-1" />
        <span className="font-mono text-[11px] text-slate-400 w-16 text-right">{fmt(t)}/{fmt(dur)}</span>
      </div>
    </div>
  )
})
