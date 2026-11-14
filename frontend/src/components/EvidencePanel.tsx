import type { RankedInvestigation } from '../types'

export default function EvidencePanel({ items }: { items: RankedInvestigation[] }) {
  return <div className="rounded-lg border border-space-600 bg-space-850 p-4">
    <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">Similar model inputs</h3>
    <p className="text-xs text-slate-400 mb-3">Similarity compares conditions, not measured outcome coverage.</p>
    <div className="grid gap-2">{items.map(r => <div key={r.experiment_id} className="rounded-md border border-space-600 bg-space-800 p-3">
      <div className="text-sm text-sky-300">{r.experiment_id} · {r.similarity}% input similarity</div>
      <div className="text-xs text-amber-300">{r.provenance === 'real_psi' ? 'Sourced conditions · estimated outcomes' : 'Synthetic example · not a NASA measurement'}</div>
      <p className="text-xs text-slate-400 mt-1">{r.parameter_diffs.join(' · ') || 'Similar listed inputs'}</p>
    </div>)}</div>
  </div>
}
