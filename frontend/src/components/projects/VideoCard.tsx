import React, { useState, useRef, useEffect } from 'react'
import type { Video } from '../../types/project'
import { useVideoStatistics } from '../../api/statistics'
import { useRenameVideo } from '../../api/projects'

interface VideoCardProps {
  video: Video
  onAnnotate: (video: Video) => void
  onDelete: (videoId: string, filename: string) => void
  onStats: (videoId: string) => void
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onAnnotate, onDelete, onStats }) => {
  const annotationCount = video.annotations?.length || 0
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(video.original_name)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: stats } = useVideoStatistics(video.id, {
    enabled: annotationCount >= 2,
  })

  const renameMutation = useRenameVideo(video.project_id)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const startEdit = () => {
    setEditValue(video.original_name)
    setEditing(true)
  }

  const commitEdit = () => {
    const trimmed = editValue.trim()
    if (!trimmed) {
      setEditValue(video.original_name)
      setEditing(false)
      return
    }
    renameMutation.mutate({ videoId: video.id, originalName: trimmed })
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditValue(video.original_name)
    setEditing(false)
  }

  return (
    <div 
      role="listitem"
      style={{
        backgroundColor: 'var(--color-panel)',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid var(--color-surface)'
      }}
    >
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
              margin: '0 0 0.25rem 0',
              fontSize: '1rem',
              color: 'var(--color-text)',
              background: 'var(--color-panel)',
              border: '1px solid var(--color-accent)',
              borderRadius: '4px',
              padding: '0.1rem 0.4rem',
              width: '100%',
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
        <button
          className="btn-primary"
          onClick={() => onAnnotate(video)}
          style={{ fontSize: '0.85rem' }}
        >
          Annoter →
        </button>
        <button
          className="btn-secondary"
          onClick={() => onStats(video.id)}
          style={{ fontSize: '0.85rem' }}
        >
          Stats
        </button>
        <button 
          aria-label="Supprimer la vidéo"
          onClick={() => onDelete(video.id, video.original_name)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--color-danger)', 
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

export default VideoCard
