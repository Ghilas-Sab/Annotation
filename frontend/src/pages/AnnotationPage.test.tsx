import React from 'react'
import { describe, test, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AnnotationPage } from './AnnotationPage'
import type { Annotation } from '../types/annotation'

const API = 'http://localhost:8000/api/v1'

const makeAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: 'ann-1',
  video_id: 'v1',
  frame_number: 10,
  timestamp_ms: 400,
  label: 'beat 1',
  created_at: '',
  updated_at: '',
  ...overrides,
})

const videoFixtures = {
  v1: {
    id: 'v1',
    project_id: 'p1',
    original_name: 'video-v1.mp4',
    fps: 25,
    total_frames: 1000,
    duration_seconds: 40,
    width: 1920,
    height: 1080,
  },
  'empty-video': {
    id: 'empty-video',
    project_id: 'p1',
    original_name: 'video-empty.mp4',
    fps: 25,
    total_frames: 500,
    duration_seconds: 20,
    width: 1920,
    height: 1080,
  },
} as const

let annotationsByVideo: Record<string, Annotation[]> = {}
let createSequence = 2

const server = setupServer(
  http.get(`${API}/videos/:videoId`, ({ params }) => {
    const videoId = String(params.videoId)
    const video = videoFixtures[videoId as keyof typeof videoFixtures]
    if (!video) {
      return HttpResponse.json({}, { status: 404 })
    }
    return HttpResponse.json(video)
  }),
  http.get(`${API}/videos/:videoId/annotations`, ({ params }) => {
    const videoId = String(params.videoId)
    return HttpResponse.json(annotationsByVideo[videoId] ?? [])
  }),
  http.post(`${API}/videos/:videoId/annotations`, async ({ params, request }) => {
    const videoId = String(params.videoId)
    const body = await request.json() as { frame_number: number; label: string; category_id?: string }
    const created = makeAnnotation({
      id: `ann-${createSequence++}`,
      video_id: videoId,
      frame_number: body.frame_number,
      label: body.label,
      category_id: body.category_id,
      timestamp_ms: body.frame_number * 40,
    })
    annotationsByVideo[videoId] = [...(annotationsByVideo[videoId] ?? []), created]
    return HttpResponse.json(created)
  }),
  http.delete(`${API}/annotations/:annotationId`, ({ params }) => {
    const annotationId = String(params.annotationId)
    Object.keys(annotationsByVideo).forEach((videoId) => {
      annotationsByVideo[videoId] = (annotationsByVideo[videoId] ?? []).filter(annotation => annotation.id !== annotationId)
    })
    return new HttpResponse(null, { status: 204 })
  }),
  http.get(`${API}/videos/:videoId/categories`, () => HttpResponse.json([])),
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  annotationsByVideo = {}
  createSequence = 2
})
afterAll(() => server.close())

vi.mock('../stores/videoStore', () => ({
  useVideoStore: vi.fn((selector: (state: {
    currentFrame: number
    fps: number
    totalFrames: number
    setVideoMetadata: () => void
    setCurrentFrame: () => void
  }) => unknown) => {
    const state = {
      currentFrame: 0,
      fps: 25,
      totalFrames: 1000,
      setVideoMetadata: vi.fn(),
      setCurrentFrame: vi.fn(),
    }
    return selector(state)
  }),
}))

vi.mock('../stores/audioStore', () => ({
  useAudioStore: vi.fn((selector: (state: { enabled: boolean; toggle: () => void }) => unknown) => {
    const state = {
      enabled: false,
      toggle: vi.fn(),
    }
    return selector(state)
  }),
}))

vi.mock('../hooks/useAudioBeep', () => ({
  useAudioBeep: () => ({ beep: vi.fn() }),
}))

vi.mock('../components/video/VideoPlayer', () => ({
  default: React.forwardRef((_props, _ref) => <div data-testid="video-player" />),
}))

