// Minimal dependency-free SVG line chart for verified NASA sensor data.
// Supports multiple series, null-as-gap (missing measurements shown as breaks),
// vertical event markers, and a synced time cursor.

export interface Series {
  key: string
  label: string
  color: string
  points: { t: number; v: number | null }[]
}

interface Props {
  series: Series[]
  unit: string
  tMin: number
  tMax: number
  cursorT: number
  markers?: { t: number; label: string }[]
  onSeek?: (t: number) => void
  height?: number
}

export default function TimeSeriesChart({
  series, unit, tMin, tMax, cursorT, markers = [], onSeek, height = 200,
}: Props) {
  const W = 760
  const H = height
  const padL = 48
  const padR = 12
  const padT = 10
  const padB = 24
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const vals = series.flatMap((s) => s.points.map((p) => p.v).filter((v): v is number => v != null))
  const vMin = vals.length ? Math.min(...vals) : 0
  const vMax = vals.length ? Math.max(...vals) : 1
  const vPad = (vMax - vMin) * 0.08 || 1
  const y0 = vMin - vPad
  const y1 = vMax + vPad

  const x = (t: number) => padL + ((t - tMin) / (tMax - tMin || 1)) * plotW
  const y = (v: number) => padT + (1 - (v - y0) / (y1 - y0 || 1)) * plotH

  // build path with gaps: null breaks the line (missing data shown as a gap)
  const pathFor = (pts: { t: number; v: number | null }[]) => {
    let d = ''
    let pen = false
    for (const p of pts) {
      if (p.v == null) { pen = false; continue }
      d += `${pen ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)} `
      pen = true
    }
    return d.trim()
  }

  const yTicks = 4
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => y0 + ((y1 - y0) * i) / yTicks)
  const xTicks = 5
  const xticks = Array.from({ length: xTicks + 1 }, (_, i) => tMin + ((tMax - tMin) * i) / xTicks)

  const handle = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const t = tMin + ((px - padL) / plotW) * (tMax - tMin)
    onSeek(Math.max(tMin, Math.min(tMax, t)))
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none"
      style={{ cursor: onSeek ? 'crosshair' : 'default' }} onClick={handle}>
      {/* grid + y labels */}
      {ticks.map((tv, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(tv)} y2={y(tv)} stroke="#1f2738" strokeWidth={1} />
          <text x={padL - 6} y={y(tv) + 3} textAnchor="end" fontSize={9} fill="#64748b">{tv.toFixed(y1 - y0 < 5 ? 1 : 0)}</text>
        </g>
      ))}
      {xticks.map((tv, i) => (
        <text key={i} x={x(tv)} y={H - 8} textAnchor="middle" fontSize={9} fill="#64748b">{tv.toFixed(0)}s</text>
      ))}
      <text x={padL} y={padT - 1} fontSize={9} fill="#94a3b8">{unit}</text>

      {/* event markers (stagger labels so close events don't overlap) */}
      {markers.map((m, i) => m.t != null && (
        <g key={i}>
          <line x1={x(m.t)} x2={x(m.t)} y1={padT} y2={padT + plotH} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
          <text x={x(m.t) + 3} y={padT + 10 + (i % 2) * 11} fontSize={8} fill="#f59e0b">{m.label}</text>
        </g>
      ))}

      {/* series */}
      {series.map((s) => (
        <path key={s.key} d={pathFor(s.points)} fill="none" stroke={s.color} strokeWidth={1.5} />
      ))}

      {/* time cursor */}
      <line x1={x(cursorT)} x2={x(cursorT)} y1={padT} y2={padT + plotH} stroke="#e2e8f0" strokeWidth={1.5} />
      <circle cx={x(cursorT)} cy={padT} r={3} fill="#e2e8f0" />
    </svg>
  )
}
