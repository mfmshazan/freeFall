import { useEffect, useRef } from 'react'
import type { Prediction, Uncertainty } from '../types'
import { useReducedMotion } from '../shared/evidence'

// ---------------------------------------------------------------------------
// FlameCanvas — a calibrated parametric "digital twin" of a microgravity flame.
// Every visual property is locked to numbers from the surrogate model / physics
// rules (skills/01 + 02). This is NOT video-game fire: no random flicker in 0g.
// The rAF loop is fully decoupled from React state via refs, so moving sliders
// smoothly morphs the flame (300ms ease) without ever resetting the animation.
// ---------------------------------------------------------------------------

interface Props {
  prediction: Prediction
  uncertainty: Pick<Uncertainty, 'std_length_mm' | 'std_width_mm' | 'trust_status'>
  gravity_g: number
  airflow_cm_s: number
}

interface Frame {
  length: number
  width: number
  standoff: number
  aspect: number
  soot: number
  spread: number
  uLen: number
  uWid: number
}

// deterministic PRNG (mulberry32) — NO Math.random on the flame envelope
function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export default function FlameCanvas({ prediction, uncertainty, gravity_g, airflow_cm_s }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // target values (updated on every prop change) and current eased values (per frame)
  const targetRef = useRef<Frame>(toFrame(prediction, uncertainty))
  const curRef = useRef<Frame>(toFrame(prediction, uncertainty))
  const regimeRef = useRef(prediction.visual_regime)
  const trustRef = useRef(uncertainty.trust_status)
  const envRef = useRef({ gravity_g, airflow_cm_s })

  const reduced = useReducedMotion()

  // update targets without touching the running loop. When reduced-motion is on,
  // snap straight to the target and draw one static frame (no animation at all).
  useEffect(() => {
    targetRef.current = toFrame(prediction, uncertainty)
    regimeRef.current = prediction.visual_regime
    trustRef.current = uncertainty.trust_status
    envRef.current = { gravity_g, airflow_cm_s }
    if (reduced) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        curRef.current = { ...targetRef.current }
        draw(ctx, canvas, curRef.current, regimeRef.current, trustRef.current, envRef.current, 0, 0)
      }
    }
  }, [prediction, uncertainty, gravity_g, airflow_cm_s, reduced])

  useEffect(() => {
    if (reduced) return // no requestAnimationFrame loop under reduced-motion
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()
    let dashOffset = 0

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000

      // ease current -> target (~300ms time constant, frame-rate independent)
      const k = 1 - Math.exp(-dt / 0.1)
      const c = curRef.current
      const tg = targetRef.current
      c.length = lerp(c.length, tg.length, k)
      c.width = lerp(c.width, tg.width, k)
      c.standoff = lerp(c.standoff, tg.standoff, k)
      c.aspect = lerp(c.aspect, tg.aspect, k)
      c.soot = lerp(c.soot, tg.soot, k)
      c.spread = lerp(c.spread, tg.spread, k)
      c.uLen = lerp(c.uLen, tg.uLen, k)
      c.uWid = lerp(c.uWid, tg.uWid, k)

      draw(ctx, canvas, c, regimeRef.current, trustRef.current, envRef.current, t, dashOffset)
      dashOffset = (dashOffset + dt * 18) % 1000
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={440}
      className="w-full h-full rounded-lg"
      style={{ background: 'radial-gradient(400px 400px at 50% 55%, #0a0f1c 0%, #05070d 80%)' }}
    />
  )
}

function toFrame(p: Prediction, u: Pick<Uncertainty, 'std_length_mm' | 'std_width_mm'>): Frame {
  return {
    length: p.flame_length_mm,
    width: p.flame_width_mm,
    standoff: p.standoff_distance_mm,
    aspect: p.aspect_ratio_LD,
    soot: p.soot_fraction,
    spread: p.spread_rate_mm_s,
    uLen: u.std_length_mm * 1.96, // ±95%
    uWid: u.std_width_mm * 1.96,
  }
}

