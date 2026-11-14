export default function SpinoffBanner({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-space-600 bg-gradient-to-r from-sky-500/10 to-emerald-500/10 px-4 py-3 flex items-center gap-3">
      <span className="text-lg">🌍</span>
      <div>
        <span className="text-[11px] font-semibold tracking-widest text-emerald-300 uppercase mr-2">
          Earth Spinoff
        </span>
        <span className="text-sm text-slate-200">{text}</span>
      </div>
    </div>
  )
}
