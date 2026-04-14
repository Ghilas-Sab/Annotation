import { useRef, useEffect } from 'react'

interface PoincareChartProps {
  distribution: number[]
}

const LOG_W = 460
const LOG_H = 420
const M = 54

export default function PoincareChart({ distribution }: PoincareChartProps) {
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
    const PW = W - 2 * M
    const PH = H - 2 * M

    ctx.fillStyle = '#0d0d1f'
    ctx.fillRect(0, 0, W, H)

    if (distribution.length < 2) {
      ctx.fillStyle = '#555'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Moins de 2 intervalles disponibles', W / 2, H / 2)
      return
    }

    const pad = (Math.max(...distribution) - Math.min(...distribution)) * 0.15 || 0.05
    const lo = Math.min(...distribution) - pad
    const hi = Math.max(...distribution) + pad
    const span = hi - lo

    const toX = (v: number) => M + ((v - lo) / span) * PW
    const toY = (v: number) => M + PH - ((v - lo) / span) * PH

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const x = M + (i / 4) * PW
      const y = M + (i / 4) * PH
      ctx.beginPath(); ctx.moveTo(x, M); ctx.lineTo(x, M + PH); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(M + PW, y); ctx.stroke()
    }

    // Ligne d'identité (y = x) — rythme parfait
    ctx.save()
    ctx.strokeStyle = 'rgba(122,162,247,0.4)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(toX(lo), toY(lo))
    ctx.lineTo(toX(hi), toY(hi))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Points
    for (let i = 0; i < distribution.length - 1; i++) {
      ctx.beginPath()
      ctx.arc(toX(distribution[i]), toY(distribution[i + 1]), 4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(233,69,96,0.72)'
      ctx.fill()
    }

    // Axes
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(M, M - 5); ctx.lineTo(M, M + PH + 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(M - 5, M + PH); ctx.lineTo(M + PW, M + PH); ctx.stroke()

    // Ticks + labels (4 graduations)
    for (let i = 0; i <= 4; i++) {
      const v = lo + (i / 4) * span
      const label = v >= 1 ? `${v.toFixed(2)}s` : `${Math.round(v * 1000)}ms`
      const x = M + (i / 4) * PW
      const y = M + PH - (i / 4) * PH

      // X
      ctx.strokeStyle = '#555'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, M + PH); ctx.lineTo(x, M + PH + 5); ctx.stroke()
      ctx.fillStyle = '#999'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(label, x, M + PH + 8)

      // Y
      ctx.beginPath(); ctx.moveTo(M - 5, y); ctx.lineTo(M, y); ctx.stroke()
      ctx.fillStyle = '#999'
      ctx.font = '10px monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, M - 9, y)
    }

    // Labels axes
    ctx.fillStyle = '#666'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('Intervalle n (s)', M + PW / 2, H - 6)

    ctx.save()
    ctx.translate(14, M + PH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#666'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Intervalle n+1 (s)', 0, 0)
    ctx.restore()

    // Légende diagonale
    ctx.fillStyle = 'rgba(122,162,247,0.5)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText('— rythme parfaitement régulier', M + PW - 4, M + 6)

  }, [distribution])

  return (
    <div>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text, #cdd6f4)' }}>
        Diagramme de Poincaré
      </h3>
      <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem', lineHeight: 1.4 }}>
        Chaque point représente deux intervalles consécutifs (n, n+1).
        Un nuage serré sur la diagonale bleue = tempo très régulier.
        Un nuage dispersé = irrégularité rythmique.
      </p>
      <canvas
        ref={canvasRef}
        width={LOG_W}
        height={LOG_H}
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '6px' }}
        aria-label="Diagramme de Poincaré des intervalles rythmiques"
      />
    </div>
  )
}
