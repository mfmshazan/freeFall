import { useEffect, useMemo, useRef, useState } from 'react'
import TimeSeriesChart, { type Series } from './TimeSeriesChart'

// ---------------------------------------------------------------------------
// Saffire-I Experiment Replay — REAL NASA data only.
// Images (S1C1 burn camera) and sensors (Calibrated Data sheet) share one
// verified clock: elapsed = (frame_epoch - t0)/1000, confirmed against the
// workbook "Camera Data" sheet. Nothing here is modelled or decorative.
// ---------------------------------------------------------------------------

interface Channel { key: string; label: string; unit: string; group: string }
interface Sample { t: number; [k: string]: number | null }
interface Sensors {
  t0_epoch_ms: number; sample_hz: number; duration_s: number
  channels: Channel[]; markers: { t: number; label: string }[]; samples: Sample[]
}
interface Frame { t: number; epoch: number; src: string }
interface Frames { camera: string; frame_count: number; t_start: number; t_end: number; frames: Frame[] }
interface Conditions {
  investigation: string; psi_id: string; doi: string; platform: string; date_utc: string; pi: string
  sample: { material: string; size_mm: string; run: string }
  measured_at_ignition: { o2_percent: number; co2_percent: number; pressure_psia: number; flow_cm_s_nominal: number }
  events: { igniter_on_s: number; igniter_off_s: number }
  timing: { t0_epoch_ms: number; image_sync: string; image_sync_note: string }
  camera: { id: string; frames_available: number; window_s: [number, number]; note: string }
  sources: string[]; provenance: string
}

interface ReportResults {
  source_url: string; report_page: number; material: string; gravity: string; nominal_duct_flow_cm_s: number; metric: string
  results: { run_id: string; direction: string; spread_mm_s: number }[]; caveat: string
}

const BASE = '/replay/saffire-1'
const GROUPS: { id: string; label: string; unit: string; colors: string[] }[] = [
  { id: 'radiometer', label: 'Flame radiation (radiometers)', unit: 'mW/cm²', colors: ['#f87171', '#fb923c', '#fbbf24', '#f472b6'] },
  { id: 'sample_temp', label: 'Sample thermocouples (TC7–12)', unit: '°C', colors: ['#60a5fa', '#38bdf8', '#34d399', '#a3e635', '#facc15', '#fb923c'] },
  { id: 'atmosphere', label: 'Atmosphere (O₂ / CO₂ / pressure)', unit: 'mixed', colors: ['#34d399', '#f87171', '#a78bfa'] },
  { id: 'igniter', label: 'Igniter current', unit: 'A', colors: ['#fbbf24'] },
]
const SPEEDS = [1, 5, 10, 30]

