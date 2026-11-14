export type EvidenceId = 'LUCI-SIBAL-PARTIAL-G' | 'LUCI-SIBAL-1G' | 'PSI-159-21174C3' | 'PSI-69-248F001'
  | 'saffire-1-1-1' | 'saffire-1-1-2' | 'bass-ii-b1-147' | 'bass-ii-b3-148'
  | 'saffire-2-2-5' | 'saffire-2-2-6' | 'bass-ii-m1' | 'bass-ii-m5' | 'bass-ii-m9' | 'bass-ii-m15' | 'bass-ii-m20'
  | 'flex-flex-035' | 'flex-flex-062' | 'flex-flex-211' | 'flex-flex-215' | 'flex-flex-217' | 'cfm-usml1-summary'
  | 'bass-ii-pmma-rod-stable-136' | 'bass-ii-thin-pmma-quench-21' | 'bass-ii-thin-pmma-quench-16'
  | 'saffire-2-pmma-regression'
export type ReplayId = 'replay' | 'bass2'

interface Source {
  title: string
  url: string
  locator: string
}

interface Story {
  id: string
  title: string
  question: string
  finding: string
  scope: string
  limit: string
  review: string
  sources: Source[]
  evidence?: { label: string; ids: [EvidenceId, ...EvidenceId[]] }
  replays?: { label: string; id: ReplayId }[]
}

