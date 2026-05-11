import React from 'react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExportPanel from './ExportPanel'
import type { AssemblageClip } from '../../stores/assemblageStore'

vi.mock('../../api/assemblage', () => ({
  startAssemblageExport: vi.fn(),
}))

vi.mock('../../api/exports', () => ({
  getJobStatus: vi.fn(),
  getJobDownloadUrl: vi.fn().mockReturnValue('http://test/download/j1'),
}))

import { startAssemblageExport } from '../../api/assemblage'
import { getJobStatus } from '../../api/exports'

const buildClip = (overrides: Partial<AssemblageClip> = {}): AssemblageClip => ({
  id: 'clip-1',
  videoId: 'v1',
  projectId: 'p1',
  name: 'test.mp4',
  duration: 10,
  ...overrides,
})

const noop = () => undefined

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExportPanel', () => {
  test('shows launch button', () => {
    render(<ExportPanel clips={[buildClip()]} audioTracks={[]} onClose={noop} />)
    expect(screen.getByRole('button', { name: /lancer l.export/i })).toBeInTheDocument()
  })

  test('progress bar shown during export', async () => {
    vi.mocked(startAssemblageExport).mockResolvedValue('job-123')
    vi.mocked(getJobStatus).mockResolvedValue({
      id: 'job-123',
      label: 'assemblage-export',
      status: 'running',
      progress: 40,
      estimated_remaining_s: null,
      error: null,
    })

    render(<ExportPanel clips={[buildClip()]} audioTracks={[]} onClose={noop} />)
    await userEvent.click(screen.getByRole('button', { name: /lancer l.export/i }))

    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    )
  })

  test('download button appears when export is done', async () => {
    vi.mocked(startAssemblageExport).mockResolvedValue('job-done')
    vi.mocked(getJobStatus).mockResolvedValue({
      id: 'job-done',
      label: 'assemblage-export',
      status: 'done',
      progress: 100,
      estimated_remaining_s: null,
      error: null,
    })

    render(<ExportPanel clips={[buildClip()]} audioTracks={[]} onClose={noop} />)
    await userEvent.click(screen.getByRole('button', { name: /lancer l.export/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /télécharger/i })).toBeInTheDocument()
    )
  })
})
