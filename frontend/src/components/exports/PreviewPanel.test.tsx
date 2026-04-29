import React from 'react'
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewPanel from './PreviewPanel'

describe('PreviewPanel', () => {
  test('preview button is disabled when less than 2 annotations', () => {
    render(<PreviewPanel videoId="v1" currentBpm={120} annotationCount={1} />)
    expect(screen.getByRole('button', { name: /prévisualiser/i })).toBeDisabled()
  })

  test('preview button calls onCreateJob with videoId and targetBpm', async () => {
    const createJob = vi.fn().mockResolvedValue('job-123')
    render(
      <PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
        onCreateJob={createJob} />
    )
    await userEvent.click(screen.getByRole('button', { name: /prévisualiser/i }))
    expect(createJob).toHaveBeenCalledWith('v1', 120)
  })

  test('shows progress bar while job is creating', async () => {
    const createJob = vi.fn().mockImplementation(() => new Promise(() => {}))
    render(
      <PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
        onCreateJob={createJob} />
    )
    await userEvent.click(screen.getByRole('button', { name: /prévisualiser/i }))
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  test('shows video player when job is done', () => {
    render(
      <PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
        _testState={{ status: 'done', jobId: 'job-123', previewUrl: '/preview.mp4' }} />
    )
    expect(screen.getByTestId('preview-player')).toBeInTheDocument()
  })

  test('shows estimated remaining time during generation', () => {
    render(
      <PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
        _testState={{ status: 'running', progress: 40, estimatedRemaining: 30 }} />
    )
    expect(screen.getByText(/~30s/i)).toBeInTheDocument()
  })

  test('save button calls onSave with videoId and jobId', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
        onSave={onSave}
        _testState={{ status: 'done', jobId: 'job-123', previewUrl: '/preview.mp4' }} />
    )
    await userEvent.click(screen.getByRole('button', { name: /sauvegarder pour le projet/i }))
    expect(onSave).toHaveBeenCalledWith('v1', 'job-123')
  })

  test('cancel button calls onCancel with jobId', async () => {
    const onCancel = vi.fn()
    render(
      <PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
        onCancel={onCancel}
        _testState={{ status: 'running', jobId: 'job-123', progress: 40 }} />
    )
    await userEvent.click(screen.getByRole('button', { name: /annuler/i }))
    expect(onCancel).toHaveBeenCalledWith('job-123')
  })
})
