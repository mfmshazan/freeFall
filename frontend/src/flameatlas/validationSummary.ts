import summary from '../../../backend/validation/results/summary.json'
import report from '../../../PHASE_4_VALIDATION_REPORT.md?raw'

for (const container of document.querySelectorAll<HTMLElement>('[data-validation-summary]')) {
  const heading = document.createElement('h3')
  heading.textContent = 'Validation status'
  const status = document.createElement('p')
  const label = summary.status.replace(/_/g, ' ')
  status.textContent = `${summary.model} · ${label.charAt(0).toUpperCase() + label.slice(1)}`
  const scope = document.createElement('p')
  scope.textContent = `${summary.target} (${summary.target_unit}). ${summary.independent_runs} eligible independent runs · ${summary.independent_groups} groups.`
  const links = document.createElement('p')
  const source = document.createElement('a')
  source.href = summary.source_url
  source.textContent = 'NASA report'
  const validation = document.createElement('a')
  validation.href = URL.createObjectURL(new Blob([report], { type: 'text/markdown;charset=utf-8' }))
  validation.download = 'PHASE_4_VALIDATION_REPORT.md'
  validation.textContent = 'Download validation report'
  source.style.textDecoration = validation.style.textDecoration = 'underline'
  links.append(source, ' · ', validation)
  container.append(heading, status, scope, links)
}
