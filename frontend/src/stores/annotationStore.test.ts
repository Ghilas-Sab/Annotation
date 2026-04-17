import { describe, test, expect, beforeEach } from 'vitest'
import { useAnnotationStore } from './annotationStore'
import type { Annotation } from '../types/annotation'

const makeAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: '1',
  video_id: 'v1',
  frame_number: 10,
  timestamp_ms: 400,
  label: 'beat',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('annotationStore', () => {
  beforeEach(() => {
    useAnnotationStore.setState({ annotations: [], selectedAnnotation: null })
  })

  test('état initial — annotations vide, aucune sélection', () => {
    const state = useAnnotationStore.getState()
    expect(state.annotations).toEqual([])
    expect(state.selectedAnnotation).toBeNull()
  })

  test('setAnnotations remplace toute la liste', () => {
    const a1 = makeAnnotation({ id: '1' })
    const a2 = makeAnnotation({ id: '2' })
    useAnnotationStore.getState().setAnnotations([a1, a2])
    expect(useAnnotationStore.getState().annotations).toHaveLength(2)
    expect(useAnnotationStore.getState().annotations[0].id).toBe('1')
  })

  test('setAnnotations avec liste vide vide le store', () => {
    useAnnotationStore.getState().setAnnotations([makeAnnotation()])
    useAnnotationStore.getState().setAnnotations([])
    expect(useAnnotationStore.getState().annotations).toHaveLength(0)
  })

  test('addAnnotation ajoute en fin de liste', () => {
    const a1 = makeAnnotation({ id: '1' })
    const a2 = makeAnnotation({ id: '2' })
    useAnnotationStore.getState().addAnnotation(a1)
    useAnnotationStore.getState().addAnnotation(a2)
    const { annotations } = useAnnotationStore.getState()
    expect(annotations).toHaveLength(2)
    expect(annotations[1].id).toBe('2')
  })

  test('updateAnnotation met à jour le label et la frame', () => {
    useAnnotationStore.getState().setAnnotations([makeAnnotation({ id: '1', label: 'ancien', frame_number: 5 })])
    useAnnotationStore.getState().updateAnnotation('1', { label: 'nouveau', frame_number: 42 })
    const { annotations } = useAnnotationStore.getState()
    expect(annotations[0].label).toBe('nouveau')
    expect(annotations[0].frame_number).toBe(42)
  })

  test("updateAnnotation n'affecte pas les autres annotations", () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: '1', label: 'alpha' }),
      makeAnnotation({ id: '2', label: 'beta' }),
    ])
    useAnnotationStore.getState().updateAnnotation('1', { label: 'modifié' })
    expect(useAnnotationStore.getState().annotations[1].label).toBe('beta')
  })

  test("updateAnnotation avec id inconnu ne modifie rien", () => {
    useAnnotationStore.getState().setAnnotations([makeAnnotation({ id: '1', label: 'stable' })])
    useAnnotationStore.getState().updateAnnotation('inconnu', { label: 'ghost' })
    expect(useAnnotationStore.getState().annotations[0].label).toBe('stable')
  })

  test('removeAnnotation supprime par id', () => {
    useAnnotationStore.getState().setAnnotations([
      makeAnnotation({ id: '1' }),
      makeAnnotation({ id: '2' }),
    ])
    useAnnotationStore.getState().removeAnnotation('1')
    const { annotations } = useAnnotationStore.getState()
    expect(annotations).toHaveLength(1)
    expect(annotations[0].id).toBe('2')
  })

  test("removeAnnotation avec id inconnu ne change pas la liste", () => {
    useAnnotationStore.getState().setAnnotations([makeAnnotation({ id: '1' })])
    useAnnotationStore.getState().removeAnnotation('inconnu')
    expect(useAnnotationStore.getState().annotations).toHaveLength(1)
  })

  test('setSelectedAnnotation définit la sélection', () => {
    const a = makeAnnotation()
    useAnnotationStore.getState().setSelectedAnnotation(a)
    expect(useAnnotationStore.getState().selectedAnnotation).toEqual(a)
  })

  test('setSelectedAnnotation(null) désélectionne', () => {
    useAnnotationStore.getState().setSelectedAnnotation(makeAnnotation())
    useAnnotationStore.getState().setSelectedAnnotation(null)
    expect(useAnnotationStore.getState().selectedAnnotation).toBeNull()
  })
})
