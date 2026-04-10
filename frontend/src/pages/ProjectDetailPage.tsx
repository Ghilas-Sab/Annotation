import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject, useDeleteVideo } from '../api/projects'
import VideoUpload from '../components/projects/VideoUpload'

const ProjectDetailPage: React.FC = () => {
  const { id: projectId = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading, error } = useProject(projectId)
  const deleteMutation = useDeleteVideo(projectId)

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

  return (
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

      <section>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Ajouter une vidéo</h2>
        <VideoUpload projectId={projectId} />
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-text)' }}>Vidéos du projet ({project.videos?.length || 0})</h2>
        
        {project.videos && project.videos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {project.videos.map(video => (
              <div 
                key={video.id}
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
                    <span style={{ color: 'var(--color-accent2)' }}>{video.annotations?.length || 0} annotations</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/annotation/${video.id}`)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Annoter →
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => navigate(`/statistics/${video.id}`)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Stats
                  </button>
                  <button 
                    aria-label="Supprimer la vidéo"
                    onClick={() => handleDeleteVideo(video.id, video.original_name)}
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
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-panel)', borderRadius: '8px', color: 'var(--color-text-muted)' }}>
            Aucune vidéo dans ce projet. Commencez par en uploader une.
          </div>
        )}
      </section>
    </div>
  )
}

export default ProjectDetailPage
