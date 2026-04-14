import { type RefObject } from 'react'
import { useVideoStore } from '../../stores/videoStore'

interface PlaybackControlsProps {
  videoRef: RefObject<HTMLVideoElement>
}

const SPEEDS = [0.5, 1, 2]

const PlaybackControls = ({ videoRef }: PlaybackControlsProps) => {
  const isPlaying = useVideoStore(s => s.isPlaying)
  const setIsPlaying = useVideoStore(s => s.setIsPlaying)
  const playbackRate = useVideoStore(s => s.playbackRate)
  const setPlaybackRate = useVideoStore(s => s.setPlaybackRate)

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const handleSpeed = (s: number) => {
    const video = videoRef.current
    if (video) video.playbackRate = s
    setPlaybackRate(s)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <button
        className="btn-primary"
        onClick={togglePlay}
        style={{ minWidth: '80px' }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => handleSpeed(s)}
            className={playbackRate === s ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
            aria-label={`Vitesse ${s}x`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}

export default PlaybackControls
