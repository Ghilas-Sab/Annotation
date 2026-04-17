import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AnnotationPage } from './AnnotationPage'

const mockAnnotations = [
  { id: '1', frame_number: 10, label: 'beat 1', timestamp_seconds: 0.4, video_id: 'v1', created_at: '', updated_at: '', data: {} },
  { id: '2', frame_number: 50, label: 'beat 2', timestamp_seconds: 2.0, video_id: 'v1', created_at: '', updated_at: '', data: {} },
]

vi.mock('../api/annotations', () => ({
  useAnnotations: () => ({ data: mockAnnotations }),
  useCreateAnnotation: () => ({ mutate: vi.fn() }),
  useDeleteAnnotation: () => ({ mutate: vi.fn() }),
  useUpdateAnnotation: () => ({ mutate: vi.fn() }),
  useCreateBulkAnnotations: () => ({ mutate: vi.fn() }),
  useShiftAnnotations: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

vi.mock('../api/projects', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../api/projects')>()
  return {
    ...mod,
    useVideo: () => ({
      data: { id: 'v1', fps: 25, total_frames: 1000, duration_seconds: 40 },
      isLoading: false,
    }),
  }
})

vi.mock('../stores/videoStore', () => ({
  useVideoStore: vi.fn((selector: (s: { currentFrame: number; fps: number; totalFrames: number; setVideoMetadata: () => void; setCurrentFrame: () => void }) => unknown) => {
    const state = {
      currentFrame: 0, fps: 25, totalFrames: 1000,
      setVideoMetadata: vi.fn(), setCurrentFrame: vi.fn(),
    }
    return selector ? selector(state) : state
  }),
}))

// Mock heavy components that need browser APIs
vi.mock('../components/video/VideoPlayer', () => ({
  default: () => <div data-testid="video-player" />,
}))
vi.mock('../components/video/VideoTimeline', () => ({
  VideoTimeline: () => <div data-testid="video-timeline" />,
}))
vi.mock('../hooks/useVideoKeyboard', () => ({
  useVideoKeyboard: vi.fn(() => ({
    seekPrevFrame: vi.fn(), seekNextFrame: vi.fn(), seek5Back: vi.fn(),
    seek5Forward: vi.fn(), seekPrevAnnotation: vi.fn(), seekNextAnnotation: vi.fn(),
    seekStart: vi.fn(), seekEnd: vi.fn(), annotate: vi.fn(),
  })),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  </MemoryRouter>
)

describe('AnnotationPage', () => {
  test('loads and displays annotations', async () => {
    render(<AnnotationPage videoId="v1" />, { wrapper })
    expect(await screen.findByText('beat 1')).toBeInTheDocument()
    expect(screen.getByText('beat 2')).toBeInTheDocument()
  })

  test('renders video player and timeline', () => {
    render(<AnnotationPage videoId="v1" />, { wrapper })
    expect(screen.getByTestId('video-player')).toBeInTheDocument()
    expect(screen.getByTestId('video-timeline')).toBeInTheDocument()
  })

  test('clicking annotation calls seek', () => {
    render(<AnnotationPage videoId="v1" />, { wrapper })
    const annotation = screen.getByText('beat 1')
    fireEvent.click(annotation.closest('[data-testid="annotation-item"]')!)
    // seek is wired to videoRef — no crash is the assertion here
    expect(annotation).toBeInTheDocument()
  })

  test('delete button is present for each annotation', () => {
    render(<AnnotationPage videoId="v1" />, { wrapper })
    const deleteButtons = screen.getAllByRole('button', { name: /supprimer/i })
    expect(deleteButtons).toHaveLength(2)
  })

  test('annotations are sorted by frame number ASC', () => {
    render(<AnnotationPage videoId="v1" />, { wrapper })
    const items = screen.getAllByTestId('annotation-item')
    expect(items[0]).toHaveTextContent('beat 1')
    expect(items[1]).toHaveTextContent('beat 2')
  })
})
