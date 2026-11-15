import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = fileURLToPath(new URL('..', import.meta.url))
const root = fileURLToPath(new URL('../..', import.meta.url))
const temp = mkdtempSync(join(tmpdir(), 'freefall-appearance-'))
const inputs = (o2_percent, pressure_psi, gravity_g = 0, airflow_cm_s = 0, diluent = 'N2', fuel_material = 'Methane_Gas') =>
  ({ gravity_g, o2_percent, pressure_psi, airflow_cm_s, diluent, fuel_material })
const fixtures = [
  ...[[85, 4.3], [59.9, 7], [60, 6.9], [60, 7], [60, 7.1], [60.1, 7]].map(pair =>
    [inputs(...pair), 'SOOT_FREE_BLUE_SPHERE']),
  [inputs(21, 14.7), 'SOOT_FREE_BLUE_SPHERE'],
  [inputs(85, 4.3, 0, 0, 'N2', 'PMMA_Acrylic'), 'BUBBLING_PMMA_STREAKS'],
  [inputs(32, 10.2, 0.166, 5, 'He', 'Cotton_Fabric'), 'STRETCHED_LAMINAR_TEARDROP'],
  [inputs(55, 14.7, 0, 4, 'N2', 'Heptane_Droplet'), 'SOOTY_YELLOW_CORE'],
  [inputs(15, 4.3, 0, 0, 'CO2', 'Heptane_Droplet'), 'QUENCHED_EXTINGUISHED'],
  [inputs(21, 14.7, 1, 8, 'CO2', 'Kapton_Wire'), 'STRETCHED_LAMINAR_TEARDROP'],
]

try {
  execFileSync(process.execPath, [
    'node_modules/typescript/bin/tsc', 'src/hooks/useFlamePrediction.ts', 'src/physics/atmosphere.ts',
    'src/data/researchStories.ts', '--module', 'commonjs', '--target', 'ES2020', '--strict',
    '--resolveJsonModule', '--esModuleInterop', '--skipLibCheck', '--outDir', temp,
  ], { cwd: frontend, stdio: 'inherit' })
  const load = createRequire(import.meta.url)
  const { predictLocal } = load(join(temp, 'physics/flameModel.js'))
  const { predictLocalService } = load(join(temp, 'physics/localService.js'))
  const { partialPressure } = load(join(temp, 'physics/atmosphere.js'))
  const { isCurrentAppearance } = load(join(temp, 'physics/appearance.js'))
  const { RESEARCH_STORIES } = load(join(temp, 'data/researchStories.js'))
  const catalog = load(join(frontend, 'src/data/evidence_catalog.json'))
  const python = process.env.FREEFALL_PYTHON || 'python3'
  const pythonExecutable = python.includes('/') ? resolve(python) : python
  const backend = JSON.parse(execFileSync(pythonExecutable, ['-c', [
    'import json, sys',
    'sys.path.insert(0, "backend")',
    'import main, physics',
    'print(json.dumps([(physics.predict(**i), main.predict(main.CabinInputs(**i))) for i in json.load(sys.stdin)]))',
  ].join('\n')], { cwd: root, input: JSON.stringify(fixtures.map(([i]) => i)), encoding: 'utf8' }))

  for (const [index, [input, appearance]] of fixtures.entries()) {
    const local = predictLocal(input)
    const fallback = predictLocalService(input)
    const [physical, api] = backend[index]
    assert.equal(local.visual_regime, appearance)
    assert.equal(api.prediction.visual_regime, appearance)
    assert.equal(isCurrentAppearance(appearance), true)
    for (const [key, value] of Object.entries(physical)) {
      if (typeof value === 'number') assert(Math.abs(value - local[key]) < 1e-10, key)
      else assert.equal(local[key], value)
    }
    assert.deepEqual(Object.keys(fallback).sort(), Object.keys(api).sort())
    assert.deepEqual(Object.keys(fallback.prediction).sort(), Object.keys(api.prediction).sort())
    assert.deepEqual(Object.keys(fallback.uncertainty).sort(), Object.keys(api.uncertainty).sort())
    assert.deepEqual(fallback.engineering_playbook, api.engineering_playbook)
    if (input.gravity_g === 0 && input.airflow_cm_s === 0) {
      for (const result of [fallback, api]) {
        assert.equal(result.prediction.aspect_ratio_LD, 1)
        assert.equal(result.prediction.flame_length_mm, result.prediction.flame_width_mm)
      }
    }
  }

  for (const [fraction, pressure, expected, shown] of [[0.21, 14.7, 3.087, '3.09'], [0.32, 10.2, 3.264, '3.26']]) {
    assert(Math.abs(partialPressure(fraction, pressure) - expected) < 1e-12)
    assert.equal(partialPressure(fraction, pressure).toFixed(2), shown)
  }
  assert.equal(isCurrentAppearance('INVISIBLE_COOL_FLAME'), false)
  assert.equal(isCurrentAppearance('constructor'), false)
  const storyIds = new Set(RESEARCH_STORIES.map(story => story.id))
  assert.equal(storyIds.size, RESEARCH_STORIES.length)
  for (const id of ['ventilation', 'habitats', 'screening', 'appearance', 'smoke', 'suppression']) {
    assert(storyIds.has(id), id)
  }
  for (const story of RESEARCH_STORIES) {
    assert(story.question && story.finding && story.scope && story.limit && story.review)
    assert(story.sources.every(source => source.locator && new URL(source.url).hostname.endsWith('.nasa.gov')))
    for (const id of story.evidence?.ids ?? []) assert(catalog.records.some(record => record.id === id), id)
  }
  console.log(`Appearance, atmosphere, API contract and story references passed for ${fixtures.length} model fixtures and ${storyIds.size} stories.`)
} finally {
  rmSync(temp, { recursive: true, force: true })
}
