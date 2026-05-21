import React, { useState, useRef, useEffect } from 'react'
import type { Video } from '../../types/project'
import { useVideoStatistics } from '../../api/statistics'
import { useRenameVideo } from '../../api/projects'
import { downloadSavedPreview, getSavedPreviewStreamUrl } from '../../api/exports'
import PreviewPanel from '../exports/PreviewPanel'
import { Icon } from '../ui'

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
  const [hov, setHov] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: stats } = useVideoStatistics(video.id, { enabled: annotationCount >= 2 })
  const renameMutation = useRenameVideo(video.project_id)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const startEdit = () => { setEditValue(video.original_name); setEditing(true) }
  const commitEdit = () => {
    const trimmed = editValue.trim()
    if (!trimmed) { setEditValue(video.original_name); setEditing(false); return }
    renameMutation.mutate({ videoId: video.id, originalName: trimmed })
    setEditing(false)
  }
  const cancelEdit = () => { setEditValue(video.original_name); setEditing(false) }

  const durationStr = (() => {
    const s = Math.round(video.duration_seconds)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  })()

  return (
    <div
      id={`video-${video.id}`}
      role="listitem"
      className="card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ overflow: 'hidden', borderColor: hov ? 'hsl(var(--border)/1.5)' : 'var(--border-c)', transition: 'all 0.2s' }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', gap: 14, padding: '14px 16px', alignItems: 'flex-start' }}>
        {/* Mini thumb */}
        <div style={{ width: 80, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon.Film />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              ref={inputRef}
              className="input input-sm"
              aria-label="Nom de la vidéo"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit() }}
              style={{ marginBottom: 6, width: '100%' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={startEdit}>
                {video.original_name}
              </span>
              {hov && (
                <button className="btn btn-ghost btn-xs btn-icon" onClick={startEdit} title="Renommer">
                  <Icon.Edit />
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace' }}>{durationStr}</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{video.fps}fps</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{(video.total_frames ?? 0).toLocaleString()} frames</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{annotationCount} annotation{annotationCount > 1 ? 's' : ''}</span>
            {annotationCount >= 2 && stats?.bpm_global && (
              <>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>·</span>
                <span className="badge badge-primary" style={{ fontSize: 10 }}>{stats.bpm_global.toFixed(2)} BPM</span>
              </>
            )}
            {video.adapted_preview && (
              <span className="badge badge-adapted" style={{ fontSize: 10 }}>Adapté</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <div className="tooltip-wrap">
            <button className="btn btn-primary btn-sm" onClick={() => onAnnotate(video)}>
              <Icon.Pin /> Annoter
            </button>
            <span className="tooltip">Ouvrir l'éditeur d'annotation</span>
          </div>
          <div className="tooltip-wrap">
            <button className="btn btn-outline btn-sm btn-icon" onClick={() => onStats(video.id)}>
              <Icon.Stats />
            </button>
            <span className="tooltip">Statistiques</span>
          </div>
          {annotationCount >= 2 && (
            <div className="tooltip-wrap">
              <button className="btn btn-ghost btn-sm btn-icon" aria-label="Adapter le BPM" onClick={() => setShowPreviewPanel(v => !v)}>
                <Icon.Waveform />
              </button>
              <span className="tooltip">Adapter le BPM</span>
            </div>
          )}
          {hov && (
            <div className="tooltip-wrap">
              <button
                className="btn btn-danger btn-sm btn-icon"
                aria-label="Supprimer la vidéo"
                onClick={() => onDelete(video.id, video.original_name)}
              >
                <Icon.Trash />
              </button>
              <span className="tooltip">Supprimer</span>
            </div>
          )}
        </div>
      </div>

      {/* BPM preview panel */}
      {showPreviewPanel && (
        <div className="fade-up" style={{ borderTop: '1px solid var(--border-c)', padding: '12px 16px', background: 'var(--elevated)' }}>
          <PreviewPanel
            projectId={video.project_id}
            videoId={video.id}
            currentBpm={stats?.bpm_global ?? 0}
            annotationCount={annotationCount}
            onClose={() => setShowPreviewPanel(false)}
          />
        </div>
      )}

      {/* Adapted preview */}
      {video.adapted_preview && (
        <div className="fade-up" style={{ borderTop: '1px solid hsl(var(--adapted-preview)/0.2)', background: 'hsl(var(--adapted-preview)/0.04)', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--adapted)', fontWeight: 600 }}>Vidéo adaptée sauvegardée</span>
            <span className="badge badge-adapted" style={{ fontSize: 10 }}>
              {Number(video.adapted_preview.bpm).toFixed(2)} BPM
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
              Adaptée le {new Date(video.adapted_preview.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className="btn btn-ghost btn-xs" onClick={() => setShowAdaptedPreview(v => !v)}>
              {showAdaptedPreview ? 'Masquer' : 'Voir'}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={() => void downloadSavedPreview(video.id)}>
              <Icon.Download /> Télécharger
            </button>
            <button className="btn btn-ghost btn-xs" onClick={() => onStats(video.id)}>
              <Icon.Stats /> Stats
            </button>
            {onDeletePreview && (
              <button
                className="btn btn-ghost btn-xs btn-icon"
                aria-label="Supprimer l'aperçu adapté"
                onClick={() => onDeletePreview(video.id)}
                style={{ color: 'var(--danger-c)', marginLeft: 'auto' }}
              >
                <Icon.Trash />
              </button>
            )}
          </div>
          {showAdaptedPreview && (
            <video
              data-testid={`adapted-preview-player-${video.id}`}
              src={getSavedPreviewStreamUrl(video.id)}
              controls
              preload="metadata"
              style={{ width: '100%', maxWidth: 320, background: '#000', borderRadius: 8, marginTop: 10, border: '1px solid hsl(var(--adapted-preview)/0.2)' }}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default VideoCard
