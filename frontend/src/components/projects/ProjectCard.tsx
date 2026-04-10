import React from 'react'
import { Project } from '../../types/project'

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
  onClick: (id: string) => void
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete, onClick }) => {
  const totalVideos = project.videos?.length || 0
  const totalAnnotations = project.videos?.reduce(
    (acc, video) => acc + (video.annotations?.length || 0),
    0
  ) || 0

  const formattedDate = new Date(project.created_at).toLocaleDateString('fr-FR')

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Supprimer le projet "${project.name}" ?`)) {
      onDelete(project.id)
    }
  }

  return (
    <div 
      className="project-card" 
      onClick={() => onClick(project.id)}
      style={{
        backgroundColor: 'var(--color-surface)',
        padding: '1.5rem',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0, color: 'var(--color-text)' }}>{project.name}</h3>
        <button 
          aria-label="Supprimer le projet"
          onClick={handleDelete}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-danger)',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '4px'
          }}
        >
          🗑️
        </button>
      </div>
      
      <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        {project.description}
      </p>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--color-accent2)' }}>
          {totalVideos} vidéos
        </span>
        <span style={{ color: 'var(--color-accent2)' }}>
          {totalAnnotations} annotations
        </span>
      </div>
      
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        Modifié le {formattedDate}
      </div>
    </div>
  )
}

export default ProjectCard
