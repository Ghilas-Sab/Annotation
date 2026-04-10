import React, { useState, useRef } from 'react'
import { useUploadVideo } from '../../api/projects'

interface VideoUploadProps {
  projectId: string
}

const VideoUpload: React.FC<VideoUploadProps> = ({ projectId }) => {
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useUploadVideo(projectId, (pct) => {
    setProgress(pct)
  })

  const handleFiles = async (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0]
      try {
        await uploadMutation.mutateAsync(file)
        setProgress(0)
      } catch (err) {
        console.error(err)
        setProgress(0)
      }
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="video-upload" style={{ marginBottom: '2rem' }}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--color-accent)' : 'var(--color-surface)'}`,
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: dragActive ? 'rgba(233, 69, 96, 0.1)' : 'var(--color-panel)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
          accept="video/*"
        />
        
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</div>
        <p style={{ margin: 0, color: 'var(--color-text)' }}>
          {uploadMutation.isPending 
            ? 'Téléchargement en cours...' 
            : 'Glissez-déposez une vidéo ici ou cliquez pour parcourir'
          }
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Tous formats vidéo acceptés
        </p>
      </div>

      {uploadMutation.isPending && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ 
            height: '8px', 
            backgroundColor: 'var(--color-surface)', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: 'var(--color-accent)', 
              width: `${progress}%`,
              transition: 'width 0.1s linear'
            }} />
          </div>
          <p style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--color-accent)' }}>
            {progress}%
          </p>
        </div>
      )}

      {uploadMutation.isError && (
        <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Erreur lors de l'upload. Veuillez réessayer.
        </p>
      )}
    </div>
  )
}

export default VideoUpload
