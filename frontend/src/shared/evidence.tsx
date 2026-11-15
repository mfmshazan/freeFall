import { useEffect, useState } from 'react'

// Every view in the app is explicitly one of these three kinds, so a viewer can
// always tell recorded reality from analysis from decoration. Use only the
// label(s) that actually apply to a given panel.
export type LabelKind = 'recorded' | 'derived' | 'illustrative'

const META: Record<LabelKind, { text: string; cls: string; icon: string }> = {
  recorded: { text: 'Recorded NASA experiment', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: '●' },
  derived: { text: 'Derived analysis', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40', icon: 'ƒ' },
  illustrative: { text: 'Illustrative animation', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: '✺' },
}

export function ViewLabel({ kind, className = '' }: { kind: LabelKind; className?: string }) {
  const m = META[kind]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded border ${m.cls} ${className}`}>
      <span aria-hidden>{m.icon}</span> {m.text}
    </span>
  )
}

// Respect the OS "reduce motion" setting. Components use this to drop looping
// animation (e.g. the illustrative flame) and heavy transitions.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return !!reduced
}

const CAT_STYLE: Record<string, { label: string; cls: string }> = {
  start: { label: 'Starting condition', cls: 'text-sky-300' },
  outcome: { label: 'Observed outcome', cls: 'text-emerald-300' },
  meta: { label: 'Recording metadata', cls: 'text-slate-400' },
  unknown: { label: 'Not documented', cls: 'text-violet-300' },
}
export function CategoryTag({ category }: { category: string }) {
  const c = CAT_STYLE[category] ?? CAT_STYLE.meta
  return <span className={`text-[9px] uppercase tracking-wide ${c.cls}`}>{c.label}</span>
}
