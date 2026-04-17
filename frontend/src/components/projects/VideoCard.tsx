import React from 'react'
import type { Video } from '../../types/project'
import { useVideoStatistics } from '../../api/statistics'

interface VideoCardProps {
  video: Video
  onAnnotate: (video: Video) => void
  onDelete: (videoId: string, filename: string) => void
  onStats: (videoId: string) => void
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onAnnotate, onDelete, onStats }) => {
  const annotationCount = video.annotations?.length || 0
  
  const { data: stats } = useVideoStatistics(video.id, { 
    enabled: annotationCount >= 2 
  })

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
        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'var(--color-text)' }}>{video.original_name}</h3>
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
