import { describe, test, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Video } from '../types/project'
import { ExportPage } from './ExportPage'

const mockVideos: Video[] = [
  {
    id: 'v1', project_id: 'p1', filename: 'video1.mp4', original_name: 'Clip A',
    fps: 25, duration_seconds: 10, total_frames: 250,
    width: 1920, height: 1080, codec: 'h264', uploaded_at: '', annotations: [],
  },
  {
    id: 'v2', project_id: 'p1', filename: 'video2.mp4', original_name: 'Clip B',
    fps: 25, duration_seconds: 20, total_frames: 500,
    width: 1920, height: 1080, codec: 'h264', uploaded_at: '', annotations: [],
  },
]

describe('ExportPage', () => {
  test('shows checkboxes for each video in project', () => {
    render(<ExportPage projectId="uuid-p1" videos={mockVideos} />)
    mockVideos.forEach(v => {
      expect(screen.getByRole('checkbox', { name: v.original_name })).toBeInTheDocument()
    })
  })

  test('select all checkbox selects all videos', async () => {
    render(<ExportPage projectId="uuid-p1" videos={mockVideos} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /tout sélectionner/i }))
    mockVideos.forEach(v => {
      expect(screen.getByRole('checkbox', { name: v.original_name })).toBeChecked()
    })
  })

  test('shows format checkboxes: JSON, CSV, Video', () => {
    render(<ExportPage projectId="uuid-p1" videos={mockVideos} />)
    expect(screen.getByRole('checkbox', { name: /json/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /csv/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /vidéo/i })).toBeInTheDocument()
  })

  test('shows loading indicator during export', async () => {
    const exportFn = vi.fn().mockImplementation(() => new Promise(() => {}))
    render(<ExportPage projectId="uuid-p1" videos={mockVideos} onExport={exportFn} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /tout sélectionner/i }))
    await userEvent.click(screen.getByRole('button', { name: /exporter/i }))
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  test('triggers download after successful export', async () => {
    const exportFn = vi.fn().mockResolvedValue(new Blob(['zip']))
    render(<ExportPage projectId="uuid-p1" videos={mockVideos} onExport={exportFn} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /tout sélectionner/i }))
    await userEvent.click(screen.getByRole('button', { name: /exporter/i }))
    await waitFor(() => expect(exportFn).toHaveBeenCalled())
  })
})
