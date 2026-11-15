import modelSpec from '../../../skills/01-flame-physics-rules.md?raw'
import planets from '../../../backend/data/planets.json'
import exampleInputs from '../data/psi_master.json'
import { freeFall, planetaryFacts, saffireReport, type SourceEntry } from '../shared/provenance'
import { drivers, FUELS } from '../physics/flameModel'
import type { CabinInputs, PredictResponse } from '../types'

const specLink = {
  label: 'Download the FlameAtlas physics specification',
  href: URL.createObjectURL(new Blob([modelSpec], { type: 'text/markdown;charset=utf-8' })),
  download: '01-flame-physics-rules.md',
}
const psi159 = { label: 'NASA PSI-159 CFI-G investigation', href: 'https://www.psi.nasa.gov/physci/repo/data/investigations/PSI-159' }
const acme = { label: 'NASA ACME investigation overview', href: 'https://science.nasa.gov/mission/acme/' }
const colourDataset = { label: 'Plotted CFI-G data (JSON)', href: 'data/flame_color_catalog.json' }
const exampleDistance = 'd = √(4Δg² + ΔO₂² + ΔP² + ΔU² + fuel penalty² + diluent penalty²)\nEach difference is scaled by 1 g, 70 percentage points, 10.4 psi or 30 cm/s. Fuel and diluent mismatch penalties are 0.5 and 0.25.'
const penalty = 'penalty = 0.6 for 0.02 < g < 0.95 or g > 1.05, plus 0.2 for O₂ ≥ 30%'
const oxygenIndex = 'OPI = (O₂ percent / 100) × (pressure / 14.7 psi) / 0.21'
const spreadFormula = '± value = estimate × min(cap, 0.08 + 0.9 × nearest d + penalty)\nCap = 0.9 for rate and 0.8 for length and width.'
const caveat = 'The ± value is a heuristic spread. Its coverage has not been calibrated.'
const sourcedCount = exampleInputs.records.filter(record => record.provenance === 'real_psi').length
const referenceRows = `The example inputs consist of ${exampleInputs.records.length - sourcedCount} seed scenarios and ${sourcedCount} sourced Saffire-I conditions. Model-estimated outputs in that file do not enter the distance calculation.`

export function gravitySource(world: keyof typeof planets, mode: string, altitude: number, gravity: number): SourceEntry {
  const p = planets[world]
  const local = p.g_surface * (p.radius_km / (p.radius_km + altitude)) ** 2
  const localMode = mode === 'surface' || mode === 'low_alt' || (mode === 'altitude' && altitude < p.max_orbit_km * 0.98 && local >= 0.002)
  const modeLabel = { surface: 'Surface / reference level', low_alt: 'Supported low altitude', free_orbit: 'Free-fall orbit', max_orbit: 'Maximum scenario altitude', altitude: 'Supported altitude' }[mode] ?? mode
  return {
    title: 'Altitude and cabin gravity', type: 'Scenario setting and calculation',
    description: 'The low and maximum altitudes are sandbox presets. Dragging the slider changes the inverse radius ratio and rounds altitude to whole kilometres. The diagram uses local gravity for supported scenarios and sets effective gravity to zero in free fall and at the maximum preset. The altitude slider also sets values below 0.002 g, or at or above 98% of the maximum altitude, to zero.',
    facts: [
      ['Destination', p.name], ['Mode', modeLabel], ['Selected altitude', `${altitude.toLocaleString()} km`],
      ['Model reference radius', `${p.radius_km.toLocaleString()} km`], ['Reference gravity', `${p.g_surface} g`],
      ['Local gravity from formula', `${local.toFixed(4)} g`],
      ['Effective cabin gravity', `${gravity} g (${(gravity * 9.81).toFixed(2)} m/s²)`],
      ['Low / maximum presets', `${p.low_orbit_km.toLocaleString()} / ${p.max_orbit_km.toLocaleString()} km`],
    ],
    formula: `Local g = reference g × (radius / (radius + altitude))²\nEffective g = ${localMode ? 'local g' : '0 by scenario rule'}\nDisplay conversion: m/s² = effective g × 9.81`,
    links: [planetaryFacts, { label: 'JPL reference radii', href: 'https://ssd.jpl.nasa.gov/planets/phys_par.html' }, { label: 'JPL lunar reference radius', href: 'https://ssd.jpl.nasa.gov/sats/phys_par/' }, freeFall],
  }
}

