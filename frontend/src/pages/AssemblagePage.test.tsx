import React from 'react'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WaveSurfer from 'wavesurfer.js'
import AssemblagePage from './AssemblagePage'
import type { Project, Video } from '../types/project'
import type { AssemblageClip } from '../stores/assemblageStore'
import { getClipTimelineStart, useAssemblageStore } from '../stores/assemblageStore'

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

const waveSurferCreateMock = vi.mocked(WaveSurfer.create)

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
  useAssemblageStore.setState({
    clips: [],
    audioTracks: [],
    annotations: {},
    activeProjectId: null,
    savedProjects: {},
  })
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

  test('adding an adapted video keeps its BPM in the assemblage clip', async () => {
    const mockProject = buildProject({
      videos: [buildVideo({ adapted_preview: { bpm: 128, created_at: '2026-04-29T10:00:00Z', path: '/tmp/a.mp4' } })],
    })
    renderWithProviders(<AssemblagePage project={mockProject} />)

    await userEvent.click(screen.getByRole('button', { name: /ajouter des vidéos/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /clip1\.mp4 adaptée/i }))
    await userEvent.click(screen.getByRole('button', { name: /ajouter la sélection/i }))

    expect(useAssemblageStore.getState().clips[0].bpm).toBe(128)
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

  test('reorders clips from the side panel and updates timeline placement', async () => {
    const clips = [
      buildClip({ id: 'c1', name: 'clip1.mp4', duration: 10 }),
      buildClip({ id: 'c2', name: 'clip2.mp4', duration: 5 }),
    ]
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={clips} />)

    await userEvent.click(screen.getByRole('button', { name: /monter clip2\.mp4/i }))

    const reordered = useAssemblageStore.getState().clips
    expect(reordered.map((clip) => clip.id)).toEqual(['c2', 'c1'])
    expect(getClipTimelineStart(reordered[0])).toBe(0)
    expect(getClipTimelineStart(reordered[1])).toBe(5)
  })

  test('shows total duration of assembled clips', () => {
    const clips = [buildClip({ id: 'c1', duration: 10 }), buildClip({ id: 'c2', duration: 5, name: 'clip2.mp4' })]
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={clips} />)
    expect(screen.getByText('Durée totale')).toBeInTheDocument()
    expect(screen.getByText('15 s')).toBeInTheDocument()
  })

  test('keeps persisted assemblage on refresh when initialClips is not provided', () => {
    // Simulate project 'p1' was already active with persisted clips
    useAssemblageStore.setState({
      clips: [buildClip({ name: 'persisted.mp4' })],
      activeProjectId: 'p1',
    })
    renderWithProviders(<AssemblagePage project={buildProject()} />)
    expect(screen.getAllByText('persisted.mp4').length).toBeGreaterThan(0)
  })

  test('switches to the next clip only after its first frame is buffered', async () => {
    const clips = [
      buildClip({ id: 'c1', videoId: 'v1', name: 'clip1.mp4' }),
      buildClip({ id: 'c2', videoId: 'v2', name: 'clip2.mp4' }),
    ]
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={clips} />)

    const activeVideo = screen.getByTestId('assemblage-video-player-active') as HTMLVideoElement
    fireEvent.ended(activeVideo)

    expect(screen.getByText((_, element) => element?.textContent?.startsWith('1/2') ?? false)).toBeInTheDocument()
    const bufferedVideo = screen.getByTestId('assemblage-video-player-buffer') as HTMLVideoElement
    expect(bufferedVideo.src).toContain('/videos/v2/stream')

    fireEvent.loadedData(bufferedVideo)

    await waitFor(() =>
      expect(screen.getByText((_, element) => element?.textContent?.startsWith('2/2') ?? false)).toBeInTheDocument()
    )
    expect((screen.getByTestId('assemblage-video-player-active') as HTMLVideoElement).src).toContain('/videos/v2/stream')
  })

  test('keeps playing through an empty space as a black gap until the next clip', async () => {
    vi.useFakeTimers()
    let now = 0
    const perfNowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now)
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16) as unknown as number)
    const cancelRafSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((id: number) => window.clearTimeout(id))
    try {
      const clips = [
        buildClip({ id: 'c1', videoId: 'v1', name: 'clip1.mp4', duration: 10, trimEnd: 10, startOffset: 0, autoPlaced: false }),
        buildClip({ id: 'c2', videoId: 'v2', name: 'clip2.mp4', duration: 10, trimEnd: 10, startOffset: 15, autoPlaced: false }),
      ]
      renderWithProviders(<AssemblagePage project={buildProject()} initialClips={clips} />)

      const activeVideo = screen.getByTestId('assemblage-video-player-active') as HTMLVideoElement
      fireEvent.ended(activeVideo)
      fireEvent.pause(activeVideo)

      expect(screen.getByTestId('assemblage-black-gap')).toBeInTheDocument()
      expect(screen.getByText((_, element) => element?.textContent?.startsWith('1/2') ?? false)).toBeInTheDocument()

      await act(async () => {})
      now = 5100
      await act(async () => {
        await vi.advanceTimersByTimeAsync(16)
      })

      const bufferedVideo = screen.getByTestId('assemblage-video-player-buffer') as HTMLVideoElement
      expect(bufferedVideo.src).toContain('/videos/v2/stream')
      act(() => {
        fireEvent.loadedData(bufferedVideo)
      })

      expect(screen.getByText((_, element) => element?.textContent?.startsWith('2/2') ?? false)).toBeInTheDocument()
      expect(screen.queryByTestId('assemblage-black-gap')).not.toBeInTheDocument()
    } finally {
      perfNowSpy.mockRestore()
      rafSpy.mockRestore()
      cancelRafSpy.mockRestore()
      vi.useRealTimers()
    }
  })

  test('uses media metadata duration as timeline duration source of truth', () => {
    renderWithProviders(
      <AssemblagePage
        project={buildProject()}
        initialClips={[buildClip({ id: 'c1', duration: 10 })]}
      />
    )

    const activeVideo = screen.getByTestId('assemblage-video-player-active') as HTMLVideoElement
    Object.defineProperty(activeVideo, 'duration', { configurable: true, value: 12.5 })
    fireEvent.loadedMetadata(activeVideo)

    expect(useAssemblageStore.getState().clips[0].duration).toBe(12.5)
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

  test('imported audio does not play before the video play promise resolves', async () => {
    let resolveVideoPlay: (() => void) | null = null
    const videoPlaySpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveVideoPlay = resolve }))

    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, new File(['audio'], 'sync.mp3', { type: 'audio/mpeg' }))
    const [track] = useAssemblageStore.getState().audioTracks
    act(() => {
      useAssemblageStore.getState().updateAudioTrackDuration(track.id, 10)
    })

    const ws = waveSurferCreateMock.mock.results.at(-1)?.value
    await userEvent.click(screen.getByRole('button', { name: /lecture/i }))

    expect(ws.play).not.toHaveBeenCalled()

    await act(async () => {
      resolveVideoPlay?.()
    })
    fireEvent.timeUpdate(screen.getByTestId('assemblage-video-player-active'))

    await waitFor(() => expect(ws.play).toHaveBeenCalled())
    videoPlaySpy.mockRestore()
  })

  test('Space toggles assemblage playback even when a button is focused', async () => {
    const videoPlaySpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)

    renderWithProviders(
      <AssemblagePage project={buildProject()} initialClips={[buildClip()]} />
    )
    const focusedButton = screen.getByRole('button', { name: /importer une piste/i })
    focusedButton.focus()

    fireEvent.keyDown(focusedButton, { key: ' ', code: 'Space' })

    await waitFor(() => expect(videoPlaySpy).toHaveBeenCalled())
    expect(document.activeElement).not.toBe(focusedButton)
    videoPlaySpy.mockRestore()
  })
})

