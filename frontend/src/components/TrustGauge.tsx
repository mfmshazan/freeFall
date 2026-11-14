import type { Uncertainty } from '../types'

export default function TrustGauge({ u, source }: { u: Uncertainty; source: 'backend' | 'local-fallback' }) {
  return <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
    <h3 className="text-sm font-semibold text-amber-300">Model uncertainty · evidence limited</h3>
    <p className="mt-2 text-xs text-slate-300">No comparable measured outcome used by this model. Training includes synthetic examples and estimated outcomes.</p>
    <p className="mt-2 text-xs text-slate-400">{source === 'backend' ? 'Model-based standard deviation' : 'Heuristic spread'} for length: {u.std_length_mm.toFixed(2)} mm. Not a calibrated interval.</p>
  </div>
}
