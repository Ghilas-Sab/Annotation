import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject, useDeleteVideo } from '../api/projects'
import { useQueryClient } from '@tanstack/react-query'
import { deletePreview } from '../api/exports'
import VideoUpload from '../components/projects/VideoUpload'
import VideoCard from '../components/projects/VideoCard'
import VideoTrimModal from '../components/video/VideoTrimModal'
import { Logo, ThemeToggle, Breadcrumb, Icon, EmptyState, Spinner } from '../components/ui'
import type { Video } from '../types/project'

const ProjectDetailPage: React.FC = () => {
  const { id: projectId = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: project, isLoading, error } = useProject(projectId)
  const deleteMutation = useDeleteVideo(projectId)
  const [trimVideo, setTrimVideo] = useState<Video | null>(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const handleDeleteVideo = async (videoId: string, filename: string) => {
    if (window.confirm(`Supprimer la vidéo "${filename}" ?`)) {
      try { await deleteMutation.mutateAsync(videoId) } catch (err) { console.error(err) }
    }
  }

  const handleDeletePreview = async (videoId: string) => {
    if (!window.confirm("Supprimer l'aperçu adapté ?")) return
    try {
      await deletePreview(videoId)
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    } catch (err) { console.error(err) }
  }

  const handleTrimConfirm = (start: number, end: number) => {
    if (!trimVideo) return
    const params = start === 0 && end === trimVideo.total_frames ? '' : `?start=${start}&end=${end}`
    navigate(`/annotation/${trimVideo.id}${params}`)
    setTrimVideo(null)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar"><Logo /></header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-2)' }}>
          <Spinner /> Chargement du projet…
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ gap: 5 }}>
            <Icon.Back /> Retour
          </button>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: 'var(--danger-c)' }}>Une erreur est survenue lors du chargement.</div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')}>Retour aux projets</button>
        </div>
      </div>
    )
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

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar">
          <Breadcrumb items={[
            { label: 'Projets', onClick: () => navigate('/projects') },
            { label: project.name },
          ]} />
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <div className="sep-v" style={{ height: 20, margin: '0 4px' }} />
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/export/${projectId}`)}>
            <Icon.Export /> Exporter le projet
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/assemblage/${projectId}`)}>
            <Icon.Layers /> Assemblage
          </button>
        </header>

        <div
          data-testid="detail-layout"
          className={isMobile ? 'flex-col' : ''}
          style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px 1fr', overflow: 'hidden' }}
        >
          {/* Left: Upload */}
          <div
            data-testid="dropzone-column"
            style={{ borderRight: isMobile ? 'none' : '1px solid var(--border-c)', overflow: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="text-h3">Ajouter une vidéo</div>
            <VideoUpload projectId={projectId} />
            <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
              Formats supportés : MP4, MOV, AVI, MKV, WebM.
            </div>
          </div>

          {/* Right: Video list */}
          <div
            data-testid="video-list-column"
            style={{ overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div className="text-h3">{project.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {project.videos?.length ?? 0} vidéo{(project.videos?.length ?? 0) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {!project.videos || project.videos.length === 0 ? (
              <EmptyState
                icon={<Icon.Video />}
                title="Aucune vidéo dans ce projet"
                description="Uploadez une vidéo pour commencer."
              />
            ) : (
              project.videos.map(v => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onAnnotate={video => setTrimVideo(video)}
                  onStats={id => navigate(`/statistics/${id}`)}
                  onDelete={handleDeleteVideo}
                  onDeletePreview={handleDeletePreview}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ProjectDetailPage
