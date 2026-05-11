import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../api/projects'
import ExportPage from './ExportPage'
import { Logo, ThemeToggle, Breadcrumb, Icon, Spinner } from '../components/ui'

const ExportPageRoute: React.FC = () => {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading } = useProject(projectId)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar"><Logo /></header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-2)' }}>
          <Spinner /> Chargement…
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ gap: 5 }}>
            <Icon.Back /> Projets
          </button>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: 'var(--danger-c)' }}>Projet introuvable.</div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')}>Retour aux projets</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <header className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${projectId}`)} style={{ gap: 5 }}>
          <Icon.Back /> Projet
        </button>
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
        <Breadcrumb items={[
          { label: 'Projets', onClick: () => navigate('/projects') },
          { label: project.name, onClick: () => navigate(`/projects/${projectId}`) },
          { label: 'Export' },
        ]} />
        <div style={{ flex: 1 }} />
        <ThemeToggle />
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px 48px', maxWidth: 880, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="text-h2" style={{ marginBottom: 4 }}>Export du Projet</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-muted">{project.videos?.length ?? 0} vidéo{(project.videos?.length ?? 0) !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <ExportPage projectId={projectId} videos={project.videos ?? []} />
      </div>
    </div>
  )
}

export default ExportPageRoute