vi.mock('../components/video/PlaybackControls', () => ({
  default: ({ currentFrame, onAnnotate }: { currentFrame: number; onAnnotate: (frame: number) => void }) => (
    <button onClick={() => onAnnotate(currentFrame)} type="button">
      Annoter
    </button>
  ),
}))

vi.mock('../components/video/VideoTimeline', () => ({
  VideoTimeline: () => <div data-testid="video-timeline" />,
}))

vi.mock('../components/annotations/CategorySelector', () => ({
  CategorySelector: () => <div data-testid="category-selector" />,
}))

vi.mock('../components/annotations/CategoryManager', () => ({
  CategoryManager: () => <div data-testid="category-manager" />,
}))

vi.mock('../components/annotations/BulkPlacementForm', () => ({
  default: () => <div data-testid="bulk-placement-form" />,
}))

vi.mock('../components/annotations/ShiftForm', () => ({
  default: () => <div data-testid="shift-form" />,
}))

vi.mock('../components/exports/ExportButtons', () => ({
  default: () => <div data-testid="export-buttons" />,
}))

vi.mock('../components/KeyboardShortcutsModal', () => ({
  KeyboardShortcutsModal: () => <div data-testid="keyboard-shortcuts-modal" />,
}))

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 5 * 60 * 1000,
      },
    },
  })

const renderPage = (videoId: string, client = createClient()) =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AnnotationPage videoId={videoId} />
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('AnnotationPage', () => {
  test('annotation count updates immediately after create', async () => {
    annotationsByVideo.v1 = []
    const user = userEvent.setup()

    renderPage('v1')

    expect(await screen.findByRole('button', { name: /liste \(0\)/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /annoter/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /liste \(1\)/i })).toBeInTheDocument()
    })
  })

  test('annotation count updates immediately after delete', async () => {
    annotationsByVideo.v1 = [
      makeAnnotation({ id: 'ann-1', label: 'beat 1', frame_number: 10 }),
      makeAnnotation({ id: 'ann-2', label: 'beat 2', frame_number: 20 }),
      makeAnnotation({ id: 'ann-3', label: 'beat 3', frame_number: 30 }),
    ]
    const user = userEvent.setup()

    renderPage('v1')

    expect(await screen.findByRole('button', { name: /liste \(3\)/i })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /supprimer/i })[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /liste \(2\)/i })).toBeInTheDocument()
    })
  })

  test('navigating to empty video shows count 0', async () => {
    annotationsByVideo.v1 = [makeAnnotation()]
    annotationsByVideo['empty-video'] = []
    const client = createClient()

    const initial = renderPage('v1', client)
    expect(await screen.findByRole('button', { name: /liste \(1\)/i })).toBeInTheDocument()

    initial.unmount()
    renderPage('empty-video', client)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /liste \(0\)/i })).toBeInTheDocument()
    })
  })

  test('no duplicate annotations displayed', async () => {
    annotationsByVideo.v1 = [
      makeAnnotation({ id: 'dup-1', label: 'beat unique', frame_number: 10 }),
      makeAnnotation({ id: 'dup-1', label: 'beat unique', frame_number: 10 }),
    ]

    renderPage('v1')

    expect(await screen.findByRole('button', { name: /liste \(1\)/i })).toBeInTheDocument()
    expect(screen.getAllByTestId('annotation-item')).toHaveLength(1)
  })

  test('annotation page respects range: player starts at startFrame', async () => {
    annotationsByVideo.v1 = [makeAnnotation()]
    const client = createClient()

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/annotation/v1?start=50&end=200']}>
          <AnnotationPage videoId="v1" />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByTestId('current-frame-display')).toHaveTextContent('50')
  })

  test('clicking annotation does not crash', async () => {
    annotationsByVideo.v1 = [makeAnnotation()]

    renderPage('v1')

    const annotation = await screen.findByText('beat 1')
    fireEvent.click(annotation.closest('[data-testid="annotation-item"]') as HTMLElement)

    expect(annotation).toBeInTheDocument()
  })
})
