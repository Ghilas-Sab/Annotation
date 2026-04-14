import React from 'react'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import StatisticsPage from './StatisticsPage'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const API_BASE = 'http://localhost:8000/api/v1'

const renderPage = (videoId = 'video-1') => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/statistics/${videoId}`]}>
        <Routes>
          <Route path="/statistics/:videoId" element={<StatisticsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const mockVideo = {
  id: 'video-1',
  filename: 'danse.mp4',
  fps: 25,
  total_frames: 1500,
  duration_seconds: 60,
  annotations: [],
}

const mockStats = {
  bpm_global: 128.4,
  bpm_mean: 126.0,
  bpm_median: 127.5,
  bpm_variation: 10.0,
  interval_std_seconds: 0.05,
  annotation_density_per_minute: 64.2,
  interval_distribution: [0.47, 0.48, 0.46],
  rhythmic_segments: [],
  activity_peaks: [],
}

describe('StatisticsPage', () => {
  it('affiche le titre de la vidéo', async () => {
    server.use(
      http.get(`${API_BASE}/videos/video-1`, () => HttpResponse.json(mockVideo)),
      http.get(`${API_BASE}/videos/video-1/statistics`, () => HttpResponse.json(mockStats))
    )
    renderPage()
    expect(await screen.findByText(/danse\.mp4/i)).toBeInTheDocument()
  })

  it('affiche les métriques BPM via BpmMetrics', async () => {
    server.use(
      http.get(`${API_BASE}/videos/video-1`, () => HttpResponse.json(mockVideo)),
      http.get(`${API_BASE}/videos/video-1/statistics`, () => HttpResponse.json(mockStats))
    )
    renderPage()
    expect(await screen.findByText(/128\.4/)).toBeInTheDocument()
  })

  it('contient un lien breadcrumb vers les projets', async () => {
    server.use(
      http.get(`${API_BASE}/videos/video-1`, () => HttpResponse.json(mockVideo)),
      http.get(`${API_BASE}/videos/video-1/statistics`, () => HttpResponse.json(mockStats))
    )
    renderPage()
    expect(await screen.findByRole('link', { name: /projets/i })).toBeInTheDocument()
  })
})
