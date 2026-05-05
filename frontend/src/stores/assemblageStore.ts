import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Video } from '../types/project'
import type { Annotation } from '../types/annotation'
import { loadAudioTrackBlobUrl } from '../utils/audioPersistence'

export interface AssemblageClip {
  id: string
  videoId: string
  projectId: string
  name: string
  duration: number
  trimStart?: number
  trimEnd?: number
  startOffset?: number
  autoPlaced?: boolean
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

interface ProjectSlice {
  clips: AssemblageClip[]
  audioTracks: AudioTrack[]
}

interface AssemblageState {
  activeProjectId: string | null
  savedProjects: Record<string, ProjectSlice>
  switchProject: (projectId: string) => void
  clips: AssemblageClip[]
  addClips: (clips: AssemblageClip[]) => void
  removeClip: (id: string) => void
  updateClipDuration: (id: string, duration: number) => void
  updateClipTrim: (id: string, trimStart: number, trimEnd: number) => void
  updateClipOffset: (id: string, startOffset: number) => void
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
  annotations: Record<string, Annotation[]>
  setAnnotations: (videoId: string, annotations: Annotation[]) => void
}

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const MIN_CLIP_EFFECTIVE_DURATION = 0.1

export const getAudioTrackTrimEnd = (track: AudioTrack) =>
  track.trimEnd > 0 ? track.trimEnd : track.duration

export const getAudioTrackEffectiveDuration = (track: AudioTrack) =>
  Math.max(0, getAudioTrackTrimEnd(track) - track.trimStart)

export const getAudioTrackTimelineEnd = (track: AudioTrack) =>
  track.startOffset + getAudioTrackEffectiveDuration(track)

export const getClipTrimEnd = (clip: AssemblageClip) =>
  clip.trimEnd && clip.trimEnd > 0 ? clip.trimEnd : clip.duration

export const getClipEffectiveDuration = (clip: AssemblageClip) =>
  Math.max(0, getClipTrimEnd(clip) - (clip.trimStart ?? 0))

export const getClipTimelineStart = (clip: AssemblageClip) =>
  clip.startOffset ?? 0

export const getClipTimelineEnd = (clip: AssemblageClip) =>
  getClipTimelineStart(clip) + getClipEffectiveDuration(clip)

export const getClipMediaTimeAtTimeline = (clip: AssemblageClip, timelineTime: number) =>
  (clip.trimStart ?? 0) + Math.max(0, timelineTime - getClipTimelineStart(clip))

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

const normalizeClips = (clips: AssemblageClip[]) => {
  let previousEnd = 0
  return clips.map((clip) => {
    const trimStart = clamp(clip.trimStart ?? 0, 0, Math.max(0, clip.duration - MIN_CLIP_EFFECTIVE_DURATION))
    const rawTrimEnd = clip.trimEnd && clip.trimEnd > 0 ? clip.trimEnd : clip.duration
    const trimEnd = clamp(rawTrimEnd, Math.min(clip.duration, trimStart + MIN_CLIP_EFFECTIVE_DURATION), clip.duration)
    const autoPlaced = clip.autoPlaced ?? clip.startOffset == null
    const startOffset = autoPlaced ? previousEnd : Math.max(previousEnd, clip.startOffset ?? 0)
    const nextClip = { ...clip, trimStart, trimEnd, startOffset, autoPlaced }
    previousEnd = getClipTimelineEnd(nextClip)
    return nextClip
  })
}

const getClipOffsetBounds = (clips: AssemblageClip[], id: string, effectiveDuration?: number) => {
  const index = clips.findIndex((clip) => clip.id === id)
  if (index < 0) return { minStart: 0, maxStart: Infinity }

  const clipDuration = effectiveDuration ?? getClipEffectiveDuration(clips[index])
  const previous = index > 0 ? clips[index - 1] : null
  const next = index < clips.length - 1 ? clips[index + 1] : null
  const minStart = previous ? getClipTimelineEnd(previous) : 0
  const nextStart = next ? getClipTimelineStart(next) : Infinity
  const maxStart = Number.isFinite(nextStart)
    ? Math.max(minStart, nextStart - clipDuration)
    : Infinity

  return { minStart, maxStart }
}

const stripRuntimeAudioUrls = (tracks: AudioTrack[] | null | undefined) => (
  Array.isArray(tracks) ? tracks : []
).map((track) => ({
  ...track,
  url: track.storageKey ? '' : track.url,
}))

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
  trimStart: 0,
  trimEnd: video.duration_seconds,
  filePath: sourceType === 'adapted' ? video.adapted_preview?.path : undefined,
  sourceType,
})

