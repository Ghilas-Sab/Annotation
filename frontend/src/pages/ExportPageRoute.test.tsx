import React from 'react'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ExportPageRoute from './ExportPageRoute'
import type { Project } from '../types/project'

const navigateMock = vi.fn()
const useProjectMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useParams: () => ({ projectId: 'p1' }),
  useNavigate: () => navigateMock,
}))

vi.mock('../api/projects', () => ({
  useProject: (projectId: string) => useProjectMock(projectId),
}))

vi.mock('./ExportPage', () => ({
  default: ({ projectId, videos }: { projectId: string; videos: unknown[] }) => (
    <div data-testid="export-page" data-project-id={projectId} data-video-count={videos.length} />
  ),
}))

const buildProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Projet Test',
  description: '',
  created_at: '',
  videos: [],
  ...overrides,
})

beforeEach(() => {
  navigateMock.mockClear()
  useProjectMock.mockReset()
})

describe('ExportPageRoute', () => {
  test('shows loading state while project is loading', () => {
    useProjectMock.mockReturnValue({ data: undefined, isLoading: true })

    render(<ExportPageRoute />)

    expect(screen.getByText(/chargement/i)).toBeInTheDocument()
    expect(useProjectMock).toHaveBeenCalledWith('p1')
  })

  test('shows not found state and navigates back to projects', () => {
    useProjectMock.mockReturnValue({ data: undefined, isLoading: false })

    render(<ExportPageRoute />)
    fireEvent.click(screen.getByRole('button', { name: /retour aux projets/i }))

    expect(screen.getByText(/projet introuvable/i)).toBeInTheDocument()
    expect(navigateMock).toHaveBeenCalledWith('/projects')
  })

  test('renders breadcrumbs and export page when project is loaded', () => {
    useProjectMock.mockReturnValue({
      data: buildProject({ videos: [{ id: 'v1' }, { id: 'v2' }] as Project['videos'] }),
      isLoading: false,
    })

    render(<ExportPageRoute />)

    expect(screen.getByText('Projet Test')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByTestId('export-page')).toHaveAttribute('data-project-id', 'p1')
    expect(screen.getByTestId('export-page')).toHaveAttribute('data-video-count', '2')
  })

  test('breadcrumb links navigate to projects and project detail', () => {
    useProjectMock.mockReturnValue({ data: buildProject(), isLoading: false })

    render(<ExportPageRoute />)
    fireEvent.click(screen.getByText('Projets'))
    fireEvent.click(screen.getByText('Projet Test'))

    expect(navigateMock).toHaveBeenCalledWith('/projects')
    expect(navigateMock).toHaveBeenCalledWith('/projects/p1')
  })
})
