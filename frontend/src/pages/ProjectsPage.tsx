import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects, useCreateProject, useDeleteProject } from '../api/projects'
import ProjectList from '../components/projects/ProjectList'

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate()
  const { data: projects = [], isLoading, error } = useProjects()
  const createMutation = useCreateProject()
  const deleteMutation = useDeleteProject()

  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createMutation.mutateAsync({ name: newName, description: newDescription })
      setNewName('')
      setNewDescription('')
      setShowForm(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ color: 'var(--color-accent)', fontSize: '1.2rem' }}>Chargement des projets...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div style={{ color: 'var(--color-danger)' }}>Une erreur est survenue lors du chargement.</div>
      </div>
    )
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-text)', margin: 0 }}>Gestion des Projets</h1>
        {!showForm && (
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span style={{ fontSize: '1.2rem' }}>+</span> Nouveau projet
          </button>
        )}
      </header>

      {showForm && (
        <div
          className="inline-form"
          style={{
            backgroundColor: 'var(--color-panel)',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            border: '1px solid var(--color-accent)'
          }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Créer un nouveau projet</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="project-name" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Nom du projet</label>
              <input
                id="project-name"
                aria-label="Nom du projet"
                placeholder="Ex: Rythme Batterie"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="project-desc" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Description (optionnelle)</label>
              <textarea
                id="project-desc"
                placeholder="Description du projet..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Annuler
              </button>
              <button
                className="btn-primary"
                disabled={!newName.trim() || createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? 'Création...' : 'Créer le projet →'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProjectList
        projects={projects}
        onDelete={handleDelete}
        onProjectClick={(id) => navigate(`/projects/${id}`)}
      />
    </div>
  )
}

export default ProjectsPage
