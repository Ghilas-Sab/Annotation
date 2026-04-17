import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useProjects,
  useProject,
  useCreateProject,
  useDeleteProject,
  useVideo,
  useDeleteVideo,
} from './projects'

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

const mockProject = {
  id: 'p1', name: 'Projet Test', description: 'desc',
  created_at: '2024-01-01T00:00:00Z', videos: [],
}

const mockVideo = {
  id: 'v1', project_id: 'p1', filename: 'video.mp4', original_name: 'video.mp4',
  fps: 25, duration_seconds: 60, total_frames: 1500,
  width: 1920, height: 1080, codec: 'h264',
  uploaded_at: '2024-01-01T00:00:00Z', annotations: [],
}

// ─── useProjects ──────────────────────────────────────────────────────────────

describe('useProjects', () => {
  it('retourne la liste des projets', async () => {
    server.use(http.get(`${API}/projects`, () => HttpResponse.json([mockProject])))
    const { result } = renderHook(() => useProjects(), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].name).toBe('Projet Test')
  })

  it('lève une erreur si non-ok', async () => {
    server.use(http.get(`${API}/projects`, () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => useProjects(), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toMatch(/erreur chargement projets/i)
  })
})

// ─── useProject ───────────────────────────────────────────────────────────────

describe('useProject', () => {
  it('retourne un projet par id', async () => {
    server.use(http.get(`${API}/projects/p1`, () => HttpResponse.json(mockProject)))
    const { result } = renderHook(() => useProject('p1'), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('p1')
  })

  it('lève une erreur si non-ok', async () => {
    server.use(http.get(`${API}/projects/p1`, () => HttpResponse.json({}, { status: 404 })))
    const { result } = renderHook(() => useProject('p1'), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it("n'exécute pas la requête si id est vide", () => {
    const { result } = renderHook(() => useProject(''), { wrapper: wrapper(makeClient()) })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

// ─── useCreateProject ─────────────────────────────────────────────────────────

describe('useCreateProject', () => {
  it('POST crée un projet', async () => {
    server.use(http.post(`${API}/projects`, () => HttpResponse.json(mockProject, { status: 201 })))
    const { result } = renderHook(() => useCreateProject(), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ name: 'Projet Test', description: 'desc' })
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('POST sans description', async () => {
    server.use(http.post(`${API}/projects`, () => HttpResponse.json(mockProject)))
    const { result } = renderHook(() => useCreateProject(), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ name: 'Projet Test' })
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('erreur si POST échoue', async () => {
    server.use(http.post(`${API}/projects`, () => HttpResponse.json({}, { status: 422 })))
    const { result } = renderHook(() => useCreateProject(), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync({ name: 'x' }).catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})

// ─── useDeleteProject ─────────────────────────────────────────────────────────

describe('useDeleteProject', () => {
  it('DELETE supprime un projet', async () => {
    server.use(http.delete(`${API}/projects/p1`, () => new HttpResponse(null, { status: 204 })))
    const { result } = renderHook(() => useDeleteProject(), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync('p1')
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('erreur si DELETE échoue', async () => {
    server.use(http.delete(`${API}/projects/p1`, () => HttpResponse.json({}, { status: 404 })))
    const { result } = renderHook(() => useDeleteProject(), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync('p1').catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})

// ─── useVideo ─────────────────────────────────────────────────────────────────

describe('useVideo', () => {
  it('retourne une vidéo par id', async () => {
    server.use(http.get(`${API}/videos/v1`, () => HttpResponse.json(mockVideo)))
    const { result } = renderHook(() => useVideo('v1'), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.fps).toBe(25)
  })

  it('lève une erreur si non-ok', async () => {
    server.use(http.get(`${API}/videos/v1`, () => HttpResponse.json({}, { status: 404 })))
    const { result } = renderHook(() => useVideo('v1'), { wrapper: wrapper(makeClient()) })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it("n'exécute pas la requête si videoId est vide", () => {
    const { result } = renderHook(() => useVideo(''), { wrapper: wrapper(makeClient()) })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

// ─── useDeleteVideo ───────────────────────────────────────────────────────────

describe('useDeleteVideo', () => {
  it('DELETE supprime une vidéo', async () => {
    server.use(http.delete(`${API}/videos/v1`, () => new HttpResponse(null, { status: 204 })))
    const { result } = renderHook(() => useDeleteVideo('p1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync('v1')
    })
    expect(result.current.isSuccess).toBe(true)
  })

  it('erreur si DELETE vidéo échoue', async () => {
    server.use(http.delete(`${API}/videos/v1`, () => HttpResponse.json({}, { status: 500 })))
    const { result } = renderHook(() => useDeleteVideo('p1'), { wrapper: wrapper(makeClient()) })
    await act(async () => {
      await result.current.mutateAsync('v1').catch(() => {})
    })
    expect(result.current.isError).toBe(true)
  })
})
