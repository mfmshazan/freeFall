import type { Uncertainty } from '../types'

const STYLE: Record<string, { label: string; ring: string; text: string; bg: string }> = {
  HIGH_CONFIDENCE: { label: 'HIGH CONFIDENCE', ring: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40' },
  CAUTION_EXTRAPOLATING: { label: 'CAUTION — EXTRAPOLATING', ring: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40' },
  UNVERIFIED_REGIME_DO_NOT_TRUST: { label: 'DO NOT TRUST — UNVERIFIED', ring: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40' },
}

export default function TrustGauge({ u }: { u: Uncertainty }) {
  const s = STYLE[u.trust_status]
  const r = 46
  const circ = 2 * Math.PI * r
  const dash = (u.trust_score / 100) * circ

  return (
    <div className={`rounded-lg border p-4 ${s.bg}`}>
      <div className="flex items-center gap-4">
        <svg width="110" height="110" className="shrink-0">
          <circle cx="55" cy="55" r={r} fill="none" stroke="#1f2738" strokeWidth="9" />
          <circle cx="55" cy="55" r={r} fill="none" stroke={s.ring} strokeWidth="9"
            strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} transform="rotate(-90 55 55)" />
          <text x="55" y="50" textAnchor="middle" className="fill-slate-100" fontSize="22" fontWeight="700">{u.trust_score}</text>
          <text x="55" y="68" textAnchor="middle" className="fill-slate-500" fontSize="10">TRUST</text>
        </svg>
        <div className="min-w-0">
          <div className={`text-sm font-bold tracking-wide ${s.text}`}>{s.label}</div>
          <div className="mt-1 text-xs text-slate-400">Recommended safety margin</div>
          <div className="text-2xl font-mono text-slate-100">{u.safety_margin_multiplier.toFixed(1)}×</div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-300">{u.plain_english_explanation}</p>
    </div>
  )
}
