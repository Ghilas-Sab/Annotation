import { create } from 'zustand'
import type { Video } from '../types/project'

export interface AssemblageClip {
  id: string
  videoId: string
  projectId: string
  name: string
  duration: number
  filePath?: string
  sourceType?: 'original' | 'adapted'
}

interface AssemblageState {
  clips: AssemblageClip[]
  addClips: (clips: AssemblageClip[]) => void
  removeClip: (id: string) => void
  reorderClips: (newOrder: AssemblageClip[]) => void
  replaceClips: (clips: AssemblageClip[]) => void
}

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const buildAssemblageClipFromVideo = (
  video: Video,
  sourceType: 'original' | 'adapted' = 'original',
): AssemblageClip => ({
  id: createLocalId(),
  videoId: video.id,
  projectId: video.project_id,
  name: sourceType === 'adapted' && video.adapted_preview
    ? `${video.original_name} · Adaptée ${Math.round(video.adapted_preview.bpm)} BPM`
    : video.original_name,
  duration: video.duration_seconds,
  filePath: sourceType === 'adapted' ? video.adapted_preview?.path : undefined,
  sourceType,
})

export const useAssemblageStore = create<AssemblageState>((set) => ({
  clips: [],
  addClips: (clips) => set((state) => ({ clips: [...state.clips, ...clips] })),
  removeClip: (id) => set((state) => ({ clips: state.clips.filter((clip) => clip.id !== id) })),
  reorderClips: (newOrder) => set({ clips: newOrder }),
  replaceClips: (clips) => set({ clips }),
}))
