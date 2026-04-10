import React from 'react'
import { Project } from '../../types/project'
import ProjectCard from './ProjectCard'

interface ProjectListProps {
  projects: Project[]
  onDelete: (id: string) => void
  onProjectClick: (id: string) => void
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onDelete, onProjectClick }) => {
  if (projects.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        Aucun projet trouvé. Créez-en un nouveau pour commencer.
      </div>
    )
  }

  return (
    <div 
      className="project-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem',
      }}
    >
      {projects.map(project => (
        <ProjectCard 
          key={project.id} 
          project={project} 
          onDelete={onDelete} 
          onClick={onProjectClick}
        />
      ))}
    </div>
  )
}

export default ProjectList
