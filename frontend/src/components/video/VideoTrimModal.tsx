import React, { useRef, useState } from 'react'
import type { Video } from '../../types/project'
import { frameToTimestamp } from '../../utils/frameUtils'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface Props {
  video: Video
  onConfirm: (startFrame: number, endFrame: number) => void
  onCancel: () => void
}

const VideoTrimModal: React.FC<Props> = ({ video, onConfirm, onCancel }) => {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(video.total_frames)
  const videoRef = useRef<HTMLVideoElement>(null)

  const captureFrame = (): number => {
    if (!videoRef.current) return 0
    return Math.round(videoRef.current.currentTime * video.fps)
  }

  const selectedFrames = end - start
  const selectedSeconds = (selectedFrames / video.fps).toFixed(1)
  const pctStart = (start / video.total_frames) * 100
  const pctEnd = (end / video.total_frames) * 100

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-panel, #1a1a2e)',
          border: '1px solid var(--color-surface, #2a2a3e)',
          borderRadius: 10, padding: '1.75rem', width: 480, maxWidth: '95vw',
        }}
      >
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: 'var(--color-text, #e0e0e0)' }}>
          Annoter une vidéo
        </h2>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--color-text-muted, #888)' }}>
          {video.original_name} — {video.total_frames} frames · {video.fps} FPS · {video.duration_seconds.toFixed(1)}s
        </p>

        {/* Aperçu vidéo */}
        <div style={{ marginBottom: '0.75rem' }}>
          <video
            ref={videoRef}
            src={`${API_BASE}/videos/${video.id}/stream`}
            controls
            preload="metadata"
            style={{ width: '100%', maxHeight: '160px', borderRadius: '6px', backgroundColor: '#000', display: 'block' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button
              onClick={() => setStart(Math.min(captureFrame(), end - 1))}
              style={{ flex: 1, padding: '0.3rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--color-accent, #e94560)', backgroundColor: 'transparent', color: 'var(--color-accent, #e94560)', cursor: 'pointer' }}
            >
              ▶ Marquer comme début
            </button>
            <button
              onClick={() => setEnd(Math.max(captureFrame(), start + 1))}
              style={{ flex: 1, padding: '0.3rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--color-accent, #e94560)', backgroundColor: 'transparent', color: 'var(--color-accent, #e94560)', cursor: 'pointer' }}
            >
              ▶ Marquer comme fin
            </button>
          </div>
        </div>

        {/* Mini barre de visualisation */}
        <div style={{ position: 'relative', height: 28, borderRadius: 6, backgroundColor: '#0a0a18', marginBottom: '1rem', overflow: 'hidden' }}>
          {/* Zone non sélectionnée */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: `${pctStart}%`, height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', left: `${pctEnd}%`, top: 0, width: `${100 - pctEnd}%`, height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }} />
          {/* Zone sélectionnée */}
          <div style={{ position: 'absolute', left: `${pctStart}%`, top: 0, width: `${pctEnd - pctStart}%`, height: '100%', backgroundColor: 'rgba(233,69,96,0.35)', border: '1px solid #e94560', boxSizing: 'border-box' }} />
          <div style={{ position: 'absolute', left: `${pctStart}%`, top: 0, width: 2, height: '100%', backgroundColor: '#e94560' }} />
          <div style={{ position: 'absolute', left: `${pctEnd}%`, top: 0, width: 2, height: '100%', backgroundColor: '#e94560', transform: 'translateX(-2px)' }} />
        </div>

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #888)' }}>Début</label>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-accent, #e94560)' }}>
                Frame {start} · {frameToTimestamp(start, video.fps)}
              </span>
            </div>
            <input
              type="range" min={0} max={video.total_frames} value={start}
              onChange={e => {
                const v = Number(e.target.value)
                setStart(Math.min(v, end - 1))
              }}
              style={{ width: '100%', accentColor: '#e94560' }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #888)' }}>Fin</label>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-accent, #e94560)' }}>
                Frame {end} · {frameToTimestamp(end, video.fps)}
              </span>
            </div>
            <input
              type="range" min={0} max={video.total_frames} value={end}
              onChange={e => {
                const v = Number(e.target.value)
                setEnd(Math.max(v, start + 1))
              }}
              style={{ width: '100%', accentColor: '#e94560' }}
            />
          </div>
        </div>

        {/* Résumé sélection */}
        <div style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: 'var(--color-text-muted, #aaa)', marginBottom: '1.25rem' }}>
          Sélection : <strong style={{ color: 'var(--color-text, #e0e0e0)' }}>{selectedFrames} frames</strong> ({selectedSeconds}s)
          {start === 0 && end === video.total_frames && ' — vidéo complète'}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onConfirm(0, video.total_frames)}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Toute la vidéo
          </button>
          <button
            onClick={() => onConfirm(start, end)}
            className="btn-primary"
            style={{ flex: 1 }}
            disabled={start === 0 && end === video.total_frames}
          >
            Annoter cette plage
          </button>
        </div>
        {start === 0 && end === video.total_frames && (
          <p style={{ textAlign: 'center', margin: '0.5rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted, #888)' }}>
            Ajuste les curseurs pour sélectionner une plage spécifique
          </p>
        )}
      </div>
    </div>
  )
}

export default VideoTrimModal
