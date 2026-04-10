import { create } from 'zustand'
import type { Video } from '../types/project'

interface VideoState {
  currentVideo: Video | null
  currentFrame: number
  isPlaying: boolean
  setCurrentVideo: (video: Video | null) => void
  setCurrentFrame: (frame: number) => void
  setIsPlaying: (playing: boolean) => void
}

export const useVideoStore = create<VideoState>((set) => ({
  currentVideo: null,
  currentFrame: 0,
  isPlaying: false,
  setCurrentVideo: (video) => set({ currentVideo: video, currentFrame: 0 }),
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
}))
