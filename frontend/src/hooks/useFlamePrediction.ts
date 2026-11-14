import { useEffect, useState } from 'react'
import type { CabinInputs, PredictResponse } from '../types'
import { predictLocalService } from '../physics/localService'
import { isCurrentAppearance } from '../physics/appearance'

const API = 'http://localhost:8000/api/predict'
const DEBOUNCE_MS = 150

// Backend-first with instant local fallback. Debounced so dragging a slider
// doesn't spam the API; local physics result shows immediately either way.
export function useFlamePrediction(inputs: CabinInputs): PredictResponse {
  const [result, setResult] = useState<PredictResponse>(() => predictLocalService(inputs))

  useEffect(() => {
    const controller = new AbortController()
    let timeout: number | undefined
    // show local result instantly for a snappy canvas
    setResult(predictLocalService(inputs))

    const debounce = window.setTimeout(async () => {
      timeout = window.setTimeout(() => controller.abort(), 1200)
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputs),
          signal: controller.signal,
        })
        if (res.ok) {
          const data = (await res.json()) as PredictResponse
          if (!controller.signal.aborted && data?.prediction && isCurrentAppearance(data.prediction.visual_regime)) {
            setResult({ ...data, source: 'backend' })
          }
        }
      } catch {
        /* backend offline — keep local fallback already set */
      } finally {
        window.clearTimeout(timeout)
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(debounce)
      window.clearTimeout(timeout)
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
