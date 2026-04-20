import { create } from 'zustand'
import type { Video } from '../types/project'

interface VideoState {
  // Legacy state (utilisé par les pages existantes)
  currentVideo: Video | null
  isPlaying: boolean
  setCurrentVideo: (video: Video | null) => void
  setIsPlaying: (playing: boolean) => void

  // State frame-précis (S3.3)
  videoId: string | null
  currentFrame: number
  fps: number
  totalFrames: number
  duration: number
  setCurrentFrame: (frame: number) => void
  setVideoMetadata: (meta: { fps: number; totalFrames: number; duration: number; videoId: string }) => void

  // Vitesse de lecture (S4.4)
  playbackRate: number
  setPlaybackRate: (rate: number) => void

  // Plage d'annotation (S6.8)
  startFrame: number | null
  endFrame: number | null
  setStartFrame: (frame: number | null) => void
  setEndFrame: (frame: number | null) => void
}

export const useVideoStore = create<VideoState>((set) => ({
  currentVideo: null,
  isPlaying: false,
  setCurrentVideo: (video) => set({ currentVideo: video, currentFrame: 0 }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  videoId: null,
  currentFrame: 0,
  fps: 0,
  totalFrames: 0,
  duration: 0,
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setVideoMetadata: (meta) => set({ ...meta }),

  playbackRate: 1,
  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  startFrame: null,
  endFrame: null,
  setStartFrame: (frame) => set({ startFrame: frame }),
  setEndFrame: (frame) => set({ endFrame: frame }),
}))
