import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePreviewJob } from './usePreviewJob'
import * as exportsApi from '../api/exports'

vi.mock('../api/exports', () => ({
  createPreviewJob: vi.fn(),
  getJobStatus: vi.fn(),
  getJobDownloadUrl: vi.fn((id: string) => `http://localhost:8000/api/v1/exports/jobs/${id}/stream`),
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  // Mock fetch for cancel
  global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePreviewJob — initial state', () => {
  test('starts with idle status and null values', () => {
    const { result } = renderHook(() => usePreviewJob())
    expect(result.current.status).toBe('idle')
    expect(result.current.jobId).toBeNull()
    expect(result.current.progress).toBe(0)
    expect(result.current.previewUrl).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.estimatedRemaining).toBeNull()
  })
})

describe('usePreviewJob — start', () => {
  test('sets status to creating then running after job created', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-123')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'running',
      progress: 10,
      estimated_remaining_s: 30,
      error: null,
    })

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    expect(result.current.status).toBe('running')
    expect(result.current.jobId).toBe('job-123')
  })

  test('sets status to error when job creation fails', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Network error')
  })

  test('uses createPreviewJob from api when no override provided', async () => {
    vi.mocked(exportsApi.createPreviewJob).mockResolvedValue('job-api')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'running',
      progress: 0,
      estimated_remaining_s: null,
      error: null,
    })

    const { result } = renderHook(() => usePreviewJob())

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    expect(exportsApi.createPreviewJob).toHaveBeenCalledWith('video-1', 120)
    expect(result.current.jobId).toBe('job-api')
  })

  test('polls job status after creation', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-abc')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'running',
      progress: 50,
      estimated_remaining_s: 10,
      error: null,
    })

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(exportsApi.getJobStatus).toHaveBeenCalledWith('job-abc')
    expect(result.current.progress).toBe(50)
    expect(result.current.estimatedRemaining).toBe(10)
  })

  test('sets previewUrl and status done when job completes', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-done')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'done',
      progress: 100,
      estimated_remaining_s: 0,
      error: null,
    })
    vi.mocked(exportsApi.getJobDownloadUrl).mockReturnValue('http://localhost/stream/job-done')

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.status).toBe('done')
    expect(result.current.previewUrl).toBe('http://localhost/stream/job-done')
    expect(result.current.progress).toBe(100)
  })

  test('sets status to error when job status is error', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-err')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'error',
      progress: 0,
      estimated_remaining_s: null,
      error: 'Processing failed',
    })

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.status).toBe('error')
  })

  test('sets status to error when job status is cancelled', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-cancel')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'cancelled',
      progress: 0,
      estimated_remaining_s: null,
      error: null,
    })

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.status).toBe('error')
  })

  test('maps pending status to running', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-pending')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'pending',
      progress: 0,
      estimated_remaining_s: null,
      error: null,
    })

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.status).toBe('running')
  })
})

describe('usePreviewJob — cancel', () => {
  test('sets status to idle and clears jobId', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-to-cancel')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'running',
      progress: 30,
      estimated_remaining_s: 15,
      error: null,
    })

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    act(() => {
      result.current.cancel('job-to-cancel')
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.jobId).toBeNull()
  })

  test('calls DELETE endpoint when cancelling', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-x')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'running',
      progress: 0,
      estimated_remaining_s: null,
      error: null,
    })

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    act(() => {
      result.current.cancel('job-x')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('job-x'),
      { method: 'DELETE' }
    )
  })
})

describe('usePreviewJob — reset', () => {
  test('resets all state to initial values', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-reset')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'running',
      progress: 50,
      estimated_remaining_s: 5,
      error: null,
    })

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.jobId).toBeNull()
    expect(result.current.progress).toBe(0)
    expect(result.current.previewUrl).toBeNull()
    expect(result.current.error).toBeNull()
  })
})

describe('usePreviewJob — network resilience', () => {
  test('does not crash when polling throws (network unavailable)', async () => {
    const mockCreate = vi.fn().mockResolvedValue('job-net')
    vi.mocked(exportsApi.getJobStatus).mockRejectedValue(new Error('Network unavailable'))

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    // Should still be running (not crashed to error state)
    expect(result.current.status).toBe('running')
  })
})

describe('usePreviewJob — notifications', () => {
  test('shows notification when job is done and permission is granted', async () => {
    const mockNotification = vi.fn()
    Object.defineProperty(window, 'Notification', {
      value: Object.assign(mockNotification, { permission: 'granted' }),
      writable: true,
    })

    const mockCreate = vi.fn().mockResolvedValue('job-notif')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'done',
      progress: 100,
      estimated_remaining_s: 0,
      error: null,
    })
    vi.mocked(exportsApi.getJobDownloadUrl).mockReturnValue('http://localhost/stream')

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(mockNotification).toHaveBeenCalled()
  })

  test('requests notification permission when not granted and not denied', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('denied')
    Object.defineProperty(window, 'Notification', {
      value: Object.assign(vi.fn(), {
        permission: 'default',
        requestPermission: requestPermissionMock,
      }),
      writable: true,
    })

    const mockCreate = vi.fn().mockResolvedValue('job-perm')
    vi.mocked(exportsApi.getJobStatus).mockResolvedValue({
      status: 'done',
      progress: 100,
      estimated_remaining_s: 0,
      error: null,
    })
    vi.mocked(exportsApi.getJobDownloadUrl).mockReturnValue('http://localhost/stream')

    const { result } = renderHook(() => usePreviewJob(mockCreate))

    await act(async () => {
      await result.current.start('video-1', 120)
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(requestPermissionMock).toHaveBeenCalled()
  })
})
