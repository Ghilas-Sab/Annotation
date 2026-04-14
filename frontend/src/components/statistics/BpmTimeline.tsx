import { useRef, useEffect } from 'react'
import type { RhythmicSegment } from '../../types/statistics'

interface BpmTimelineProps {
  segments: RhythmicSegment[]
  bpmGlobal: number
  bpmVariation: number
}

const LOG_W = 700
const LOG_H = 200
const MT = 32, MR = 24, MB = 48, ML = 56

function secToMMSS(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function BpmTimeline({ segments, bpmGlobal, bpmVariation }: BpmTimelineProps) {
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

    ctx.fillStyle = '#0d0d1f'
    ctx.fillRect(0, 0, W, H)

    if (segments.length === 0 || bpmGlobal === 0) {
      ctx.fillStyle = '#555'
      ctx.font = '13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Données insuffisantes (minimum 2 annotations)', W / 2, H / 2)
      return
    }

    const totalTime = segments[segments.length - 1].end_seconds
    const bpmValues = segments.map(s => s.bpm)
    const minBpm = Math.max(0, Math.min(...bpmValues) * 0.88)
    const maxBpm = Math.max(...bpmValues) * 1.10
    const bpmRange = maxBpm - minBpm || 1

    const xS = (t: number) => ML + (t / totalTime) * PW
    const yS = (bpm: number) => MT + PH - ((bpm - minBpm) / bpmRange) * PH

    // Zone variation ±%
    if (bpmVariation > 0) {
      const frac = bpmVariation / 100
      const y0 = Math.max(MT, yS(bpmGlobal * (1 + frac)))
      const y1 = Math.min(MT + PH, yS(bpmGlobal * (1 - frac)))
      ctx.fillStyle = 'rgba(122,162,247,0.07)'
      ctx.fillRect(ML, y0, PW, y1 - y0)
    }

    // Grid horizontale
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) {
      const y = MT + (i / 4) * PH
      ctx.beginPath(); ctx.moveTo(ML, y); ctx.lineTo(ML + PW, y); ctx.stroke()
    }

    // Ligne BPM global de référence
    const yRef = yS(bpmGlobal)
    ctx.save()
    ctx.strokeStyle = 'rgba(122,162,247,0.45)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])
    ctx.beginPath(); ctx.moveTo(ML, yRef); ctx.lineTo(ML + PW, yRef); ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    ctx.fillStyle = '#7aa2f7'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${bpmGlobal.toFixed(0)} bpm`, ML + PW + 4, yRef)

    // Step chart (courbe BPM)
    ctx.strokeStyle = '#e94560'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    segments.forEach((seg, i) => {
      const x0 = xS(seg.start_seconds)
      const x1 = xS(seg.end_seconds)
      const y = yS(seg.bpm)
      if (i === 0) ctx.moveTo(x0, y)
      else { ctx.lineTo(x0, y) }
      ctx.lineTo(x1, y)
    })
    ctx.stroke()

    // Points aux transitions
    ctx.fillStyle = '#e94560'
    for (const seg of segments) {
      ctx.beginPath()
      ctx.arc(xS(seg.start_seconds), yS(seg.bpm), 3.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Axes
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(ML, MT); ctx.lineTo(ML, MT + PH + 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(ML - 5, MT + PH); ctx.lineTo(ML + PW, MT + PH); ctx.stroke()

    // Ticks Y
    for (let i = 0; i <= 4; i++) {
      const bpm = minBpm + (i / 4) * bpmRange
      const y = MT + PH - (i / 4) * PH
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(ML - 5, y); ctx.lineTo(ML, y); ctx.stroke()
      ctx.fillStyle = '#999'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(bpm.toFixed(0), ML - 9, y)
    }

    // Ticks X
    const nX = Math.min(7, segments.length + 1)
    for (let i = 0; i <= nX; i++) {
      const t = (i / nX) * totalTime
      const x = xS(t)
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, MT + PH); ctx.lineTo(x, MT + PH + 5); ctx.stroke()
      ctx.fillStyle = '#999'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(secToMMSS(t), x, MT + PH + 8)
    }

    // Labels axes
    ctx.fillStyle = '#666'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Temps (mm:ss)', ML + PW / 2, H - 4)

    ctx.save()
    ctx.translate(14, MT + PH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#666'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('BPM', 0, 0)
    ctx.restore()

  }, [segments, bpmGlobal, bpmVariation])

  return (
    <div>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text, #cdd6f4)' }}>
        Évolution du BPM dans le temps
      </h3>
      <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem', lineHeight: 1.4 }}>
        BPM calculé par segment. La ligne pointillée bleue est la référence globale.
        La zone ombragée représente la plage de variation (±{Math.round(bpmVariation)}%).
      </p>
      <canvas
        ref={canvasRef}
        width={LOG_W}
        height={LOG_H}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '6px' }}
        aria-label="Évolution du BPM dans le temps"
      />
    </div>
  )
}
