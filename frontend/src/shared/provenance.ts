import './provenance.css'

export type SourceLink = { label: string; href: string; download?: string }
export type SourceEntry = {
  title: string
  type: string
  description: string
  formula?: string
  facts?: [string, string][]
  links?: SourceLink[]
  table?: { headers: string[]; rows: string[][] }
}

export const planetaryFacts: SourceLink = { label: 'NASA planetary fact sheets', href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/' }
export const orbitalElements: SourceLink = { label: 'JPL orbital elements and position equations', href: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html' }
export const freeFall: SourceLink = { label: 'NASA explanation of free fall', href: 'https://www.nasa.gov/centers-and-facilities/glenn/what-is-microgravity/' }
export const bassInvestigation: SourceLink = { label: 'NASA PSI-25 investigation and experimental tables', href: 'https://www.psi.nasa.gov/physci/repo/data/investigations/PSI-25' }
export const bassReport: SourceLink = { label: 'NASA BASS-II report, §2.3.5 (PDF p. 46)', href: 'https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf#page=46' }
export const saffireReport: SourceLink = { label: 'NASA Saffire report (PDF pp. 14–22)', href: 'https://ntrs.nasa.gov/api/citations/20170008805/downloads/20170008805.pdf#page=14' }

const entries: Record<string, SourceEntry> = {
  orbits: {
    title: 'Positions in the solar system', type: 'Calculated figure',
    description: 'The app advances the JPL orbital elements from their J2000 values to the displayed date, solves Kepler’s equation, and projects the result into the scene. The Moon uses a short periodic approximation around Earth. Planet sizes and distances in the illustration are compressed. The JPL planet fit covers 1800–2050.',
    links: [orbitalElements, { label: 'JPL lunar ephemeris for reference', href: 'https://ssd.jpl.nasa.gov/planets/eph_export.html' }],
  },
  'planet-facts': {
    title: 'Destination facts', type: 'Reference values',
    description: 'Rotation is sidereal, measured relative to the stars. The orbit period and atmosphere and temperature summaries are rounded reference values. The giant-planet temperature estimates are for the one-bar level. Sun and Moon values are listed in their own fact sheets.',
    links: [planetaryFacts, { label: 'JPL physical parameters and gravity conventions', href: 'https://ssd.jpl.nasa.gov/planets/phys_par.html' }, { label: 'NASA Sun fact sheet', href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html' }, { label: 'NASA Moon fact sheet', href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html' }, { label: 'NASA solar system temperatures', href: 'https://science.nasa.gov/resource/solar-system-temperatures/' }],
  },
  'planet-distance': {
    title: 'Distance from the Sun', type: 'Calculated value',
    description: 'The distance is the magnitude of the JPL-based heliocentric position vector at the selected simulation date. The app converts the unrounded result to kilometres before rounding each display value.',
    formula: 'Distance (AU) = √(x² + y² + z²)\nDistance (million km) ≈ distance (AU) × 149.6',
    links: [orbitalElements, { label: 'JPL astronomical unit', href: 'https://ssd.jpl.nasa.gov/astro_par.html' }],
  },
  'sim-time': {
    title: 'Simulation time and playback speed', type: 'Simulation setting',
    description: 'The simulation starts at the browser’s current date. Each real second adds the selected number of simulated days while time is running. A simulated month and year use 30.44 and 365.25 days respectively.',
    links: [orbitalElements],
  },
  'flight-progress': {
    title: 'Spacecraft flight progress', type: 'Animation progress',
    description: 'The percentage tracks a scripted animation. Its duration is scaled by the starting scene distance and limited to 3.4–7.5 seconds. Skip advances to at least 97% of the animation.',
    formula: 'Progress (%) = round(100 × min(1, elapsed animation time ÷ duration))',
  },
  'arrival-gravity': {
    title: 'Cabin gravity in orbit', type: 'Scenario assumption',
    description: 'The flight ends in free-fall orbit. The Flame Lab starts with effective cabin gravity of 0 g. Supported surface and altitude settings use the applicable local gravity.',
    links: [freeFall],
  },
  'evidence-ranking': {
    title: 'Evidence matching and coverage counts', type: 'Calculated from the reviewed catalog',
    description: 'Within each compatibility group the app sorts by number of comparable numeric conditions, then by increasing distance. For each condition, the difference is zero inside a reported range and is measured to the nearest bound outside it. Unknown or provisional conditions are excluded from the numeric distance. Counts in group headings reflect the visible cases. Outcome coverage counts cases per metric across the ranked catalog, including cases that share a specimen.',
    formula: 'Distance = √(sum of weighted squared scaled differences ÷ sum of included weights)\nScales: gravity 1 g, oxygen 70 percentage points, pressure 10.4 psi, airflow 30 cm/s\nWeights: gravity 4, all other conditions 1',
    links: [{ label: 'Browse the reviewed evidence catalog', href: 'evidence.html#reviewed-evidence' }],
  },
  'saffire-timing': {
    title: 'Saffire-I replay clock and images', type: 'Derived from NASA timestamps',
    description: 'S1C1 filenames contain frame epoch milliseconds. These match the workbook’s Camera Data clock. The app samples the available part-one camera frames and the calibrated sensor series for replay. The displayed camera window is the processed subset. The speed control only changes playback.',
    formula: 'Elapsed time (s) = (frame epoch in ms − 1465937043422) ÷ 1000',
    links: [{ label: 'Processed camera frame index', href: 'replay/saffire-1/frames.json' }, { label: 'Processed sensor time series', href: 'replay/saffire-1/sensors.json' }],
  },
  'saffire-sensors': {
    title: 'Saffire-I sensor readings and chart', type: 'Processed NASA measurements',
    description: 'The series comes from the Calibrated Data sheet in Saffire-I Sample 1 Sensor Data Complete TM graphs.xlsx. It is downsampled for the web. The readout uses the most recent bundled sample at or before the cursor. Temperatures are instrument readings, and the four radiometer traces retain their original units and baseline.',
    links: [{ label: 'Processed sensor data and channel definitions', href: 'replay/saffire-1/sensors.json' }, { label: 'NASA report and sensor plots (PDF p. 22)', href: saffireReport.href.replace('#page=14', '#page=22') }],
  },
  'saffire-conditions': {
    title: 'Saffire-I replay metadata', type: 'Reported and provisional source values',
    description: 'The processed replay lists the workbook’s calibrated ignition readings and the verification sheet’s geometry. The original workbook and placement sheet were unavailable during the independent review. The geometry reported for run 1-1 in the NASA presentation is 40.6 × 94 cm. The published and replay metadata retain their own source values.',
    links: [{ label: 'Replay metadata and original file names', href: 'replay/saffire-1/conditions.json' }, { label: 'NASA PSI-98 investigation', href: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-98' }, saffireReport],
  },
  'bass-timing': {
    title: 'BASS-II playback clock', type: 'Video playback',
    description: 'The playback counter comes from the processed flight video. Linking the clips seeks both players to the same video offset. The source provides before and after gas readings, with no synchronized sensor series or verified common ignition clock.',
    links: [bassReport, { label: 'Replay metadata and video source file names', href: 'replay/bass-2/compare.json' }],
  },
  'bass-values': {
    title: 'BASS-II run values', type: 'Recorded conditions and outcomes',
    description: 'The run table draws from the Bhattacharjee test matrix, PSI-25 CSV lines 2 (B1) and 4 (B3), the flight video overlays, and the still-camera proof sheets. Select a row for the specific file, qualifier, and basis. Pressure is a series range, and the airflow display can lag the physical duct flow.',
    links: [bassInvestigation, bassReport, { label: 'B1 proof sheet', href: 'replay/bass-2/proofsheet.pdf' }, { label: 'B3 proof sheet', href: 'replay/bass-2/proofsheet_b3.pdf' }, { label: 'Processed field-level citations', href: 'replay/bass-2/compare.json' }],
  },
  'bass-single': {
    title: 'BASS-II B1 source data', type: 'Recorded conditions and outcomes',
    description: 'Sample 147 / B1 is in the Bhattacharjee test matrix and on line 2 of the PSI-25 CSV. Each row lists the source file or instrument. The video, proof sheet and report supply recording details and qualifiers.',
    links: [bassInvestigation, bassReport, { label: 'B1 proof sheet', href: 'replay/bass-2/proofsheet.pdf' }, { label: 'Processed B1 conditions and source locators', href: 'replay/bass-2/conditions.json' }],
  },
}

export function sourceButton(key: string, text = 'Source', label?: string) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'source-link'
  button.dataset.provenance = key
  button.setAttribute('aria-haspopup', 'dialog')
  if (label) button.setAttribute('aria-label', label)
  button.textContent = text
  return button
}

const dialog = document.createElement('dialog')
dialog.className = 'source-dialog'
dialog.setAttribute('aria-labelledby', 'source-title')
dialog.innerHTML = `<header class="source-header">
  <div><p class="source-type"></p><h2 id="source-title"></h2></div>
  <form method="dialog"><button class="source-close" type="submit" autofocus>Close</button></form>
</header><div class="source-content"></div>`
document.body.append(dialog)

function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, value?: string) {
  const node = document.createElement(tag)
  if (value !== undefined) node.textContent = value
  parent.append(node)
  return node
}

function show(entry: SourceEntry) {
  dialog.querySelector('.source-type')!.textContent = entry.type
  dialog.querySelector('#source-title')!.textContent = entry.title
  const content = dialog.querySelector<HTMLElement>('.source-content')!
  content.replaceChildren()
  add(content, 'p', entry.description)
  if (entry.facts?.length) {
    const list = add(content, 'dl')
    for (const [label, value] of entry.facts) {
      const row = add(list, 'div')
      add(row, 'dt', label)
      add(row, 'dd', value)
    }
  }
  if (entry.formula) add(content, 'pre', entry.formula)
  if (entry.links?.length) {
    const links = add(content, 'ul')
    for (const link of entry.links) {
      const anchor = add(add(links, 'li'), 'a', link.label)
      anchor.href = link.href
      if (link.download) anchor.download = link.download
      else if (link.href.startsWith('https:') || link.href.endsWith('.json') || link.href.endsWith('.pdf')) {
        anchor.target = '_blank'
        anchor.rel = 'noopener noreferrer'
      }
    }
  }
  if (entry.table) {
    const table = add(content, 'table')
    add(table, 'caption', 'Plotted observations')
    const headings = add(add(table, 'thead'), 'tr')
    for (const label of entry.table.headers) add(headings, 'th', label).scope = 'col'
    const body = add(table, 'tbody')
    for (const cells of entry.table.rows) {
      const row = add(body, 'tr')
      for (const cell of cells) add(row, 'td', cell)
    }
  }
  dialog.showModal()
  content.scrollTop = 0
}

document.addEventListener('click', event => {
  const trigger = (event.target as Element).closest<HTMLElement>('[data-provenance]')
  if (!trigger) return
  const key = trigger.dataset.provenance!
  const detail = { key, trigger, entry: entries[key] ? { ...entries[key] } : undefined }
  trigger.dispatchEvent(new CustomEvent('flameatlas:source', { bubbles: true, detail }))
  if (detail.entry) show(detail.entry)
})
