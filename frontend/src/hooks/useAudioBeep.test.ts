import { describe, test, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { playBeep, useAudioBeep } from './useAudioBeep'

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

  test('sets oscillator frequency to 1000 Hz', () => {
    const { mockContext, mockOscillator } = makeMockContext()
    playBeep(mockContext as unknown as AudioContext)
    expect(mockOscillator.frequency.value).toBe(1000)
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

describe('useAudioBeep', () => {
  const makeAudioContextMock = () => {
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
    const mockAudioContext = {
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      destination: {},
      currentTime: 0,
      state: 'running' as AudioContextState,
      resume: vi.fn().mockResolvedValue(undefined),
    }
    return { mockAudioContext, mockOscillator, mockGain }
  }

  test('creates AudioContext on first beep call', () => {
    const { mockAudioContext } = makeAudioContextMock()
    const AudioContextMock = vi.fn(() => mockAudioContext)
    vi.stubGlobal('AudioContext', AudioContextMock)

    const { result } = renderHook(() => useAudioBeep())

    act(() => {
      result.current.beep()
    })

    expect(AudioContextMock).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  test('reuses existing AudioContext on subsequent calls', () => {
    const { mockAudioContext } = makeAudioContextMock()
    const AudioContextMock = vi.fn(() => mockAudioContext)
    vi.stubGlobal('AudioContext', AudioContextMock)

    const { result } = renderHook(() => useAudioBeep())

    act(() => {
      result.current.beep()
      result.current.beep()
    })

    expect(AudioContextMock).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  test('resumes suspended AudioContext before playing beep', () => {
    const { mockAudioContext } = makeAudioContextMock()
    mockAudioContext.state = 'suspended'
    const AudioContextMock = vi.fn(() => mockAudioContext)
    vi.stubGlobal('AudioContext', AudioContextMock)

    const { result } = renderHook(() => useAudioBeep())

    act(() => {
      result.current.beep()
    })

    expect(mockAudioContext.resume).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  test('does not resume when context is running', () => {
    const { mockAudioContext } = makeAudioContextMock()
    mockAudioContext.state = 'running'
    const AudioContextMock = vi.fn(() => mockAudioContext)
    vi.stubGlobal('AudioContext', AudioContextMock)

    const { result } = renderHook(() => useAudioBeep())

    act(() => {
      result.current.beep()
    })

    expect(mockAudioContext.resume).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  test('beep plays an oscillator through the audio context', () => {
    const { mockAudioContext, mockOscillator } = makeAudioContextMock()
    const AudioContextMock = vi.fn(() => mockAudioContext)
    vi.stubGlobal('AudioContext', AudioContextMock)

    const { result } = renderHook(() => useAudioBeep())

    act(() => {
      result.current.beep()
    })

    expect(mockOscillator.start).toHaveBeenCalled()
    expect(mockOscillator.stop).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
