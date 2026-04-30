import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { AssemblageClip } from '../../stores/assemblageStore'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface AssemblagePreviewPanelProps {
  clips: AssemblageClip[]
  onClose: () => void
}

const getClipUrl = (clip: AssemblageClip) =>
  clip.sourceType === 'adapted'
    ? `${API_BASE}/videos/${clip.videoId}/preview-adapted/stream`
    : `${API_BASE}/videos/${clip.videoId}/stream`

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return m > 0 ? `${m}:${sec}` : `0:${sec}`
}

const fmtDuration = (s: number) => {
  if (s < 60) return `${Math.round(s)} s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60).toString().padStart(2, '0')}s`
}

const STRIP_COLORS = ['#3b82f6', '#a855f7', '#14b8a6', '#f59e0b', '#ef4444', '#22c55e']
const getStripColor = (clip: AssemblageClip, index: number) =>
  clip.sourceType === 'adapted' ? '#f43f5e' : STRIP_COLORS[index % STRIP_COLORS.length]

const AssemblagePreviewPanel: React.FC<AssemblagePreviewPanelProps> = ({ clips, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const shouldAutoplayRef = useRef(false)

  const totalDuration = clips.reduce((s, c) => s + c.duration, 0)
  const currentClip = clips[currentIndex] ?? clips[0]

  // Change de source directement sur l'élément DOM — plus fiable que le pattern key+ref
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentClip) return

    setVideoError(false)
    video.src = getClipUrl(currentClip)
    video.load()

    if (shouldAutoplayRef.current) {
      shouldAutoplayRef.current = false
      video.play().catch(() => {})
    }
  }, [currentIndex, currentClip])

  const handleEnded = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      shouldAutoplayRef.current = true
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, clips.length])

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= clips.length) return
    shouldAutoplayRef.current = true
    setCurrentIndex(index)
  }, [clips.length])

  const offsetBefore = clips.slice(0, currentIndex).reduce((s, c) => s + c.duration, 0)

  if (!currentClip) return null

  return (
    <section
      style={{
        marginTop: '1.25rem',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        background: 'linear-gradient(160deg, rgba(10,15,35,0.98) 0%, rgba(16,22,48,0.98) 100%)',
        overflow: 'hidden',
      }}
    >
      {/* En-tête */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)',
        gap: '1rem', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted, #8892b0)' }}>
            Lecture enchaînée
          </div>
          <div style={{ marginTop: '0.2rem', fontSize: '1rem', fontWeight: 700, color: '#eef3ff' }}>
            Aperçu de l&apos;enchaînement de {clips.length} clip{clips.length > 1 ? 's' : ''}
          </div>
          <div style={{ marginTop: '0.1rem', fontSize: '0.78rem', color: 'var(--color-text-muted, #8892b0)' }}>
            Durée totale : {fmtDuration(totalDuration)} · Clip {currentIndex + 1}/{clips.length}
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={onClose} style={{ flexShrink: 0 }}>
          Masquer l&apos;aperçu
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px' }}>
        {/* Colonne gauche : player + contrôles */}
        <div style={{ padding: '1rem 0.75rem 1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>

          {/* Player */}
          {videoError ? (
            <div style={{
              aspectRatio: '16 / 9', borderRadius: 12, background: '#05070f',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', color: 'var(--color-text-muted, #8892b0)', fontSize: '0.85rem',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ fontSize: '1.5rem' }}>⚠</span>
              <span>Impossible de charger cette vidéo</span>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}
                onClick={() => {
                  setVideoError(false)
                  const video = videoRef.current
                  if (video) { video.load() }
                }}
              >
                Réessayer
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              controls
              preload="auto"
              onEnded={handleEnded}
              onError={() => setVideoError(true)}
              style={{
                width: '100%',
                display: 'block',
                borderRadius: 12,
                background: '#000',
                aspectRatio: '16 / 9',
              }}
            />
          )}

          {/* Info clip courant */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div style={{
              width: 6, height: 36, borderRadius: 3, flexShrink: 0,
              background: getStripColor(currentClip, currentIndex),
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e8ecf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentClip.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #8892b0)', marginTop: '0.15rem' }}>
                {fmtDuration(currentClip.duration)} · Débute à {fmtTime(offsetBefore)} dans la séquence
              </div>
            </div>
          </div>

          {/* Contrôles prev / next */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.45rem 0.6rem', fontSize: '0.82rem' }}
            >
              ◀ Clip précédent
            </button>
            <button
              type="button"
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === clips.length - 1}
              className="btn-secondary"
              style={{ flex: 1, padding: '0.45rem 0.6rem', fontSize: '0.82rem' }}
            >
              Clip suivant ▶
            </button>
          </div>

          {/* Barre de progression séquence */}
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #8892b0)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Progression de la séquence
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.07)', gap: 1 }}>
              {clips.map((clip, i) => {
                const pct = totalDuration > 0 ? (clip.duration / totalDuration) * 100 : 100 / clips.length
                return (
                  <div
                    key={clip.id}
                    style={{
                      width: `${pct}%`, height: '100%',
                      background: i < currentIndex
                        ? 'rgba(255,255,255,0.35)'
                        : i === currentIndex
                          ? getStripColor(clip, i)
                          : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.2s',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Colonne droite : liste des clips */}
        <div style={{
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.4rem',
          maxHeight: 480, overflowY: 'auto',
        }}>
          <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted, #8892b0)', marginBottom: '0.35rem' }}>
            Ordre de lecture
          </div>
          {clips.map((clip, i) => {
            const isActive = i === currentIndex
            return (
              <button
                key={clip.id}
                type="button"
                onClick={() => goTo(i)}
                style={{
                  textAlign: 'left', width: '100%', padding: '0.65rem 0.75rem',
                  borderRadius: 10, cursor: 'pointer',
                  border: isActive ? `1px solid ${getStripColor(clip, i)}` : '1px solid rgba(255,255,255,0.06)',
                  background: isActive ? `${getStripColor(clip, i)}22` : 'rgba(255,255,255,0.03)',
                  color: '#e8ecf8',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    flexShrink: 0, width: 20, height: 20, borderRadius: 999,
                    background: isActive ? getStripColor(clip, i) : 'rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: '0.62rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isActive ? '▶' : i + 1}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: isActive ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {clip.name}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--color-text-muted, #8892b0)', marginTop: '0.1rem' }}>
                      {fmtDuration(clip.duration)}
                    </span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default AssemblagePreviewPanel