describe('Isolation par projet', () => {
  test('switching to a different project shows empty assemblage', () => {
    // Project p1 was active with clips
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().addClips([buildClip({ name: 'clip-p1.mp4', projectId: 'p1' })])

    // Switch to project p2 before rendering
    useAssemblageStore.getState().switchProject('p2')

    renderWithProviders(<AssemblagePage project={buildProject({ id: 'p2' })} />)
    expect(screen.queryAllByText('clip-p1.mp4')).toHaveLength(0)
    expect(screen.getByText(/ajoutez des vidéos pour commencer/i)).toBeInTheDocument()
  })

  test('switching back to project p1 restores its clips', () => {
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().addClips([buildClip({ name: 'clip-p1.mp4', projectId: 'p1' })])
    useAssemblageStore.getState().switchProject('p2')

    // Now render p1 again — page uses effectiveProjectId = project.id = 'p1'
    renderWithProviders(<AssemblagePage project={buildProject({ id: 'p1' })} />)
    expect(screen.getAllByText('clip-p1.mp4').length).toBeGreaterThan(0)
  })

  test('audio tracks from a previous project are not visible in a new project', async () => {
    renderWithProviders(
      <AssemblagePage project={buildProject({ id: 'p1' })} initialClips={[buildClip({ projectId: 'p1' })]} />
    )
    const input = document.querySelector('input[accept*="mp3"]') as HTMLInputElement
    await userEvent.upload(input, new File(['audio'], 'p1-track.mp3', { type: 'audio/mpeg' }))
    await waitFor(() => expect(screen.getAllByText('p1-track.mp3').length).toBeGreaterThan(0))

    // Switch to project p2 — manually simulate what the page would do on navigation
    useAssemblageStore.getState().switchProject('p2')

    renderWithProviders(<AssemblagePage project={buildProject({ id: 'p2' })} />)
    expect(screen.queryAllByText('p1-track.mp3')).toHaveLength(0)
  })
})

