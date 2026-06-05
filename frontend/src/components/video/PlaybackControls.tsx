import { type RefObject } from 'react'
import { useVideoStore } from '../../stores/videoStore'
import { useVideoKeyboard } from '../../hooks/useVideoKeyboard'
import { Icon } from '../ui'
import { frameToTimestamp } from '../../utils/frameUtils'
import type { VideoPlayerHandle } from './VideoPlayer'
import type { Annotation } from '../../types/annotation'

interface PlaybackControlsProps {
  videoRef: RefObject<VideoPlayerHandle>
  currentFrame?: number
  totalFrames?: number
  fps?: number
  annotations?: Annotation[]
  startFrame?: number
  onSeek?: (frame: number) => void
  onAnnotate?: (frame: number) => void
}

const SPEEDS = [0.5, 1, 2]

const PlaybackControls = ({
  videoRef,
  currentFrame = 0,
  totalFrames = 0,
  fps = 25,
  annotations = [],
  startFrame = 0,
  onSeek,
  onAnnotate,
}: PlaybackControlsProps) => {
  const isPlaying = useVideoStore(s => s.isPlaying)
  const setIsPlaying = useVideoStore(s => s.setIsPlaying)
  const playbackRate = useVideoStore(s => s.playbackRate)
  const setPlaybackRate = useVideoStore(s => s.setPlaybackRate)

  const togglePlay = () => {
    const handle = videoRef.current
    if (!handle) return
    if (handle.isPaused()) {
      handle.play()
      setIsPlaying(true)
    } else {
      handle.pause()
      setIsPlaying(false)
    }
  }

  const jumpToPrevAnnotation = () => {
    const sorted = [...annotations].sort((a, b) => a.frame_number - b.frame_number)
    const prev = [...sorted].reverse().find(a => a.frame_number < currentFrame)
    if (prev) onSeek?.(prev.frame_number)
  }

  const {
    seekPrevFrame,
    seekNextFrame,
    seek5Back,
    seek5Forward,
    seekNextAnnotation,
    seekStart,
    seekEnd,
    annotate,
    togglePlayPause: keyboardTogglePlayPause,
  } = useVideoKeyboard({
    currentFrame,
    totalFrames,
    fps,
    annotations,
    startFrame,
    seek: onSeek ?? (() => {}),
    createAnnotation: onAnnotate,
    togglePlayPause: togglePlay,
  })

  const handleSpeed = (s: number) => {
    videoRef.current?.setPlaybackRate(s)
    setPlaybackRate(s)
  }

  return (
    <div className="playback-control-bar">
      <div className="playback-speed-group">
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => handleSpeed(s)}
            aria-label={`vitesse ${s}x`}
            className="btn btn-ghost btn-xs"
            style={{
              background: playbackRate === s ? 'var(--ac-muted)' : 'transparent',
              color: playbackRate === s ? 'var(--ac)' : 'var(--text-2)',
              border: `1px solid ${playbackRate === s ? 'var(--border-ac)' : 'transparent'}`,
              fontFamily: 'monospace',
            }}
          >{s}×</button>
        ))}
      </div>

      <div className="sep-v playback-separator" />

      <div className="tooltip-wrap">
        <button className="btn btn-ghost btn-sm btn-icon" aria-label="début vidéo" onClick={seekStart}>
          <Icon.SkipBack />
        </button>
        <span className="tooltip">Aller au début</span>
      </div>

      <div className="tooltip-wrap">
        <button className="btn btn-ghost btn-sm btn-icon playback-frame-step-btn" aria-label="-5 frames" onClick={seek5Back}>
          −5
        </button>
        <span className="tooltip">−5 frames</span>
      </div>

      <div className="tooltip-wrap">
        <button className="btn btn-ghost btn-sm btn-icon" aria-label="frame précédente" onClick={seekPrevFrame}>
          <Icon.StepBack />
        </button>
        <span className="tooltip">Frame précédente</span>
      </div>

      <div className="tooltip-wrap">
        <button className="btn btn-ghost btn-sm playback-smart-jump-btn" aria-label="saut intelligent précédent" onClick={jumpToPrevAnnotation}>
          <span style={{ display: 'flex', transform: 'rotate(90deg)' }}>
            <Icon.ChevronDown />
          </span>
          Smart
        </button>
        <span className="tooltip">Saut intelligent précédent</span>
      </div>

      <button
        className="btn btn-sm playback-play-btn"
        aria-label={isPlaying ? 'pause' : 'play'}
        onClick={keyboardTogglePlayPause}
        style={{
          background: isPlaying ? 'var(--ac)' : 'var(--elevated)',
          color: isPlaying ? '#fff' : 'var(--fg)',
          border: `1px solid ${isPlaying ? 'var(--ac)' : 'var(--border-c)'}`,
          boxShadow: isPlaying ? '0 2px 12px var(--ac-glow)' : undefined,
        }}
      >
        {isPlaying ? <Icon.Pause /> : <Icon.Play />}
      </button>

      <div className="tooltip-wrap">
        <button className="btn btn-ghost btn-sm playback-smart-jump-btn" aria-label="saut intelligent suivant" onClick={seekNextAnnotation}>
          Smart
          <Icon.ChevronRight />
        </button>
        <span className="tooltip">Saut intelligent suivant</span>
      </div>

      <div className="tooltip-wrap">
        <button className="btn btn-ghost btn-sm btn-icon" aria-label="frame suivante" onClick={seekNextFrame}>
          <Icon.StepFwd />
        </button>
        <span className="tooltip">Frame suivante</span>
      </div>

      <div className="tooltip-wrap">
        <button className="btn btn-ghost btn-sm btn-icon playback-frame-step-btn" aria-label="+5 frames" onClick={seek5Forward}>
          +5
        </button>
        <span className="tooltip">+5 frames</span>
      </div>

      <div className="tooltip-wrap">
        <button className="btn btn-ghost btn-sm btn-icon" aria-label="fin vidéo" onClick={seekEnd}>
          <Icon.SkipFwd />
        </button>
        <span className="tooltip">Aller à la fin</span>
      </div>

      <div className="sep-v playback-separator" />

      <button className="btn btn-primary btn-sm playback-annotate-btn" aria-label="annoter" onClick={annotate}>
        <Icon.Pin />
        Annoter
      </button>

      <div className="playback-time">
        {frameToTimestamp(currentFrame, fps)} <span style={{ color: 'var(--text-3)' }}>/ {frameToTimestamp(totalFrames, fps)}</span>
      </div>
    </div>
  )
}

export default PlaybackControls
