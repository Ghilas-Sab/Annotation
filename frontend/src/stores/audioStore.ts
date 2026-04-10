import { create } from 'zustand'

interface AudioState {
  volume: number
  isMuted: boolean
  currentTime: number
  setVolume: (volume: number) => void
  setIsMuted: (muted: boolean) => void
  setCurrentTime: (time: number) => void
}

export const useAudioStore = create<AudioState>((set) => ({
  volume: 1,
  isMuted: false,
  currentTime: 0,
  setVolume: (volume) => set({ volume }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setCurrentTime: (time) => set({ currentTime: time }),
}))
