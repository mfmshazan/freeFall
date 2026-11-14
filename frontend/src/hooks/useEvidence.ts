import { useEffect, useMemo, useState } from 'react'
import bundled from '../data/evidence_catalog.json'
import { rankEvidence } from '../evidence/rankEvidence'
import type { EvidenceCatalog, EvidenceQuery, EvidenceResponse } from '../evidence/types'

export const evidenceCatalog = bundled as EvidenceCatalog
const API = 'http://localhost:8000/api/evidence'

type RemoteState = { result: EvidenceResponse | null; message: string | null }

export function useEvidence(query: EvidenceQuery) {
  const local = useMemo(() => rankEvidence(evidenceCatalog, query), [query])
  const [remote, setRemote] = useState<(RemoteState & { query: EvidenceQuery }) | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let timeout: number | undefined
    const publish = (state: RemoteState) => {
      if (active) setRemote({ query, ...state })
    }
    const debounce = window.setTimeout(async () => {
      timeout = window.setTimeout(() => controller.abort(), 1200)
      try {
        const response = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Evidence endpoint unavailable')
        const data: EvidenceResponse = await response.json()
        if (data.catalog_version === local.catalog_version && data.ranking_version === local.ranking_version) {
          if (!controller.signal.aborted) publish({ result: data, message: null })
        } else if (!controller.signal.aborted) {
          publish({ result: null, message: 'The server uses a different evidence version. Showing the bundled catalog.' })
        }
      } catch {
        publish({ result: null, message: 'Showing the bundled catalog. Original source links require a connection.' })
      } finally {
        window.clearTimeout(timeout)
      }
    }, 150)

    return () => {
      active = false
      controller.abort()
      window.clearTimeout(debounce)
      window.clearTimeout(timeout)
    }
  }, [query, local])

  const currentRemote = remote?.query === query ? remote : null
  return { result: currentRemote?.result ?? local, message: currentRemote?.message }
}
