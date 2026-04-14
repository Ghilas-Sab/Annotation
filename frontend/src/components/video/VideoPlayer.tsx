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
}

export interface VideoPlayerHandle {
  seekToFrame: (frame: number) => void
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ videoId, fps, totalFrames, duration }, ref) => {
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
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#000', flex: 1 }}>
        {/* Vidéo */}
        <div style={{ position: 'relative', flex: 1 }}>
          <video
            ref={videoRef}
            src={`${API_BASE}/videos/${videoId}/stream`}
            style={{ width: '100%', height: '100%', maxHeight: '50vh', objectFit: 'contain', display: 'block' }}
            onPlay={() => { setIsPlaying(true); setPlaying(true) }}
            onPause={() => { setIsPlaying(false); setPlaying(false) }}
            controls={false}
            preload="metadata"
          />
          {/* Bouton play/pause centré */}
          <button
            onClick={togglePlay}
            style={{
              position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', borderRadius: '50%', width: 44, height: 44,
              fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸' : '▶'}
          </button>
        </div>

        {/* Scrubber barre de progression */}
        <div style={{ padding: '0.4rem 0.75rem 0.2rem', backgroundColor: 'var(--color-panel, #1a1a2e)' }}>
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
