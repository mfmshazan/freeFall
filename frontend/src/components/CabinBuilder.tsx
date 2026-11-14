import { useState } from 'react'
import type { CabinInputs, Diluent, FuelMaterial } from '../types'

interface Props {
  inputs: CabinInputs
  onChange: (next: CabinInputs) => void
}

interface Preset {
  name: string
  tag: string
  values: CabinInputs
}

export const PRESETS: Preset[] = [
  {
    name: 'Orbital cabin example',
    tag: '0g · 21% O₂ · quiescent',
    values: { gravity_g: 0.0, o2_percent: 21, pressure_psi: 14.7, airflow_cm_s: 0, diluent: 'N2', fuel_material: 'Methane_Gas' },
  },
  {
    name: 'Supported lunar habitat example',
    tag: '1/6g · 32% O₂ · 10.2 psi',
    values: { gravity_g: 0.166, o2_percent: 32, pressure_psi: 10.2, airflow_cm_s: 5, diluent: 'N2', fuel_material: 'Cotton_Fabric' },
  },
  {
    name: 'High-oxygen / low-pressure example',
    tag: '0g · 85% O₂ · 4.3 psi',
    values: { gravity_g: 0.0, o2_percent: 85, pressure_psi: 4.3, airflow_cm_s: 0, diluent: 'N2', fuel_material: 'PMMA_Acrylic' },
  },
  {
    name: 'Saffire-I example conditions',
    tag: '0g · 22% O₂ · 20 cm/s · cotton proxy',
    values: { gravity_g: 0.0, o2_percent: 22, pressure_psi: 14.7, airflow_cm_s: 20, diluent: 'N2', fuel_material: 'Cotton_Fabric' },
  },
]

const FUELS: { v: FuelMaterial; label: string }[] = [
  { v: 'PMMA_Acrylic', label: 'PMMA Acrylic' },
  { v: 'Cotton_Fabric', label: 'Cotton Fabric' },
  { v: 'Kapton_Wire', label: 'Kapton Wire' },
  { v: 'Heptane_Droplet', label: 'Heptane Droplet' },
  { v: 'Methane_Gas', label: 'Methane Gas' },
]

const DILUENTS: Diluent[] = ['N2', 'CO2', 'He']

function Slider({
  label, value, min, max, step, unit, onChange,
}: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-sky-300">{value}{unit}</span>
      </div>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  )
}

export default function CabinBuilder({ inputs, onChange }: Props) {
  const [altitude, setAltitude] = useState(400)
  const field = (6371 / (6371 + altitude)) ** 2
  const set = (patch: Partial<CabinInputs>) => onChange({ ...inputs, ...patch })
  const activePreset = PRESETS.find((p) =>
    (Object.keys(p.values) as (keyof CabinInputs)[]).every((key) => p.values[key] === inputs[key]),
  )
  const pO2 = (inputs.o2_percent / 100) * inputs.pressure_psi

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-3">
        Cabin & Mission Builder
      </h2>

      <div className="grid grid-cols-1 gap-2 mb-5">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => onChange(p.values)}
            className={`text-left rounded-md border px-3 py-2 transition ${
              activePreset?.name === p.name
                ? 'border-sky-500 bg-sky-500/10'
                : 'border-space-600 bg-space-800 hover:border-space-500'
            }`}
          >
            <div className="text-sm text-slate-200">{p.name}</div>
            <div className="text-[11px] font-mono text-slate-500">{p.tag}</div>
          </button>
        ))}
      </div>

      <Slider label="Effective cabin gravity" value={inputs.gravity_g} min={0} max={1} step={0.001} unit=" g"
        onChange={(v) => set({ gravity_g: v })} />
      <div className="flex gap-1 -mt-2 mb-4">
        {[['ISS', 0], ['Moon', 0.166], ['Mars', 0.38], ['Earth', 1]].map(([l, v]) => (
          <button key={l as string} onClick={() => set({ gravity_g: v as number })}
            className="text-[10px] px-2 py-0.5 rounded bg-space-700 hover:bg-space-600 text-slate-400">
            {l}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 mb-3">ISS is nominal free fall. Moon and Mars are supported surface habitats; atmospheres are examples, not mission specifications.</p>
      <div className="rounded border border-space-600 p-3 mb-4">
        <h3 className="text-sm text-slate-200 mb-2">Earth orbit: field and free fall</h3>
        <Slider label="Altitude" value={altitude} min={0} max={2000} step={10} unit=" km" onChange={setAltitude} />
        <p className="text-xs text-slate-300">Earth field: {field.toFixed(3)} g · Nominal orbital effective gravity: 0 g</p>
        <p className="text-xs text-slate-400 mt-1">Current effective input: {inputs.gravity_g.toFixed(3)} g{inputs.gravity_g !== 0 ? ' (custom or surface)' : ' (nominal orbit)'}. Altitude does not change the prediction. At 0 km the field is a surface reference, not an orbit.</p>
        <a className="text-xs text-sky-400" href="https://www.nasa.gov/centers-and-facilities/glenn/what-is-microgravity/" target="_blank" rel="noreferrer">NASA: microgravity and free fall</a>
      </div>

      <Slider label="Oxygen (volume/mole %)" value={inputs.o2_percent} min={15} max={85} step={1} unit="%"
        onChange={(v) => set({ o2_percent: v })} />
      <Slider label="Total pressure (absolute)" value={inputs.pressure_psi} min={4.3} max={14.7} step={0.1} unit=" psi"
        onChange={(v) => set({ pressure_psi: v })} />
      <div className="rounded border border-sky-500/30 bg-sky-500/5 p-3 mb-4 text-xs">
        <div className="text-sky-200">Derived oxygen partial pressure: <strong className="font-mono">{pO2.toFixed(2)} psi</strong></div>
        <p className="text-slate-400 mt-1">21% × 14.7 psi = 3.09 psi; 32% × 10.2 psi = 3.26 psi.</p>
        <p className="text-slate-400 mt-1">Similar partial pressure does not establish equivalent combustion or safety. Oxygen fraction, total pressure, balance gas, material and apparatus also matter.</p>
      </div>
      <Slider label="Ventilation airflow" value={inputs.airflow_cm_s} min={0} max={30} step={1} unit=" cm/s"
        onChange={(v) => set({ airflow_cm_s: v })} />

      <div className="mb-4">
        <div className="text-xs text-slate-400 mb-1">Illustrative balance gas</div>
        <div className="flex gap-1">
          {DILUENTS.map((d) => (
            <button key={d} onClick={() => set({ diluent: d })}
              className={`flex-1 text-xs py-1.5 rounded border ${
                inputs.diluent === d ? 'border-sky-500 bg-sky-500/10 text-sky-300' : 'border-space-600 bg-space-800 text-slate-400'
              }`}>
              {d === 'N2' ? 'N₂' : d === 'CO2' ? 'CO₂' : 'He'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Binary-mixture model: O₂ plus one of N₂, CO₂ or He. Reported mixed-gas experiments stay in evidence.</p>
      </div>

      <div>
        <div className="text-xs text-slate-400 mb-1">Cabin material</div>
        <select value={inputs.fuel_material} onChange={(e) => set({ fuel_material: e.target.value as FuelMaterial })}
          className="w-full bg-space-800 border border-space-600 rounded px-2 py-2 text-sm text-slate-200">
          {FUELS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
        </select>
      </div>
    </div>
  )
}
