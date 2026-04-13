import { create } from 'zustand'

interface AudioState {
  volume: number
  isMuted: boolean
  currentTime: number
  enabled: boolean
  setVolume: (volume: number) => void
  setIsMuted: (muted: boolean) => void
  setCurrentTime: (time: number) => void
  toggle: () => void
}

export const useAudioStore = create<AudioState>((set) => ({
  volume: 1,
  isMuted: false,
  currentTime: 0,
  enabled: false,
  setVolume: (volume) => set({ volume }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setCurrentTime: (time) => set({ currentTime: time }),
  toggle: () => set(state => ({ enabled: !state.enabled })),
}))
