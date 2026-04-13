import React from 'react'
import { frameToTimestamp } from '../../utils/frameUtils'

interface FrameCounterProps {
  currentFrame: number
  totalFrames: number
  fps: number
}

const FrameCounter: React.FC<FrameCounterProps> = ({ currentFrame, totalFrames, fps }) => {
  const timestamp = fps > 0 ? frameToTimestamp(currentFrame, fps) : '00:00:00.000'

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
      Frame {currentFrame} / {totalFrames} — {timestamp}
    </div>
  )
}

export default FrameCounter
