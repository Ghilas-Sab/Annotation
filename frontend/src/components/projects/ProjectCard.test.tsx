import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProjectCard from './ProjectCard'
import type { Project } from '../../types/project'

const mockProject: Project = {
  id: 'p1',
  name: 'Mon Projet',
  description: 'Description du projet',
  created_at: '2024-03-15T10:00:00Z',
  videos: [],
}

const projectWithVideosAndAnnotations: Project = {
  id: 'p2',
  name: 'Projet Annoté',
  description: '',
  created_at: '2024-03-15T10:00:00Z',
  videos: [
    {
      id: 'v1', project_id: 'p2', filename: 'a.mp4', original_name: 'a.mp4',
      fps: 25, duration_seconds: 60, total_frames: 1500,
      width: 1920, height: 1080, codec: 'h264',
      uploaded_at: '', annotations: [
        { id: 'a1', video_id: 'v1', frame_number: 1, timestamp_ms: 40, label: 'beat', created_at: '', updated_at: '' },
        { id: 'a2', video_id: 'v1', frame_number: 2, timestamp_ms: 80, label: 'beat', created_at: '', updated_at: '' },
      ],
    },
    {
      id: 'v2', project_id: 'p2', filename: 'b.mp4', original_name: 'b.mp4',
      fps: 25, duration_seconds: 30, total_frames: 750,
      width: 1280, height: 720, codec: 'h264',
      uploaded_at: '', annotations: [
        { id: 'a3', video_id: 'v2', frame_number: 5, timestamp_ms: 200, label: 'x', created_at: '', updated_at: '' },
      ],
    },
  ],
}

describe('ProjectCard', () => {
  test('affiche le nom du projet', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByText('Mon Projet')).toBeInTheDocument()
  })

  test('affiche la description', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByText('Description du projet')).toBeInTheDocument()
  })

  test('affiche 0 vidéos quand aucune', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByText(/0 vidéos/i)).toBeInTheDocument()
  })

  test('affiche 0 annotations quand aucune', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByText(/0 annotations/i)).toBeInTheDocument()
  })

  test('affiche le bon nombre de vidéos', () => {
    render(<ProjectCard project={projectWithVideosAndAnnotations} onDelete={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByText(/2 vidéos/i)).toBeInTheDocument()
  })

  test('affiche le total des annotations (somme des vidéos)', () => {
    render(<ProjectCard project={projectWithVideosAndAnnotations} onDelete={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByText(/3 annotations/i)).toBeInTheDocument()
  })

  test('affiche la date formatée en fr-FR', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} onClick={vi.fn()} />)
    // 15/03/2024 en locale fr-FR
    expect(screen.getByText(/15\/03\/2024/)).toBeInTheDocument()
  })

  test('appelle onClick au clic sur la carte', () => {
    const onClick = vi.fn()
    const { container } = render(<ProjectCard project={mockProject} onDelete={vi.fn()} onClick={onClick} />)
    fireEvent.click(container.querySelector('.project-card')!)
    expect(onClick).toHaveBeenCalledWith('p1')
  })

  test('affiche le bouton supprimer', () => {
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /supprimer le projet/i })).toBeInTheDocument()
  })

  test('appelle onDelete après confirmation', () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ProjectCard project={mockProject} onDelete={onDelete} onClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /supprimer le projet/i }))
    expect(onDelete).toHaveBeenCalledWith('p1')
    vi.restoreAllMocks()
  })

  test("n'appelle pas onDelete si confirmation refusée", () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ProjectCard project={mockProject} onDelete={onDelete} onClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /supprimer le projet/i }))
    expect(onDelete).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('le clic sur supprimer ne déclenche pas onClick', () => {
    const onClick = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ProjectCard project={mockProject} onDelete={vi.fn()} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /supprimer le projet/i }))
    expect(onClick).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('fonctionne sans videos (undefined)', () => {
    const projectNoVideos = { ...mockProject, videos: undefined as never }
    render(<ProjectCard project={projectNoVideos} onDelete={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByText(/0 vidéos/i)).toBeInTheDocument()
  })
})
