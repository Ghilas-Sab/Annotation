import { describe, test, expect } from 'vitest'
import { frameToTimestamp } from './frameUtils'

describe('frameToTimestamp', () => {
  test('converts frame 42 at 25fps correctly', () => {
    expect(frameToTimestamp(42, 25)).toBe('00:00:01.680')
  })
  test('converts frame 0 correctly', () => {
    expect(frameToTimestamp(0, 25)).toBe('00:00:00.000')
  })
  test('converts frame 1500 (1 minute) at 25fps correctly', () => {
    expect(frameToTimestamp(1500, 25)).toBe('00:01:00.000')
  })
  test('converts frame 3750 (2.5 minutes) at 25fps correctly', () => {
    expect(frameToTimestamp(3750, 25)).toBe('00:02:30.000')
  })
  test('converts frame 3600*25 (1 hour) at 25fps correctly', () => {
    expect(frameToTimestamp(3600 * 25, 25)).toBe('01:00:00.000')
  })
})
