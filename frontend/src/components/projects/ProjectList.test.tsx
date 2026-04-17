import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProjectList from './ProjectList'
import type { Project } from '../../types/project'

const makeProject = (id: string, name: string): Project => ({
  id,
  name,
  description: '',
  created_at: '2024-01-01T00:00:00Z',
  videos: [],
})

describe('ProjectList', () => {
  test('affiche le message vide quand aucun projet', () => {
    render(<ProjectList projects={[]} onDelete={vi.fn()} onProjectClick={vi.fn()} />)
    expect(screen.getByText(/aucun projet trouvé/i)).toBeInTheDocument()
  })

  test('affiche tous les projets', () => {
    const projects = [makeProject('p1', 'Alpha'), makeProject('p2', 'Beta')]
    render(<ProjectList projects={projects} onDelete={vi.fn()} onProjectClick={vi.fn()} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  test('affiche une seule carte pour un seul projet', () => {
    render(
      <ProjectList
        projects={[makeProject('p1', 'Solo')]}
        onDelete={vi.fn()}
        onProjectClick={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('button', { name: /supprimer/i })).toHaveLength(1)
  })

  test('transmet onDelete à chaque carte', () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const projects = [makeProject('p1', 'Projet')]
    render(<ProjectList projects={projects} onDelete={onDelete} onProjectClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /supprimer le projet/i }))
    expect(onDelete).toHaveBeenCalledWith('p1')
    vi.restoreAllMocks()
  })

  test('transmet onProjectClick à chaque carte', () => {
    const onProjectClick = vi.fn()
    const projects = [makeProject('p1', 'Clic')]
    const { container } = render(
      <ProjectList projects={projects} onDelete={vi.fn()} onProjectClick={onProjectClick} />,
    )
    fireEvent.click(container.querySelector('.project-card')!)
    expect(onProjectClick).toHaveBeenCalledWith('p1')
  })

  test('affiche N cartes pour N projets', () => {
    const projects = Array.from({ length: 5 }, (_, i) => makeProject(`p${i}`, `Projet ${i}`))
    render(<ProjectList projects={projects} onDelete={vi.fn()} onProjectClick={vi.fn()} />)
    expect(screen.getAllByRole('button', { name: /supprimer le projet/i })).toHaveLength(5)
  })
})
