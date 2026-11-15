import { forwardRef, useEffect, useRef, useState } from 'react'
import { bassReport } from '../shared/provenance'
import { RecordingAppearance } from './RecordingAppearance'
import { ViewLabel, CategoryTag } from '../shared/evidence'

// ---------------------------------------------------------------------------
// BASS-II  B1 (Sample 147)  vs  B3 (Sample 148) — Recorded NASA data.
// Two independent flight videos (own controls + optional playback-position
// link), evidence grouped into starting conditions / observed outcomes /
// recording metadata / unknowns, and a "What changed?" panel. No causal claims
// are made from the comparison; nothing is inferred from flame colour.
// ---------------------------------------------------------------------------

interface AttrVal { value: string; source: string }
interface CField { key: string; field: string; status: 'same' | 'different' | 'unknown'; unit?: string; b1: AttrVal[]; b3: AttrVal[]; plain: string; uncertainty?: string; note?: string }
interface Group { category: 'start' | 'outcome' | 'meta' | 'unknown'; label: string; fields: CField[] }
interface Run { test_no: string; sample_no: string; video: string; proof_sheet: string; video_source: string; proof_source: string }
interface Compare {
  title: string; investigation: string; psi_id: string; investigation_link: string; nasa_report: string; pi: string
  runs: { b1: Run; b3: Run }; groups: Group[]; comparison_limitations: string[]
}

const BASE = '/replay/bass-2'
const STATUS: Record<string, { label: string; cls: string }> = {
  same: { label: 'same', cls: 'text-slate-500' },
  different: { label: 'DIFFERENT', cls: 'text-amber-300' },
  unknown: { label: 'unknown', cls: 'text-violet-300' },
}

