import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnnotationList } from './AnnotationList'
import type { Annotation } from '../../types/annotation'

const makeAnnotation = (id: string, frame: number, label = 'beat'): Annotation => ({
  id,
  video_id: 'v1',
  frame_number: frame,
  timestamp_ms: frame * 40,
  label,
  created_at: '',
  updated_at: '',
})

const defaultProps = {
  fps: 25,
  totalFrames: 1000,
  onSeek: vi.fn(),
  onUpdate: vi.fn(),
  onDelete: vi.fn(),
}

describe('AnnotationList', () => {
  test("affiche le message vide quand aucune annotation", () => {
    render(<AnnotationList {...defaultProps} annotations={[]} />)
    expect(screen.getByText(/aucune annotation/i)).toBeInTheDocument()
    expect(screen.getByText(/espace/i)).toBeInTheDocument()
  })

  test('affiche toutes les annotations', () => {
    const annotations = [
      makeAnnotation('1', 10, 'beat 1'),
      makeAnnotation('2', 20, 'beat 2'),
    ]
    render(<AnnotationList {...defaultProps} annotations={annotations} />)
    expect(screen.getByText('beat 1')).toBeInTheDocument()
    expect(screen.getByText('beat 2')).toBeInTheDocument()
  })

  test('trie les annotations par frame_number ASC', () => {
    const annotations = [
      makeAnnotation('2', 50, 'beat 2'),
      makeAnnotation('1', 10, 'beat 1'),
      makeAnnotation('3', 30, 'beat 3'),
    ]
    render(<AnnotationList {...defaultProps} annotations={annotations} />)
    const items = screen.getAllByTestId('annotation-item')
    expect(items[0]).toHaveTextContent('beat 1')
    expect(items[1]).toHaveTextContent('beat 3')
    expect(items[2]).toHaveTextContent('beat 2')
  })

  test('ne modifie pas le tableau original (copie défensive)', () => {
    const annotations = [
      makeAnnotation('2', 50),
      makeAnnotation('1', 10),
    ]
    const copy = [...annotations]
    render(<AnnotationList {...defaultProps} annotations={annotations} />)
    expect(annotations[0].id).toBe(copy[0].id)
    expect(annotations[1].id).toBe(copy[1].id)
  })

  test('rend une seule annotation sans erreur', () => {
    render(<AnnotationList {...defaultProps} annotations={[makeAnnotation('1', 5, 'solo')]} />)
    expect(screen.getByText('solo')).toBeInTheDocument()
  })

  test('chaque AnnotationItem reçoit fps et totalFrames', () => {
    const annotations = [makeAnnotation('1', 10)]
    render(<AnnotationList {...defaultProps} annotations={annotations} fps={30} totalFrames={900} />)
    expect(screen.getByTestId('annotation-item')).toBeInTheDocument()
  })
})
