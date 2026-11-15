import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EvidencePanel, { LinkedEvidence } from './components/EvidencePanel'
import ResearchStories from './components/ResearchStories'
import { useEvidence } from './hooks/useEvidence'
import { normalizeInputs } from './flameatlas/predictBridge'
import type { EvidenceQuery, ReplayLink } from './evidence/types'
import type { EvidenceId } from './data/researchStories'

const params = new URLSearchParams(location.search)
const cabin = normalizeInputs({
  gravity_g: Number(params.get('gravity_g') ?? 0),
  o2_percent: Number(params.get('o2_percent') ?? 21),
  pressure_psi: Number(params.get('pressure_psi') ?? 14.7),
  airflow_cm_s: Number(params.get('airflow_cm_s') ?? 20),
  diluent: params.get('diluent') ?? 'N2',
  fuel_material: params.get('fuel_material') ?? 'Cotton_Fabric',
})

const openReplay = ({ target }: ReplayLink) => { location.href = `replay.html#${target}` }

function EvidenceExplorer() {
  const [context, setContext] = useState<NonNullable<EvidenceQuery['context']>>({})
  const [story, setStory] = useState('ventilation')
  const [ids, setIds] = useState<EvidenceId[]>([])
  const query = useMemo(() => ({ cabin, context }), [context])
  const { result, message } = useEvidence(query)

  return (
    <div className="grid min-w-0 gap-4 py-4">
      <p className="text-sm text-slate-300">Scenario for comparison · {cabin.gravity_g} g · {cabin.o2_percent}% O₂ · {cabin.pressure_psi} psi · {cabin.airflow_cm_s} cm/s · {cabin.diluent}</p>
      <div id="research-stories" className="grid min-w-0 gap-2">
        <ResearchStories storyId={story} onSelect={id => { setStory(id); setIds([]) }}
          onOpenEvidence={setIds} onOpenReplay={id => { location.href = `replay.html?exp=${id === 'replay' ? 'saffire' : 'bass2'}` }} />
        {!!ids.length && <LinkedEvidence ids={ids} onReplay={openReplay} />}
      </div>
      <EvidencePanel filters={context} onChange={setContext} result={result} message={message} onReplay={openReplay} />
    </div>
  )
}

createRoot(document.getElementById('evidence-root')!).render(<EvidenceExplorer />)
