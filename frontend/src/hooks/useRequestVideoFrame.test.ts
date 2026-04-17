import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRequestVideoFrame } from './useRequestVideoFrame'
import { useVideoStore } from '../stores/videoStore'

// Utilitaire pour créer un mock d'élément video avec requestVideoFrameCallback
function makeVideoElement() {
  const callbackIdRef = { current: 0 }
  const storedCallbacks: Map<number, VideoFrameRequestCallback> = new Map()
  let nextId = 1

  const video = {
    requestVideoFrameCallback: vi.fn((cb: VideoFrameRequestCallback) => {
      const id = nextId++
      storedCallbacks.set(id, cb)
      callbackIdRef.current = id
      return id
    }),
    cancelVideoFrameCallback: vi.fn((id: number) => {
      storedCallbacks.delete(id)
    }),
    // Déclenche le callback enregistré
    triggerFrame: (mediaTime: number) => {
      const cb = storedCallbacks.get(callbackIdRef.current)
      if (cb) cb(performance.now(), { mediaTime } as VideoFrameCallbackMetadata)
    },
  }
  return video
}

beforeEach(() => {
  useVideoStore.setState({ currentFrame: 0 })
})

describe('useRequestVideoFrame', () => {
  test("ne fait rien si fps = 0", () => {
    const video = makeVideoElement()
    const videoRef = { current: video as unknown as HTMLVideoElement }
    renderHook(() => useRequestVideoFrame(videoRef, 0))
    expect(video.requestVideoFrameCallback).not.toHaveBeenCalled()
  })

  test("ne fait rien si videoRef.current est null", () => {
    const videoRef = { current: null }
    expect(() => renderHook(() => useRequestVideoFrame(videoRef, 25))).not.toThrow()
  })

  test("enregistre requestVideoFrameCallback quand fps > 0", () => {
    const video = makeVideoElement()
    const videoRef = { current: video as unknown as HTMLVideoElement }
    renderHook(() => useRequestVideoFrame(videoRef, 25))
    expect(video.requestVideoFrameCallback).toHaveBeenCalledOnce()
  })

  test("met à jour currentFrame lors d'un callback", () => {
    const video = makeVideoElement()
    const videoRef = { current: video as unknown as HTMLVideoElement }
    renderHook(() => useRequestVideoFrame(videoRef, 25))
    video.triggerFrame(2.0) // 2 secondes * 25 fps = frame 50
    expect(useVideoStore.getState().currentFrame).toBe(50)
  })

  test("re-enregistre le callback après chaque frame", () => {
    const video = makeVideoElement()
    const videoRef = { current: video as unknown as HTMLVideoElement }
    renderHook(() => useRequestVideoFrame(videoRef, 25))
    video.triggerFrame(1.0)
    // Après le premier callback, un nouveau est enregistré
    expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(2)
  })

  test("annule le callback au démontage", () => {
    const video = makeVideoElement()
    const videoRef = { current: video as unknown as HTMLVideoElement }
    const { unmount } = renderHook(() => useRequestVideoFrame(videoRef, 25))
    unmount()
    expect(video.cancelVideoFrameCallback).toHaveBeenCalled()
  })

  test("arrondit la frame (Math.round)", () => {
    const video = makeVideoElement()
    const videoRef = { current: video as unknown as HTMLVideoElement }
    renderHook(() => useRequestVideoFrame(videoRef, 25))
    video.triggerFrame(1.018) // 1.018 * 25 = 25.45 → arrondi à 25
    expect(useVideoStore.getState().currentFrame).toBe(25)
  })

  test("fps = 30 — calcul correct", () => {
    const video = makeVideoElement()
    const videoRef = { current: video as unknown as HTMLVideoElement }
    renderHook(() => useRequestVideoFrame(videoRef, 30))
    video.triggerFrame(1.0) // 30 frames
    expect(useVideoStore.getState().currentFrame).toBe(30)
  })
})
