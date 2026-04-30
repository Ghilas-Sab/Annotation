import React, { useMemo, useState } from 'react'
import type { Project, Video } from '../../types/project'

interface VideoImportModalProps {
  project: Project
  onClose: () => void
  onAddSelection: (sources: Array<{ video: Video; sourceType: 'original' | 'adapted' }>) => void
}


const VideoImportModal: React.FC<VideoImportModalProps> = ({
  project,
  onClose,
  onAddSelection,
}) => {
  // selectedIds est un Set de strings de la forme "videoId:original" ou "videoId:adapted"
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const videos = project.videos

  const allIds = useMemo(() =>
    videos.flatMap((v) => {
      const ids = [`${v.id}:original`]
      if (v.adapted_preview) ids.push(`${v.id}:adapted`)
      return ids
    }),
    [videos],
  )

  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(allIds))
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    const sources: Array<{ video: Video; sourceType: 'original' | 'adapted' }> = []
    for (const id of selectedIds) {
      const [videoId, type] = id.split(':')
      const video = videos.find((v) => v.id === videoId)
      if (video) sources.push({ video, sourceType: type as 'original' | 'adapted' })
    }
    onAddSelection(sources)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(10,10,20,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sélectionner des vidéos"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(600px, calc(100vw - 2rem))',
          maxHeight: 'min(85vh, 720px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-panel, #16213e)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderTop: '3px solid var(--color-accent, #e94560)',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* En-tête */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.1rem 1.4rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text, #eaeaea)' }}>
              Sélectionner des vidéos
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #8892b0)', marginTop: '0.15rem' }}>
              {project.name} · {videos.length} vidéo{videos.length > 1 ? 's' : ''} disponible{videos.length > 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-muted, #8892b0)',
              fontSize: '1.2rem', lineHeight: 1, padding: '0.2rem 0.4rem',
              borderRadius: 4, cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Corps scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {videos.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted, #8892b0)', fontSize: '0.88rem' }}>
              Aucune vidéo disponible dans ce projet.
            </p>
          ) : (
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              {/* Header tout sélectionner */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    checked={allSelected}
                    onChange={toggleAll}
                    style={{ width: 15, height: 15, accentColor: 'var(--color-accent, #e94560)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text, #cdd6f4)' }}>
                    Tout sélectionner
                  </span>
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)' }}>
                  {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
                </span>
              </div>

              {/* Liste des vidéos */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {videos.map((video, i) => {
                  const origId = `${video.id}:original`
                  const adapId = `${video.id}:adapted`
                  const origSelected = selectedIds.has(origId)
                  const adapSelected = selectedIds.has(adapId)
                  const isLast = i === videos.length - 1

                  return (
                    <div
                      key={video.id}
                      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                    >
                      {/* Vidéo originale */}
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        background: origSelected ? 'rgba(233,69,96,0.06)' : 'transparent',
                        transition: 'background 0.12s',
                      }}>
                        <input
                          type="checkbox"
                          aria-label={video.original_name}
                          checked={origSelected}
                          onChange={() => toggle(origId)}
                          style={{ width: 15, height: 15, accentColor: 'var(--color-accent, #e94560)', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', color: 'var(--color-text, #cdd6f4)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {video.original_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)', marginTop: 2 }}>
                            {video.fps} fps · {video.width}×{video.height} · {video.duration_seconds.toFixed(1)} s
                          </div>
                        </div>
                        <span style={{
                          flexShrink: 0, fontSize: '0.68rem', fontWeight: 600,
                          padding: '0.15rem 0.45rem', borderRadius: 6,
                          background: 'rgba(74,158,255,0.12)', color: '#93c5fd',
                          border: '1px solid rgba(74,158,255,0.2)',
                        }}>
                          Source
                        </span>
                      </label>

                      {/* Version adaptée (si disponible) */}
                      {video.adapted_preview && (
                        <label style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.6rem 1rem 0.6rem 2.6rem',
                          cursor: 'pointer',
                          background: adapSelected ? 'rgba(100,255,218,0.05)' : 'rgba(0,0,0,0.15)',
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                          transition: 'background 0.12s',
                          position: 'relative',
                        }}>
                          {/* Connecteur visuel */}
                          <div style={{
                            position: 'absolute', left: '1.35rem', top: 0, bottom: '50%',
                            width: 1, background: 'rgba(100,255,218,0.2)',
                          }} />
                          <div style={{
                            position: 'absolute', left: '1.35rem', top: '50%',
                            width: '0.65rem', height: 1, background: 'rgba(100,255,218,0.2)',
                          }} />
                          <input
                            type="checkbox"
                            aria-label={`${video.original_name} adaptée`}
                            checked={adapSelected}
                            onChange={() => toggle(adapId)}
                            style={{ width: 15, height: 15, accentColor: '#64ffda', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', color: '#64ffda', fontWeight: 500 }}>
                              Version adaptée sauvegardée
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #8892b0)', marginTop: 1 }}>
                              Sauvegardée le {new Date(video.adapted_preview.created_at).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                          <span style={{
                            flexShrink: 0, fontSize: '0.68rem', fontWeight: 700,
                            padding: '0.15rem 0.45rem', borderRadius: 6,
                            background: 'rgba(100,255,218,0.1)', color: '#64ffda',
                            border: '1px solid rgba(100,255,218,0.25)',
                          }}>
                            {Math.round(video.adapted_preview.bpm)} BPM
                          </span>
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {selectedIds.size === 0 && videos.length > 0 && (
            <div style={{
              padding: '0.55rem 0.85rem', borderRadius: 6, fontSize: '0.78rem',
              background: 'rgba(233,69,96,0.07)', border: '1px solid rgba(233,69,96,0.2)',
              color: 'var(--color-accent, #e94560)',
            }}>
              Sélectionnez au moins une vidéo pour continuer.
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '0.65rem',
          padding: '1rem 1.4rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.15)',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 500,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 7, color: 'var(--color-text-muted, #8892b0)', cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            style={{
              padding: '0.5rem 1.3rem', fontSize: '0.85rem', fontWeight: 700,
              background: selectedIds.size > 0 ? 'var(--color-accent, #e94560)' : 'rgba(233,69,96,0.3)',
              border: 'none', borderRadius: 7, color: '#fff',
              cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.15s',
            }}
          >
            Ajouter la sélection
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoImportModal
