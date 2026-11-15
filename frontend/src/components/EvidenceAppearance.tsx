import type { EvidenceRecord } from '../evidence/types'
import { partialPressure } from '../physics/atmosphere'

export function AtmosphereNote({ record }: { record: EvidenceRecord }) {
  const initialOxygen = record.conditions.filter(field =>
    field.comparison_basis === 'mole_fraction' && field.time === 'initial')
  const absolutePressure = record.conditions.filter(field => field.comparison_basis === 'absolute_pressure')
  if (initialOxygen.length === 1 && absolutePressure.length === 1) {
    const [oxygen] = initialOxygen
    const [pressure] = absolutePressure
    // The FLEX-018 source row says ambient pressure. Appendix A and Fig. 22
    // link that pressure to the test atmosphere reported with the initial composition.
    const flex018 = record.id === 'PSI-69-248F001' && pressure.time === 'unspecified'
    const sameSourceRow = oxygen.source && pressure.source &&
      oxygen.source.source_id === pressure.source.source_id && oxygen.source.locator === pressure.source.locator
    if ((pressure.time === 'initial' || flex018) && sameSourceRow && oxygen.unit === 'mole fraction' &&
      pressure.unit && !oxygen.provisional && !pressure.provisional &&
      oxygen.status !== 'assumed' && pressure.status !== 'assumed' &&
      typeof oxygen.value === 'number' && typeof pressure.value === 'number') {
      return <p className="py-2 text-slate-300">Derived oxygen partial pressure: {partialPressure(oxygen.value, pressure.value).toFixed(2)} {pressure.unit}.
        Initial mole fraction × absolute ambient pressure{flex018 ? ' (FLEX-018, Appendix A and Fig. 22)' : ''}.</p>
    }
  }
  return <p className="py-2 text-slate-400">Oxygen partial pressure unavailable on a verified common condition basis.</p>
}

export function EvidenceAppearance({ id }: { id: string }) {
  if (id === 'PSI-159-21174C3') return <div className="mb-3 space-y-1 text-slate-300">
    <p>The authors identified the cool phase using radiometer readings after the hot flame went out and processed images from the intensified camera. See final report pp. 43–46, especially Figs. 1b and 2.</p>
    <p>Fig. 2 uses processed grayscale images shown in blue. Exact run exposure and optical calibration are not documented in the figure. Appendix M describes a formaldehyde filter typically used with this camera.</p>
    <p className="text-amber-200">The n-butane feed blend, porous burner, and chamber pressure above the model range are unsupported cabin inputs. Burner feed is separate from the chamber oxidizer.</p>
    <a className="text-sky-300 underline" href="https://www.nasa.gov/missions/station/cool-flames-created-during-a-first-for-international-space-station-research/" target="_blank" rel="noreferrer">NASA’s CFI-G overview</a>
  </div>
  if (id === 'PSI-69-248F001') return <div className="mb-3 space-y-1 text-slate-300">
    <p>In Fig. 22 the authors describe soot in the multispectral view and later apparent extinction in the UV and color views. They suggest cool burning may have continued. This interpretation provides no measured cool-phase duration.</p>
    <p className="text-amber-200">The nitrogen and carbon dioxide balance gases and the pressure above the model range are unsupported cabin inputs.</p>
  </div>
  return null
}
