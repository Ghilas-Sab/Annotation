import { describe, test, expect, beforeEach } from 'vitest'
import { useVideoStore } from './videoStore'

const defaultState = {
  currentVideo: null,
  isPlaying: false,
  videoId: null,
  currentFrame: 0,
  fps: 0,
  totalFrames: 0,
  duration: 0,
  playbackRate: 1,
}

describe('videoStore', () => {
  beforeEach(() => {
    useVideoStore.setState(defaultState)
  })

  test('état initial correct', () => {
    const s = useVideoStore.getState()
    expect(s.currentVideo).toBeNull()
    expect(s.isPlaying).toBe(false)
    expect(s.currentFrame).toBe(0)
    expect(s.fps).toBe(0)
    expect(s.totalFrames).toBe(0)
    expect(s.duration).toBe(0)
    expect(s.playbackRate).toBe(1)
  })

  test('setCurrentVideo met à jour la vidéo et remet currentFrame à 0', () => {
    const video = { id: 'v1', filename: 'test.mp4' } as never
    useVideoStore.getState().setCurrentVideo(video)
    expect(useVideoStore.getState().currentVideo).toEqual(video)
    expect(useVideoStore.getState().currentFrame).toBe(0)
  })

  test('setCurrentVideo(null) réinitialise', () => {
    const video = { id: 'v1' } as never
    useVideoStore.getState().setCurrentVideo(video)
    useVideoStore.getState().setCurrentVideo(null)
    expect(useVideoStore.getState().currentVideo).toBeNull()
  })

  test('setIsPlaying passe à true puis false', () => {
    useVideoStore.getState().setIsPlaying(true)
    expect(useVideoStore.getState().isPlaying).toBe(true)
    useVideoStore.getState().setIsPlaying(false)
    expect(useVideoStore.getState().isPlaying).toBe(false)
  })

  test('setCurrentFrame met à jour currentFrame', () => {
    useVideoStore.getState().setCurrentFrame(42)
    expect(useVideoStore.getState().currentFrame).toBe(42)
  })

  test('setCurrentFrame accepte 0', () => {
    useVideoStore.getState().setCurrentFrame(100)
    useVideoStore.getState().setCurrentFrame(0)
    expect(useVideoStore.getState().currentFrame).toBe(0)
  })

  test('setVideoMetadata met à jour fps, totalFrames, duration et videoId', () => {
    useVideoStore.getState().setVideoMetadata({ fps: 25, totalFrames: 1000, duration: 40, videoId: 'v42' })
    const s = useVideoStore.getState()
    expect(s.fps).toBe(25)
    expect(s.totalFrames).toBe(1000)
    expect(s.duration).toBe(40)
    expect(s.videoId).toBe('v42')
  })

  test('setVideoMetadata multiple fois — dernière valeur gagne', () => {
    useVideoStore.getState().setVideoMetadata({ fps: 25, totalFrames: 1000, duration: 40, videoId: 'v1' })
    useVideoStore.getState().setVideoMetadata({ fps: 30, totalFrames: 900, duration: 30, videoId: 'v2' })
    expect(useVideoStore.getState().fps).toBe(30)
    expect(useVideoStore.getState().videoId).toBe('v2')
  })

  test('setPlaybackRate met à jour le taux de lecture', () => {
    useVideoStore.getState().setPlaybackRate(1.5)
    expect(useVideoStore.getState().playbackRate).toBe(1.5)
  })

  test('setPlaybackRate accepte valeurs décimales', () => {
    useVideoStore.getState().setPlaybackRate(0.75)
    expect(useVideoStore.getState().playbackRate).toBe(0.75)
  })

  test('setPlaybackRate à 2.0', () => {
    useVideoStore.getState().setPlaybackRate(2.0)
    expect(useVideoStore.getState().playbackRate).toBe(2.0)
  })
})
