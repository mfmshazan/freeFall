import type { RankedInvestigation } from '../types'

export default function EvidencePanel({ items }: { items: RankedInvestigation[] }) {
  return (
    <div className="rounded-lg border border-space-600 bg-space-850 p-4">
      <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">
        Ranked NASA PSI Evidence
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {items.map((r) => (
          <a key={r.experiment_id} href={r.doi_url} target="_blank" rel="noreferrer"
            className="block rounded-md border border-space-600 bg-space-800 p-3 hover:border-sky-500/60 transition">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-sky-300">{r.experiment_id}</span>
                {r.provenance === 'real_psi' ? (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 tracking-wide">REAL PSI</span>
                ) : (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-space-600 text-slate-500 tracking-wide">SEED</span>
                )}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                {r.similarity}% match
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-space-600 text-slate-400">{r.hardware_rack}</span>
              {r.parameter_diffs.slice(0, 4).map((d, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 font-mono">{d}</span>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{r.summary}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
