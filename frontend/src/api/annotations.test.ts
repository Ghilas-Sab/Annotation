import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useAnnotations,
  useCreateAnnotation,
  useCreateBulkAnnotations,
  useUpdateAnnotation,
  useDeleteAnnotation,
  useShiftAnnotations,
  useDeleteAllAnnotations,
} from './annotations'

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

const mockAnnotation = {
  id: '1', video_id: 'v1', frame_number: 10,
  timestamp_ms: 400, label: 'beat', created_at: '', updated_at: '',
}

// ─── useAnnotations ───────────────────────────────────────────────────────────

describe('useAnnotations', () => {
  it('retourne les annotations', async () => {
    server.use(http.get(`${API}/videos/v1/annotations`, () => HttpResponse.json([mockAnnotation])))
    const { result } = renderHook(() => useAnnotations('v1'), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].id).toBe('1')
  })

  it('lève une erreur si la réponse est non-ok', async () => {
    server.use(http.get(`${API}/videos/v1/annotations`, () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => useAnnotations('v1'), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toMatch(/erreur chargement annotations/i)
  })

  it("n'exécute pas la requête si videoId est vide", () => {
    const { result } = renderHook(() => useAnnotations(''), { wrapper: wrapper(makeClient()) })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

// ─── useCreateAnnotation ──────────────────────────────────────────────────────

describe('useCreateAnnotation', () => {
  it('POST crée une annotation', async () => {
    server.use(http.post(`${API}/videos/v1/annotations`, () => HttpResponse.json(mockAnnotation, { status: 200 })))
    const { result } = renderHook(() => useCreateAnnotation('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ frame_number: 10, label: 'beat' })
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('erreur si POST échoue', async () => {
    server.use(http.post(`${API}/videos/v1/annotations`, () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => useCreateAnnotation('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ frame_number: 10, label: 'beat' }).catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})

// ─── useCreateBulkAnnotations ─────────────────────────────────────────────────

describe('useCreateBulkAnnotations', () => {
  it('POST bulk crée plusieurs annotations', async () => {
    server.use(http.post(`${API}/videos/v1/annotations/bulk`, () => HttpResponse.json([mockAnnotation])))
    const { result } = renderHook(() => useCreateBulkAnnotations('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ start_frame: 0, end_frame: 100, count: 5, prefix: 'beat' })
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('erreur si bulk échoue', async () => {
    server.use(http.post(`${API}/videos/v1/annotations/bulk`, () => HttpResponse.json({}, { status: 422 })))
    const { result } = renderHook(() => useCreateBulkAnnotations('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ start_frame: 0, end_frame: 100, count: 5, prefix: 'b' }).catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})

// ─── useUpdateAnnotation ──────────────────────────────────────────────────────

describe('useUpdateAnnotation', () => {
  it('PUT met à jour une annotation', async () => {
    server.use(http.put(`${API}/annotations/1`, () => HttpResponse.json({ ...mockAnnotation, label: 'updated' })))
    const { result } = renderHook(() => useUpdateAnnotation('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ id: '1', data: { frame_number: 10, label: 'updated' } })
    })
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.label).toBe('updated')
  })

  it('erreur si PUT échoue', async () => {
    server.use(http.put(`${API}/annotations/1`, () => HttpResponse.json({}, { status: 404 })))
    const { result } = renderHook(() => useUpdateAnnotation('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ id: '1', data: { frame_number: 10, label: 'x' } }).catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})

// ─── useDeleteAnnotation ──────────────────────────────────────────────────────

describe('useDeleteAnnotation', () => {
  it('DELETE supprime une annotation', async () => {
    server.use(http.delete(`${API}/annotations/1`, () => new HttpResponse(null, { status: 204 })))
    const { result } = renderHook(() => useDeleteAnnotation('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync('1')
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('erreur si DELETE échoue', async () => {
    server.use(http.delete(`${API}/annotations/1`, () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => useDeleteAnnotation('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync('1').catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})

// ─── useShiftAnnotations ──────────────────────────────────────────────────────

describe('useShiftAnnotations', () => {
  it('PATCH décale les annotations', async () => {
    server.use(http.patch(`${API}/videos/v1/annotations/shift`, () => HttpResponse.json([mockAnnotation])))
    const { result } = renderHook(() => useShiftAnnotations('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync(100)
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('erreur si PATCH échoue', async () => {
    server.use(http.patch(`${API}/videos/v1/annotations/shift`, () => HttpResponse.json({}, { status: 400 })))
    const { result } = renderHook(() => useShiftAnnotations('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync(100).catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})

// ─── useDeleteAllAnnotations ──────────────────────────────────────────────────

describe('useDeleteAllAnnotations', () => {
  it('DELETE supprime toutes les annotations', async () => {
    server.use(http.delete(`${API}/videos/v1/annotations`, () => new HttpResponse(null, { status: 204 })))
    const { result } = renderHook(() => useDeleteAllAnnotations('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync()
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('erreur si DELETE all échoue', async () => {
    server.use(http.delete(`${API}/videos/v1/annotations`, () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => useDeleteAllAnnotations('v1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync().catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})