export default function Bass2Compare({ focusRun }: { focusRun?: 'b1' | 'b3' }) {
  const [data, setData] = useState<Compare | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [linked, setLinked] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string>('air')

  const b1Ref = useRef<HTMLVideoElement>(null)
  const b3Ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch(`${BASE}/compare.json`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setData).catch((e) => setErr(String(e)))
  }, [])

  useEffect(() => {
    if (data && focusRun) document.getElementById(`bass-${focusRun}`)?.focus()
  }, [data, focusRun])

  // when linked, if either clip ends, stop both (clips have different lengths)
  const onEnded = () => { if (linked) { b1Ref.current?.pause(); b3Ref.current?.pause() } }

  if (err) return <div className="p-6 text-red-400" role="alert">Couldn’t load comparison data ({err}). The processed file <code>compare.json</code> may be missing.</div>
  if (!data) return <div className="p-6 text-slate-400">Loading recorded B1 vs B3 data…</div>

  const allFields = data.groups.flatMap((g) => g.fields.map((f) => ({ ...f, category: g.category })))
  const selected = allFields.find((f) => f.key === selectedKey) ?? allFields[0]

  return (
    <div className="p-3 grid grid-cols-12 gap-3">
      {/* header */}
      <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2">
        <div>
          <span className="text-sm font-semibold text-slate-100">{data.title}</span>
          <span className="ml-2 text-[11px] font-mono text-slate-500">{data.psi_id} · {data.nasa_report} · PI {data.pi}</span>
        </div>
        <ViewLabel kind="recorded" />
      </div>

      {/* link-playback control */}
      <div className="col-span-12 flex flex-wrap items-center gap-3 rounded-lg border border-space-600 bg-space-850 px-4 py-2">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} />
          Link playback
        </label>
        <span className="text-[11px] text-amber-300/80">
          Playback-position alignment only — independent recordings with no documented scientific-time synchronization. If one clip ends, both stop.
        </span>
        <span className="text-xs text-sky-300"><button className="source-link" type="button" data-provenance="bass-timing" aria-haspopup="dialog">Playback timing source</button></span>
      </div>

      {/* side-by-side videos */}
      <VideoCard ref={b1Ref} run={data.runs.b1} other={b3Ref} linked={linked} accent="sky" onEnded={onEnded} />
      <VideoCard ref={b3Ref} run={data.runs.b3} other={b1Ref} linked={linked} accent="emerald" onEnded={onEnded} />

      <div className="col-span-12"><RecordingAppearance recording="bass" /></div>

      {/* What changed? */}
      <div className="col-span-12 lg:col-span-5 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold tracking-widest text-sky-300 uppercase">What changed?</h3>
          <ViewLabel kind="derived" />
        </div>
        <label className="block text-[11px] text-slate-500 mb-1" htmlFor="wc-field">Pick a field to inspect</label>
        <select id="wc-field" value={selected.key} onChange={(e) => setSelectedKey(e.target.value)}
          className="w-full bg-space-800 border border-space-600 rounded px-2 py-1.5 text-sm text-slate-200 mb-3">
          {data.groups.map((g) => (
            <optgroup key={g.category} label={g.label}>
              {g.fields.map((f) => <option key={f.key} value={f.key}>{f.field}{f.status === 'different' ? '  (differs)' : ''}</option>)}
            </optgroup>
          ))}
        </select>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-100">{selected.field}</span>
          <CategoryTag category={selected.category} />
          <span className={`ml-auto text-[11px] font-semibold ${STATUS[selected.status].cls}`}>{STATUS[selected.status].label}</span>
        </div>
        <p className="text-xs text-slate-300 mb-2">{selected.plain}</p>

        {/* two highlighted experiment cards for the selected field */}
        <div className="grid grid-cols-2 gap-2">
          {(['b1', 'b3'] as const).map((r) => {
            const run = data.runs[r]
            const vals = selected[r]
            return (
              <div key={r} className={`rounded border p-2 ${selected.status === 'different' ? 'border-amber-500/50 bg-amber-500/5' : 'border-space-600 bg-space-800'}`}>
                <div className={`text-[11px] font-semibold ${r === 'b1' ? 'text-sky-300' : 'text-emerald-300'}`}>
                  {run.test_no} · Sample {run.sample_no}
                </div>
                {vals.map((v, i) => (
                  <div key={i} className="mt-0.5">
                    <span className="text-sm text-slate-100 font-mono">{v.value}{selected.unit ? ` ${selected.unit}` : ''}</span>
                    {v.source !== '—' && <a className="block text-[10px] text-sky-300 underline" target="_blank" rel="noreferrer"
                      href={/proof|still|nikon/i.test(v.source) ? `${BASE}/${run.proof_sheet}` : /video|overlay/i.test(v.source) ? `${BASE}/${run.video}` : /report|§|^TM/i.test(v.source) ? bassReport.href : data.investigation_link}>
                      {v.source}
                    </a>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {selected.uncertainty && (
          <p className="mt-2 text-[11px] text-amber-300/90"><span className="font-semibold">Uncertainty:</span> {selected.uncertainty}</p>
        )}
        {selected.note && <p className="mt-1 text-[10px] text-slate-500">{selected.note}</p>}
        {selected.category === 'outcome' && (
          <p className="mt-2 text-[10px] text-emerald-300/80">This is a measured <strong>outcome</strong>, kept separate from the input conditions — it is not something that was set.</p>
        )}
      </div>

      {/* grouped evidence table */}
      <div className="col-span-12 lg:col-span-7 rounded-lg border border-space-600 bg-space-850 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase">Documented evidence (grouped)</h3>
          <ViewLabel kind="recorded" />
        </div>
        <p className="mb-2 text-xs text-sky-300"><button className="source-link" type="button" data-provenance="bass-values" aria-haspopup="dialog">Sources for table values</button></p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[460px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-600 border-b border-space-600">
                <th className="text-left py-1 font-medium">Field</th>
                <th className="text-left py-1 font-medium">B1 · 147</th>
                <th className="text-left py-1 font-medium">B3 · 148</th>
                <th className="text-right py-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.groups.map((g) => (
                <GroupRows key={g.category} group={g} selectedKey={selected.key} onSelect={setSelectedKey} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* sources + limitations */}
      <div className="col-span-12 min-w-0 md:col-span-5 rounded-lg border border-space-600 bg-space-850 p-3">
        <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-2">Sources & link</h3>
        <a href={data.investigation_link} target="_blank" rel="noreferrer" className="inline-block text-[11px] text-sky-300 hover:underline mb-2">NASA PSI investigation {data.psi_id} ↗</a>
        <a href={bassReport.href} target="_blank" rel="noreferrer" className="ml-3 text-[11px] text-sky-300 underline">{bassReport.label}</a>
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
      <div className="col-span-12 min-w-0 md:col-span-7 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <h3 className="text-xs font-semibold tracking-widest text-amber-400/90 uppercase mb-2">Comparison limitations</h3>
        <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1">
          {data.comparison_limitations.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>
    </div>
  )
}

function GroupRows({ group, selectedKey, onSelect }: { group: Group; selectedKey: string; onSelect: (k: string) => void }) {
  return (
    <>
      <tr><td colSpan={4} className="pt-2 pb-1">
        <span className="text-[10px] uppercase tracking-widest text-slate-500">{group.label}</span>
      </td></tr>
      {group.fields.map((f) => {
        const s = STATUS[f.status]
        const diff = f.status === 'different'
        const sel = f.key === selectedKey
        return (
          <tr key={f.key}
            className={`border-b border-space-700/50 cursor-pointer hover:bg-space-800 ${diff ? 'bg-amber-500/5' : ''} ${sel ? 'outline outline-1 outline-sky-500/50' : ''}`}
            onClick={() => onSelect(f.key)} tabIndex={0} role="button"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(f.key) } }}
            aria-pressed={sel}>
            <td className="py-1 pr-2 text-slate-400 align-top">{f.field}</td>
            <td className={`py-1 pr-2 align-top ${diff ? 'text-amber-200' : 'text-slate-300'}`}>{f.b1.map((v) => v.value).join(' · ')}{f.unit ? ` ${f.unit}` : ''}</td>
            <td className={`py-1 pr-2 align-top ${diff ? 'text-amber-200' : 'text-slate-300'}`}>{f.b3.map((v) => v.value).join(' · ')}{f.unit ? ` ${f.unit}` : ''}</td>
            <td className={`py-1 text-right align-top font-semibold ${s.cls}`}>{s.label}</td>
          </tr>
        )
      })}
    </>
  )
}

const VideoCard = forwardRef<HTMLVideoElement, {
  run: Run; other: React.RefObject<HTMLVideoElement>; linked: boolean; accent: 'sky' | 'emerald'; onEnded: () => void
}>(function VideoCard({ run, other, linked, accent, onEnded }, ref) {
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [failed, setFailed] = useState(false)
  const self = ref as React.RefObject<HTMLVideoElement>
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const toggle = () => {
    const v = self.current; if (!v) return
    if (v.paused) { v.play(); setPlaying(true); if (linked) other.current?.play() }
    else { v.pause(); setPlaying(false); if (linked) other.current?.pause() }
  }
  const seek = (val: number) => {
    const v = self.current; if (!v) return
    v.currentTime = val; setT(val)
    if (linked && other.current) other.current.currentTime = val
  }

  const ring = accent === 'sky' ? 'border-sky-500/40' : 'border-emerald-500/40'
  const chip = accent === 'sky' ? 'bg-sky-500/15 text-sky-300' : 'bg-emerald-500/15 text-emerald-300'

  return (
    <div id={`bass-${run.test_no.toLowerCase()}`} tabIndex={-1}
      className={`col-span-12 min-w-0 md:col-span-6 rounded-lg border ${ring} bg-space-850 p-3`}>
      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${chip}`}>Test {run.test_no} · Sample {run.sample_no}</span>
        <div className="flex items-center gap-2">
          <ViewLabel kind="recorded" />
          <span className="text-[11px] font-mono text-amber-300/80">playback time — not sensor time</span>
        </div>
      </div>
      {failed ? (
        <div className="w-full aspect-video rounded bg-black flex items-center justify-center text-center text-xs text-amber-300 px-4" role="alert">
          Video asset “{run.video}” failed to load. The recording may be missing from the processed assets.
        </div>
      ) : (
        <video ref={ref} src={`${BASE}/${run.video}`} className="w-full rounded bg-black" preload="metadata"
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); onEnded() }}
          onError={() => setFailed(true)} playsInline />
      )}
      <div className="mt-2 flex items-center gap-3">
        <button onClick={toggle} disabled={failed}
          className="px-3 py-1.5 rounded bg-space-700 border border-space-600 text-slate-200 text-sm w-20 disabled:opacity-40"
          aria-label={`${playing ? 'Pause' : 'Play'} Test ${run.test_no} video`}>
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <input type="range" min={0} max={dur || 1} step={0.05} value={t} disabled={failed}
          onChange={(e) => seek(parseFloat(e.target.value))} className="min-w-0 flex-1"
          aria-label={`Seek Test ${run.test_no} video`} />
        <span className="font-mono text-[11px] text-slate-400 w-16 text-right">{fmt(t)}/{fmt(dur)}</span>
      </div>
    </div>
  )
})
