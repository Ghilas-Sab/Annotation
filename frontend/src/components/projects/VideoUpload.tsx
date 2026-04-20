import React, { useState, useRef } from 'react'
import { useUploadVideo } from '../../api/projects'

interface VideoUploadProps {
  projectId: string
  onUpload?: (args: { file: File; displayName: string }) => Promise<unknown>
}

const VideoUpload: React.FC<VideoUploadProps> = ({ projectId, onUpload }) => {
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useUploadVideo(projectId, (pct) => {
    setProgress(pct)
  })

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      setDisplayName(file.name)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    const name = displayName.trim() || selectedFile.name
    try {
      if (onUpload) {
        await onUpload({ file: selectedFile, displayName: name })
      } else {
        await uploadMutation.mutateAsync({ file: selectedFile, displayName: name })
      }
      setSelectedFile(null)
      setDisplayName('')
      setProgress(0)
    } catch (err) {
      console.error(err)
      setProgress(0)
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
        data-testid="dropzone"
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
          MP4, MOV, AVI, MKV, WebM, FLV, WMV acceptés
        </p>
      </div>

      {selectedFile && (
        <div style={{ marginTop: '1rem' }} onClick={(e) => e.stopPropagation()}>
          <label
            htmlFor="video-name-input"
            style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--color-text)', fontSize: '0.9rem' }}
          >
            Nom de la vidéo
          </label>
          <input
            id="video-name-input"
            type="text"
            aria-label="Nom de la vidéo"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={() => {
              if (!displayName.trim()) {
                setDisplayName(selectedFile.name)
              }
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--color-surface)',
              backgroundColor: 'var(--color-panel)',
              color: 'var(--color-text)',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1.5rem',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: uploadMutation.isPending ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Uploader
          </button>
        </div>
      )}

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
