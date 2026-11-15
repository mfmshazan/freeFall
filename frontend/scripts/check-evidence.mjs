import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = fileURLToPath(new URL('..', import.meta.url))
const root = fileURLToPath(new URL('../..', import.meta.url))
const catalog = JSON.parse(readFileSync(join(frontend, 'src/data/evidence_catalog.json'), 'utf8'))
const temp = mkdtempSync(join(tmpdir(), 'freefall-evidence-'))
try {
  execFileSync(process.execPath, [
    join(frontend, 'node_modules/typescript/bin/tsc'), 'src/evidence/rankEvidence.ts',
    '--module', 'commonjs', '--target', 'ES2020', '--strict', '--skipLibCheck', '--outDir', temp,
  ], { cwd: frontend, stdio: 'inherit' })
  const { rankEvidence } = createRequire(import.meta.url)(join(temp, 'evidence/rankEvidence.js'))
  const fixtures = JSON.parse(execFileSync(process.env.EVIDENCE_PYTHON || 'python3', ['-c', [
    'import json, sys',
    'sys.path.insert(0, "backend")',
    'from test_evidence import fixture_runs',
    'from export_evidence import load_catalog',
    'from evidence import rank_evidence',
    'catalog = load_catalog()',
    'print(json.dumps([dict(id=id, records=None if c["records"] is catalog["records"] else c["records"],',
    'query=q, expected=rank_evidence(c,q)) for id,c,q in fixture_runs(catalog)]))',
  ].join('\n')], { cwd: root, encoding: 'utf8' }))

  const tolerance = 1e-12
  for (const { id, records, query, expected } of fixtures) {
    const actual = rankEvidence({ ...catalog, records: records ?? catalog.records }, query)
    for (const group of Object.keys(expected.groups)) {
      for (let i = 0; i < expected.groups[group].length; i++) {
        const want = expected.groups[group][i].distance
        const got = actual.groups[group][i]?.distance
        if (typeof want === 'number') {
          assert(typeof got === 'number' && Math.abs(want - got) <= tolerance, `${id} ${group} distance`)
          actual.groups[group][i].distance = want
        }
      }
    }
    assert.deepEqual(actual, expected, id)
  }
  console.log(`Python/TypeScript evidence parity passed for ${fixtures.length} fixtures (distance tolerance ${tolerance}).`)
} finally {
  rmSync(temp, { recursive: true, force: true })
}
