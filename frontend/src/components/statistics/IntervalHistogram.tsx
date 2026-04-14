import { useRef, useEffect } from 'react'

interface IntervalHistogramProps {
  distribution: number[]
  bpmMean?: number
  bpmMedian?: number
}

const N_BINS = 18
const LOG_W = 700
const LOG_H = 220
const MT = 32, MR = 20, MB = 54, ML = 52

function fmt(s: number) {
  return s >= 1 ? `${s.toFixed(3)}s` : `${Math.round(s * 1000)}ms`
}

function text(
  ctx: CanvasRenderingContext2D,
  t: string, x: number, y: number,
  color = '#888', align: CanvasTextAlign = 'center',
  baseline: CanvasTextBaseline = 'middle', size = 11,
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = `${size}px monospace`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(t, x, y)
  ctx.restore()
}

export default function IntervalHistogram({ distribution, bpmMean, bpmMedian }: IntervalHistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = LOG_W * dpr
    canvas.height = LOG_H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const W = LOG_W, H = LOG_H
    const PW = W - ML - MR
    const PH = H - MT - MB

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0d0d1f'
    ctx.fillRect(0, 0, W, H)

    if (distribution.length === 0) {
      text(ctx, 'Aucune donnée', W / 2, H / 2, '#555', 'center', 'middle', 13)
      return
    }

    const minVal = Math.min(...distribution)
    const maxVal = Math.max(...distribution)
    const range = maxVal - minVal || 0.001
    const binWidth = range / N_BINS

    const bins = new Array<number>(N_BINS).fill(0)
    for (const v of distribution) {
      bins[Math.min(Math.floor((v - minVal) / binWidth), N_BINS - 1)]++
    }
    const maxCount = Math.max(...bins, 1)

    const xScale = (v: number) => ML + ((v - minVal) / range) * PW

    // Grid horizontale
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) {
      const y = MT + PH - (i / 4) * PH
      ctx.beginPath(); ctx.moveTo(ML, y); ctx.lineTo(ML + PW, y); ctx.stroke()
    }

    // Barres
    const bW = PW / N_BINS
    bins.forEach((count, i) => {
      if (count === 0) return
      const alpha = 0.4 + 0.6 * (count / maxCount)
      ctx.fillStyle = `rgba(122,162,247,${alpha.toFixed(2)})`
      ctx.fillRect(ML + i * bW + 1, MT + PH - (count / maxCount) * PH, bW - 2, (count / maxCount) * PH)
    })

    // Axes
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(ML, MT); ctx.lineTo(ML, MT + PH + 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ML - 5, MT + PH); ctx.lineTo(ML + PW, MT + PH); ctx.stroke()

    // Ticks X (6 labels)
    for (let i = 0; i <= 5; i++) {
      const v = minVal + (i / 5) * range
      const x = ML + (i / 5) * PW
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, MT + PH); ctx.lineTo(x, MT + PH + 5); ctx.stroke()
      text(ctx, fmt(v), x, MT + PH + 16, '#999', 'center', 'top', 10)
    }

    // Ticks Y (5 labels)
    for (let i = 0; i <= 4; i++) {
      const count = Math.round((i / 4) * maxCount)
      const y = MT + PH - (i / 4) * PH
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(ML - 5, y); ctx.lineTo(ML, y); ctx.stroke()
      text(ctx, String(count), ML - 10, y, '#999', 'right', 'middle', 10)
    }

    // Label X
    text(ctx, 'Intervalle entre annotations', ML + PW / 2, H - 8, '#666', 'center', 'bottom', 11)

    // Label Y (rotaté)
    ctx.save()
    ctx.translate(14, MT + PH / 2)
    ctx.rotate(-Math.PI / 2)
    text(ctx, 'Fréquence', 0, 0, '#666', 'center', 'middle', 11)
    ctx.restore()

    // Calcul médiane et moyenne depuis la distribution
    const sortedD = [...distribution].sort((a, b) => a - b)
    const mid = Math.floor(sortedD.length / 2)
    const localMedian = sortedD.length % 2 === 0 ? (sortedD[mid - 1] + sortedD[mid]) / 2 : sortedD[mid]
    const localMean = distribution.reduce((a, b) => a + b, 0) / distribution.length

    const refMean = bpmMean && bpmMean > 0 ? 60 / bpmMean : localMean
    const refMedian = bpmMedian && bpmMedian > 0 ? 60 / bpmMedian : localMedian

    // Ligne moyenne — jaune tirets
    const xMean = xScale(refMean)
    if (xMean >= ML && xMean <= ML + PW) {
      ctx.save()
      ctx.strokeStyle = '#e6c419'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.beginPath(); ctx.moveTo(xMean, MT + 22); ctx.lineTo(xMean, MT + PH); ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
      text(ctx, `Moy: ${fmt(refMean)}`, xMean, MT + 12, '#e6c419', 'center', 'middle', 10)
    }

    // Ligne médiane — rouge plein
    const xMed = xScale(refMedian)
    if (xMed >= ML && xMed <= ML + PW) {
      ctx.strokeStyle = '#e94560'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(xMed, MT + 22); ctx.lineTo(xMed, MT + PH); ctx.stroke()
      text(ctx, `Méd: ${fmt(refMedian)}`, xMed, MT + 12, '#e94560', 'center', 'middle', 10)
    }

  }, [distribution, bpmMean, bpmMedian])

  return (
    <div>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text, #cdd6f4)' }}>
        Distribution des intervalles
      </h3>
      <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem', lineHeight: 1.4 }}>
        Durées entre chaque annotation consécutive.
        Un pic étroit indique un tempo régulier.
      </p>
      <canvas
        ref={canvasRef}
        width={LOG_W}
        height={LOG_H}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '6px' }}
        aria-label="Histogramme des intervalles entre annotations"
      />
    </div>
  )
}
