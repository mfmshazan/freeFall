import { useEffect, useRef, useState } from 'react'
import type { CabinInputs, PredictResponse } from '../types'
import { predictLocalService } from '../physics/localService'
import { isCurrentAppearance } from '../physics/appearance'

const API = 'http://localhost:8000/api/predict'
const DEBOUNCE_MS = 150

// Backend-first with instant local fallback. Debounced so dragging a slider
// doesn't spam the API; local physics result shows immediately either way.
export function useFlamePrediction(inputs: CabinInputs): PredictResponse {
  const [result, setResult] = useState<PredictResponse>(() => predictLocalService(inputs))
  const timer = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    // show local result instantly for a snappy canvas
    setResult(predictLocalService(inputs))

    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      try {
        const ctrl = new AbortController()
        const to = window.setTimeout(() => ctrl.abort(), 1200)
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs),
          signal: ctrl.signal,
        })
        window.clearTimeout(to)
        if (res.ok) {
          const data = (await res.json()) as PredictResponse
          if (active && data?.prediction && isCurrentAppearance(data.prediction.visual_regime)) {
            setResult({ ...data, source: 'backend' })
          }
        }
      } catch {
        /* backend offline — keep local fallback already set */
      }
    }, DEBOUNCE_MS)

    return () => {
      active = false
      if (timer.current) window.clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inputs.gravity_g,
    inputs.o2_percent,
    inputs.pressure_psi,
    inputs.airflow_cm_s,
    inputs.diluent,
    inputs.fuel_material,
  ])

  return result
}
