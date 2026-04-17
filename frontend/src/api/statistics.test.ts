import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useVideoStatistics, useInvalidateStatistics, usePlaybackSpeed } from './statistics'

const API = 'http://localhost:8000/api/v1'
const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)

const mockStats = {
  bpm_global: 128, bpm_mean: 126, bpm_median: 127,
  bpm_variation: 10, interval_std_seconds: 0.05,
  annotation_density_per_minute: 64,
  interval_distribution: [0.47, 0.48],
  rhythmic_segments: [], activity_peaks: [],
}

// ─── useVideoStatistics ───────────────────────────────────────────────────────

describe('useVideoStatistics', () => {
  it('retourne les statistiques', async () => {
    server.use(http.get(`${API}/videos/v1/statistics`, () => HttpResponse.json(mockStats)))
    const { result } = renderHook(() => useVideoStatistics('v1'), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.bpm_global).toBe(128)
  })

  it('lève une erreur si non-ok', async () => {
    server.use(http.get(`${API}/videos/v1/statistics`, () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => useVideoStatistics('v1'), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toMatch(/erreur chargement statistiques/i)
  })

  it("n'exécute pas si videoId est vide", () => {
    const { result } = renderHook(() => useVideoStatistics(''), { wrapper: wrapper(makeClient()) })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

// ─── useInvalidateStatistics ──────────────────────────────────────────────────

describe('useInvalidateStatistics', () => {
  it('retourne une fonction sans lever d\'erreur', async () => {
    const client = makeClient()
    const { result } = renderHook(() => useInvalidateStatistics(), { wrapper: wrapper(client) })
    expect(() => result.current('v1')).not.toThrow()
  })
})

// ─── usePlaybackSpeed ─────────────────────────────────────────────────────────

describe('usePlaybackSpeed', () => {
  it('POST retourne la vitesse de lecture', async () => {
    server.use(
      http.post(`${API}/videos/v1/statistics/playback-speed`, () =>
        HttpResponse.json({ playback_speed: 1.2, current_bpm: 128, target_bpm: 135 }),
      ),
    )
    const { result } = renderHook(() => usePlaybackSpeed('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync(135)
    })
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.playback_speed).toBe(1.2)
  })

  it('retourne les champs current_bpm et target_bpm', async () => {
    server.use(
      http.post(`${API}/videos/v1/statistics/playback-speed`, () =>
        HttpResponse.json({ playback_speed: 0.9, current_bpm: 128, target_bpm: 115 }),
      ),
    )
    const { result } = renderHook(() => usePlaybackSpeed('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync(115)
    })
    expect(result.current.data?.current_bpm).toBe(128)
    expect(result.current.data?.target_bpm).toBe(115)
  })

  it('erreur si POST échoue', async () => {
    server.use(
      http.post(`${API}/videos/v1/statistics/playback-speed`, () =>
        HttpResponse.json({}, { status: 400 }),
      ),
    )
    const { result } = renderHook(() => usePlaybackSpeed('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync(120).catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})
