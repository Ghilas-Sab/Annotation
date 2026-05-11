import React, { useState, useRef, useEffect } from 'react'
import type { Video } from '../../types/project'
import { useVideoStatistics } from '../../api/statistics'
import { useRenameVideo } from '../../api/projects'
import { downloadSavedPreview, getSavedPreviewStreamUrl } from '../../api/exports'
import PreviewPanel from '../exports/PreviewPanel'

interface VideoCardProps {
  video: Video
  onAnnotate: (video: Video) => void
  onDelete: (videoId: string, filename: string) => void
  onStats: (videoId: string) => void
  onDeletePreview?: (videoId: string) => void
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onAnnotate, onDelete, onStats, onDeletePreview }) => {
  const annotationCount = video.annotations?.length || 0
  const [editing, setEditing] = useState(false)
  const [showPreviewPanel, setShowPreviewPanel] = useState(false)
  const [showAdaptedPreview, setShowAdaptedPreview] = useState(false)
  const [editValue, setEditValue] = useState(video.original_name)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: stats } = useVideoStatistics(video.id, {
    enabled: annotationCount >= 2,
  })

  const renameMutation = useRenameVideo(video.project_id)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const startEdit = () => { setEditValue(video.original_name); setEditing(true) }

  const commitEdit = () => {
    const trimmed = editValue.trim()
    if (!trimmed) { setEditValue(video.original_name); setEditing(false); return }
    renameMutation.mutate({ videoId: video.id, originalName: trimmed })
    setEditing(false)
  }

  const cancelEdit = () => { setEditValue(video.original_name); setEditing(false) }

  return (
    <div
      id={`video-${video.id}`}
      role="listitem"
      style={{
        backgroundColor: 'var(--color-panel)',
        borderRadius: '8px',
        border: '1px solid var(--color-surface)',
        overflow: 'hidden',
        scrollMarginTop: '1rem',
      }}
    >
      {/* Ligne principale */}
      <div style={{
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              aria-label="Nom de la vidéo"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') cancelEdit()
              }}
              style={{
                margin: '0 0 0.25rem 0', fontSize: '1rem',
                color: 'var(--color-text)', background: 'var(--color-panel)',
                border: '1px solid var(--color-accent)', borderRadius: '4px',
                padding: '0.1rem 0.4rem', width: '100%',
              }}
            />
          ) : (
            <h3
              onClick={startEdit}
              title="Cliquer pour renommer"
              style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--color-text)', cursor: 'pointer' }}
            >
              {video.original_name}
            </h3>
          )}
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
            <span>{Math.round(video.duration_seconds)}s</span>
            <span>{video.fps} FPS</span>
            <span style={{ color: 'var(--color-accent2)' }}>
              {annotationCount} {annotationCount <= 1 ? 'annotation' : 'annotations'}
            </span>
            {annotationCount >= 2 && stats?.bpm_global && (
              <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>
                {stats.bpm_global.toFixed(2)} BPM
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" onClick={() => onAnnotate(video)} style={{ fontSize: '0.85rem' }}>
            Annoter →
          </button>
          <button className="btn-secondary" onClick={() => onStats(video.id)} style={{ fontSize: '0.85rem' }}>
            Stats
          </button>
          {annotationCount >= 2 && (
            <button
              className="btn-secondary"
              onClick={() => setShowPreviewPanel(true)}
              style={{ fontSize: '0.85rem' }}
            >
              Adapter
            </button>
          )}
          <button
            aria-label="Supprimer la vidéo"
            onClick={() => onDelete(video.id, video.original_name)}
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.5rem' }}
          >
            🗑️
          </button>
        </div>
      </div>

      {showPreviewPanel && (
        <div style={{
          borderTop: '1px solid rgba(122,162,247,0.14)',
          background: 'rgba(122,162,247,0.03)',
          padding: '1rem 1.5rem',
        }}>
          <PreviewPanel
            projectId={video.project_id}
            videoId={video.id}
            currentBpm={stats?.bpm_global ?? 0}
            annotationCount={annotationCount}
            onClose={() => setShowPreviewPanel(false)}
          />
        </div>
      )}

      {video.adapted_preview && (
        <>
          <div style={{
            borderTop: '1px solid rgba(100,255,218,0.15)',
            background: 'rgba(100,255,218,0.04)',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', color: '#64ffda', fontWeight: 600 }}>
                Vidéo adaptée sauvegardée
              </span>
              <span style={{
                fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: 10,
                background: 'rgba(100,255,218,0.12)', border: '1px solid rgba(100,255,218,0.3)',
                color: '#64ffda',
              }}>
                {Number(video.adapted_preview.bpm).toFixed(2)} BPM
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)' }}>
                Adaptée le {new Date(video.adapted_preview.created_at).toLocaleString('fr-FR')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAdaptedPreview(v => !v)}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.28rem 0.55rem',
                  borderRadius: 6,
                  border: '1px solid rgba(100,255,218,0.25)',
                  background: 'rgba(100,255,218,0.08)',
                  color: '#64ffda',
                  cursor: 'pointer',
                }}
              >
                {showAdaptedPreview ? 'Masquer' : 'Voir'}
              </button>
              <button
                onClick={() => void downloadSavedPreview(video.id)}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.28rem 0.55rem',
                  borderRadius: 6,
                  border: '1px solid rgba(100,255,218,0.25)',
                  background: 'rgba(100,255,218,0.08)',
                  color: '#64ffda',
                  cursor: 'pointer',
                }}
              >
                Exporter la video adaptee
              </button>
              <button
                className="btn-secondary"
                onClick={() => onStats(video.id)}
                style={{ fontSize: '0.72rem', padding: '0.28rem 0.55rem' }}
              >
                Ouvrir les stats
              </button>
              {onDeletePreview && (
                <button
                  aria-label="Supprimer l'aperçu adapté"
                  onClick={() => onDeletePreview(video.id)}
                  title="Supprimer l'aperçu adapté"
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.25rem', fontSize: '0.85rem' }}
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          {showAdaptedPreview && (
            <div style={{
              borderTop: '1px solid rgba(100,255,218,0.15)',
              padding: '0.85rem 1.5rem 0.9rem 1.5rem',
            }}>
              <video
                data-testid={`adapted-preview-player-${video.id}`}
                src={getSavedPreviewStreamUrl(video.id)}
                controls
                preload="metadata"
                style={{
                  width: '100%',
                  maxWidth: 320,
                  background: '#000',
                  borderRadius: 8,
                  border: '1px solid rgba(100,255,218,0.14)',
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default VideoCard
