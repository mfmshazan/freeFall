interface CameraField {
  label: string
  value: string | null
  locator?: string
}

const cameraSources = {
  saffire: 'replay/saffire-1/conditions.json',
  bass: 'https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf#page=13',
}

const unknownFields: CameraField[] = [
  { label: 'Filter / band', value: null },
  { label: 'Exposure / camera gain', value: null },
  { label: 'Optical calibration', value: null },
]

export function RecordingAppearance({ recording }: { recording: 'saffire' | 'bass' }) {
  const fields: CameraField[] = recording === 'saffire'
    ? [
      { label: 'Camera', value: 'S1C1 flight camera. Sensor type and model not documented.', locator: 'S1C1 replay conditions and Camera Data sheet' },
      { label: 'Processing', value: 'JPEG frames downscaled for replay.', locator: 'Data inventory, Saffire-I processed outputs' },
    ]
    : [
      { label: 'Camera', value: 'Panasonic WV–CP654 side-view color video camera.', locator: 'NASA/TM-20210011385, printed pp. 4–5 and §2.3.5' },
      { label: 'Processing', value: 'Onboard instrument overlay. Other processing not documented.', locator: 'NASA/TM-20210011385, printed p. 5' },
    ]
  return <div className="mt-2 rounded border border-space-600 p-2 text-xs text-slate-300">
    <p>Recorded brightness and color depend on how the camera captured and processed the image. Uncalibrated RGB cannot establish temperature, soot concentration, visibility limits or detector performance.</p>
    <details className="mt-1">
      <summary className="cursor-pointer text-sky-300">Camera and image metadata</summary>
      <dl className="mt-1 space-y-1">
        {[...fields, ...unknownFields].map(field => <div key={field.label}>
          <dt className="inline text-slate-400">{field.label} · </dt>
          <dd className="inline">{field.value ?? 'Not documented'}{field.locator && <span className="block text-[11px] text-slate-400">{field.locator}</span>}</dd>
        </div>)}
      </dl>
      <a href={cameraSources[recording]} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sky-300 underline">
        {recording === 'saffire' ? 'Processed replay metadata' : 'NASA BASS-II report, camera and overlay (PDF pp. 12–13)'}
      </a>
      {recording === 'bass' && <p className="mt-1 text-slate-400">Radiometer gain applies to the radiometer channel. Camera gain is undocumented.</p>}
    </details>
  </div>
}
