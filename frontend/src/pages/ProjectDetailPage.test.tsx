import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProjectDetailPage from './ProjectDetailPage'
import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import React from 'react'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const mockProject = (overrides = {}) => ({
  id: '1',
  name: 'Projet Test',
  description: 'Une description',
  created_at: new Date().toISOString(),
  videos: [],
  ...overrides,
})

const renderWithProviders = (projectId: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProjectDetailPage', () => {
  it('renders project name and videos', async () => {
    server.use(http.get('*/api/v1/projects/1', () =>
      HttpResponse.json(mockProject({
        videos: [
          { id: 'v1', original_name: 'video1.mp4', duration_seconds: 10, fps: 25, annotations: [] },
          { id: 'v2', original_name: 'video2.mp4', duration_seconds: 20, fps: 30, annotations: [] }
        ]
      }))
    ))

    renderWithProviders('1')

    const projectNames = await screen.findAllByText('Projet Test')
    expect(projectNames.length).toBeGreaterThanOrEqual(1)
    expect(await screen.findByText('video1.mp4')).toBeInTheDocument()
    expect(await screen.findByText('video2.mp4')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows upload zone', async () => {
    server.use(http.get('*/api/v1/projects/1', () =>
      HttpResponse.json(mockProject())
    ))

    renderWithProviders('1')

    expect(await screen.findByText(/Glissez-déposez/i)).toBeInTheDocument()
  })

  it('shows breadcrumb', async () => {
    server.use(http.get('*/api/v1/projects/1', () =>
      HttpResponse.json(mockProject({ name: 'Mon Projet' }))
    ))

    renderWithProviders('1')

    expect(await screen.findByText('Projets')).toBeInTheDocument()
    expect((await screen.findAllByText('Mon Projet')).length).toBeGreaterThanOrEqual(1)
  })

  // AC 1 & 6 — deux colonnes avec data-testid
  it('layout has two columns: dropzone left, video list right', async () => {
    server.use(http.get('*/api/v1/projects/1', () =>
      HttpResponse.json(mockProject())
    ))

    renderWithProviders('1')

    const dropzone = await screen.findByTestId('dropzone-column')
    const videoList = screen.getByTestId('video-list-column')
    expect(dropzone).toBeInTheDocument()
    expect(videoList).toBeInTheDocument()
    expect(dropzone.compareDocumentPosition(videoList)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  // AC 2 — responsive mobile
  it('layout is responsive: columns stack on mobile', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 600, writable: true })
    server.use(http.get('*/api/v1/projects/1', () =>
      HttpResponse.json(mockProject())
    ))

    renderWithProviders('1')

    const container = await screen.findByTestId('detail-layout')
    expect(container.className).toMatch(/flex-col|stack/)
  })

  // AC 4 — liste scrollable
  it('video list is scrollable when overflowing', async () => {
    server.use(http.get('*/api/v1/projects/1', () =>
      HttpResponse.json(mockProject())
    ))

    renderWithProviders('1')

    const videoList = await screen.findByTestId('video-list-column')
    expect(videoList).toHaveStyle({ overflowY: 'auto' })
  })
})