describe('S7.9 — Fondus par clip', () => {
  test('fade-in and fade-out toggles visible for the active clip', () => {
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={[buildClip()]} />)
    expect(screen.getByRole('checkbox', { name: /fondu d.entrée/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /fondu de sortie/i })).toBeInTheDocument()
  })

  test('fade-in toggle is unchecked by default', () => {
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={[buildClip()]} />)
    expect(screen.getByRole('checkbox', { name: /fondu d.entrée/i })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /fondu de sortie/i })).not.toBeChecked()
  })

  test('enabling fade-in shows duration field', async () => {
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={[buildClip()]} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /fondu d.entrée/i }))
    expect(screen.getByRole('spinbutton', { name: /durée fondu d.entrée/i })).toBeInTheDocument()
  })

  test('fade-in and fade-out can use different durations', async () => {
    renderWithProviders(<AssemblagePage project={buildProject()} initialClips={[buildClip()]} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /fondu d.entrée/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /fondu de sortie/i }))

    const fadeInDuration = screen.getByRole('spinbutton', { name: /durée fondu d.entrée/i })
    const fadeOutDuration = screen.getByRole('spinbutton', { name: /durée fondu de sortie/i })
    fireEvent.change(fadeInDuration, { target: { value: '2' } })
    fireEvent.change(fadeOutDuration, { target: { value: '3' } })

    const clip = useAssemblageStore.getState().clips[0]
    expect(clip.fadeInDurationS).toBe(2)
    expect(clip.fadeOutDurationS).toBe(3)
  })

  test('fade-in changes the active preview opacity', async () => {
    renderWithProviders(
      <AssemblagePage
        project={buildProject()}
        initialClips={[buildClip({ fadeIn: true, fadeDurationS: 2 })]}
      />
    )
    const activeVideo = screen.getByTestId('assemblage-video-player-active') as HTMLVideoElement
    expect(activeVideo.style.opacity).toBe('0')

    activeVideo.currentTime = 1
    fireEvent.timeUpdate(activeVideo)

    await waitFor(() => expect(activeVideo.style.opacity).toBe('0.5'))
  })

  test('fade controls not visible when no clips are present', () => {
    renderWithProviders(<AssemblagePage project={buildProject()} />)
    expect(screen.queryByRole('checkbox', { name: /fondu/i })).not.toBeInTheDocument()
  })
})

describe('S7.8 — Chargement annotations', () => {
  test('annotations are fetched for each clip added', async () => {
    const fetchAnnotations = vi.fn().mockResolvedValue([])
    renderWithProviders(<AssemblagePage project={buildProject()} onFetchAnnotations={fetchAnnotations} />)

    await act(async () => {
      useAssemblageStore.getState().addClips([buildClip({ videoId: 'v1' })])
    })

    await waitFor(() => expect(fetchAnnotations).toHaveBeenCalledWith('v1'))
  })

  test('annotations are fetched from API when clip is added via UI', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([]) })
    vi.stubGlobal('fetch', mockFetch)

    const mockProject = buildProject({ videos: [buildVideo({ id: 'v42', original_name: 'test.mp4' })] })
    renderWithProviders(<AssemblagePage project={mockProject} />)

    await userEvent.click(screen.getByRole('button', { name: /ajouter des vidéos/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /test\.mp4/i }))
    await userEvent.click(screen.getByRole('button', { name: /ajouter la sélection/i }))

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/videos/v42/annotations'))
    )
  })
})