export function predictionSource(key: string, response?: PredictResponse, input?: CabinInputs, shown?: string): SourceEntry | undefined {
  const isOffline = response?.source === 'local-fallback'
  const color = response?.flame_color
  const details: Record<string, SourceEntry> = {
    spread: {
      title: 'Illustrative flame spread rate', type: 'Model estimate',
      description: `The baseline estimates a linear rate from the fuel coefficient, oxygen partial-pressure index, gravity, airflow and diluent. Above 25 cm/s it applies a blow-off factor. The extinction branch limits the rate to 0.04 mm/s. The FLEX droplet burning constant uses mm²/s. ${caveat}`,
      formula: `${oxygenIndex}\nRate = fuel coefficient × OPI¹·³ × (0.55 + 0.45g) × [1 + 0.6 exp(−(U − 12)² / 98)] × diluent factor\nAbove 25 cm/s, multiply by max(0, 1 − (U − 25)/8). Clamp to 0–12 mm/s.\n${spreadFormula}`,
    },
    dimensions: {
      title: 'Flame length, width and aspect ratio', type: 'Model estimate',
      description: `The reference size depends on the selected fuel and oxygen partial-pressure index. Effective gravity and airflow stretch the flame. The extinction branch halves both dimensions. ${caveat}`,
      formula: `${oxygenIndex}\nL/D = clamp(1 + 1.8g + 0.09U, 1, 4.5)\nReference length = fuel reference size × √OPI\nLength = reference length × √(L/D)\nWidth = reference length / √(L/D)\n${spreadFormula}`,
    },
    flux: {
      title: 'Radiometric heat flux', type: 'Model proxy',
      description: 'The baseline estimates heat flux from the oxygen partial-pressure index, a soot proxy and the gravity deficit below 1 g. The result is illustrative and has no radiometer calibration.',
      formula: `${oxygenIndex}\nSoot = clamp(fuel soot × diluent soot factor × oxygen fraction⁰·⁸ × (P/14.7)⁰·⁵ × [1 − 0.015 × max(0, O₂ percent − 60)], 0, 1)\nFlux = clamp(3 × OPI × (0.4 + 0.6 × soot) + 1.5 × max(0, 1 − g), 0, 25) kW/m²`,
    },
    trust: {
      title: 'Model confidence and uncertainty', type: 'Heuristic',
      description: `The confidence score decreases as the scenario moves farther from the nearest example input or incurs a gravity or oxygen penalty. The same factors widen the ± values. ${referenceRows} ${caveat} The model status is unverified when both the gravity penalty applies and O₂ is at least 30%, extrapolating when the gravity penalty applies or score is below 55, and exploratory otherwise.`,
      formula: `${exampleDistance}\n${penalty}\n${spreadFormula}\nScore = clamp(round(100 × exp(−1.4 × (nearest d + penalty))), 2, 99)`,
      links: [specLink, saffireReport],
    },
    colour: {
      title: 'Flame colour, temperature and score', type: isOffline ? 'Offline estimate' : 'Model estimate',
      description: isOffline
        ? 'The browser uses the baseline soot proxy to assign blue, yellow-blue or yellow. The displayed 50% is a fixed fallback score. The marker temperature is an illustrative estimate.'
        : 'A Gaussian process estimates adiabatic temperature from oxygen and a fuel sooting index. A classifier uses those three variables to assign colour from the observed gaseous CFI-G classes. The score starts with the highest class probability and is reduced for extrapolation. A score is model output with uncalibrated coverage for this cabin.',
      formula: isOffline
        ? 'Temperature (K) = round(1900 + 1100 × oxygen fraction)\nBlue if soot < 0.3, yellow if soot > 0.55, otherwise yellow-blue.\nBlue weight = clamp((0.5 − soot) / 0.5, 0, 1)\nYellow weight = clamp((soot − 0.2) / 0.7, 0, 1)\nYellow-blue weight = max(0, 1 − blue weight − yellow weight). Divide each by their sum.'
        : 'Colour = class with highest probability\nDisplayed score = highest probability × (0.6 if extrapolating, otherwise 1)\nExtrapolation: sooting index > 0.35 or oxygen fraction outside 0.12–0.85.',
      links: isOffline ? [specLink, colourDataset] : [psi159, acme, colourDataset],
    },
  }
  const entry = details[key]
  if (!entry) return
  entry.links ??= [specLink]
  if (!response || !input) {
    entry.description = 'Choose fabric, acrylic or a droplet to calculate an estimate for this pane. Candle mode shows a qualitative illustration.'
    entry.formula = undefined
    return entry
  }
  const facts: [string, string][] = [['Displayed value', shown || 'Unavailable']]
  if (key === 'colour' && color) {
    facts.push(['Marker temperature', `${Math.round(color.est_flame_temp_k)} K`], ['Basis', color.basis],
      ['Class weights (blue / yellow-blue / yellow)', [color.p_blue, color.p_mixed, color.p_yellow].map(w => `${Math.round(w * 100)}%`).join(' / ')])
  }
  if (key === 'spread' || key === 'dimensions' || key === 'flux') {
    facts.push(['Oxygen partial-pressure index', drivers(input).OPI.toFixed(4)])
    const fuel = FUELS[input.fuel_material]
    if (key === 'spread') facts.push(['Fuel rate coefficient', `${fuel.k_spread} mm/s`])
    if (key === 'dimensions') facts.push(['Fuel reference size', `${fuel.L0_mm} mm`])
    if (key === 'flux') facts.push(['Model soot proxy', response.prediction.soot_fraction.toFixed(4)])
  }
  facts.push(
    ['Calculation path', isOffline ? 'Browser fallback' : 'Prediction API'],
    ['Model inputs', `${response.planet_telemetry?.effective_gravity_g ?? input.gravity_g} g · ${input.o2_percent}% O₂ · ${input.pressure_psi} psi · ${input.airflow_cm_s} cm/s`],
    ['Fuel and diluent', `${input.fuel_material.replace(/_/g, ' ')} · ${input.diluent}`],
  )
  entry.facts = facts
  return entry
}

