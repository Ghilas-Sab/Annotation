import React from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExportJobsWidget from './ExportJobsWidget'
import type { ExportJob } from '../../contexts/ExportJobsContext'

const dismissJob = vi.fn()
const cancelJob = vi.fn()
const savePreviewJob = vi.fn()
let jobs: ExportJob[] = []

vi.mock('../../contexts/ExportJobsContext', () => ({
  useExportJobs: () => ({
    jobs,
    dismissJob,
    cancelJob,
    savePreviewJob,
  }),
}))

HTMLAnchorElement.prototype.click = vi.fn()

const renderWidget = () =>
  render(
    <MemoryRouter>
      <ExportJobsWidget />
    </MemoryRouter>,
  )

const buildJob = (overrides: Partial<ExportJob> = {}): ExportJob => ({
  job_id: 'job-1',
  label: 'Export projet',
  type: 'export',
  status: 'pending',
  progress: 35,
  estimated_remaining_s: 42,
  error: null,
  ...overrides,
})

beforeEach(() => {
  jobs = []
  dismissJob.mockReset()
  cancelJob.mockReset()
  savePreviewJob.mockReset()
  vi.mocked(HTMLAnchorElement.prototype.click).mockClear()
})

describe('ExportJobsWidget', () => {
  test('renders nothing when there are no jobs', () => {
    const { container } = renderWidget()
    expect(container).toBeEmptyDOMElement()
  })

  test('shows running job progress and lets the user cancel it', () => {
    jobs = [buildJob({ status: 'running', progress: 35, estimated_remaining_s: 42 })]

    renderWidget()
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

    expect(screen.getByTestId('export-jobs-widget')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(screen.getByText('~42s')).toBeInTheDocument()
    expect(cancelJob).toHaveBeenCalledWith('job-1')
  })

  test('can collapse and expand the job list', () => {
    jobs = [buildJob({ status: 'running' })]

    renderWidget()
    fireEvent.click(screen.getByText('▼'))

    expect(screen.queryByText('Export projet')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('▲'))
    expect(screen.getByText(/Export projet/)).toBeInTheDocument()
  })

  test('shows error details and lets the user dismiss finished error jobs', () => {
    jobs = [buildJob({ status: 'error', error: 'FFmpeg failed' })]

    renderWidget()
    fireEvent.click(screen.getByTitle('Fermer'))

    expect(screen.getByText('FFmpeg failed')).toBeInTheDocument()
    expect(dismissJob).toHaveBeenCalledWith('job-1')
  })

  test('shows export completion message for done export jobs', () => {
    jobs = [buildJob({ status: 'done', type: 'export', progress: 100 })]

    renderWidget()

    expect(screen.getByText(/téléchargement démarré/i)).toBeInTheDocument()
  })

  test('preview job can be downloaded and saved', async () => {
    savePreviewJob.mockResolvedValue(undefined)
    jobs = [
      buildJob({
        job_id: 'preview-1',
        label: 'Preview 120 BPM',
        type: 'preview',
        status: 'done',
        progress: 100,
        projectId: 'p1',
        videoId: 'v1',
        targetBpm: 120,
        saved: false,
      }),
    ]

    renderWidget()
    fireEvent.click(screen.getByRole('button', { name: /télécharger/i }))
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    await waitFor(() => expect(savePreviewJob).toHaveBeenCalledWith('preview-1'))
    expect(screen.getByRole('link', { name: /voir/i })).toHaveAttribute('href', '/projects/p1#video-v1')
  })

  test('saved preview jobs show saved status instead of save button', () => {
    jobs = [buildJob({ type: 'preview', status: 'done', saved: true })]

    renderWidget()

    expect(screen.getByText(/sauvegardé/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sauvegarder/i })).not.toBeInTheDocument()
  })
})
