import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AssemblagePage from './AssemblagePage'
import type { Project, Video } from '../types/project'
import type { AssemblageClip } from '../stores/assemblageStore'
import { useAssemblageStore } from '../stores/assemblageStore'

const buildVideo = (overrides: Partial<Video> = {}): Video => ({
  id: 'v1',
  project_id: 'p1',
  filename: 'clip1.mp4',
  original_name: 'clip1.mp4',
  fps: 25,
  duration_seconds: 10,
  total_frames: 250,
  width: 1920,
  height: 1080,
  codec: 'h264',
  uploaded_at: '',
  annotations: [],
  ...overrides,
})

const buildProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Projet A',
  description: '',
  created_at: '',
  videos: [],
  ...overrides,
})

const buildClip = (overrides: Partial<AssemblageClip> = {}): AssemblageClip => ({
  id: 'clip-1',
  videoId: 'v1',
  projectId: 'p1',
  name: 'clip1.mp4',
  duration: 10,
  ...overrides,
})

const renderWithProviders = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  useAssemblageStore.getState().replaceClips([])
})

describe('AssemblagePage', () => {
  test('renders assemblage page with title', () => {
    renderWithProviders(<AssemblagePage project={buildProject()} />)
    expect(screen.getByRole('heading', { name: /assemblage/i })).toBeInTheDocument()
  })

  test('shows empty state message when no videos added', () => {
    renderWithProviders(<AssemblagePage project={buildProject()} />)
    expect(screen.getByText(/ajoutez des vidéos pour commencer/i)).toBeInTheDocument()
  })

  test('add videos button opens import modal', async () => {
    renderWithProviders(<AssemblagePage project={buildProject()} />)
    await userEvent.click(screen.getByRole('button', { name: /ajouter des vidéos/i }))
    expect(screen.getByRole('dialog', { name: /sélectionner des vidéos/i })).toBeInTheDocument()
  })

  test('selecting video in modal and confirming adds it to timeline', async () => {
    const mockProject = buildProject({ videos: [buildVideo({ original_name: 'clip1.mp4' })] })
    renderWithProviders(<AssemblagePage project={mockProject} />)
    await userEvent.click(screen.getByRole('button', { name: /ajouter des vidéos/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /clip1\.mp4/i }))
    await userEvent.click(screen.getByRole('button', { name: /ajouter la sélection/i }))
    expect(screen.getByText('clip1.mp4')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows adapted video source in modal when saved preview exists', async () => {
    const mockProject = buildProject({
      videos: [buildVideo({ adapted_preview: { bpm: 128, created_at: '2026-04-29T10:00:00Z', path: '/tmp/a.mp4' } })],
    })
    renderWithProviders(<AssemblagePage project={mockProject} />)
    await userEvent.click(screen.getByRole('button', { name: /ajouter des vidéos/i }))
    expect(screen.getByText(/version adaptée sauvegardée/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /clip1\.mp4 adaptée/i })).toBeInTheDocument()
  })

  test('preview button reveals sequence preview panel', async () => {
    renderWithProviders(
      <AssemblagePage
        project={buildProject()}
        initialClips={[buildClip({ id: 'c1', name: 'clip1.mp4' })]}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /voir les vidéos concaténées/i }))
    expect(screen.getByText(/aperçu de l'enchaînement/i)).toBeInTheDocument()
    expect(screen.getAllByText('clip1.mp4').length).toBeGreaterThan(0)
  })

  test('removing a clip from timeline', async () => {
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={[buildClip({ name: 'clip1.mp4' })]} />)
    await userEvent.click(screen.getByRole('button', { name: /supprimer clip1\.mp4/i }))
    expect(screen.queryByText('clip1.mp4')).not.toBeInTheDocument()
  })

  test('shows total duration of assembled clips', () => {
    const clips = [buildClip({ id: 'c1', duration: 10 }), buildClip({ id: 'c2', duration: 5, name: 'clip2.mp4' })]
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={clips} />)
    expect(screen.getByText(/durée totale : 15 s/i)).toBeInTheDocument()
  })

})
