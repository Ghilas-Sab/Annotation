import { describe, test, expect } from 'vitest'
import { getInterAnnotationStep } from './bpmUtils'

describe('getInterAnnotationStep', () => {
  test('returns interval between last two left annotations', () => {
    const annotations = [
      { frame_number: 10 }, { frame_number: 25 },
      { frame_number: 40 }, { frame_number: 70 }
    ]
    expect(getInterAnnotationStep(50, annotations)).toBe(15)
  })

  test('returns fallback 10 when less than 2 left annotations', () => {
    expect(getInterAnnotationStep(5, [{ frame_number: 3 }])).toBe(10)
  })

  test('returns fallback 10 when no left annotations', () => {
    expect(getInterAnnotationStep(5, [])).toBe(10)
  })
})
