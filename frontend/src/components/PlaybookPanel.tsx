import type { PlaybookAction } from '../types'

export default function PlaybookPanel({ actions }: { actions: PlaybookAction[] }) {
  return <div className="rounded-lg border border-space-600 bg-space-850 p-4">
    <h3 className="text-sm text-slate-200">Research notes</h3>
    {actions.length === 0 && <p className="text-xs text-slate-400 mt-2">No sourced research notes available for this scenario.</p>}
    {actions.map(a => <div key={a.category} className="mt-2 text-xs text-slate-400"><strong>{a.headline}</strong><p>{a.detail}</p></div>)}
  </div>
}
