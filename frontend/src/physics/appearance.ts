import type { VisualRegime } from '../types'

export const APPEARANCE_LABELS: Record<VisualRegime, string> = {
  SOOT_FREE_BLUE_SPHERE: 'Blue palette',
  STRETCHED_LAMINAR_TEARDROP: 'Stretched blue palette',
  SOOTY_YELLOW_CORE: 'Yellow-core palette',
  BUBBLING_PMMA_STREAKS: 'PMMA streak palette',
  INVISIBLE_COOL_FLAME: 'Faint violet palette (illustrative)',
  QUENCHED_EXTINGUISHED: 'Modeled extinction',
}

export function isCurrentAppearance(value: unknown): value is VisualRegime {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(APPEARANCE_LABELS, value)
}
