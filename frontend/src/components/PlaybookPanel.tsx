import type { PlaybookAction } from '../types'

const META: Record<string, { icon: string; accent: string }> = {
  PREVENTION: { icon: '🛡️', accent: 'text-sky-300' },
  DETECTION: { icon: '📡', accent: 'text-violet-300' },
  SUPPRESSION: { icon: '🧯', accent: 'text-emerald-300' },
}

export default function PlaybookPanel({ actions }: { actions: PlaybookAction[] }) {
  return (
    <div className="rounded-lg border border-space-600 bg-space-850 p-4 h-full">
      <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">
        "Fix It" Engineering Playbook
      </h3>
      <div className="flex flex-col gap-2">
        {actions.map((a) => {
          const m = META[a.category]
          return (
            <div key={a.category}
              className={`rounded-md border p-3 ${
                a.triggered ? 'border-amber-500/50 bg-amber-500/5' : 'border-space-600 bg-space-800'
              }`}>
              <div className="flex items-center gap-2">
                <span>{m.icon}</span>
                <span className={`text-[11px] font-semibold tracking-wider ${m.accent}`}>{a.category}</span>
                {a.triggered && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">ACTION</span>
                )}
              </div>
              <div className="mt-1 text-sm text-slate-200">{a.headline}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{a.detail}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
