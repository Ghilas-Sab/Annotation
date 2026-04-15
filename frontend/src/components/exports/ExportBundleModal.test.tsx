import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ExportBundleModal from './ExportBundleModal'

global.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
global.URL.revokeObjectURL = vi.fn()
HTMLAnchorElement.prototype.click = vi.fn()

const defaultProps = {
  videoId: 'v1',
  currentBpm: 100,
  annotationCount: 3,
  onClose: vi.fn(),
}

describe('ExportBundleModal', () => {
  beforeEach(() => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(new Blob(['zipdata']), { status: 200 })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le BPM courant et le champ BPM cible', () => {
    render(<ExportBundleModal {...defaultProps} />)
    expect(screen.getByLabelText(/BPM cible/i)).toBeInTheDocument()
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('affiche les options vidéo complète et partie annotée', () => {
    render(<ExportBundleModal {...defaultProps} />)
    expect(screen.getByLabelText(/complète/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/annotée/i)).toBeInTheDocument()
  })

  it('affiche les options format JSON et CSV', () => {
    render(<ExportBundleModal {...defaultProps} />)
    expect(screen.getByLabelText(/^JSON$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^CSV$/i)).toBeInTheDocument()
  })

  it('submit appelle fetch vers /export/bundle', async () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(new Blob(['zipdata']), { status: 200 })
    )
    render(<ExportBundleModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /exporter/i }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/export/bundle'),
        expect.objectContaining({ method: 'POST' })
      )
    )
  })

  it('envoie target_bpm correct dans le body', async () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(new Blob(['zipdata']), { status: 200 })
    )
    render(<ExportBundleModal {...defaultProps} currentBpm={100} />)
    const input = screen.getByLabelText(/BPM cible/i)
    fireEvent.change(input, { target: { value: '140' } })
    fireEvent.click(screen.getByRole('button', { name: /exporter/i }))
    await waitFor(() => {
      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.target_bpm).toBe(140)
    })
  })

  it('appelle onClose après export réussi', async () => {
    const onClose = vi.fn()
    render(<ExportBundleModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /exporter/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('affiche une erreur si le fetch échoue', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Minimum 2 annotations' }), { status: 422 })
    )
    render(<ExportBundleModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /exporter/i }))
    await waitFor(() =>
      expect(screen.getByText(/Minimum 2 annotations/i)).toBeInTheDocument()
    )
  })

  it('ferme le modal au clic sur le backdrop', () => {
    const onClose = vi.fn()
    render(<ExportBundleModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('bundle-modal-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('ferme le modal au clic sur Annuler', () => {
    const onClose = vi.fn()
    render(<ExportBundleModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