export const useAssemblageStore = create<AssemblageState>()(
  persist(
    (set, get) => ({
      activeProjectId: null,
      savedProjects: {},
      switchProject: (projectId) => set((state) => {
        if (state.activeProjectId === projectId) return {}

        const nextSaved = { ...state.savedProjects }
        if (state.activeProjectId !== null) {
          nextSaved[state.activeProjectId] = {
            clips: state.clips,
            audioTracks: stripRuntimeAudioUrls(state.audioTracks),
          }
        }

        const restored = nextSaved[projectId] ?? { clips: [], audioTracks: [] }
        return {
          activeProjectId: projectId,
          savedProjects: nextSaved,
          clips: normalizeClips(restored.clips),
          audioTracks: restored.audioTracks,
          annotations: {},
        }
      }),
      clips: [],
      addClips: (clips) => set((state) => ({ clips: normalizeClips([...state.clips, ...clips]) })),
      removeClip: (id) => set((state) => ({ clips: state.clips.filter((clip) => clip.id !== id) })),
      updateClipDuration: (id, duration) => {
        if (!Number.isFinite(duration) || duration <= 0) return
        set((state) => {
          let changed = false
          const index = state.clips.findIndex((clip) => clip.id === id)
          const nextClip = index >= 0 && index < state.clips.length - 1 ? state.clips[index + 1] : null
          const nextStart = nextClip ? getClipTimelineStart(nextClip) : Infinity
          const currentStart = index >= 0 ? getClipTimelineStart(state.clips[index]) : 0
          const maxEffectiveDuration = Number.isFinite(nextStart)
            ? Math.max(MIN_CLIP_EFFECTIVE_DURATION, nextStart - currentStart)
            : Infinity

          const clips = state.clips.map((clip) => {
            if (clip.id !== id || Math.abs(clip.duration - duration) <= 0.025) return clip
            changed = true
            const shouldExtendTrim = !clip.trimEnd || clip.trimEnd >= clip.duration - 0.025
            const trimStart = clip.trimStart ?? 0
            const requestedTrimEnd = shouldExtendTrim ? duration : Math.min(clip.trimEnd ?? duration, duration)
            const trimEnd = Math.min(requestedTrimEnd, trimStart + maxEffectiveDuration, duration)
            return { ...clip, duration, trimEnd }
          })
          return changed ? { clips: normalizeClips(clips) } : state
        })
      },
      updateClipTrim: (id, trimStart, trimEnd) =>
        set((state) => ({
          clips: normalizeClips(state.clips.map((clip) => {
            if (clip.id !== id) return clip
            const index = state.clips.findIndex((c) => c.id === id)
            const nextClip = index >= 0 && index < state.clips.length - 1 ? state.clips[index + 1] : null
            const nextStart = nextClip ? getClipTimelineStart(nextClip) : Infinity
            const maxEffectiveDuration = Number.isFinite(nextStart)
              ? Math.max(MIN_CLIP_EFFECTIVE_DURATION, nextStart - getClipTimelineStart(clip))
              : Infinity
            const nextTrimStart = clamp(trimStart, 0, Math.max(0, clip.duration - MIN_CLIP_EFFECTIVE_DURATION))
            const maxTrimEnd = Math.min(clip.duration, nextTrimStart + maxEffectiveDuration)
            const nextTrimEnd = clamp(trimEnd, nextTrimStart + MIN_CLIP_EFFECTIVE_DURATION, maxTrimEnd)
            return { ...clip, trimStart: nextTrimStart, trimEnd: nextTrimEnd, autoPlaced: false }
          })),
        })),
      updateClipOffset: (id, startOffset) =>
        set((state) => ({
          clips: normalizeClips(state.clips.map((clip) => {
            if (clip.id !== id) return clip
            const { minStart, maxStart } = getClipOffsetBounds(state.clips, id)
            const nextStartOffset = Number.isFinite(maxStart)
              ? clamp(startOffset, minStart, maxStart)
              : Math.max(minStart, startOffset)
            return { ...clip, startOffset: nextStartOffset, autoPlaced: false }
          })),
        })),
      reorderClips: (newOrder) => set({ clips: normalizeClips(newOrder) }),
      replaceClips: (clips) => set({ clips: normalizeClips(clips) }),
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
      annotations: {},
      setAnnotations: (videoId, anns) =>
        set((state) => ({ annotations: { ...state.annotations, [videoId]: anns } })),
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
        activeProjectId: state.activeProjectId,
        savedProjects: Object.fromEntries(
          Object.entries(state.savedProjects ?? {}).map(([pid, slice]) => [
            pid,
            {
              clips: slice?.clips ?? [],
              audioTracks: stripRuntimeAudioUrls(slice?.audioTracks),
            },
          ]),
        ),
        clips: state.clips,
        audioTracks: stripRuntimeAudioUrls(state.audioTracks),
      }),
    },
  ),
)
