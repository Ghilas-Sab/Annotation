import { describe, test, expect } from 'vitest'
import { getInterAnnotationStep } from './bpmUtils'

describe('getInterAnnotationStep', () => {
  test('returns interval between the two annotations just before current position', () => {
    // annotations : 10, 25, 40, 70 — position actuelle : 50
    // Les deux avant 50 : 25 et 40 → step = 15
    const annotations = [
      { frame_number: 10 }, { frame_number: 25 },
      { frame_number: 40 }, { frame_number: 70 }
    ]
    expect(getInterAnnotationStep(50, annotations)).toBe(15)
  })

  test('returns interval between the two annotations when cursor is past all of them', () => {
    // annotations : 10, 25 — position : 100
    // Les deux avant 100 : 10 et 25 → step = 15
    const annotations = [{ frame_number: 10 }, { frame_number: 25 }]
    expect(getInterAnnotationStep(100, annotations)).toBe(15)
  })

  test('returns fallback 10 when only one annotation is before current position', () => {
    // Une seule annotation avant la position → pas assez pour calculer un intervalle
    const annotations = [{ frame_number: 10 }, { frame_number: 50 }]
    expect(getInterAnnotationStep(20, annotations)).toBe(10)
  })

  test('returns fallback 10 when no annotation is before current position', () => {
    const annotations = [{ frame_number: 50 }, { frame_number: 100 }]
    expect(getInterAnnotationStep(10, annotations)).toBe(10)
  })

  test('returns fallback 10 when only one annotation total', () => {
    expect(getInterAnnotationStep(5, [{ frame_number: 3 }])).toBe(10)
  })

  test('returns fallback 10 when no annotations', () => {
    expect(getInterAnnotationStep(5, [])).toBe(10)
  })

  test('handles unsorted annotations — takes the two just before current frame', () => {
    // Annotations dans le désordre : 70, 10, 40, 25 — position : 50
    // Triées : 10, 25, 40, 70 → les deux avant 50 : 25 et 40 → step = 15
    const annotations = [
      { frame_number: 70 }, { frame_number: 10 },
      { frame_number: 40 }, { frame_number: 25 }
    ]
    expect(getInterAnnotationStep(50, annotations)).toBe(15)
  })
})
