import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AssemblagePage from './AssemblagePage'
import type { Project, Video } from '../types/project'
import type { AssemblageClip } from '../stores/assemblageStore'
import { useAssemblageStore } from '../stores/assemblageStore'

vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => ({
      load: vi.fn(),
      loadBlob: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn(),
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      seekTo: vi.fn(),
      setVolume: vi.fn(),
    })),
  },
}))

vi.mock('../utils/audioPersistence', () => ({
  saveAudioTrackBlob: vi.fn().mockResolvedValue(true),
  loadAudioTrackBlobUrl: vi.fn().mockResolvedValue(null),
  deleteAudioTrackBlob: vi.fn().mockResolvedValue(undefined),
}))

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
  localStorage.clear()
  useAssemblageStore.persist.clearStorage()
  useAssemblageStore.getState().replaceClips([])
  useAssemblageStore.setState({ audioTracks: [] })
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test-audio-url'),
    revokeObjectURL: vi.fn(),
  })
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
    expect(screen.getAllByText('clip1.mp4').length).toBeGreaterThan(0)
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

  test('clip appears in right panel and video player is shown when clips added', () => {
    renderWithProviders(
      <AssemblagePage
        project={buildProject()}
        initialClips={[buildClip({ id: 'c1', name: 'clip1.mp4' })]}
      />
    )
    expect(screen.getAllByText('clip1.mp4').length).toBeGreaterThan(0)
    expect(document.querySelector('video')).toBeInTheDocument()
  })

  test('removing a clip from timeline', async () => {
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={[buildClip({ name: 'clip1.mp4' })]} />)
    await userEvent.click(screen.getAllByRole('button', { name: /supprimer clip1\.mp4/i })[0])
    expect(screen.queryAllByText('clip1.mp4')).toHaveLength(0)
  })

  test('shows total duration of assembled clips', () => {
    const clips = [buildClip({ id: 'c1', duration: 10 }), buildClip({ id: 'c2', duration: 5, name: 'clip2.mp4' })]
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={clips} />)
    expect(screen.getByText('Durée totale')).toBeInTheDocument()
    expect(screen.getByText('15 s')).toBeInTheDocument()
  })

  test('keeps persisted assemblage on refresh when initialClips is not provided', () => {
    useAssemblageStore.getState().replaceClips([buildClip({ name: 'persisted.mp4' })])
    renderWithProviders(<AssemblagePage project={buildProject()} />)
    expect(screen.getAllByText('persisted.mp4').length).toBeGreaterThan(0)
  })
})

