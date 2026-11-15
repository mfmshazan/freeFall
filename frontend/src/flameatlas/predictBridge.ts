import { predictLocalService } from '../physics/localService'
import type { CabinInputs, Diluent, FuelMaterial, GravityMode, PredictResponse } from '../types'

const FUEL_MAP: Record<string, FuelMaterial> = {
  candle: 'Cotton_Fabric',
  sheet: 'Cotton_Fabric',
  droplet: 'Heptane_Droplet',
  rod: 'PMMA_Acrylic',
  PMMA_Acrylic: 'PMMA_Acrylic',
  Cotton_Fabric: 'Cotton_Fabric',
  Kapton_Wire: 'Kapton_Wire',
  Heptane_Droplet: 'Heptane_Droplet',
  Methane_Gas: 'Methane_Gas',
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
  const g = Math.max(0, Math.min(3, Number(raw.gravity_g ?? 0)))
  const o2 = Math.max(10, Math.min(100, Number(raw.o2_percent ?? 21)))
  const p = Math.max(3, Math.min(15, Number(raw.pressure_psi ?? 14.7)))
  const flow = Math.max(0, Math.min(40, Number(raw.airflow_cm_s ?? 0)))
  const dil = (['N2', 'CO2', 'He'].includes(raw.diluent || '') ? raw.diluent : 'N2') as Diluent
  const fuel = FUEL_MAP[raw.fuel_material || raw.fuel || 'rod'] ?? 'PMMA_Acrylic'
  return {
    gravity_g: g,
    o2_percent: o2,
    pressure_psi: p,
    airflow_cm_s: flow,
    diluent: dil,
    fuel_material: fuel,
    ...(raw.world ? { world: raw.world } : {}),
    ...(raw.altitude_km != null ? { altitude_km: Math.max(0, Number(raw.altitude_km)) } : {}),
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
    return (await res.json()) as PredictResponse
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
    }
  }
}

window.FlameAtlasPredict = {
  predictFlame,
  checkBackendHealth,
  normalizeInputs,
}
window.dispatchEvent(new CustomEvent('flameatlas:bridge-ready'))

