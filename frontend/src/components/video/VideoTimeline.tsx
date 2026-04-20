import React, { useRef, useEffect, useCallback, useState } from 'react'
import type { Annotation, Category } from '../../types/annotation'

interface VideoTimelineProps {
  currentFrame: number
  totalFrames: number
  fps: number
  annotations: Annotation[]
  categories?: Category[]
  onSeek: (frame: number) => void
  onMoveAnnotation?: (id: string, newFrame: number) => void
  /** Restreindre la vue à une plage (trim) */
  startFrame?: number
  endFrame?: number
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  currentFrame, totalFrames, fps, annotations, categories = [], onSeek, onMoveAnnotation,
  startFrame = 0, endFrame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState<{ id: string; frame: number } | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; label: string } | null>(null)

  const rangeEnd = endFrame ?? totalFrames
  const [viewRange, setViewRange] = useState({ start: startFrame, end: rangeEnd })

  // Sync quand totalFrames change
  useEffect(() => {
    setViewRange({ start: startFrame, end: rangeEnd })
  }, [totalFrames, startFrame, rangeEnd])

  const isZoomed = viewRange.start !== startFrame || viewRange.end !== rangeEnd

  // Zoom molette (non-passive)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || totalFrames === 0) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (canvas.width / rect.width)
      const span = viewRange.end - viewRange.start
      const cursorFrame = viewRange.start + (x / canvas.width) * span
      const factor = e.deltaY > 0 ? 1.25 : 0.8
      const newSpan = Math.max(50, Math.min(rangeEnd - startFrame, Math.round(span * factor)))
      const ratio = (cursorFrame - viewRange.start) / span
      const newStart = Math.max(startFrame, Math.round(cursorFrame - ratio * newSpan))
      const newEnd = Math.min(rangeEnd, newStart + newSpan)
      setViewRange({ start: newStart, end: newEnd })
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [viewRange, totalFrames, startFrame, rangeEnd])

  const frameToX = useCallback((frame: number, width: number) => {
    return ((frame - viewRange.start) / (viewRange.end - viewRange.start)) * width
  }, [viewRange])

  const xToFrame = useCallback((clientX: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const frame = viewRange.start + (x / canvas.width) * (viewRange.end - viewRange.start)
    return Math.max(startFrame, Math.min(rangeEnd, Math.round(frame)))
  }, [viewRange, startFrame, rangeEnd])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || totalFrames === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = canvas

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Zone hors plage (trim) en grisé
    if (startFrame > 0) {
      const trimX = frameToX(startFrame, width)
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, trimX, height)
    }
    if (rangeEnd < totalFrames) {
      const trimX = frameToX(rangeEnd, width)
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(trimX, 0, width - trimX, height)
    }

    const visibleAnnotations = annotations.filter(
      a => a.frame_number >= viewRange.start && a.frame_number <= viewRange.end
    )
    const framesPerPixel = (viewRange.end - viewRange.start) / width

    if (framesPerPixel > 2 && visibleAnnotations.length > width / 3) {
      // Mode densité — heatmap
      const density = new Uint32Array(width)
      for (const ann of visibleAnnotations) {
        const x = Math.floor(frameToX(ann.frame_number, width))
        if (x >= 0 && x < width) density[x]++
      }
      const max = Math.max(1, ...density)
      for (let x = 0; x < width; x++) {
        if (density[x] > 0) {
          const alpha = 0.25 + 0.75 * (density[x] / max)
          ctx.fillStyle = `rgba(233,69,96,${alpha.toFixed(2)})`
          ctx.fillRect(x, 0, 1, height)
        }
      }
    } else {
      // Mode individuel — lignes + triangle
      for (const ann of visibleAnnotations) {
        const isDragging = dragging !== null && dragging.id === ann.id
        const displayFrame = isDragging ? dragging.frame : ann.frame_number
        const x = frameToX(displayFrame, width)
        const categoryColor = ann.category?.color ?? '#e94560'
        ctx.strokeStyle = isDragging ? '#ffcc00' : categoryColor
        ctx.lineWidth = isDragging ? 3 : 2
        ctx.beginPath()
        ctx.moveTo(x, 8)
        ctx.lineTo(x, height)
        ctx.stroke()
        ctx.fillStyle = isDragging ? '#ffcc00' : categoryColor
        ctx.beginPath()
        ctx.moveTo(x - 5, 0)
        ctx.lineTo(x + 5, 0)
        ctx.lineTo(x, 8)
        ctx.closePath()
        ctx.fill()
      }
    }

    // Curseur frame courante
    const cursorX = frameToX(currentFrame, width)
    if (cursorX >= 0 && cursorX <= width) {
      ctx.strokeStyle = '#4a9eff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cursorX, 0)
      ctx.lineTo(cursorX, height)
      ctx.stroke()
    }

    // Indicateur zoom
    if (isZoomed) {
      ctx.fillStyle = 'rgba(74,158,255,0.15)'
      ctx.fillRect(0, height - 4, width, 4)
    }
  }, [currentFrame, totalFrames, annotations, dragging, viewRange, frameToX, startFrame, rangeEnd, isZoomed])

  useEffect(() => { draw() }, [draw])

  const findAnnotationAt = useCallback((clientX: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clickX = (clientX - rect.left) * (canvas.width / rect.width)
    const tolerance = Math.max(8, (canvas.width / (viewRange.end - viewRange.start)) * 2)
    return annotations.find(a => {
      const annX = frameToX(a.frame_number, canvas.width)
      return Math.abs(annX - clickX) < tolerance
    }) ?? null
  }, [annotations, viewRange, frameToX])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ann = findAnnotationAt(e.clientX)
    if (ann && onMoveAnnotation) {
      setDragging({ id: ann.id, frame: ann.frame_number })
    } else {
      onSeek(xToFrame(e.clientX))
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragging) {
      setDragging(prev => prev ? { ...prev, frame: xToFrame(e.clientX) } : null)
      return
    }
    const ann = findAnnotationAt(e.clientX)
    if (ann) {
      const rect = canvasRef.current!.getBoundingClientRect()
      setTooltip({ x: e.clientX - rect.left, label: ann.label || `Frame ${ann.frame_number}` })
    } else {
      setTooltip(null)
    }
  }

  const handleMouseUp = () => {
    if (dragging) {
      onMoveAnnotation?.(dragging.id, dragging.frame)
      setDragging(null)
    }
  }

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {/* Indicateur zoom + reset */}
      {isZoomed && (
        <div style={{ position: 'absolute', top: 2, right: 6, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.65rem', color: '#4a9eff' }}>
            {viewRange.start}–{viewRange.end}
          </span>
          <button
            onClick={() => setViewRange({ start: startFrame, end: rangeEnd })}
            style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 3, border: '1px solid #4a9eff', background: 'rgba(74,158,255,0.15)', color: '#4a9eff', cursor: 'pointer' }}
          >
            Reset zoom
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={800}
        height={50}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setTooltip(null); setDragging(null) }}
        style={{ width: '100%', cursor: dragging ? 'grabbing' : 'pointer', display: 'block' }}
        title="Molette pour zoomer · Glisser un marqueur pour déplacer"
      />
      {tooltip && (
        <div style={{
          position: 'absolute', top: 2, left: tooltip.x + 8,
          background: 'rgba(0,0,0,0.85)', color: '#fff',
          padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem',
          pointerEvents: 'none', whiteSpace: 'nowrap', border: '1px solid #e94560'
        }}>
          {tooltip.label}
        </div>
      )}
      {dragging && (
        <div style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,204,0,0.9)', color: '#000',
          padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', pointerEvents: 'none'
        }}>
          → Frame {dragging.frame}
        </div>
      )}
      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.2, paddingBottom: 1 }}>
        Molette pour zoomer · {fps > 0 ? `${annotations.length} annotations` : ''}
      </div>
      {categories.length > 0 && (
        <div
          data-testid="category-legend"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.72rem' }}
        >
          {categories.map((cat) => (
            <span key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-muted)' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }} />
              {cat.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