describe('S7.7 — Audio import', () => {
  test('import audio button visible when clips are present', () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    expect(screen.getAllByRole('button', { name: /importer une piste/i }).length).toBeGreaterThan(0)
  })

  test('audio file input accepts mp3, wav and ogg', () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const inputs = document.querySelectorAll('input[type="file"]')
    const audioInput = Array.from(inputs).find(
      (el) => (el as HTMLInputElement).accept.includes('mp3')
    ) as HTMLInputElement | undefined
    expect(audioInput).toBeDefined()
    expect(audioInput!.multiple).toBe(true)
    expect(audioInput!.accept).toContain('.wav')
    expect(audioInput!.accept).toContain('.ogg')
  })

  test('importing an audio file shows track name in the timeline', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    const file = new File(['audio-data'], 'musique.mp3', { type: 'audio/mpeg' })
    await userEvent.upload(input, file)
    expect(screen.getAllByText('musique.mp3').length).toBeGreaterThan(0)
  })

  test('audio track delete button removes it from the timeline', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    const file = new File(['audio-data'], 'musique.mp3', { type: 'audio/mpeg' })
    await userEvent.upload(input, file)
    expect(screen.getAllByText('musique.mp3').length).toBeGreaterThan(0)
    await userEvent.click(screen.getAllByRole('button', { name: /supprimer musique\.mp3/i })[0])
    expect(screen.queryAllByText('musique.mp3')).toHaveLength(0)
  })

  test('audio can be imported again after deleting a previous track', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, new File(['audio-a'], 'alpha.mp3', { type: 'audio/mpeg' }))
    await waitFor(() => expect(screen.getAllByText('alpha.mp3').length).toBeGreaterThan(0))
    await userEvent.click(screen.getAllByRole('button', { name: /supprimer alpha\.mp3/i })[0])
    expect(screen.queryAllByText('alpha.mp3')).toHaveLength(0)

    await userEvent.upload(input, new File(['audio-b'], 'beta.mp3', { type: 'audio/mpeg' }))
    await waitFor(() => expect(screen.getAllByText('beta.mp3').length).toBeGreaterThan(0))
  })

  test('audio lane remains usable even without any video clip', async () => {
    renderWithProviders(<AssemblagePage project={buildProject()} />)
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, new File(['audio'], 'solo.mp3', { type: 'audio/mpeg' }))
    await waitFor(() => expect(screen.getAllByText('solo.mp3').length).toBeGreaterThan(0))
    expect(screen.getByTestId('assemblage-audio-lane')).toBeInTheDocument()
  })

  test('audio label shows Musique track section', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    const file = new File(['audio-data'], 'track.mp3', { type: 'audio/mpeg' })
    await userEvent.upload(input, file)
    expect(screen.getAllByText(/musique/i).length).toBeGreaterThan(0)
  })

  test('audio track has a volume slider', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, new File(['audio'], 'beat.mp3', { type: 'audio/mpeg' }))
    const [track] = useAssemblageStore.getState().audioTracks
    expect(document.querySelector(`[data-testid="audio-volume-slider-${track.id}"]`)).toBeInTheDocument()
  })

  test('source video volume slider is shown in the left mix column', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, new File(['audio'], 'mix.mp3', { type: 'audio/mpeg' }))
    expect(screen.getByTestId('source-video-volume-slider')).toBeInTheDocument()
    expect(screen.getByLabelText(/son d'origine vidéo/i)).toBeInTheDocument()
  })

  test('global play button appears when clips are present', () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    expect(screen.getByRole('button', { name: /lecture/i })).toBeInTheDocument()
  })

  test('audio track has left and right trim handles', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, new File(['audio'], 'beat.mp3', { type: 'audio/mpeg' }))
    expect(document.querySelector('[data-testid="trim-start-handle"]')).toBeInTheDocument()
    expect(document.querySelector('[data-testid="trim-end-handle"]')).toBeInTheDocument()
  })

  test('multiple audio clips share the same audio timeline lane', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, [
      new File(['audio1'], 'beat-1.mp3', { type: 'audio/mpeg' }),
      new File(['audio2'], 'beat-2.mp3', { type: 'audio/mpeg' }),
    ])
    expect(screen.getByTestId('assemblage-audio-lane')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('beat-1.mp3').length).toBeGreaterThan(0)
      expect(screen.getAllByText('beat-2.mp3').length).toBeGreaterThan(0)
    })
    expect(screen.getByText(/2 clips audio/i)).toBeInTheDocument()
  })

  test('new audio clips are chained after the previous one when durations are known', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, [
      new File(['audio1'], 'first.mp3', { type: 'audio/mpeg' }),
      new File(['audio2'], 'second.mp3', { type: 'audio/mpeg' }),
    ])

    await waitFor(() => expect(useAssemblageStore.getState().audioTracks).toHaveLength(2))

    const [first, second] = useAssemblageStore.getState().audioTracks
    await act(async () => {
      useAssemblageStore.getState().updateAudioTrackDuration(first.id, 12)
      useAssemblageStore.getState().updateAudioTrackDuration(second.id, 8)
    })

    const [updatedFirst, updatedSecond] = useAssemblageStore.getState().audioTracks
    expect(updatedFirst.startOffset).toBe(0)
    expect(updatedSecond.startOffset).toBe(12)
  })
})