export default function SaffireReplay() {
  const [sensors, setSensors] = useState<Sensors | null>(null)
  const [frames, setFrames] = useState<Frames | null>(null)
  const [cond, setCond] = useState<Conditions | null>(null)
  const [report, setReport] = useState<ReportResults | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(10)
  const [group, setGroup] = useState('radiometer')
  const raf = useRef<number | null>(null)
  const last = useRef<number>(0)

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/sensors.json`).then((r) => r.json()),
      fetch(`${BASE}/frames.json`).then((r) => r.json()),
      fetch(`${BASE}/conditions.json`).then((r) => r.json()),
    ])
      // open mid-burn so the first visible frame actually shows the flame front
      .then(([s, f, c]) => { setSensors(s); setFrames(f); setCond(c); setT(Math.round((f.t_start + f.t_end) / 2)) })
      .catch((e) => setErr(String(e)))
  }, [])

  useEffect(() => {
    fetch(`${BASE}/report-results.json`)
      .then(r => { if (!r.ok) throw new Error('Report results unavailable'); return r.json() })
      .then(setReport).catch(() => setReport(null))
  }, [])

  // playback loop (real experiment seconds × speed)
  useEffect(() => {
    if (!playing || !sensors) return
    last.current = performance.now()
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000
      last.current = now
      setT((prev) => {
        const next = prev + dt * speed
        if (next >= sensors.duration_s) { setPlaying(false); return sensors.duration_s }
        return next
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [playing, speed, sensors])

  const curFrame = useMemo(() => {
    if (!frames) return null
    if (t < frames.t_start - 0.5 || t > frames.t_end + 0.5) return null
    let best = frames.frames[0]
    for (const f of frames.frames) { if (f.t <= t + 1e-6) best = f; else break }
    return best
  }, [frames, t])

  const curSample = useMemo(() => {
    if (!sensors) return null
    let best = sensors.samples[0]
    for (const s of sensors.samples) { if (s.t <= t + 1e-6) best = s; else break }
    return best
  }, [sensors, t])

  const chartSeries: Series[] = useMemo(() => {
    if (!sensors) return []
    const g = GROUPS.find((x) => x.id === group)!
    const chans = sensors.channels.filter((c) => c.group === group)
    return chans.map((c, i) => ({
      key: c.key,
      label: c.label,
      color: g.colors[i % g.colors.length],
      points: sensors.samples.map((s) => ({ t: s.t, v: s[c.key] })),
    }))
  }, [sensors, group])

  if (err) return <div className="p-6 text-red-400">Failed to load replay data: {err}</div>
  if (!sensors || !frames || !cond) return <div className="p-6 text-slate-400">Loading real Saffire-I data…</div>

  const groupMeta = GROUPS.find((x) => x.id === group)!

  return (
    <div className="p-3 grid grid-cols-12 gap-3">
      {/* header strip */}
      <div className="col-span-12 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2">
        <div>
          <span className="text-sm font-semibold text-slate-100">{cond.investigation}</span>
          <span className="ml-2 text-[11px] font-mono text-slate-500">{cond.psi_id} · {cond.date_utc} · DOI {cond.doi}</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 tracking-wide">
          REAL NASA DATA — NOT A MODEL
        </span>
      </div>

      {/* LEFT: real images */}
      <div className="col-span-7 rounded-lg border border-space-600 bg-space-850 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-500">Flight camera {cond.camera.id} — actual burn footage</span>
          <span className="text-[11px] font-mono text-sky-300">t = {t.toFixed(1)} s</span>
        </div>
        <div className="relative bg-black rounded flex items-center justify-center" style={{ aspectRatio: '480/345' }}>
          {curFrame ? (
            <img src={`${BASE}/${curFrame.src}`} alt={`S1C1 frame at ${curFrame.t}s`} className="w-full h-full object-contain rounded" />
          ) : (
            <div className="text-center text-slate-500 text-xs px-6">
              <div className="text-amber-400 mb-1">No S1C1 frame at t = {t.toFixed(0)} s</div>
              S1C1_jpeg_part1 covers {frames.t_start.toFixed(0)}–{frames.t_end.toFixed(0)} s only.
              Sensor data continues to {sensors.duration_s.toFixed(0)} s (chart below).
            </div>
          )}
          {curFrame && (
            <span className="absolute bottom-1 right-2 text-[9px] font-mono text-emerald-300/80 bg-black/50 px-1 rounded">
              epoch {curFrame.epoch}
            </span>
          )}
        </div>

        {/* transport */}
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => setPlaying((p) => !p)}
            className="px-3 py-1.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-200 text-sm w-20">
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <input type="range" min={0} max={sensors.duration_s} step={0.1} value={t}
            onChange={(e) => { setPlaying(false); setT(parseFloat(e.target.value)) }} className="flex-1" />
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-space-800 border border-space-600 rounded text-xs text-slate-300 px-2 py-1">
            {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-600">
          <span>0 s</span>
          <span className="text-amber-500/70">igniter {cond.events.igniter_on_s}–{cond.events.igniter_off_s} s</span>
          <span>{sensors.duration_s.toFixed(0)} s</span>
        </div>
      </div>

      {/* RIGHT: recorded conditions */}
      <div className="col-span-5 rounded-lg border border-space-600 bg-space-850 p-3">
        <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-2">Replay metadata and calibrated data</h3>
        <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
          <dt className="text-slate-500">Material</dt><dd className="text-slate-200 text-right">{cond.sample.material}</dd>
          <dt className="text-slate-500">Sample size</dt><dd className="text-slate-200 text-right">{cond.sample.size_mm} mm</dd>
          <dt className="text-slate-500">Platform</dt><dd className="text-slate-200 text-right">{cond.platform}</dd>
          <dt className="text-slate-500">O₂ at ignition</dt><dd className="font-mono text-sky-300 text-right">{cond.measured_at_ignition.o2_percent?.toFixed(2)} %</dd>
          <dt className="text-slate-500">CO₂ at ignition</dt><dd className="font-mono text-sky-300 text-right">{cond.measured_at_ignition.co2_percent?.toFixed(2)} %</dd>
          <dt className="text-slate-500">Pressure</dt><dd className="font-mono text-sky-300 text-right">{cond.measured_at_ignition.pressure_psia?.toFixed(2)} PSIA</dd>
          <dt className="text-slate-500">Flow (nominal)</dt><dd className="font-mono text-sky-300 text-right">{cond.measured_at_ignition.flow_cm_s_nominal} cm/s</dd>
        </dl>

        {/* live readout at current time */}
        <div className="mt-3 pt-2 border-t border-space-700">
          <div className="text-[11px] text-slate-500 mb-1">Live sensor values @ t = {t.toFixed(1)} s</div>
          <div className="grid grid-cols-2 gap-y-1 text-xs font-mono">
            <LiveVal label="O₂" v={curSample?.o2} unit="%" />
            <LiveVal label="CO₂" v={curSample?.co2} unit="%" />
            <LiveVal label="Radiometer 3" v={curSample?.rad3} unit="mW/cm²" />
            <LiveVal label="Sample TC7" v={curSample?.tc7} unit="°C" />
            <LiveVal label="Flow" v={curSample?.flow} unit="cm/s" />
            <LiveVal label="Igniter" v={curSample?.igniter_a} unit="A" />
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-600">Image↔sensor timing: <span className="text-emerald-400">{cond.timing.image_sync}</span>. {cond.timing.image_sync_note}</p>
      </div>

      {report && <section className="col-span-12 rounded-lg border border-space-600 bg-space-850 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Measured results in the NASA report</h3>
        <p className="text-xs text-slate-400 mt-1">{report.material} · {report.gravity} · nominal duct flow {report.nominal_duct_flow_cm_s} cm/s · {report.metric}</p>
        <div className="flex gap-6 mt-2 text-sm text-sky-300">{report.results.map(r => <span key={r.run_id}>Run {r.run_id}, {r.direction}: {r.spread_mm_s} mm/s</span>)}</div>
        <p className="text-xs text-slate-400 mt-2">{report.caveat}</p>
        <a className="text-xs text-sky-400" href={report.source_url} target="_blank" rel="noreferrer">NASA Saffire-I report, page {report.report_page}</a>
      </section>}

      {/* chart */}
      <div className="col-span-12 rounded-lg border border-space-600 bg-space-850 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase">Verified Measurement — {groupMeta.label}</h3>
          <div className="flex gap-1">
            {GROUPS.map((g) => (
              <button key={g.id} onClick={() => setGroup(g.id)}
                className={`text-[11px] px-2 py-1 rounded border ${group === g.id ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-space-600 text-slate-500'}`}>
                {g.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <TimeSeriesChart series={chartSeries} unit={groupMeta.unit} tMin={0} tMax={sensors.duration_s}
          cursorT={t} markers={sensors.markers} onSeek={(nt) => { setPlaying(false); setT(nt) }} height={210} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {chartSeries.map((s) => (
            <span key={s.key} className="text-[10px] flex items-center gap-1 text-slate-400">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.label}
            </span>
          ))}
          <span className="text-[10px] text-slate-600 ml-auto">Source: {cond.sources[0]} · click chart or drag slider to seek</span>
        </div>
      </div>
    </div>
  )
}

function LiveVal({ label, v, unit }: { label: string; v: number | null | undefined; unit: string }) {
  return (
    <div className="flex justify-between pr-3">
      <span className="text-slate-500">{label}</span>
      <span className={v == null ? 'text-slate-600' : 'text-slate-200'}>
        {v == null ? '— gap' : `${v.toFixed(2)} ${unit}`}
      </span>
    </div>
  )
}
