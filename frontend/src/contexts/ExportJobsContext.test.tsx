import React from 'react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ExportJobsProvider, useExportJobs } from './ExportJobsContext'

beforeEach(() => {
  vi.useFakeTimers()
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      status: 'running',
      progress: 50,
      estimated_remaining_s: 10,
      error: null,
    }),
    text: vi.fn().mockResolvedValue(''),
  } as unknown as Response)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const TestConsumer: React.FC = () => {
  const { jobs, startJob, startPreviewJob, dismissJob, cancelJob, savePreviewJob } = useExportJobs()

  return (
    <div>
      <div data-testid="job-count">{jobs.length}</div>
      {jobs.map((job) => (
        <div key={job.job_id} data-testid={`job-${job.job_id}`}>
          <span data-testid={`status-${job.job_id}`}>{job.status}</span>
          <span data-testid={`progress-${job.job_id}`}>{job.progress}</span>
          {job.error && <span data-testid={`error-${job.job_id}`}>{job.error}</span>}
          {job.previewUrl && <span data-testid={`url-${job.job_id}`}>{job.previewUrl}</span>}
        </div>
      ))}
      <button onClick={() => startJob('p1', 'job-1', 'Export Test')}>Start Export</button>
      <button onClick={() => startPreviewJob('p1', 'v1', 'job-2', 'Preview Test', 120)}>Start Preview</button>
      <button onClick={() => dismissJob('job-1')}>Dismiss job-1</button>
      <button onClick={() => cancelJob('job-1')}>Cancel job-1</button>
      <button onClick={() => savePreviewJob('job-2')}>Save Preview</button>
    </div>
  )
}

const renderProvider = (client = createClient()) =>
  render(
    <QueryClientProvider client={client}>
      <ExportJobsProvider>
        <TestConsumer />
      </ExportJobsProvider>
    </QueryClientProvider>
  )

describe('ExportJobsContext — startJob', () => {
  test('adds an export job with pending status', async () => {
    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
    })

    expect(screen.getByTestId('job-count')).toHaveTextContent('1')
    expect(screen.getByTestId('status-job-1')).toHaveTextContent('pending')
  })

  test('startPreviewJob adds a preview job', async () => {
    renderProvider()

    act(() => {
      screen.getByText('Start Preview').click()
    })

    expect(screen.getByTestId('job-count')).toHaveTextContent('1')
    expect(screen.getByTestId('status-job-2')).toHaveTextContent('pending')
  })

  test('multiple jobs can be added', async () => {
    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
      screen.getByText('Start Preview').click()
    })

    expect(screen.getByTestId('job-count')).toHaveTextContent('2')
  })
})

describe('ExportJobsContext — dismissJob', () => {
  test('removes a job from the list', async () => {
    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
    })

    expect(screen.getByTestId('job-count')).toHaveTextContent('1')

    act(() => {
      screen.getByText('Dismiss job-1').click()
    })

    expect(screen.getByTestId('job-count')).toHaveTextContent('0')
  })
})

describe('ExportJobsContext — cancelJob', () => {
  test('calls DELETE endpoint to cancel job', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn(), text: vi.fn() } as unknown as Response)
    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
    })

    await act(async () => {
      screen.getByText('Cancel job-1').click()
      await Promise.resolve()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('job-1'),
      { method: 'DELETE' }
    )
  })

  test('marks job as error/Annulé after cancel', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn(), text: vi.fn() } as unknown as Response)
    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
    })

    await act(async () => {
      screen.getByText('Cancel job-1').click()
      await Promise.resolve()
    })

    expect(screen.getByTestId('error-job-1')).toHaveTextContent('Annulé')
  })
})

