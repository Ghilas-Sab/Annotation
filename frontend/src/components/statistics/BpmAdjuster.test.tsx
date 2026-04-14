import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest'
import BpmAdjuster from './BpmAdjuster'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const API_BASE = 'http://localhost:8000/api/v1'

const renderAdjuster = (props: { videoId?: string; currentBpm?: number; onSpeedChange?: (s: number) => void }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BpmAdjuster
        videoId={props.videoId ?? 'video-1'}
        currentBpm={props.currentBpm ?? 60}
        onSpeedChange={props.onSpeedChange ?? vi.fn()}
      />
    </QueryClientProvider>
  )
}

describe('BpmAdjuster', () => {
  it('calls playback speed API on submit', async () => {
    const onSpeedChange = vi.fn()
    server.use(
      http.post(`${API_BASE}/videos/video-1/statistics/playback-speed`, () =>
        HttpResponse.json({ playback_speed: 2.0, current_bpm: 60, target_bpm: 120 })
      )
    )
    renderAdjuster({ onSpeedChange })
    fireEvent.change(screen.getByLabelText(/BPM cible/i), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: /calculer/i }))
    await waitFor(() => expect(onSpeedChange).toHaveBeenCalledWith(2.0))
  })

  it('displays speed factor after API call', async () => {
    server.use(
      http.post(`${API_BASE}/videos/video-1/statistics/playback-speed`, () =>
        HttpResponse.json({ playback_speed: 2.0, current_bpm: 60, target_bpm: 120 })
      )
    )
    renderAdjuster({})
    fireEvent.change(screen.getByLabelText(/BPM cible/i), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: /calculer/i }))
    expect(await screen.findByText(/×2\.00|x2\.0/i)).toBeInTheDocument()
  })

  it('blocks submit and shows error for zero BPM', async () => {
    const onSpeedChange = vi.fn()
    renderAdjuster({ onSpeedChange })
    fireEvent.change(screen.getByLabelText(/BPM cible/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /calculer/i }))
    await waitFor(() => expect(onSpeedChange).not.toHaveBeenCalled())
    expect(screen.getByText(/positif|invalide/i)).toBeInTheDocument()
  })

  it('blocks submit for negative BPM', async () => {
    const onSpeedChange = vi.fn()
    renderAdjuster({ onSpeedChange })
    fireEvent.change(screen.getByLabelText(/BPM cible/i), { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: /calculer/i }))
    await waitFor(() => expect(onSpeedChange).not.toHaveBeenCalled())
  })
})