type ColourData = {
  points: { xo2: number; tad_k: number; color: string; fuel: string; test_id: string }[]
}

export function colourChartSource(data: ColourData | null): SourceEntry {
  return {
    title: 'Data behind the flame colour map', type: 'NASA observations and source-reported calculations',
    description: 'Each point uses XO₂ (oxygen mole fraction in the burner feed), Tad (adiabatic flame temperature) and colour or extinction label from the NASA PSI-159 CFI-G Inverse Flames CSV. Tad is a calculated source value. See the CFI-G final report, PDF pp. 29 and 59, for the temperature definition and apparatus. The app normalizes the colour labels and plots rows with numeric XO₂ and Tad. The cabin marker uses the selected cabin oxygen on the same axis as a model input.',
    formula: 'Oxygen (%) = 100 × XO₂',
    facts: [['Plotted rows', data ? String(data.points.length) : 'Data unavailable']],
    links: [psi159, acme, colourDataset],
    table: data ? {
      headers: ['Test ID', 'Fuel', 'O₂ (%)', 'Tad (K)', 'Colour / limit'],
      rows: data.points.map(p => [p.test_id || 'Unavailable', p.fuel, String(Number((p.xo2 * 100).toFixed(2))), String(p.tad_k), p.color === 'mixed' ? 'yellow-blue' : p.color]),
    } : undefined,
  }
}