function draw(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  f: Frame,
  regime: string,
  trust: string,
  env: { gravity_g: number; airflow_cm_s: number },
  t: number,
  dashOffset: number,
) {
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)

  const cx = W / 2
  const cy = H * 0.52
  // scale so the largest expected flame (~40mm incl. uncertainty) fits comfortably
  const mmMax = Math.max(40, f.length + f.uLen)
  const PX = (H * 0.42) / mmMax // px per mm

  const halfLen = (f.length / 2) * PX
  const halfWid = (f.width / 2) * PX

  const quenched = regime === 'QUENCHED_EXTINGUISHED'
  const cool = regime === 'INVISIBLE_COOL_FLAME'

  // extinction pulse (sine — NOT noise) when quenched/marginal
  const pulse = quenched ? 0.6 + 0.4 * Math.sin(t * 2.4) : 1

  // ---- fuel sample + standoff ----
  ctx.save()
  ctx.fillStyle = '#334155'
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  const fuelR = 6
  ctx.beginPath()
  ctx.arc(cx, cy, fuelR, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // ---- uncertainty halo (dashed outer ±95% envelope) ----
  const haloLen = ((f.length + f.uLen) / 2) * PX
  const haloWid = ((f.width + f.uWid) / 2) * PX
  ctx.save()
  ctx.translate(cx, cy)
  ctx.setLineDash([6, 6])
  ctx.lineDashOffset = -dashOffset
  ctx.lineWidth = 1.5
  ctx.strokeStyle =
    trust === 'HIGH_CONFIDENCE' ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.5)'
  ctx.beginPath()
  ctx.ellipse(0, 0, haloWid, haloLen, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // ---- flame body ----
  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalCompositeOperation = 'lighter'

  const drawBlob = (rx: number, ry: number, stops: [number, string][], alpha = 1) => {
    const r = Math.max(rx, ry)
    const grad = ctx.createRadialGradient(0, 0, Math.max(1, f.standoff * PX * 0.4), 0, 0, r)
    for (const [stop, color] of stops) grad.addColorStop(stop, color)
    ctx.globalAlpha = alpha
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  if (quenched) {
    // faint shrinking ember with slow pulse
    drawBlob(halfWid * 0.6 * pulse, halfLen * 0.6 * pulse, [
      [0, 'rgba(120,80,40,0.35)'],
      [0.6, 'rgba(60,40,30,0.15)'],
      [1, 'rgba(0,0,0,0)'],
    ])
  } else if (cool) {
    // near-invisible violet/blue cool flame, very low opacity, gentle breathing
    const breathe = 0.12 + 0.05 * Math.sin(t * 1.6)
    drawBlob(
      halfWid,
      halfLen,
      [
        [0, 'rgba(109,40,217,0.0)'],
        [0.55, `rgba(109,40,217,${breathe})`],
        [0.85, `rgba(76,29,149,${breathe * 0.7})`],
        [1, 'rgba(0,0,0,0)'],
      ],
      1,
    )
  } else {
    // outer blue chemiluminescence shell
    drawBlob(halfWid, halfLen, [
      [0, 'rgba(30,64,175,0.0)'],
      [0.35, 'rgba(30,64,175,0.55)'],
      [0.7, 'rgba(96,165,250,0.55)'],
      [1, 'rgba(96,165,250,0)'],
    ])
    // inner soot/yellow core proportional to soot fraction
    if (f.soot > 0.12) {
      const coreScale = 0.35 + 0.5 * f.soot
      drawBlob(halfWid * coreScale, halfLen * coreScale, [
        [0, `rgba(253,224,71,${0.5 + 0.4 * f.soot})`],
        [0.6, `rgba(245,158,11,${0.4 + 0.3 * f.soot})`],
        [1, 'rgba(245,158,11,0)'],
      ])
    }
    // melting PMMA vapor-bubble streaks (deterministic seeded sparks)
    if (regime === 'BUBBLING_PMMA_STREAKS') {
      const rnd = seeded(1337)
      const n = 7
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < n; i++) {
        const base = rnd() * Math.PI * 2
        const phase = (t * (0.8 + rnd() * 0.6) + rnd() * 10) % 1
        const ang = base + Math.sin(t * 0.5 + i) * 0.15
        const dist = halfLen * (0.6 + phase * 0.8)
        const px = Math.cos(ang) * dist * 0.6
        const py = Math.sin(ang) * dist
        const a = (1 - phase) * 0.8
        ctx.fillStyle = `rgba(255,170,60,${a})`
        ctx.beginPath()
        ctx.arc(px, py, 1.6 + phase * 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.restore()

  // ---- dark standoff gap ring (between fuel and reaction zone) ----
  if (!quenched && f.standoff > 0.2) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.strokeStyle = 'rgba(5,7,13,0.65)'
    ctx.lineWidth = Math.max(1.5, f.standoff * PX * 0.5)
    ctx.beginPath()
    ctx.ellipse(0, 0, fuelR + f.standoff * PX * 0.6, fuelR + f.standoff * PX * 0.6, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // ---- mm scale bar (20 mm reference, matches BASS acrylic sphere) ----
  drawScaleBar(ctx, W, H, PX)

  // ---- HUD telemetry ----
  drawHUD(ctx, W, H, f, regime, env)

  // ---- invisible-flame hazard badge ----
  if (cool) drawHazardBadge(ctx, W, t)
}

function drawScaleBar(ctx: CanvasRenderingContext2D, W: number, H: number, PX: number) {
  const mm = 20
  const px = mm * PX
  const x0 = 24
  const y0 = H - 26
  ctx.save()
  ctx.strokeStyle = '#94a3b8'
  ctx.fillStyle = '#94a3b8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0 + px, y0)
  ctx.moveTo(x0, y0 - 4)
  ctx.lineTo(x0, y0 + 4)
  ctx.moveTo(x0 + px, y0 - 4)
  ctx.lineTo(x0 + px, y0 + 4)
  ctx.stroke()
  ctx.font = '11px ui-monospace, monospace'
  ctx.fillText('20 mm (BASS sphere)', x0, y0 - 8)
  ctx.restore()
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  f: Frame,
  regime: string,
  env: { gravity_g: number; airflow_cm_s: number },
) {
  ctx.save()
  ctx.font = '11px ui-monospace, monospace'
  ctx.fillStyle = '#7dd3fc'
  // top-left
  const tl = [
    `L  ${f.length.toFixed(1)} mm`,
    `W  ${f.width.toFixed(1)} mm`,
    `L/D ${f.aspect.toFixed(2)}`,
  ]
  tl.forEach((s, i) => ctx.fillText(s, 14, 20 + i * 15))
  // top-right
  ctx.textAlign = 'right'
  const tr = [
    `spread ${f.spread.toFixed(2)} mm/s`,
    `standoff ${f.standoff.toFixed(1)} mm`,
    `±margin ${(f.uLen / 2).toFixed(1)} mm`,
  ]
  tr.forEach((s, i) => ctx.fillText(s, W - 14, 20 + i * 15))
  // bottom-right regime + env
  ctx.fillStyle = '#cbd5e1'
  ctx.fillText(regime.replace(/_/g, ' '), W - 14, H - 26)
  ctx.fillStyle = '#64748b'
  ctx.fillText(`g=${env.gravity_g.toFixed(3)}  flow=${env.airflow_cm_s} cm/s`, W - 14, H - 12)
  ctx.restore()
}

function drawHazardBadge(ctx: CanvasRenderingContext2D, W: number, t: number) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4)
  const text = 'OPTICAL HAZARD: LOW-SOOT / INVISIBLE FLAME — RADIOMETER REQUIRED'
  ctx.save()
  ctx.font = 'bold 10px ui-monospace, monospace'
  ctx.textAlign = 'center'
  const w = ctx.measureText(text).width + 20
  const x = W / 2 - w / 2
  ctx.fillStyle = `rgba(109,40,217,${0.35 + 0.35 * pulse})`
  ctx.fillRect(x, 44, w, 20)
  ctx.strokeStyle = `rgba(167,139,250,${0.6 + 0.4 * pulse})`
  ctx.strokeRect(x, 44, w, 20)
  ctx.fillStyle = '#e9d5ff'
  ctx.fillText(text, W / 2, 58)
  ctx.restore()
}
