import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import React from 'react'
import VideoCard from './VideoCard'
import type { Video } from '../../types/project'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})
afterAll(() => server.close())

const renderVideoCard = (video: Video) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <VideoCard 
          video={video} 
          onAnnotate={vi.fn()} 
          onDelete={vi.fn()} 
          onStats={vi.fn()} 
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const buildVideo = (overrides = {}): Video => ({
  id: 'uuid-v1',
  project_id: 'p1',
  filename: 'test.mp4',
  original_name: 'Test Video',
  fps: 25,
  duration_seconds: 10,
  total_frames: 250,
  width: 1920,
  height: 1080,
  codec: 'h264',
  uploaded_at: new Date().toISOString(),
  annotations: [],
  ...overrides,
}) as Video

describe('VideoCard', () => {
  it.each([
    [0, '0 annotation'],
    [1, '1 annotation'],
    [2, '2 annotations'],
    [3, '3 annotations'],
    [10, '10 annotations'],
  ])('displays correct annotation count: %i → "%s"', (count, expected) => {
    const video = buildVideo({ 
      annotations: new Array(count).fill({ id: 'a', frame: 0, timestamp: 0 }) 
    })
    renderVideoCard(video)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('hides BPM when annotation count is 0', () => {
    server.use(
      http.get('*/api/v1/videos/uuid-v1/statistics', () => 
        HttpResponse.json({ bpm_global: 120, bpm_mean: 120, bpm_median: 120, bpm_variation: 0 })
      )
    )
    const video = buildVideo({ annotations: [] })
    renderVideoCard(video)
    expect(screen.queryByText(/BPM/)).not.toBeInTheDocument()
  })

  it('hides BPM when annotation count is 1', () => {
    server.use(
      http.get('*/api/v1/videos/uuid-v1/statistics', () => 
        HttpResponse.json({ bpm_global: 120, bpm_mean: 120, bpm_median: 120, bpm_variation: 0 })
      )
    )
    const video = buildVideo({ annotations: [{ id: 'a', frame: 10, timestamp: 0.4 }] })
    renderVideoCard(video)
    expect(screen.queryByText(/BPM/)).not.toBeInTheDocument()
  })

  it('shows BPM when video has 2 annotations', async () => {
    server.use(
      http.get('*/api/v1/videos/uuid-v1/statistics', () => 
        HttpResponse.json({ bpm_global: 72.5, bpm_mean: 72.5, bpm_median: 72.5, bpm_variation: 0 })
      )
    )
    const video = buildVideo({ 
      annotations: [
        { id: 'a1', frame: 0, timestamp: 0 },
        { id: 'a2', frame: 25, timestamp: 1.0 }
      ] 
    })
    renderVideoCard(video)
    expect(await screen.findByText('72.5 BPM')).toBeInTheDocument()
  })

  it('shows BPM when video has 5+ annotations', async () => {
    server.use(
      http.get('*/api/v1/videos/uuid-v1/statistics', () => 
        HttpResponse.json({ bpm_global: 90, bpm_mean: 90, bpm_median: 90, bpm_variation: 0 })
      )
    )
    const video = buildVideo({ 
      annotations: new Array(5).fill({ id: 'a', frame: 0, timestamp: 0 }) 
    })
    renderVideoCard(video)
    expect(await screen.findByText('90 BPM')).toBeInTheDocument()
  })

  it('updates annotation count reactively when prop changes', () => {
    const video0 = buildVideo({ annotations: [] })
    const { rerender } = renderVideoCard(video0)
    expect(screen.getByText('0 annotation')).toBeInTheDocument()

    const video1 = buildVideo({ annotations: [{ id: 'a', frame: 0, timestamp: 0 }] })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    rerender(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <VideoCard 
            video={video1} 
            onAnnotate={vi.fn()} 
            onDelete={vi.fn()} 
            onStats={vi.fn()} 
          />
        </BrowserRouter>
      </QueryClientProvider>
    )
    expect(screen.getByText('1 annotation')).toBeInTheDocument()
  })
})
