import { RESEARCH_STORIES, type EvidenceId, type ReplayId } from '../data/researchStories'

interface Props {
  storyId: string
  onSelect: (id: string) => void
  onOpenEvidence: (ids: EvidenceId[]) => void
  onOpenReplay: (id: ReplayId) => void
}

export default function ResearchStories({ storyId, onSelect, onOpenEvidence, onOpenReplay }: Props) {
  const story = RESEARCH_STORIES.find(({ id }) => id === storyId) ?? RESEARCH_STORIES[0]
  const evidence = story.evidence

  return (
    <section aria-labelledby="story-heading" className="rounded-lg border border-space-600 bg-space-850 p-4 text-sm">
      <h2 id="story-heading" className="font-semibold text-slate-100">Research stories</h2>
      <p className="mt-1 text-xs text-slate-400">Explore what each experiment can tell us. Your cabin settings stay in place.</p>
      <label htmlFor="research-story" className="mt-4 block text-xs text-slate-300">Choose a research story</label>
      <select id="research-story" value={story.id} onChange={e => onSelect(e.target.value)}
        className="mt-1 w-full rounded border border-space-600 bg-space-800 px-2 py-2 text-slate-100">
        {RESEARCH_STORIES.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
      </select>
      <article className="mt-4 space-y-2">
        <p className="text-xs text-sky-300">{story.review}</p>
        <h3 className="font-semibold text-slate-100">{story.question}</h3>
        <p className="text-slate-300">{story.finding}</p>
        <p className="text-xs text-slate-400"><strong className="text-slate-300">Apparatus and material.</strong> {story.scope}</p>
        <p className="text-xs text-slate-400"><strong className="text-amber-200">Limits.</strong> {story.limit}</p>
        <ul className="space-y-1 border-t border-space-600 pt-2 text-xs">
          {story.sources.map(source => <li key={source.url}>
            <a className="text-sky-300 underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
            <span className="text-slate-400"> · {source.locator}</span>
          </li>)}
        </ul>
        {evidence && <button type="button" className="block rounded border border-sky-500/40 px-2 py-1 text-xs text-sky-200"
          onClick={() => onOpenEvidence([...evidence.ids])}>{evidence.label}</button>}
        {story.replays?.map(replay => <button key={replay.id} type="button" onClick={() => onOpenReplay(replay.id)}
          className="block rounded border border-sky-500/40 px-2 py-1 text-xs text-sky-200">{replay.label}</button>)}
      </article>
    </section>
  )
}
