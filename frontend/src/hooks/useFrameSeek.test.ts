import { describe, test, expect } from 'vitest'
import { seekToFrame } from './useFrameSeek'

describe('seekToFrame', () => {
  test('sets correct currentTime for frame 42 at 25fps', () => {
    const mockVideo = { currentTime: 0 } as HTMLVideoElement
    seekToFrame(mockVideo, 42, 25)
    expect(mockVideo.currentTime).toBeCloseTo((42 + 0.001) / 25, 5)
  })
  test('sets correct currentTime for frame 0', () => {
    const mockVideo = { currentTime: 1 } as HTMLVideoElement
    seekToFrame(mockVideo, 0, 25)
    expect(mockVideo.currentTime).toBeCloseTo(0.001 / 25, 5)
  })
  test('sets correct currentTime for frame 100 at 24fps', () => {
    const mockVideo = { currentTime: 0 } as HTMLVideoElement
    seekToFrame(mockVideo, 100, 24)
    expect(mockVideo.currentTime).toBeCloseTo((100 + 0.001) / 24, 5)
  })
})
