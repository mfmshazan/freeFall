import { APPEARANCE_LABELS, isCurrentAppearance } from '../physics/appearance'
import { MODEL_NAME, predictLocalService } from '../physics/localService'
import type { CabinInputs, Diluent, FuelMaterial, GravityMode, PredictResponse } from '../types'

const FUEL_MAP: Record<string, FuelMaterial> = {
  sheet: 'Cotton_Fabric',
  droplet: 'Heptane_Droplet',
  rod: 'PMMA_Acrylic',
  PMMA_Acrylic: 'PMMA_Acrylic',
  Cotton_Fabric: 'Cotton_Fabric',
  Kapton_Wire: 'Kapton_Wire',
  Heptane_Droplet: 'Heptane_Droplet',
  Methane_Gas: 'Methane_Gas',
}

function bounded(value: number | undefined, fallback: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value != null && Number.isFinite(value) ? value : fallback))
}

export function normalizeInputs(raw: {
  gravity_g?: number
  o2_percent?: number
  pressure_psi?: number
  airflow_cm_s?: number
  diluent?: string
  fuel?: string
  fuel_material?: string
  world?: string
  altitude_km?: number
  gravity_mode?: GravityMode
}): CabinInputs {
  const g = bounded(raw.gravity_g, 0, 0, 3)
  const o2 = bounded(raw.o2_percent, 21, 10, 100)
  const p = bounded(raw.pressure_psi, 14.7, 3, 15)
  const flow = bounded(raw.airflow_cm_s, 0, 0, 40)
  const dil = (['N2', 'CO2', 'He'].includes(raw.diluent || '') ? raw.diluent : 'N2') as Diluent
  const key = raw.fuel_material || raw.fuel || 'rod'
  const fuel = Object.prototype.hasOwnProperty.call(FUEL_MAP, key) ? FUEL_MAP[key] : 'PMMA_Acrylic'
  return {
    gravity_g: g,
    o2_percent: o2,
    pressure_psi: p,
    airflow_cm_s: flow,
    diluent: dil,
    fuel_material: fuel,
    ...(raw.world ? { world: raw.world } : {}),
    ...(raw.altitude_km != null && Number.isFinite(raw.altitude_km) ? { altitude_km: Math.max(0, raw.altitude_km) } : {}),
    ...(raw.gravity_mode ? { gravity_mode: raw.gravity_mode } : {}),
  }
}

export async function predictFlame(raw: Parameters<typeof normalizeInputs>[0], signal?: AbortSignal): Promise<PredictResponse> {
  const inputs = normalizeInputs(raw)
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 1800)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const result = (await res.json()) as PredictResponse
    if (result.model !== MODEL_NAME || !isCurrentAppearance(result.prediction?.visual_regime)) {
      return predictLocalService(inputs)
    }
    return result
  } catch {
    return predictLocalService(inputs)
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export async function checkBackendHealth(): Promise<{ online: boolean; model?: string }> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(1200) })
    if (!res.ok) return { online: false }
    const data = (await res.json()) as { status?: string; model?: string }
    return { online: data.status === 'ok', model: data.model }
  } catch {
    return { online: false }
  }
}

declare global {
  interface Window {
    FlameAtlasPredict?: {
      predictFlame: typeof predictFlame
      checkBackendHealth: typeof checkBackendHealth
      normalizeInputs: typeof normalizeInputs
      appearanceLabels: typeof APPEARANCE_LABELS
    }
  }
}

window.FlameAtlasPredict = {
  predictFlame,
  checkBackendHealth,
  normalizeInputs,
  appearanceLabels: APPEARANCE_LABELS,
}
window.dispatchEvent(new CustomEvent('flameatlas:bridge-ready'))

