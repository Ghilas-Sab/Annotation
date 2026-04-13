import { describe, test, expect, vi } from 'vitest'
import { playBeep } from './useAudioBeep'

const makeMockContext = () => {
  const mockOscillator = {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 0 },
    type: 'sine' as OscillatorType,
  }
  const mockGain = {
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  }
  const mockContext = {
    createOscillator: vi.fn(() => mockOscillator),
    createGain: vi.fn(() => mockGain),
    destination: {},
    currentTime: 0,
  }
  return { mockContext, mockOscillator, mockGain }
}

describe('playBeep', () => {
  test('creates an oscillator and a gain node', () => {
    const { mockContext } = makeMockContext()
    playBeep(mockContext as unknown as AudioContext)
    expect(mockContext.createOscillator).toHaveBeenCalledOnce()
    expect(mockContext.createGain).toHaveBeenCalledOnce()
  })

  test('sets oscillator frequency to 880 Hz', () => {
    const { mockContext, mockOscillator } = makeMockContext()
    playBeep(mockContext as unknown as AudioContext)
    expect(mockOscillator.frequency.value).toBe(880)
  })

  test('starts and stops the oscillator', () => {
    const { mockContext, mockOscillator } = makeMockContext()
    playBeep(mockContext as unknown as AudioContext)
    expect(mockOscillator.start).toHaveBeenCalled()
    expect(mockOscillator.stop).toHaveBeenCalled()
  })

  test('connects oscillator to gain and gain to destination', () => {
    const { mockContext, mockOscillator, mockGain } = makeMockContext()
    playBeep(mockContext as unknown as AudioContext)
    expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain)
    expect(mockGain.connect).toHaveBeenCalledWith(mockContext.destination)
  })

  test('applies gain envelope (setValueAtTime + exponentialRamp)', () => {
    const { mockContext, mockGain } = makeMockContext()
    playBeep(mockContext as unknown as AudioContext)
    expect(mockGain.gain.setValueAtTime).toHaveBeenCalled()
    expect(mockGain.gain.exponentialRampToValueAtTime).toHaveBeenCalled()
  })
})
