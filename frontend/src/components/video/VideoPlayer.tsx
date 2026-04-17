import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'
import { useVideoStore } from '../../stores/videoStore'
import { useRequestVideoFrame } from '../../hooks/useRequestVideoFrame'
import { seekToFrame } from '../../hooks/useFrameSeek'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface VideoPlayerProps {
  videoId: string
  fps: number
  totalFrames: number
  duration: number
  width: number
  height: number
}

export interface VideoPlayerHandle {
  seekToFrame: (frame: number) => void
  play: () => Promise<void>
  pause: () => void
  setPlaybackRate: (rate: number) => void
  isPaused: () => boolean
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ videoId, fps, totalFrames, duration, width, height }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const setIsPlaying = useVideoStore(s => s.setIsPlaying)
    const setVideoMetadata = useVideoStore(s => s.setVideoMetadata)
    const currentFrame = useVideoStore(s => s.currentFrame)
    const playbackRate = useVideoStore(s => s.playbackRate)
    const [playing, setPlaying] = useState(false)

    useEffect(() => {
      setVideoMetadata({ fps, totalFrames, duration, videoId })
    }, [fps, totalFrames, duration, videoId, setVideoMetadata])

    useEffect(() => {
      if (videoRef.current) videoRef.current.playbackRate = playbackRate
    }, [playbackRate])

    useRequestVideoFrame(videoRef, fps)

    useImperativeHandle(ref, () => ({
      seekToFrame: (frame: number) => {
        if (videoRef.current) seekToFrame(videoRef.current, frame, fps)
      },
      play: () => videoRef.current?.play() ?? Promise.resolve(),
      pause: () => videoRef.current?.pause(),
      setPlaybackRate: (rate: number) => {
        if (videoRef.current) videoRef.current.playbackRate = rate
      },
      isPaused: () => videoRef.current?.paused ?? true,
    }))

    const togglePlay = () => {
      const v = videoRef.current
      if (!v) return
      if (v.paused) { v.play() } else { v.pause() }
    }

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
      const frame = Number(e.target.value)
      if (videoRef.current) seekToFrame(videoRef.current, frame, fps)
    }

    return (
      <div 
        data-testid="video-container"
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: 'transparent', 
          width: '100%', 
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          overflow: 'hidden' // Empêche tout débordement global
        }}
      >
        {/* Zone Vidéo - S'adapte dynamiquement */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: 0,
          padding: '1rem',
          position: 'relative'
        }}>
          {/* Le "Cadre" de la vidéo qui respecte le ratio et ne déborde jamais */}
          <div style={{
            position: 'relative',
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: width && height ? `${width} / ${height}` : 'auto',
            backgroundColor: 'var(--color-bg)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video
              ref={videoRef}
              data-testid="video-element"
              src={`${API_BASE}/videos/${videoId}/stream`}
              style={{ 
                width: '100%', 
                height: '100%', 
                display: 'block',
                objectFit: 'contain'
              }}
              onPlay={() => { setIsPlaying(true); setPlaying(true) }}
              onPause={() => { setIsPlaying(false); setPlaying(false) }}
              controls={false}
              preload="metadata"
            />
            {/* Bouton play/pause centré sur la vidéo */}
            <button
              onClick={togglePlay}
              style={{
                position: 'absolute', 
                bottom: '1rem', 
                left: '50%', 
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)', 
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', 
                borderRadius: '50%', 
                width: 48, 
                height: 48,
                fontSize: '1.4rem', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                zIndex: 10,
                transition: 'transform 0.1s'
              }}
              aria-label={playing ? 'Pause' : 'Play'}
              onMouseDown={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
            >
              {playing ? '⏸' : '▶'}
            </button>
          </div>
        </div>

        {/* Scrubber - Toujours visible en bas */}
        <div style={{ 
          padding: '0.5rem 1rem 0.75rem', 
          backgroundColor: 'var(--color-panel, #1a1a2e)',
          borderTop: '1px solid var(--color-surface, #2a2a3e)',
          flexShrink: 0
        }}>
          <input
            type="range"
            min={0}
            max={totalFrames || 1}
            value={currentFrame}
            onChange={handleScrub}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-accent, #e94560)' }}
            aria-label="Position de lecture"
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted, #888)', marginTop: '0.1rem' }}>
            <span>Frame {currentFrame}</span>
            <span>
              <kbd style={{ padding: '0 3px', border: '1px solid #555', borderRadius: 2, fontSize: '0.7rem' }}>←→</kbd> frame
              &nbsp;
              <kbd style={{ padding: '0 3px', border: '1px solid #555', borderRadius: 2, fontSize: '0.7rem' }}>Shift</kbd> ±5
              &nbsp;
              <kbd style={{ padding: '0 3px', border: '1px solid #555', borderRadius: 2, fontSize: '0.7rem' }}>Espace</kbd> annoter
            </span>
            <span>/ {totalFrames}</span>
          </div>
        </div>
      </div>
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer
