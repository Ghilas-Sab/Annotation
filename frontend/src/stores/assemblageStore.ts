import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Video } from '../types/project'
import { loadAudioTrackBlobUrl } from '../utils/audioPersistence'

export interface AssemblageClip {
  id: string
  videoId: string
  projectId: string
  name: string
  duration: number
  filePath?: string
  sourceType?: 'original' | 'adapted'
}

export interface AudioTrack {
  id: string
  name: string
  url: string      // URL runtime: object URL restaurée depuis IndexedDB ou data URL de fallback
  storageKey?: string
  duration: number   // durée totale du fichier (0 avant que WaveSurfer soit prêt)
  trimStart: number  // secondes depuis le début (défaut 0)
  trimEnd: number    // secondes de fin (défaut = duration une fois prêt)
  startOffset: number // position de départ sur la timeline
  autoPlaced?: boolean
}

interface AssemblageState {
  clips: AssemblageClip[]
  addClips: (clips: AssemblageClip[]) => void
  removeClip: (id: string) => void
  reorderClips: (newOrder: AssemblageClip[]) => void
  replaceClips: (clips: AssemblageClip[]) => void
  audioTracks: AudioTrack[]
  addAudioTrack: (track: AudioTrack) => void
  addAudioTracks: (tracks: AudioTrack[]) => void
  removeAudioTrack: (id: string) => void
  updateAudioTrackDuration: (id: string, duration: number) => void
  updateAudioTrackTrim: (id: string, trimStart: number, trimEnd: number) => void
  updateAudioTrackOffset: (id: string, startOffset: number) => void
  restoreAudioTrackUrls: () => Promise<void>
}

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const getAudioTrackTrimEnd = (track: AudioTrack) =>
  track.trimEnd > 0 ? track.trimEnd : track.duration

export const getAudioTrackEffectiveDuration = (track: AudioTrack) =>
  Math.max(0, getAudioTrackTrimEnd(track) - track.trimStart)

export const getAudioTrackTimelineEnd = (track: AudioTrack) =>
  track.startOffset + getAudioTrackEffectiveDuration(track)

const normalizeAudioTracks = (tracks: AudioTrack[]) => {
  let previousEnd = 0
  return tracks.map((track) => {
    if (track.autoPlaced === false) {
      previousEnd = getAudioTrackTimelineEnd(track)
      return track
    }

    const nextTrack = {
      ...track,
      autoPlaced: true,
      startOffset: previousEnd,
    }
    previousEnd = getAudioTrackTimelineEnd(nextTrack)
    return nextTrack
  })
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

export const useAssemblageStore = create<AssemblageState>()(
  persist(
    (set, get) => ({
      clips: [],
      addClips: (clips) => set((state) => ({ clips: [...state.clips, ...clips] })),
      removeClip: (id) => set((state) => ({ clips: state.clips.filter((clip) => clip.id !== id) })),
      reorderClips: (newOrder) => set({ clips: newOrder }),
      replaceClips: (clips) => set({ clips }),
      audioTracks: [],
      addAudioTrack: (track) => set((state) => ({
        audioTracks: normalizeAudioTracks([...state.audioTracks, { ...track, autoPlaced: track.autoPlaced ?? true }]),
      })),
      addAudioTracks: (tracks) => set((state) => ({
        audioTracks: normalizeAudioTracks([
          ...state.audioTracks,
          ...tracks.map((track) => ({ ...track, autoPlaced: track.autoPlaced ?? true })),
        ]),
      })),
      removeAudioTrack: (id) => set((state) => ({
        audioTracks: normalizeAudioTracks(state.audioTracks.filter((t) => t.id !== id)),
      })),
      updateAudioTrackDuration: (id, duration) =>
        set((state) => ({
          audioTracks: normalizeAudioTracks(state.audioTracks.map((t) => {
            if (t.id !== id) return t
            const nextTrimEnd = t.trimEnd === 0 ? duration : clamp(t.trimEnd, 0, duration)
            const nextTrimStart = clamp(t.trimStart, 0, Math.max(0, nextTrimEnd - 0.5))
            return { ...t, duration, trimStart: nextTrimStart, trimEnd: nextTrimEnd }
          })),
        })),
      updateAudioTrackTrim: (id, trimStart, trimEnd) =>
        set((state) => ({
          audioTracks: normalizeAudioTracks(state.audioTracks.map((t) => {
            if (t.id !== id) return t
            const maxEnd = t.duration > 0 ? t.duration : trimEnd
            const nextTrimStart = clamp(trimStart, 0, Math.max(0, maxEnd - 0.5))
            const nextTrimEnd = clamp(trimEnd, nextTrimStart + 0.5, maxEnd)
            return { ...t, trimStart: nextTrimStart, trimEnd: nextTrimEnd }
          })),
        })),
      updateAudioTrackOffset: (id, startOffset) =>
        set((state) => ({
          audioTracks: normalizeAudioTracks(state.audioTracks.map((t) => (
            t.id === id ? { ...t, startOffset: Math.max(0, startOffset), autoPlaced: false } : t
          ))),
        })),
      restoreAudioTrackUrls: async () => {
        const tracks = get().audioTracks
        if (tracks.length === 0 || tracks.every((t) => !t.storageKey || t.url)) return
        const restoredTracks = await Promise.all(
          tracks.map(async (track) => {
            if (!track.storageKey || track.url) return track
            const restoredUrl = await loadAudioTrackBlobUrl(track.storageKey)
            return restoredUrl ? { ...track, url: restoredUrl } : track
          }),
        )
        set({ audioTracks: restoredTracks })
      },
    }),
    {
      name: 'assemblage-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        clips: state.clips,
        audioTracks: state.audioTracks.map((track) => ({
          ...track,
          url: track.storageKey ? '' : track.url,
        })),
      }),
    },
  ),
)
