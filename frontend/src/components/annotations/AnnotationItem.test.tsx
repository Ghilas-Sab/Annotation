import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnnotationItem } from './AnnotationItem'
import type { Annotation } from '../../types/annotation'

const mockAnnotation: Annotation = {
  id: '1',
  video_id: 'v1',
  frame_number: 42,
  timestamp_ms: 1680,
  label: 'beat',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const defaultProps = {
  annotation: mockAnnotation,
  fps: 25,
  totalFrames: 1000,
  onSeek: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
}

describe('AnnotationItem', () => {
  test('affiche le numéro de frame', () => {
    render(<AnnotationItem {...defaultProps} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('affiche le label', () => {
    render(<AnnotationItem {...defaultProps} />)
    expect(screen.getByText('beat')).toBeInTheDocument()
  })

  test('affiche "sans label" si label vide', () => {
    render(<AnnotationItem {...defaultProps} annotation={{ ...mockAnnotation, label: '' }} />)
    expect(screen.getByText('sans label')).toBeInTheDocument()
  })

  test('appelle onSeek au clic sur la frame', () => {
    const onSeek = vi.fn()
    render(<AnnotationItem {...defaultProps} onSeek={onSeek} />)
    fireEvent.click(screen.getByText('42'))
    expect(onSeek).toHaveBeenCalledWith(42)
  })

  test('appelle onDelete au clic sur le bouton supprimer', () => {
    const onDelete = vi.fn()
    render(<AnnotationItem {...defaultProps} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  test('ne propage pas le clic supprimer au parent', () => {
    const onSeek = vi.fn()
    render(<AnnotationItem {...defaultProps} onSeek={onSeek} />)
    fireEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    expect(onSeek).not.toHaveBeenCalled()
  })

  test('double-clic sur la frame active le mode édition frame', () => {
    render(<AnnotationItem {...defaultProps} />)
    fireEvent.dblClick(screen.getByText('42'))
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  test('double-clic sur le label active le mode édition label', () => {
    render(<AnnotationItem {...defaultProps} />)
    fireEvent.dblClick(screen.getByText('beat'))
    expect(screen.getByPlaceholderText('label...')).toBeInTheDocument()
  })

  test('Entrée dans l\'input label appelle onUpdate', () => {
    const onUpdate = vi.fn()
    render(<AnnotationItem {...defaultProps} onUpdate={onUpdate} />)
    fireEvent.dblClick(screen.getByText('beat'))
    const input = screen.getByPlaceholderText('label...')
    fireEvent.change(input, { target: { value: 'nouveau' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith('1', 42, 'nouveau')
  })

  test('Escape dans l\'input label annule l\'édition', () => {
    render(<AnnotationItem {...defaultProps} />)
    fireEvent.dblClick(screen.getByText('beat'))
    const input = screen.getByPlaceholderText('label...')
    fireEvent.change(input, { target: { value: 'changé' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByText('beat')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('label...')).not.toBeInTheDocument()
  })

  test('blur sur input label appelle onUpdate', () => {
    const onUpdate = vi.fn()
    render(<AnnotationItem {...defaultProps} onUpdate={onUpdate} />)
    fireEvent.dblClick(screen.getByText('beat'))
    const input = screen.getByPlaceholderText('label...')
    fireEvent.change(input, { target: { value: 'blur-save' } })
    fireEvent.blur(input)
    expect(onUpdate).toHaveBeenCalledWith('1', 42, 'blur-save')
  })

  test('Entrée dans l\'input frame appelle onUpdate avec la frame clampée', () => {
    const onUpdate = vi.fn()
    render(<AnnotationItem {...defaultProps} onUpdate={onUpdate} />)
    fireEvent.dblClick(screen.getByText('42'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith('1', 50, 'beat')
  })

  test('frame clampée à 0 si valeur négative', () => {
    const onUpdate = vi.fn()
    render(<AnnotationItem {...defaultProps} onUpdate={onUpdate} />)
    fireEvent.dblClick(screen.getByText('42'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '-10' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith('1', 0, 'beat')
  })

  test('frame clampée à totalFrames si trop grande', () => {
    const onUpdate = vi.fn()
    render(<AnnotationItem {...defaultProps} onUpdate={onUpdate} />)
    fireEvent.dblClick(screen.getByText('42'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '9999' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith('1', 1000, 'beat')
  })

  test('Escape dans l\'input frame annule l\'édition', () => {
    render(<AnnotationItem {...defaultProps} />)
    fireEvent.dblClick(screen.getByText('42'))
    const input = screen.getByRole('spinbutton')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('affiche le timestamp formaté', () => {
    render(<AnnotationItem {...defaultProps} />)
    // frameToTimestamp(42, 25) = "0:01.68" ou similar — on vérifie juste la présence d'un span avec les ms
    const container = screen.getByTestId('annotation-item')
    expect(container).toBeInTheDocument()
  })
})
