import React from 'react'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import BpmMetrics from './BpmMetrics'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const API_BASE = 'http://localhost:8000/api/v1'

const renderWithQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
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

describe('BpmMetrics', () => {
  it('affiche bpm_global quand les données arrivent', async () => {
    server.use(
      http.get(`${API_BASE}/videos/video-1/statistics`, () =>
        HttpResponse.json(mockStats)
      )
    )
    renderWithQuery(<BpmMetrics videoId="video-1" />)
    expect(await screen.findByText(/128\.4/)).toBeInTheDocument()
  })

  it('affiche bpm_median', async () => {
    server.use(
      http.get(`${API_BASE}/videos/video-1/statistics`, () =>
        HttpResponse.json(mockStats)
      )
    )
    renderWithQuery(<BpmMetrics videoId="video-1" />)
    expect(await screen.findByText(/127\.5/)).toBeInTheDocument()
  })

  it('affiche annotation_density_per_minute', async () => {
    server.use(
      http.get(`${API_BASE}/videos/video-1/statistics`, () =>
        HttpResponse.json(mockStats)
      )
    )
    renderWithQuery(<BpmMetrics videoId="video-1" />)
    expect(await screen.findByText(/64\.2/)).toBeInTheDocument()
  })

  it('affiche un message clair quand moins de 2 annotations', async () => {
    server.use(
      http.get(`${API_BASE}/videos/video-1/statistics`, () =>
        HttpResponse.json({ error: 'Minimum 2 annotations requises' })
      )
    )
    renderWithQuery(<BpmMetrics videoId="video-1" />)
    expect(
      await screen.findByText(/minimum 2 annotations requises/i)
    ).toBeInTheDocument()
  })

  it('affiche un état de chargement initialement', () => {
    server.use(
      http.get(`${API_BASE}/videos/video-1/statistics`, async () => {
        await new Promise(() => {}) // ne résout jamais
        return HttpResponse.json(mockStats)
      })
    )
    renderWithQuery(<BpmMetrics videoId="video-1" />)
    expect(screen.getByText(/chargement/i)).toBeInTheDocument()
  })
})
