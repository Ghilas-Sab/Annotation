import { useState, type RefObject } from 'react'
import { useVideoStore } from '../../stores/videoStore'
import { useVideoKeyboard } from '../../hooks/useVideoKeyboard'
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal'
import type { VideoPlayerHandle } from './VideoPlayer'
import type { Annotation } from '../../types/annotation'

interface PlaybackControlsProps {
  videoRef: RefObject<VideoPlayerHandle>
  // Props de navigation (pour le panneau tablette + raccourcis clavier)
  currentFrame?: number
  totalFrames?: number
  fps?: number
  annotations?: Annotation[]
  startFrame?: number
  onSeek?: (frame: number) => void
  onAnnotate?: (frame: number) => void
}

const SPEEDS = [0.5, 1, 2]

const btnStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--color-text, #e0e0e0)',
  cursor: 'pointer',
  borderRadius: 6,
  padding: '0.4rem 0.6rem',
  fontSize: '1rem',
  lineHeight: 1,
  minWidth: 38,
}

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
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Keyboard shortcuts + handlers partagés avec les boutons
  const {
    seekPrevFrame,
    seekNextFrame,
    seek5Back,
    seek5Forward,
    seekPrevAnnotation,
    seekNextAnnotation,
    seekStart,
    seekEnd,
    annotate,
  } = useVideoKeyboard({
    currentFrame,
    totalFrames,
    fps,
    annotations,
    startFrame,
    seek: onSeek ?? (() => {}),
    createAnnotation: onAnnotate,
  })

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

  const handleSpeed = (s: number) => {
    videoRef.current?.setPlaybackRate(s)
    setPlaybackRate(s)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>

      {/* Ligne 1 — Lecture + Vitesse */}
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

      {/* Ligne 2 — Panneau Contrôles (navigation tablette) */}
      <div
        data-testid="controls-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.4rem 0.5rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Navigation frame */}
        <button style={btnStyle} aria-label="début vidéo" title="Début vidéo (Alt+←)" onClick={seekStart}>⏪</button>
        <button style={btnStyle} aria-label="annotation précédente" title="Annotation précédente (Ctrl+←)" onClick={seekPrevAnnotation}>⏮</button>
        <button style={btnStyle} aria-label="-5 frames" title="-5 frames (Shift+←)" onClick={seek5Back}>◀◀</button>
        <button style={btnStyle} aria-label="frame précédente" title="Frame précédente (←)" onClick={seekPrevFrame}>◀</button>

        {/* Annoter */}
        <button
          style={{ ...btnStyle, padding: '0.4rem 0.9rem', background: 'rgba(233,69,96,0.15)', borderColor: 'rgba(233,69,96,0.4)', color: '#e94560', fontWeight: 600 }}
          aria-label="annoter"
          title="Annoter (Espace)"
          onClick={annotate}
        >
          ● Annoter
        </button>

        {/* Navigation frame (droite) */}
        <button style={btnStyle} aria-label="frame suivante" title="Frame suivante (→)" onClick={seekNextFrame}>▶</button>
        <button style={btnStyle} aria-label="+5 frames" title="+5 frames (Shift+→)" onClick={seek5Forward}>▶▶</button>
        <button style={btnStyle} aria-label="annotation suivante" title="Annotation suivante (Ctrl+→)" onClick={seekNextAnnotation}>⏭</button>
        <button style={btnStyle} aria-label="fin vidéo" title="Fin vidéo (Alt+→)" onClick={seekEnd}>⏩</button>

        {/* Aide */}
        <button
          style={{ ...btnStyle, marginLeft: '0.25rem', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
          aria-label="raccourcis clavier"
          title="Raccourcis clavier"
          onClick={() => setShowShortcuts(true)}
        >
          ⌨ ?
        </button>
      </div>

      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}

export default PlaybackControls
