import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject, useDeleteVideo } from '../api/projects'
import VideoUpload from '../components/projects/VideoUpload'
import VideoTrimModal from '../components/video/VideoTrimModal'
import VideoCard from '../components/projects/VideoCard'
import type { Video } from '../types/project'

function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])

  return isMobile
}

const ProjectDetailPage: React.FC = () => {
  const { id: projectId = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading, error } = useProject(projectId)
  const deleteMutation = useDeleteVideo(projectId)
  const [trimVideo, setTrimVideo] = useState<Video | null>(null)
  const isMobile = useIsMobile()

  const handleDeleteVideo = async (videoId: string, filename: string) => {
    if (window.confirm(`Supprimer la vidéo "${filename}" ?`)) {
      try {
        await deleteMutation.mutateAsync(videoId)
      } catch (err) {
        console.error(err)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ color: 'var(--color-accent)', fontSize: '1.2rem' }}>Chargement du projet...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="container">
        <div style={{ color: 'var(--color-danger)' }}>Une erreur est survenue ou le projet est introuvable.</div>
        <button onClick={() => navigate('/projects')} className="btn-secondary" style={{ marginTop: '1rem' }}>Retour aux projets</button>
      </div>
    )
  }

  const handleTrimConfirm = (start: number, end: number) => {
    if (!trimVideo) return
    const params = start === 0 && end === trimVideo.total_frames
      ? ''
      : `?start=${start}&end=${end}`
    navigate(`/annotation/${trimVideo.id}${params}`)
    setTrimVideo(null)
  }

  return (
    <>
    {trimVideo && (
      <VideoTrimModal
        video={trimVideo}
        onConfirm={handleTrimConfirm}
        onCancel={() => setTrimVideo(null)}
      />
    )}
    <div className="container">
      <nav style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <span
          onClick={() => navigate('/projects')}
          style={{ color: 'var(--color-accent)', cursor: 'pointer' }}
        >
          Projets
        </span>
        <span style={{ color: 'var(--color-text-muted)', margin: '0 0.5rem' }}>&gt;</span>
        <span style={{ color: 'var(--color-text)' }}>{project.name}</span>
      </nav>

      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-text)', margin: '0 0 0.5rem 0' }}>{project.name}</h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{project.description}</p>
      </header>

      <div
        data-testid="detail-layout"
        className={isMobile ? 'flex-col' : undefined}
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '2rem',
          alignItems: 'flex-start',
        }}
      >
        <div
          data-testid="dropzone-column"
          style={{ flex: isMobile ? undefined : '0 0 35%', width: isMobile ? '100%' : undefined }}
        >
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Ajouter une vidéo</h2>
          <VideoUpload projectId={projectId} />
        </div>

        <div
          data-testid="video-list-column"
          style={{
            flex: isMobile ? undefined : '1',
            width: isMobile ? '100%' : undefined,
            overflowY: 'auto',
            maxHeight: isMobile ? undefined : '80vh',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
            Vidéos du projet ({project.videos?.length || 0})
          </h2>

          {project.videos && project.videos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {project.videos.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onAnnotate={(v) => setTrimVideo(v)}
                  onStats={(id) => navigate(`/statistics/${id}`)}
                  onDelete={handleDeleteVideo}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-panel)', borderRadius: '8px', color: 'var(--color-text-muted)' }}>
              Aucune vidéo dans ce projet. Commencez par en uploader une.
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

export default ProjectDetailPage
