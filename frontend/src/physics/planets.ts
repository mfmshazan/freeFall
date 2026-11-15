import planets from '../../../backend/data/planets.json'
import type { CabinInputs, PlanetTelemetry } from '../types'

export function resolvePlanetGravity(inputs: CabinInputs): PlanetTelemetry | null {
  const key = inputs.world?.trim().toLowerCase()
  if (!key || !Object.prototype.hasOwnProperty.call(planets, key)) return null
  const spec = planets[key as keyof typeof planets]
  const { gravity_g: gravity, altitude_km: altitude } = inputs
  const { g_surface: surface, radius_km: radius, low_orbit_km: low, max_orbit_km: max } = spec
  const mode = inputs.gravity_mode ?? (gravity === 0 && altitude == null ? 'free_orbit' : 'custom')
  const field = (height: number) => surface * (radius / (radius + height)) ** 2
  const bounded = (height: number) => Math.max(0, Math.min(max, height))
  let height: number
  let local: number
  let effective: number

  if (mode === 'free_orbit') {
    height = altitude == null ? low : bounded(altitude)
    local = field(height)
    effective = 0
  } else if (mode === 'surface') {
    height = 0
    local = effective = surface
  } else if (mode === 'low_alt') {
    height = low
    local = effective = field(height)
  } else if (mode === 'max_orbit') {
    height = max
    local = field(height)
    effective = 0
  } else if (mode === 'altitude' || altitude != null) {
    height = bounded(altitude ?? 0)
    local = field(height)
    effective = height >= max * 0.98 || local < 0.002 ? 0 : local
  } else {
    effective = Math.max(0, Math.min(surface, gravity))
    if (effective <= 0.002) {
      height = max
      local = effective = 0
    } else {
      height = bounded(radius * ((surface / effective) ** 0.5 - 1))
      local = effective
    }
  }

  return {
    world: spec.id,
    name: spec.name,
    surface_label: spec.surface_label,
    gravity_mode: mode,
    altitude_km: Number(height.toFixed(1)),
    effective_gravity_g: Number(effective.toFixed(4)),
    local_field_g: Number(local.toFixed(4)),
    g_surface: surface,
    radius_km: radius,
    low_orbit_km: low,
    max_orbit_km: max,
  }
}
