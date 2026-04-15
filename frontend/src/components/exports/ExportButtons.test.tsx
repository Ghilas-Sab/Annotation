import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ExportButtons from './ExportButtons'

// URL.createObjectURL n'est pas disponible en jsdom
global.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
global.URL.revokeObjectURL = vi.fn()
HTMLAnchorElement.prototype.click = vi.fn()

describe('ExportButtons', () => {
  beforeEach(() => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(new Blob(['content']), { status: 200 })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche 3 boutons d\'export', () => {
    render(<ExportButtons videoId="v1" annotationCount={3} />)
    expect(screen.getByRole('button', { name: /JSON/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CSV/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vidéo/i })).toBeInTheDocument()
  })

  it('triggers json download on click', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(new Blob(['content']), { status: 200 })
    )
    render(<ExportButtons videoId="v1" annotationCount={3} />)
    fireEvent.click(screen.getByRole('button', { name: /JSON/i }))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/export/json'))
  })

  it('triggers csv download on click', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(new Blob(['content']), { status: 200 })
    )
    render(<ExportButtons videoId="v1" annotationCount={3} />)
    fireEvent.click(screen.getByRole('button', { name: /CSV/i }))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/export/csv'))
  })

  it('triggers video download on click', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(new Blob(['content']), { status: 200 })
    )
    render(<ExportButtons videoId="v1" annotationCount={3} />)
    fireEvent.click(screen.getByRole('button', { name: /vidéo/i }))
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/export/video'))
  })

  it('disables video export when less than 2 annotations', () => {
    render(<ExportButtons videoId="v1" annotationCount={1} />)
    expect(screen.getByRole('button', { name: /vidéo/i })).toBeDisabled()
  })

  it('enables video export when 2 or more annotations', () => {
    render(<ExportButtons videoId="v1" annotationCount={2} />)
    expect(screen.getByRole('button', { name: /vidéo/i })).not.toBeDisabled()
  })

  it('affiche un toast après téléchargement réussi', async () => {
    render(<ExportButtons videoId="v1" annotationCount={3} />)
    fireEvent.click(screen.getByRole('button', { name: /JSON/i }))
    await waitFor(() => {
      expect(screen.getByText(/export.*réussi/i)).toBeInTheDocument()
    })
  })
})
