import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../api/projects'
import ExportPage from './ExportPage'

const ExportPageRoute: React.FC = () => {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { data: project, isLoading } = useProject(projectId)

  if (isLoading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ color: 'var(--color-accent)', fontSize: '1.2rem' }}>Chargement...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container">
        <div style={{ color: 'var(--color-danger)' }}>Projet introuvable.</div>
        <button onClick={() => navigate('/projects')} className="btn-secondary" style={{ marginTop: '1rem' }}>
          Retour aux projets
        </button>
      </div>
    )
  }

  return (
    <div className="container">
      <nav style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        <span onClick={() => navigate('/projects')} style={{ color: 'var(--color-accent)', cursor: 'pointer' }}>
          Projets
        </span>
        <span style={{ color: 'var(--color-text-muted)', margin: '0 0.5rem' }}>&gt;</span>
        <span onClick={() => navigate(`/projects/${projectId}`)} style={{ color: 'var(--color-accent)', cursor: 'pointer' }}>
          {project.name}
        </span>
        <span style={{ color: 'var(--color-text-muted)', margin: '0 0.5rem' }}>&gt;</span>
        <span style={{ color: 'var(--color-text)' }}>Export</span>
      </nav>
      <ExportPage projectId={projectId} videos={project.videos ?? []} />
    </div>
  )
}

export default ExportPageRoute