export const RESEARCH_STORIES: Story[] = [
  {
    id: 'ventilation',
    title: 'Orbital ventilation',
    question: 'What changes when a flame spreads with or against the flow?',
    finding: 'Saffire-I reported different spread rates for the two flow directions. BASS-II tested how thin solid fuels burn in a smaller flow duct.',
    scope: 'SIBAL fabric in the uncrewed Cygnus spacecraft and cast PMMA films in the ISS glovebox.',
    limit: 'The opposed Saffire pass reused the specimen. BASS B1 and B3 also differ in specimen and gas readings. These tests establish no recommended cabin airflow.',
    review: 'Report results and recorded replays',
    sources: [
      { title: 'Saffire-I flammability results', url: 'https://ntrs.nasa.gov/citations/20170008805', locator: 'PDF p. 21, runs 1-1 and 1-2' },
      { title: 'BASS-II summary report', url: 'https://ntrs.nasa.gov/citations/20210011385', locator: '§2.3.5 and replay test matrix references' },
    ],
    evidence: { label: 'Open ventilation evidence', ids: ['saffire-1-1-1', 'saffire-1-1-2', 'saffire-2-2-5', 'saffire-2-2-6', 'bass-ii-b1-147', 'bass-ii-b3-148'] },
    replays: [{ id: 'replay', label: 'Open Saffire-I replay' }, { id: 'bass2', label: 'Open BASS-II replay' }],
  },
  {
    id: 'measured-rates',
    title: 'Measured burning rates',
    question: 'What measured rates can anchor the lab examples?',
    finding: 'NASA reports five PMMA slab spread rates across BASS-II tests, plus separate heptane droplet diameter-squared rates from FLEX.',
    scope: 'PMMA slabs in opposed flow inside the ISS glovebox; free-floating heptane droplets in the ISS Combustion Integrated Rack.',
    limit: 'The BASS-II oxygen reading changed during each test and does not identify oxygen at each flow stage. FLEX reports mm²/s for droplet diameter squared, not mm/s. These geometries and measures do not calibrate one shared rate curve.',
    review: 'Run-level outcomes from NASA reports',
    sources: [
      { title: 'BASS-II summary report', url: 'https://ntrs.nasa.gov/citations/20210011385', locator: 'Table 5.1, PDF p. 65' },
      { title: 'Detailed FLEX results', url: 'https://ntrs.nasa.gov/citations/20150023456', locator: 'Appendix A, Table IX, PDF pp. 33 and 38' },
    ],
    evidence: { label: 'Open measured-rate evidence', ids: ['bass-ii-m1', 'bass-ii-m5', 'bass-ii-m9', 'bass-ii-m15', 'bass-ii-m20', 'saffire-2-pmma-regression', 'flex-flex-035', 'flex-flex-062', 'flex-flex-211', 'flex-flex-215', 'flex-flex-217'] },
  },
  {
    id: 'habitats',
    title: 'Supported habitats',
    question: 'How did researchers study flame spread at simulated lunar gravity?',
    finding: 'LUCI spun a sounding rocket to produce lunar-like effective acceleration. The team fit spread rates separately at the flame base and tip.',
    scope: 'SIBAL cotton-fiberglass fabric in a rotating flight chamber, compared with a 1 g reference.',
    limit: 'The two oxygen histories differ and the rocket test simulates lunar acceleration. Mars remains an exploratory model scenario with no compatible observation established here.',
    review: 'Run-level fits from the researchers’ presentation',
    sources: [{ title: 'LUCI flammability results', url: 'https://ntrs.nasa.gov/citations/20250010653', locator: 'PDF pp. 12, 19, 27, 33 and 42' }],
    evidence: { label: 'Open LUCI evidence', ids: ['LUCI-SIBAL-PARTIAL-G', 'LUCI-SIBAL-1G'] },
  },
  {
    id: 'candles',
    title: 'Candle flames',
    question: 'What does NASA report for a wick-fed candle in microgravity?',
    finding: 'USML-1 reported a typical flame diameter near 1.5 cm and visible lifetimes usually around 40–60 seconds in about ten tests.',
    scope: 'Small paraffin and stearic-acid candles in the Shuttle USML-1 glovebox.',
    limit: 'A candle is a wick-stabilized, non-propagating flame, so its diameter and lifetime are not a material spread rate. The report treats initial oxygen as an assumed glovebox condition.',
    review: 'Summary of roughly ten single-candle tests',
    sources: [{ title: 'Candle Flames in Microgravity', url: 'https://ntrs.nasa.gov/citations/20030075810', locator: '§§V–VI, PDF pp. 7–8' }],
    evidence: { label: 'Open candle evidence', ids: ['cfm-usml1-summary'] },
  },
  {
    id: 'screening',
    title: 'Material screening',
    question: 'How do oxygen and airflow affect extinction on a solid sample?',
    finding: 'SoFIE GEL researchers observed the flame tip retreat during low-flow quenching and a hole open on the upstream side during blowoff.',
    scope: '4 cm diameter PMMA spheres in the ISS combustion rack, with forced flow from 0.2 to 80 cm/s across the reported tests.',
    limit: 'The spheres and test flows differ from the BASS thin-film setup. The results do not provide a general material pass/fail test.',
    review: 'Experimental paper, apparatus and results',
    sources: [{ title: 'SoFIE GEL quenching and blowoff', url: 'https://ntrs.nasa.gov/api/citations/20240007628/downloads/GELsymposiumfinalRev1.pdf', locator: 'Abstract and §§2–3' }],
    evidence: { label: 'Open material-limit observations', ids: ['bass-ii-pmma-rod-stable-136', 'bass-ii-thin-pmma-quench-21', 'bass-ii-thin-pmma-quench-16'] },
  },
  {
    id: 'appearance',
    title: 'Soot and optical appearance',
    question: 'What can flame appearance tell us about soot or chemistry?',
    finding: 'ACME Flame Design studies soot production and control in gaseous diffusion flames. Cleaner terrestrial burners are a research goal.',
    scope: 'Spherical gaseous flames in the ISS Combustion Integrated Rack. The linked CFI-G observation is from a separate investigation.',
    limit: 'Canvas color supplies no soot measurement, temperature, or visibility threshold. The burner research gives no guaranteed performance improvement.',
    review: 'Literature context from NASA’s investigation overview',
    sources: [{ title: 'ACME Flame Design', url: 'https://science.nasa.gov/biological-physical/investigations/flame-design/', locator: 'Experiment Description and Earth Applications' }],
    evidence: { label: 'Open CFI-G evidence', ids: ['PSI-159-21174C3'] },
  },
  {
    id: 'smoke',
    title: 'Smoke detection',
    question: 'Why does the same detector see different smoke signatures?',
    finding: 'SAME found that different materials produced particles with different shapes. Particle size also changed with airflow and time spent aging.',
    scope: 'Aerosols from heated materials in the ISS SAME apparatus. A separate vehicle study considers transport, mixing, and filtration.',
    limit: 'The staged SAME and SAME-R tables describe test conditions. These studies provide no detector guarantee for the selected cabin scenario.',
    review: 'Literature context from published SAME results and vehicle analysis',
    sources: [
      { title: 'SAME smoke aerosol measurements', url: 'https://ntrs.nasa.gov/api/citations/20140006579/downloads/20140006579.pdf', locator: 'Results and conclusions, PDF pp. 7–12' },
      { title: 'Fire detection tradeoffs by vehicle', url: 'https://ntrs.nasa.gov/citations/20170000248', locator: 'Abstract, separate vehicle analysis' },
    ],
  },
  {
    id: 'suppression',
    title: 'Suppression research',
    question: 'What does visible extinction tell us in a droplet experiment?',
    finding: 'FLEX used droplet imaging to track burning and reported the droplet diameter at visible extinction for the linked heptane run.',
    scope: 'A free heptane droplet in the ISS combustion rack with a reported oxygen, nitrogen and carbon dioxide mixture.',
    limit: 'The diameter-squared rate uses mm²/s and the extinction diameter is a droplet measurement. Visible extinction establishes no measured cool-phase duration or room-scale fire response.',
    review: 'Run-level FLEX report results',
    sources: [{ title: 'Detailed FLEX results', url: 'https://ntrs.nasa.gov/citations/20150023456', locator: 'Appendix A and Fig. 22, FLEX-018' }],
    evidence: { label: 'Open FLEX evidence', ids: ['PSI-69-248F001'] },
  },
]
