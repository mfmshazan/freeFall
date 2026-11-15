// Curated, offline text for the Fix It cards and the Earth card.
// Each statement was checked against the linked source (locators point to the
// page that supports it). No thresholds, agent discharge, fan operation, or
// alarm settings are given: those stay outside this prototype.

import type { PlaybookTopic } from './dashboardTypes'

export interface PlaybookSource {
  title: string
  url: string
  locator: string
}

export interface PlaybookCard {
  id: PlaybookTopic
  title: string
  observed: string
  testNext: string
  scopeLimit: string
  sources: PlaybookSource[]
}

export interface EarthCardContent {
  heading: string
  text: string
  /** 'documented' = NASA-documented transfer; 'none' = no sourced Earth link for this topic yet. */
  kind: 'documented' | 'none'
  source: PlaybookSource | null
}

// Default display order. playbook.ts moves Prevention to the top at higher modeled spread.
export const PLAYBOOK_CARDS: PlaybookCard[] = [
  {
    id: 'detection',
    title: 'Detection · Test smoke and nuisance dust',
    observed:
      'SAME heated five spacecraft materials below ignition aboard the ISS. All produced significant sub-micron smoke particles, and particles grew larger at low airflow.',
    testNext:
      'For a Moon surface scenario, test whether the candidate detector can tell smoke from lunar dust simulant under representative ventilation.',
    scopeLimit:
      'SAME used heated, non-flaming samples in airflow up to 8 cm/s. Detector thresholds require results for the chosen device and aerosols.',
    sources: [
      {
        title: 'SAME smoke particulate results',
        url: 'https://ntrs.nasa.gov/api/citations/20140006579/downloads/20140006579.pdf',
        locator: 'PDF pp. 7–12',
      },
      {
        title: 'NASA early fire detection study (smoke vs. lunar dust)',
        url: 'https://ntrs.nasa.gov/citations/20260005612',
        locator: 'abstract',
      },
    ],
  },
  {
    id: 'prevention',
    title: 'Prevention · Screen a material substitute',
    observed:
      'In Saffire-II sample 2-7, a 0.8 mm PMMA strip burned for about two minutes against Nomex HT 90-40 fabric. The fabric was not ignited.',
    testNext:
      'Shortlist that fabric for screening, then test the actual material and thickness at the selected oxygen fraction, pressure, and airflow.',
    scopeLimit:
      'One specimen in one Saffire-II setup. The first centimetre of fabric was still significantly damaged.',
    sources: [
      {
        title: 'Results of Large-Scale Spacecraft Flammability Tests',
        url: 'https://ntrs.nasa.gov/citations/20170008805',
        locator: 'slides 24–25',
      },
    ],
  },
  {
    id: 'suppression',
    title: 'Suppression · Compare hardware at the right scale',
    observed:
      'In FLEX-018 a free-floating heptane droplet burned in 21% O₂ / 70% CO₂ / 9% N₂ at about 2 atm until its flame went out.',
    testNext:
      "Use it as evidence about droplet extinction only. Evaluate NASA's ISS fine water mist portable extinguisher separately as a hardware example.",
    scopeLimit:
      'A single droplet in a CO₂-rich test gas is not a cabin fire. Cabin scale and fuel type matter when evaluating suppression options.',
    sources: [
      {
        title: 'Detailed FLEX results',
        url: 'https://ntrs.nasa.gov/citations/20150023456',
        locator: 'Appendix A (PDF p. 26) and Figure 22 (PDF p. 52)',
      },
      {
        title: 'ISS fine water mist extinguisher development',
        url: 'https://ntrs.nasa.gov/citations/20110012300',
        locator: 'abstract',
      },
    ],
  },
]

/** Shown on the Detection card when the selected world is the Moon. No alarm-cause claim. */
export const LUNAR_DUST_NOTE =
  'Moon scenario: lunar dust is a nuisance aerosol a detector must not mistake for smoke.'

// Only Detection has a source-supported Earth connection. Other topics say so
// rather than inventing an analogy.
export const EARTH_CARDS: Record<PlaybookTopic, EarthCardContent> = {
  detection: {
    heading: 'How this helps on Earth',
    kind: 'documented',
    text:
      "Lunar Outpost built the Space Canary air-quality sensor to NASA NextSTEP needs for measuring lunar dust in habitats. Rebranded Canary-S, it now monitors particulate pollution and other pollutants on Earth.",
    source: {
      title: 'NASA Spinoff: Measuring Moon Dust to Fight Air Pollution',
      url: 'https://spinoff.nasa.gov/moon-dust-sensor-pollution',
      locator: '2021',
    },
  },
  prevention: {
    heading: 'Related Earth research',
    kind: 'none',
    text: 'No sourced Earth application is shown for this topic yet.',
    source: null,
  },
  suppression: {
    heading: 'Related Earth research',
    kind: 'none',
    text: 'No sourced Earth application is shown for this topic yet.',
    source: null,
  },
}
