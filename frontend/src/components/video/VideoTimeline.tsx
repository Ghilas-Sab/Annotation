import React, { useRef, useEffect, useCallback } from 'react'

interface Annotation {
  frame_number: number
  label: string
  timestamp_ms: number
}

interface VideoTimelineProps {
  currentFrame: number
  totalFrames: number
  fps: number
  annotations: Annotation[]
  onSeek: (frame: number) => void
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  currentFrame, totalFrames, fps, annotations, onSeek
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || totalFrames === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = canvas

    // Fond
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    const frameToX = (frame: number) => (frame / totalFrames) * width

    // Marqueurs annotations
    ctx.strokeStyle = '#e94560'
    ctx.lineWidth = 2
    for (const ann of annotations) {
      const x = frameToX(ann.frame_number)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Curseur frame courante
    ctx.strokeStyle = '#0f3460'
    ctx.lineWidth = 2
    const cursorX = frameToX(currentFrame)
    ctx.beginPath()
    ctx.moveTo(cursorX, 0)
    ctx.lineTo(cursorX, height)
    ctx.stroke()
  }, [currentFrame, totalFrames, annotations])

  useEffect(() => { draw() }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const frame = Math.round((x / canvas.width) * totalFrames)
    onSeek(Math.max(0, Math.min(totalFrames, frame)))
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={60}
      onClick={handleClick}
      style={{ width: '100%', cursor: 'pointer' }}
    />
  )
}