describe('ExportJobsContext — polling', () => {
  test('polls running jobs on interval and updates status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'running',
        progress: 75,
        estimated_remaining_s: 5,
        error: null,
      }),
    } as unknown as Response)

    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(screen.getByTestId('progress-job-1')).toHaveTextContent('75')
  })

  test('stops polling and triggers download when export job is done', async () => {
    const createAMock = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const el = originalCreateElement('a')
        el.click = createAMock
        return el
      }
      return originalCreateElement(tag)
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'done',
        progress: 100,
        estimated_remaining_s: 0,
        error: null,
        label: 'Export Test',
      }),
    } as unknown as Response)

    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(createAMock).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  test('sets previewUrl when preview job is done', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'done',
        progress: 100,
        estimated_remaining_s: 0,
        error: null,
      }),
    } as unknown as Response)

    renderProvider()

    act(() => {
      screen.getByText('Start Preview').click()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(screen.getByTestId('url-job-2')).toBeInTheDocument()
  })

  test('does not poll done jobs', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: 'done',
          progress: 100,
          estimated_remaining_s: 0,
          error: null,
        }),
      } as unknown as Response)
      .mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: 'done',
          progress: 100,
          estimated_remaining_s: 0,
          error: null,
        }),
      } as unknown as Response)

    global.fetch = fetchMock

    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    const countAfterFirst = fetchMock.mock.calls.length

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    // After job is done, further polling should not call fetch for done jobs
    // The second interval fires but job is already done so it's filtered out
    expect(fetchMock.mock.calls.length).toBe(countAfterFirst)
  })
})

describe('ExportJobsContext — savePreviewJob', () => {
  test('calls save endpoint and marks job as saved', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'pending', progress: 0, estimated_remaining_s: null, error: null }),
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    renderProvider()

    act(() => {
      screen.getByText('Start Preview').click()
    })

    await act(async () => {
      screen.getByText('Save Preview').click()
      await Promise.resolve()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('v1/preview-adapted/save'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  test('does not call save when job has no videoId', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn(),
      text: vi.fn(),
    } as unknown as Response)

    const TestConsumerExport: React.FC = () => {
      const { startJob, savePreviewJob } = useExportJobs()
      return (
        <div>
          <button onClick={() => startJob('p1', 'job-exp', 'Export')}>Start</button>
          <button onClick={() => savePreviewJob('job-exp')}>Save</button>
        </div>
      )
    }

    const client = createClient()
    render(
      <QueryClientProvider client={client}>
        <ExportJobsProvider>
          <TestConsumerExport />
        </ExportJobsProvider>
      </QueryClientProvider>
    )

    act(() => {
      screen.getByText('Start').click()
    })

    await act(async () => {
      screen.getByText('Save').click()
      await Promise.resolve()
    })

    // Save should not call the preview save endpoint since it's an export job (no videoId)
    const saveCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call) => call[0]?.includes('preview-adapted/save')
    )
    expect(saveCalls.length).toBe(0)
  })

  test('updates job with error when save fails', async () => {
    vi.useRealTimers()
    const fetchMock = vi.fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      } as unknown as Response)

    global.fetch = fetchMock

    const TestConsumerSave: React.FC = () => {
      const { jobs, startPreviewJob, savePreviewJob } = useExportJobs()
      return (
        <div>
          {jobs.map(j => j.error && <span key={j.job_id} data-testid="error">{j.error}</span>)}
          <button onClick={() => startPreviewJob('p1', 'v1', 'job-save', 'Preview', 120)}>Start</button>
          <button onClick={() => savePreviewJob('job-save')}>Save</button>
        </div>
      )
    }

    const client = createClient()
    render(
      <QueryClientProvider client={client}>
        <ExportJobsProvider>
          <TestConsumerSave />
        </ExportJobsProvider>
      </QueryClientProvider>
    )

    act(() => {
      screen.getByText('Start').click()
    })

    await act(async () => {
      screen.getByText('Save').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('ExportJobsContext — notifications', () => {
  test('requests notification permission for export job when default', async () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('denied')
    const createAMock = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const el = originalCreateElement('a')
        el.click = createAMock
        return el
      }
      return originalCreateElement(tag)
    })

    Object.defineProperty(window, 'Notification', {
      value: Object.assign(vi.fn(), {
        permission: 'default',
        requestPermission: requestPermissionMock,
      }),
      writable: true,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'done',
        progress: 100,
        estimated_remaining_s: 0,
        error: null,
        label: 'My Export',
      }),
    } as unknown as Response)

    renderProvider()

    act(() => {
      screen.getByText('Start Export').click()
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })

    expect(requestPermissionMock).toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
