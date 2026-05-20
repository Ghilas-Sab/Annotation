import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProject } from '../api/projects'
import type { Project, Video } from '../types/project'
import type { Annotation } from '../types/annotation'
import AssemblageTimeline from '../components/assemblage/AssemblageTimeline'
import VideoImportModal from '../components/assemblage/VideoImportModal'
import {
  buildAssemblageClipFromVideo,
  getClipEffectiveDuration,
  getClipFadeInDuration,
  getClipFadeOpacity,
  getClipFadeOutDuration,
  getClipMediaTimeAtTimeline,
  getClipTimelineEnd,
  getClipTimelineStart,
  type AssemblageClip,
  useAssemblageStore,
} from '../stores/assemblageStore'
import { deleteAudioTrackBlob, saveAudioTrackBlob } from '../utils/audioPersistence'
import { blurNonTextFocus, isTextEditingTarget } from '../utils/keyboardTargets'
import ExportPanel from '../components/assemblage/ExportPanel'
import { Logo, ThemeToggle, Icon, Spinner } from '../components/ui'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface AssemblagePageProps {
  project?: Project
  initialClips?: AssemblageClip[]
  onFetchAnnotations?: (videoId: string) => Promise<Annotation[]>
}

const getClipUrl = (clip: AssemblageClip) =>
  clip.sourceType === 'adapted'
    ? `${API_BASE}/videos/${clip.videoId}/preview-adapted/stream`
    : `${API_BASE}/videos/${clip.videoId}/stream`

const resolveMediaSrc = (src: string) => {
  if (typeof document === 'undefined') return src
  const anchor = document.createElement('a')
  anchor.href = src
  return anchor.href
}

const videoHasSource = (video: HTMLVideoElement, src: string) => {
  const resolvedSrc = resolveMediaSrc(src)
  return (
    video.getAttribute('src') === src ||
    video.src === resolvedSrc ||
    video.currentSrc === resolvedSrc
  )
}

const loadVideoSource = (video: HTMLVideoElement, src: string) => {
  if (videoHasSource(video, src)) return false
  video.src = src
  video.load()
  return true
}

const fmtDuration = (s: number) => {
  if (s === 0) return '0 s'
  if (s < 60) return `${Math.round(s)} s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60).toString().padStart(2, '0')}s`
}

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Lecture impossible'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// ─── Style constants ─────────────────────────────────────────────────────────

const panelSection: React.CSSProperties = { padding: '0.85rem' }

const panelSectionHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: '0.55rem',
  fontSize: '0.68rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--color-text-muted, #8892b0)',
}

const smallAddBtn: React.CSSProperties = {
  fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-text, #e8ecf8)', cursor: 'pointer',
}

const rowItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.45rem',
  padding: '0.4rem 0.5rem', borderRadius: 6,
  transition: 'background 0.1s',
}

const deleteBtn: React.CSSProperties = {
  flexShrink: 0, border: 'none', background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.4)', borderRadius: 999, width: 18, height: 18,
  fontSize: '0.55rem', cursor: 'pointer', lineHeight: 1, padding: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const reorderClipBtn: React.CSSProperties = {
  flexShrink: 0,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.045)',
  color: 'rgba(232,236,248,0.56)',
  borderRadius: 4,
  width: 18,
  height: 18,
  fontSize: '0.58rem',
  cursor: 'pointer',
  lineHeight: 1,
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const navBtn: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
  color: 'var(--color-text-muted, #8892b0)', borderRadius: 6,
  padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem',
}

const divider: React.CSSProperties = { height: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }

const videoLayerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: '0.35rem',
  width: 'calc(100% - 0.7rem)',
  height: 'calc(100% - 0.7rem)',
  objectFit: 'contain',
  borderRadius: 10,
  display: 'block',
  background: '#050710',
  boxShadow: '0 18px 48px rgba(0,0,0,0.32)',
}

const fadeControlPanel: React.CSSProperties = {
  marginTop: '0.55rem',
  paddingTop: '0.5rem',
  borderTop: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
}

const fadeControlsHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.45rem',
}

const fadeControlsTitle: React.CSSProperties = {
  fontSize: '0.62rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(232,236,248,0.58)',
}

const fadeStatusBadge: React.CSSProperties = {
  flexShrink: 0,
  borderRadius: 999,
  padding: '0.12rem 0.38rem',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(232,236,248,0.58)',
  fontSize: '0.58rem',
  fontWeight: 700,
  lineHeight: 1.1,
}

const fadeToggleGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.35rem',
}

const fadeCheckbox: React.CSSProperties = {
  width: 14,
  height: 14,
  margin: 0,
  padding: 0,
  flexShrink: 0,
  accentColor: 'var(--color-accent, #e94560)',
}

const fadeDurationInput: React.CSSProperties = {
  width: 58,
  marginTop: 0,
  padding: '0.22rem 0.32rem',
  borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(5,7,16,0.45)',
  color: '#e8ecf8',
  fontSize: '0.72rem',
  fontWeight: 700,
}

// ─── Component ────────────────────────────────────────────────────────────────

const AssemblagePage: React.FC<AssemblagePageProps> = ({
  project: projectOverride,
  initialClips,
  onFetchAnnotations,
}) => {
  const navigate = useNavigate()
  const { projectId = '' } = useParams<{ projectId: string }>()
  const { data: fetchedProject, isLoading, error } = useProject(projectOverride ? '' : projectId)

  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [timelinePlaybackActive, setTimelinePlaybackActive] = useState(false)
  const [activeVideoActuallyPlaying, setActiveVideoActuallyPlaying] = useState(false)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [globalTimelineTime, setGlobalTimelineTime] = useState(0)
  const [isBlackGapActive, setIsBlackGapActive] = useState(false)
  const [videoVolume, setVideoVolume]   = useState(1)
  const [videoMuted, setVideoMuted]     = useState(false)

  const clips          = useAssemblageStore((s) => s.clips)
  const addClips       = useAssemblageStore((s) => s.addClips)
  const removeClip     = useAssemblageStore((s) => s.removeClip)
  const updateClipDuration = useAssemblageStore((s) => s.updateClipDuration)
  const updateClipTrim = useAssemblageStore((s) => s.updateClipTrim)
  const updateClipOffset = useAssemblageStore((s) => s.updateClipOffset)
  const reorderClips   = useAssemblageStore((s) => s.reorderClips)
  const replaceClips   = useAssemblageStore((s) => s.replaceClips)
  const storeAnnotations = useAssemblageStore((s) => s.annotations)
  const setAnnotations = useAssemblageStore((s) => s.setAnnotations)

  const audioTracks            = useAssemblageStore((s) => s.audioTracks)
  const addAudioTracks         = useAssemblageStore((s) => s.addAudioTracks)
  const removeAudioTrack       = useAssemblageStore((s) => s.removeAudioTrack)
  const updateAudioTrackDuration = useAssemblageStore((s) => s.updateAudioTrackDuration)
  const updateAudioTrackTrim   = useAssemblageStore((s) => s.updateAudioTrackTrim)
  const updateAudioTrackOffset = useAssemblageStore((s) => s.updateAudioTrackOffset)
  const restoreAudioTrackUrls  = useAssemblageStore((s) => s.restoreAudioTrackUrls)
  const switchProject          = useAssemblageStore((s) => s.switchProject)

  const updateClipFade        = useAssemblageStore((s) => s.updateClipFade)

  const audioInputRef         = useRef<HTMLInputElement>(null)
  const fetchedVideoIdsRef    = useRef<Set<string>>(new Set())
  const primaryVideoRef       = useRef<HTMLVideoElement>(null)
  const secondaryVideoRef     = useRef<HTMLVideoElement>(null)
  const shouldAutoplay        = useRef(false)
  const isTransitioningRef    = useRef(false)
  const pendingActiveAutoplayRef = useRef<0 | 1 | null>(null)
  const rafRef                = useRef<number | null>(null)
  const gapPlaybackRef        = useRef<{ timelineStart: number; startedAt: number } | null>(null)
  const pendingSeekRef        = useRef<number | null>(null)
  const nextClipPreloadedRef  = useRef(-1)
  const stagedSwitchRef       = useRef<{
    index: number
    slot: 0 | 1
    seekTime: number
    autoplay: boolean
  } | null>(null)
  const [activeVideoSlot, setActiveVideoSlot] = useState<0 | 1>(0)

  const project = projectOverride ?? fetchedProject
  const effectiveProjectId = projectOverride?.id ?? projectId
  const timelinePanelHeight = audioTracks.length > 0 ? 198 : 142

  const defaultFetchAnnotations = useCallback(async (videoId: string) => {
    const response = await fetch(`${API_BASE}/videos/${videoId}/annotations`)
    if (!response.ok) return []
    const annotations = await response.json()
    return Array.isArray(annotations) ? annotations : []
  }, [])

  // Switch to the correct project state when the project changes
  useEffect(() => {
    if (effectiveProjectId) {
      fetchedVideoIdsRef.current = new Set()
      switchProject(effectiveProjectId)
    }
  }, [effectiveProjectId, switchProject])

  useEffect(() => {
    if (initialClips !== undefined) replaceClips(initialClips)
  }, [initialClips, replaceClips])

  useEffect(() => {
    void restoreAudioTrackUrls()
  }, [effectiveProjectId, restoreAudioTrackUrls])

  // Fetch annotations for newly added clips
  useEffect(() => {
    const fetchAnnotations = onFetchAnnotations ?? defaultFetchAnnotations
    clips.forEach((clip) => {
      if (fetchedVideoIdsRef.current.has(clip.videoId)) return
      fetchedVideoIdsRef.current.add(clip.videoId)
      fetchAnnotations(clip.videoId)
        .then((anns) => setAnnotations(clip.videoId, anns))
        .catch(() => {})
    })
  }, [clips, defaultFetchAnnotations, onFetchAnnotations, setAnnotations])

  // Maintenir l'index dans les bornes
  useEffect(() => {
    if (clips.length > 0 && currentClipIndex >= clips.length) {
      setCurrentClipIndex(clips.length - 1)
    }
    if (clips.length === 0) {
      primaryVideoRef.current?.pause()
      secondaryVideoRef.current?.pause()
      setCurrentClipIndex(0)
      setVideoCurrentTime(0)
      setGlobalTimelineTime(0)
      setIsBlackGapActive(false)
      setIsPlaying(false)
      setTimelinePlaybackActive(false)
      setActiveVideoActuallyPlaying(false)
    }
  }, [clips.length, currentClipIndex])

  const currentClip = clips[currentClipIndex] ?? null
  const currentVideoOpacity = currentClip
    ? getClipFadeOpacity(currentClip, videoCurrentTime)
    : 1

  const sortedClipEntries = useMemo(
    () => clips
      .map((clip, index) => ({ clip, index }))
      .sort((a, b) => getClipTimelineStart(a.clip) - getClipTimelineStart(b.clip) || a.index - b.index),
    [clips],
  )

  const findClipEntryAtTime = useCallback((time: number) => (
    sortedClipEntries.find(({ clip }) => (
      time >= getClipTimelineStart(clip) && time < getClipTimelineEnd(clip)
    )) ?? null
  ), [sortedClipEntries])

  const findNextClipEntryAfterTime = useCallback((time: number) => (
    sortedClipEntries.find(({ clip }) => getClipTimelineStart(clip) >= time) ?? null
  ), [sortedClipEntries])

  const totalDuration = useMemo(
    () => Math.max(
      clips.reduce((max, clip) => Math.max(max, getClipTimelineEnd(clip)), 0),
      audioTracks.reduce((max, track) => {
        const trimEnd = track.trimEnd > 0 ? track.trimEnd : track.duration
        return Math.max(max, track.startOffset + Math.max(0, trimEnd - track.trimStart))
      }, 0),
    ),
    [audioTracks, clips],
  )

  const getVideoElement = useCallback((slot: 0 | 1) => (
    slot === 0 ? primaryVideoRef.current : secondaryVideoRef.current
  ), [])

  const getActiveVideo = useCallback(
    () => getVideoElement(activeVideoSlot),
    [activeVideoSlot, getVideoElement],
  )

  const updateCurrentTimeFromVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video || !currentClip) return
    const nextTime = Number.isFinite(video.currentTime) ? video.currentTime : 0
    const localTime = Math.max(0, Math.min(nextTime - (currentClip.trimStart ?? 0), getClipEffectiveDuration(currentClip)))
    setVideoCurrentTime(localTime)
    setGlobalTimelineTime(getClipTimelineStart(currentClip) + localTime)
  }, [currentClip])

  const playVideo = useCallback((video: HTMLVideoElement) => {
    video.play()
      .then(() => {
        if (!video.ended) {
          setIsPlaying(true)
          setActiveVideoActuallyPlaying(true)
          setTimelinePlaybackActive(true)
        }
      })
      .catch(() => {
        setIsPlaying(false)
        setActiveVideoActuallyPlaying(false)
        setTimelinePlaybackActive(false)
      })
  }, [])

  const enterBlackGap = useCallback((timelineStart: number, shouldPlay = true) => {
    isTransitioningRef.current = true
    getActiveVideo()?.pause()
    gapPlaybackRef.current = { timelineStart, startedAt: performance.now() }
    setGlobalTimelineTime(timelineStart)
    setVideoCurrentTime(0)
    setIsBlackGapActive(true)
    setIsPlaying(shouldPlay)
    setActiveVideoActuallyPlaying(false)
    setTimelinePlaybackActive(shouldPlay)
  }, [getActiveVideo])

  // Sync volume/mute sur l'élément vidéo
  useEffect(() => {
    const volume = videoMuted ? 0 : videoVolume
    const primary = primaryVideoRef.current
    const secondary = secondaryVideoRef.current
    if (primary) primary.volume = volume
    if (secondary) secondary.volume = volume
  }, [videoVolume, videoMuted])

  // Changer la source vidéo quand le clip actif change
  useEffect(() => {
    const video = getActiveVideo()
    if (!video || !currentClip) return
    loadVideoSource(video, getClipUrl(currentClip))
  }, [activeVideoSlot, currentClip, getActiveVideo])

  // Pré-charger le clip suivant 3 s avant la fin du clip actuel pour une transition sans freeze
  useEffect(() => {
    if (isTransitioningRef.current) return
    if (!currentClip) return
    const nextClipEntry = findNextClipEntryAfterTime(getClipTimelineEnd(currentClip) + 0.001)
    if (!nextClipEntry) return
    if (videoCurrentTime < getClipEffectiveDuration(currentClip) - 3) return
    if (nextClipPreloadedRef.current === nextClipEntry.index) return

    const nextSlot: 0 | 1 = activeVideoSlot === 0 ? 1 : 0
    const nextVid = getVideoElement(nextSlot)
    const nextClipData = nextClipEntry.clip
    if (!nextVid || !nextClipData) return

    nextClipPreloadedRef.current = nextClipEntry.index
    const nextSrc = getClipUrl(nextClipData)
    loadVideoSource(nextVid, nextSrc)
  }, [videoCurrentTime, currentClip, activeVideoSlot, findNextClipEntryAfterTime, getVideoElement])

  const completeBufferedSwitch = useCallback((slot: 0 | 1) => {
    const staged = stagedSwitchRef.current
    if (!staged || staged.slot !== slot) return

    const nextClip = clips[staged.index]
    const nextVideo = getVideoElement(slot)
    const currentVideo = getActiveVideo()
    if (!nextClip || !nextVideo) return

    const seekTime = Math.max(0, Math.min(getClipEffectiveDuration(nextClip), staged.seekTime))
    try {
      nextVideo.currentTime = (nextClip.trimStart ?? 0) + seekTime
    } catch {
      // Certains navigateurs refusent le seek tant que les métadonnées ne sont pas totalement disponibles.
    }

    if (currentVideo && currentVideo !== nextVideo) {
      currentVideo.pause()
    }

    stagedSwitchRef.current = null
    pendingSeekRef.current = null
    setActiveVideoSlot(slot)
    setCurrentClipIndex(staged.index)
    setVideoCurrentTime(seekTime)
    setGlobalTimelineTime(getClipTimelineStart(nextClip) + seekTime)
    setIsBlackGapActive(false)

    if (staged.autoplay) {
      shouldAutoplay.current = false
      pendingActiveAutoplayRef.current = slot
    } else {
      isTransitioningRef.current = false
    }
  }, [clips, getActiveVideo, getVideoElement])

  const switchToClipWithoutBlackFrame = useCallback((index: number, seekTime = 0, autoplay = true) => {
    if (index < 0 || index >= clips.length) return

    const nextClip = clips[index]
    const nextSlot: 0 | 1 = activeVideoSlot === 0 ? 1 : 0
    const nextVideo = getVideoElement(nextSlot)
    if (!nextClip || !nextVideo) {
      shouldAutoplay.current = autoplay
      pendingSeekRef.current = seekTime
      setCurrentClipIndex(index)
      return
    }

    isTransitioningRef.current = true
    shouldAutoplay.current = false
    stagedSwitchRef.current = { index, slot: nextSlot, seekTime, autoplay }

    const nextSrc = getClipUrl(nextClip)
    if (loadVideoSource(nextVideo, nextSrc)) {
      return
    }

    if (nextVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      completeBufferedSwitch(nextSlot)
    } else if (nextVideo.networkState !== HTMLMediaElement.NETWORK_LOADING) {
      // Don't restart a download already in progress (e.g. from pre-load)
      nextVideo.load()
    }
    // else: pre-load in progress → wait for onCanPlay/onLoadedData
  }, [activeVideoSlot, clips, completeBufferedSwitch, getVideoElement])

  useEffect(() => {
    if (!timelinePlaybackActive) return

    const requestFrame = window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16)
    const cancelFrame = window.cancelAnimationFrame
      ? window.cancelAnimationFrame.bind(window)
      : window.clearTimeout.bind(window)

    const tick = () => {
      const activeVideo = getActiveVideo()
      if (currentClip && !isBlackGapActive) {
        updateCurrentTimeFromVideo(activeVideo)
        const mediaTime = activeVideo?.currentTime ?? 0
        if (mediaTime >= getClipMediaTimeAtTimeline(currentClip, getClipTimelineEnd(currentClip)) - 0.035) {
          const nextTime = getClipTimelineEnd(currentClip)
          setGlobalTimelineTime(nextTime)
          const nextEntry = findNextClipEntryAfterTime(nextTime - 0.001)
          if (nextEntry && getClipTimelineStart(nextEntry.clip) <= nextTime + 0.05) {
            switchToClipWithoutBlackFrame(nextEntry.index, 0, true)
          } else if (nextTime < totalDuration - 0.025) {
            enterBlackGap(nextTime)
          } else {
            activeVideo?.pause()
            setIsPlaying(false)
            setTimelinePlaybackActive(false)
            setActiveVideoActuallyPlaying(false)
          }
        }
      } else {
        const gap = gapPlaybackRef.current ?? { timelineStart: globalTimelineTime, startedAt: performance.now() }
        gapPlaybackRef.current = gap
        const nextTime = Math.min(totalDuration, gap.timelineStart + ((performance.now() - gap.startedAt) / 1000))
        setGlobalTimelineTime(nextTime)

        const entry = findClipEntryAtTime(nextTime)
        if (entry) {
          gapPlaybackRef.current = null
          setIsBlackGapActive(false)
          switchToClipWithoutBlackFrame(entry.index, nextTime - getClipTimelineStart(entry.clip), true)
        } else if (nextTime >= totalDuration - 0.025) {
          setIsPlaying(false)
          setTimelinePlaybackActive(false)
          setActiveVideoActuallyPlaying(false)
          setIsBlackGapActive(false)
        }
      }
      rafRef.current = requestFrame(tick)
    }

    rafRef.current = requestFrame(tick)
    return () => {
      if (rafRef.current != null) cancelFrame(rafRef.current)
      rafRef.current = null
    }
  }, [
    currentClip,
    findClipEntryAtTime,
    findNextClipEntryAfterTime,
    getActiveVideo,
    globalTimelineTime,
    enterBlackGap,
    isBlackGapActive,
    switchToClipWithoutBlackFrame,
    timelinePlaybackActive,
    totalDuration,
    updateCurrentTimeFromVideo,
  ])

  useEffect(() => {
    if (pendingActiveAutoplayRef.current !== activeVideoSlot) return
    const video = getActiveVideo()
    if (!video) return

    pendingActiveAutoplayRef.current = null
    isTransitioningRef.current = false
    playVideo(video)
  }, [activeVideoSlot, currentClipIndex, getActiveVideo, playVideo])

  const applyPendingSeek = useCallback(() => {
    const video = getActiveVideo()
    if (!video || !currentClip) return

    if (pendingSeekRef.current != null) {
      const seekTime = Math.max(0, Math.min(getClipEffectiveDuration(currentClip), pendingSeekRef.current))
      video.currentTime = (currentClip.trimStart ?? 0) + seekTime
      setVideoCurrentTime(seekTime)
      setGlobalTimelineTime(getClipTimelineStart(currentClip) + seekTime)
      pendingSeekRef.current = null
    }

    if (shouldAutoplay.current) {
      shouldAutoplay.current = false
      playVideo(video)
    }
  }, [currentClip, getActiveVideo, playVideo])

  const handleVideoLoadedMetadata = useCallback((slot: 0 | 1) => {
    const video = getVideoElement(slot)
    if (!video) return

    const staged = stagedSwitchRef.current
    const clipIndex = staged?.slot === slot
      ? staged.index
      : slot === activeVideoSlot
        ? currentClipIndex
        : -1
    const clip = clipIndex >= 0 ? clips[clipIndex] : null

    if (clip && Number.isFinite(video.duration) && video.duration > 0) {
      updateClipDuration(clip.id, video.duration)
    }

    if (slot === activeVideoSlot) {
      applyPendingSeek()
      updateCurrentTimeFromVideo(video)
    }
  }, [
    activeVideoSlot,
    applyPendingSeek,
    clips,
    currentClipIndex,
    getVideoElement,
    updateClipDuration,
    updateCurrentTimeFromVideo,
  ])

  const handleAddSelection = (
    sources: Array<{ video: Video; sourceType: 'original' | 'adapted' }>,
  ) => {
    addClips(
      sources.map(({ video, sourceType }) =>
        buildAssemblageClipFromVideo(video, sourceType),
      ),
    )
  }

  const handleAudioImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length === 0) return

    const tracks = await Promise.all(
      files.map(async (file) => {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const storageKey = `assemblage-audio-${id}`
        const storedInIndexedDb = await saveAudioTrackBlob(storageKey, file)

        let url = URL.createObjectURL(file)
        if (!storedInIndexedDb) {
          try { url = await readFileAsDataUrl(file) }
          catch { url = URL.createObjectURL(file) }
        }

        return {
          id,
          name: file.name,
          url,
          storageKey: storedInIndexedDb ? storageKey : undefined,
          duration: 0,
          trimStart: 0,
          trimEnd: 0,
          startOffset: 0,
        }
      }),
    )
    addAudioTracks(tracks)
  }

  const handleRemoveAudioTrack = useCallback((id: string) => {
    const track = audioTracks.find((t) => t.id === id)
    removeAudioTrack(id)
    if (track?.storageKey) void deleteAudioTrackBlob(track.storageKey)
  }, [audioTracks, removeAudioTrack])

  const handleVideoEnded = useCallback(() => {
    setActiveVideoActuallyPlaying(false)
    const currentEnd = currentClip ? getClipTimelineEnd(currentClip) : globalTimelineTime
    const nextEntry = findNextClipEntryAfterTime(currentEnd - 0.001)
    if (nextEntry && getClipTimelineStart(nextEntry.clip) <= currentEnd + 0.05) {
      isTransitioningRef.current = true
      switchToClipWithoutBlackFrame(nextEntry.index, 0, true)
    } else if (nextEntry) {
      enterBlackGap(currentEnd)
    } else {
      isTransitioningRef.current = false
      setIsPlaying(false)
      setActiveVideoActuallyPlaying(false)
      setTimelinePlaybackActive(false)
    }
  }, [currentClip, enterBlackGap, findNextClipEntryAfterTime, globalTimelineTime, switchToClipWithoutBlackFrame])

  const handleVideoPlay  = useCallback(() => {
    isTransitioningRef.current = false
    setIsPlaying(true)
    setActiveVideoActuallyPlaying(true)
    setTimelinePlaybackActive(true)
  }, [])
  const handleVideoPause = useCallback(() => {
    if (!isTransitioningRef.current && !isBlackGapActive) {
      setIsPlaying(false)
      setActiveVideoActuallyPlaying(false)
      setTimelinePlaybackActive(false)
    }
  }, [isBlackGapActive])

  const handleGlobalPlayPause = useCallback(() => {
    if (clips.length === 0) return
    if (isPlaying) {
      getActiveVideo()?.pause()
      setActiveVideoActuallyPlaying(false)
      setTimelinePlaybackActive(false)
      gapPlaybackRef.current = null
    } else {
      const entry = findClipEntryAtTime(globalTimelineTime)
      if (!entry) {
        enterBlackGap(globalTimelineTime)
        return
      }

      const localTime = Math.max(0, Math.min(getClipEffectiveDuration(entry.clip), globalTimelineTime - getClipTimelineStart(entry.clip)))
      const activeVideo = getActiveVideo()
      if (entry.index === currentClipIndex && activeVideo && !isBlackGapActive) {
        activeVideo.currentTime = (entry.clip.trimStart ?? 0) + localTime
        setVideoCurrentTime(localTime)
        playVideo(activeVideo)
      } else {
        switchToClipWithoutBlackFrame(entry.index, localTime, true)
      }
    }
  }, [
    clips.length,
    currentClipIndex,
    findClipEntryAtTime,
    getActiveVideo,
    globalTimelineTime,
    enterBlackGap,
    isBlackGapActive,
    isPlaying,
    playVideo,
    switchToClipWithoutBlackFrame,
  ])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.code !== 'Space') return
      if (isTextEditingTarget(e.target)) return

      e.preventDefault()
      blurNonTextFocus(e.target)
      handleGlobalPlayPause()
    }

    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [handleGlobalPlayPause])

  const goToClip = useCallback((index: number) => {
    if (index < 0 || index >= clips.length) return
    if (index === currentClipIndex) {
      const video = getActiveVideo()
      if (!video) return
      const clip = clips[index]
      video.currentTime = clip.trimStart ?? 0
      setVideoCurrentTime(0)
      setGlobalTimelineTime(getClipTimelineStart(clip))
      setIsBlackGapActive(false)
      playVideo(video)
      return
    }
    switchToClipWithoutBlackFrame(index, 0, true)
  }, [clips.length, currentClipIndex, getActiveVideo, playVideo, switchToClipWithoutBlackFrame])

  const moveClipInList = useCallback((index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= clips.length) return

    const activeClipId = currentClip?.id
    const nextClips = [...clips]
    const movedClip = nextClips[index]
    nextClips[index] = nextClips[targetIndex]
    nextClips[targetIndex] = movedClip
    reorderClips(nextClips)

    if (activeClipId) {
      const nextActiveIndex = nextClips.findIndex((clip) => clip.id === activeClipId)
      if (nextActiveIndex >= 0) setCurrentClipIndex(nextActiveIndex)
    }
  }, [clips, currentClip?.id, reorderClips])

  const playFromTimelineTime = useCallback((targetTime: number) => {
    if (clips.length === 0) return

    const clampedTarget = Math.max(0, Math.min(totalDuration, targetTime))
    const shouldContinuePlayback = isPlaying || timelinePlaybackActive
    const entry = findClipEntryAtTime(clampedTarget)
    if (!entry) {
      enterBlackGap(clampedTarget, shouldContinuePlayback)
      return
    }

    const localTime = Math.max(0, Math.min(getClipEffectiveDuration(entry.clip), clampedTarget - getClipTimelineStart(entry.clip)))
    shouldAutoplay.current = shouldContinuePlayback

    const activeVideo = getActiveVideo()
    if (entry.index === currentClipIndex && activeVideo && !isBlackGapActive) {
      activeVideo.currentTime = (entry.clip.trimStart ?? 0) + localTime
      setVideoCurrentTime(localTime)
      setGlobalTimelineTime(clampedTarget)
      if (shouldContinuePlayback) {
        playVideo(activeVideo)
      } else {
        activeVideo.pause()
        setIsPlaying(false)
        setActiveVideoActuallyPlaying(false)
        setTimelinePlaybackActive(false)
      }
    } else {
      switchToClipWithoutBlackFrame(entry.index, localTime, shouldContinuePlayback)
    }
  }, [
    clips.length,
    currentClipIndex,
    enterBlackGap,
    findClipEntryAtTime,
    getActiveVideo,
    isBlackGapActive,
    isPlaying,
    playVideo,
    switchToClipWithoutBlackFrame,
    timelinePlaybackActive,
    totalDuration,
  ])

  // ── États de chargement ──────────────────────────────────────────────────
  if (!projectOverride && isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar"><Logo /></header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-2)' }}>
          <Spinner /> Chargement…
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ gap: 5 }}>
            <Icon.Back /> Projets
          </button>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: 'var(--danger-c)' }}>
            {error ? 'Une erreur est survenue lors du chargement.' : 'Projet introuvable.'}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')}>Retour</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--bg)',
    }}>

      {/* ══ Barre supérieure ══════════════════════════════════════════════════ */}
      <header className="topbar">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(`/projects/${project.id}`)}
          style={{ gap: 5 }}
        >
          <Icon.Back /> {project.name}
        </button>
        <div className="sep-v" style={{ height: 18, margin: '0 4px' }} />
        <h2 role="heading" style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)', margin: 0, fontFamily: 'inherit' }}>Assemblage</h2>
        <div style={{ display: 'flex', gap: 8, marginLeft: 10 }}>
          <span className="badge badge-muted">{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
          {audioTracks.length > 0 && <span className="badge badge-muted">{audioTracks.length} piste{audioTracks.length !== 1 ? 's' : ''}</span>}
          {clips.length > 0 && (() => {
            const n = clips.filter((c) => c.fadeIn || c.fadeOut).length
            return n > 0 ? (
              <span className="badge" style={{ background: 'hsl(var(--danger)/0.12)', border: '1px solid hsl(var(--danger)/0.35)', color: 'var(--danger-c)', fontSize: 10 }}>
                ✦ {n} fondu{n > 1 ? 's' : ''}
              </span>
            ) : null
          })()}
        </div>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
        <div className="sep-v" style={{ height: 18, margin: '0 4px' }} />
        {/* Bouton Export — toujours visible, désactivé si pas de clips */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          aria-label="Exporter l'assemblage"
          disabled={clips.length === 0}
          onClick={() => setShowExportPanel(true)}
          style={{ gap: 5 }}
        >
          <Icon.Export /> Exporter
        </button>
      </header>

      {/* ══ Zone principale : preview + panneau droite ══════════════════════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Prévisualisation (centre) ──────────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          background: '#050710',
          borderRight: '1px solid var(--color-border, #2a2a4a)',
        }}>
          {clips.length === 0 ? (
            /* État vide */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-3)', fontSize: 48, opacity: 0.25 }}><Icon.Film /></div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
                  Ajoutez des vidéos pour commencer l&apos;assemblage
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  Importez des clips via le panneau à droite.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowImportModal(true)}
              >
                <Icon.Plus /> Ajouter des vidéos
              </button>
            </div>
          ) : (
            <>
              {/* Player vidéo */}
              <div style={{
                flex: 1,
                minHeight: 0,
                position: 'relative',
                background: '#000',
              }}>
                {([0, 1] as const).map((slot) => {
                  const isActiveSlot = slot === activeVideoSlot
                  const ref = slot === 0 ? primaryVideoRef : secondaryVideoRef
                  return (
                    <video
                      key={slot}
                      data-testid={isActiveSlot ? 'assemblage-video-player-active' : 'assemblage-video-player-buffer'}
                      className="assemblage-video-player"
                      ref={ref}
                      controls={isActiveSlot}
                      preload="auto"
                      muted={videoMuted}
                      aria-hidden={!isActiveSlot}
                      onLoadedMetadata={() => handleVideoLoadedMetadata(slot)}
                      onLoadedData={() => completeBufferedSwitch(slot)}
                      onCanPlay={() => completeBufferedSwitch(slot)}
                      onPlay={isActiveSlot ? handleVideoPlay : undefined}
                      onPause={isActiveSlot ? handleVideoPause : undefined}
                      onEnded={isActiveSlot ? handleVideoEnded : undefined}
                      onTimeUpdate={() => {
                        if (slot !== activeVideoSlot) return
                        updateCurrentTimeFromVideo(getVideoElement(slot))
                      }}
                      onSeeked={() => {
                        if (slot !== activeVideoSlot) return
                        updateCurrentTimeFromVideo(getVideoElement(slot))
                      }}
                      style={{
                        ...videoLayerStyle,
                        opacity: isActiveSlot && !isBlackGapActive ? currentVideoOpacity : 0,
                        zIndex: isActiveSlot ? 2 : 1,
                        pointerEvents: isActiveSlot ? 'auto' : 'none',
                      }}
                    />
                  )
                })}
                {isBlackGapActive && (
                  <div
                    data-testid="assemblage-black-gap"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: '0.35rem',
                      borderRadius: 10,
                      background: '#000',
                      zIndex: 3,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {/* Barre info clip + navigation */}
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.26rem 0.65rem',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(8,12,28,0.95)',
              }}>
                {/* Barre de progression séquence */}
                <div style={{ display: 'flex', height: 4, flex: 1, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.07)', gap: 1 }}>
                  {clips.map((clip, i) => {
                    const pct = totalDuration > 0 ? (clip.duration / totalDuration) * 100 : 100 / clips.length
                    return (
                      <div
                        key={clip.id}
                        style={{
                          width: `${pct}%`, height: '100%',
                          background: i < currentClipIndex
                            ? 'rgba(255,255,255,0.3)'
                            : i === currentClipIndex
                              ? 'var(--color-accent, #e94560)'
                              : 'rgba(255,255,255,0.1)',
                          cursor: 'pointer', transition: 'background 0.2s',
                        }}
                        onClick={() => goToClip(i)}
                      />
                    )
                  })}
                </div>

                {/* Nom + position clip */}
                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e8ecf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                    {currentClip?.name}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted, #8892b0)' }}>
                    {currentClipIndex + 1}/{clips.length}
                    {currentClip && ` · ${fmtTime(currentClip.duration)}`}
                  </div>
                </div>

                {/* Volume vidéo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    aria-label={videoMuted ? 'Activer son vidéo' : 'Couper son vidéo'}
                    onClick={() => setVideoMuted(m => !m)}
                    style={{ border: 'none', background: 'transparent', color: videoMuted ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.6)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >
                    {videoMuted ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={videoMuted ? 0 : videoVolume}
                    onChange={(e) => { setVideoVolume(+e.target.value); if (+e.target.value > 0) setVideoMuted(false) }}
                    style={{ width: 52, height: 3, accentColor: '#e94560', cursor: 'pointer' }}
                    aria-label="Volume vidéo"
                  />
                </div>

                {/* Navigation + Play global */}
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => goToClip(currentClipIndex - 1)}
                    disabled={currentClipIndex === 0}
                    style={{ ...navBtn, opacity: currentClipIndex === 0 ? 0.3 : 1 }}
                  >◀</button>

                  <button
                    type="button"
                    aria-label={isPlaying ? 'Pause' : 'Lecture'}
                    onClick={handleGlobalPlayPause}
                    style={{
                      border: '1px solid rgba(233,69,96,0.5)',
                      background: isPlaying ? 'rgba(233,69,96,0.2)' : 'rgba(233,69,96,0.1)',
                      color: '#e94560', borderRadius: 999,
                      width: 28, height: 28, fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>

                  <button
                    type="button"
                    onClick={() => goToClip(currentClipIndex + 1)}
                    disabled={currentClipIndex === clips.length - 1}
                    style={{ ...navBtn, opacity: currentClipIndex === clips.length - 1 ? 0.3 : 1 }}
                  >▶
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Panneau droite ─────────────────────────────────────────────── */}
        <div className="panel-right" style={{ width: 240 }}>

          {/* Section Vidéos */}
          <div style={panelSection}>
            <div style={panelSectionHeader}>
              <span>🎬 Vidéos</span>
              <button type="button" style={smallAddBtn} onClick={() => setShowImportModal(true)}>
                + Ajouter
              </button>
            </div>

            {clips.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                Aucun clip
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {clips.map((clip, i) => {
                  const isActive = i === currentClipIndex
                  const activeFadeCount = Number(!!clip.fadeIn) + Number(!!clip.fadeOut)
                  const fadeInDuration = getClipFadeInDuration(clip)
                  const fadeOutDuration = getClipFadeOutDuration(clip)
                  return (
                    <div
                      key={clip.id}
                      onClick={() => goToClip(i)}
                      style={{
                        ...rowItem,
                        flexDirection: 'column', alignItems: 'stretch', gap: 0,
                        padding: '0.4rem 0.5rem',
                        background: isActive ? 'rgba(233,69,96,0.13)' : 'rgba(255,255,255,0.03)',
                        border: isActive
                          ? '1px solid rgba(233,69,96,0.35)'
                          : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                      }}
                    >
                      {/* Ligne principale */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{
                          flexShrink: 0, width: 18, height: 18, borderRadius: 999,
                          background: isActive ? 'var(--color-accent, #e94560)' : 'rgba(255,255,255,0.1)',
                          color: '#fff', fontSize: '0.58rem', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isActive ? '▶' : i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 400, color: isActive ? '#e8ecf8' : '#b0bcd4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {clip.name}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                            {fmtTime(clip.duration)}
                            {clip.sourceType === 'adapted' && (
                              <span style={{ marginLeft: 4, color: '#f43f5e', fontWeight: 700 }}>ADAPTÉ</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                          <button
                            type="button"
                            aria-label={`Monter ${clip.name}`}
                            title="Monter"
                            disabled={i === 0}
                            onClick={(e) => { e.stopPropagation(); moveClipInList(i, -1) }}
                            style={{ ...reorderClipBtn, opacity: i === 0 ? 0.35 : 1 }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            aria-label={`Descendre ${clip.name}`}
                            title="Descendre"
                            disabled={i === clips.length - 1}
                            onClick={(e) => { e.stopPropagation(); moveClipInList(i, 1) }}
                            style={{ ...reorderClipBtn, opacity: i === clips.length - 1 ? 0.35 : 1 }}
                          >
                            ▼
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label={`Supprimer ${clip.name}`}
                          onClick={(e) => { e.stopPropagation(); removeClip(clip.id) }}
                          style={deleteBtn}
                        >
                          ✕
                        </button>
                      </div>

                      {/* Contrôles fondus — visibles quand le clip est actif */}
                      {isActive && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={fadeControlPanel}
                        >
                          <div style={fadeControlsHeader}>
                            <div style={fadeControlsTitle}>Fondus</div>
                            <div
                              style={{
                                ...fadeStatusBadge,
                                background: activeFadeCount > 0 ? 'rgba(233,69,96,0.12)' : fadeStatusBadge.background,
                                border: activeFadeCount > 0 ? '1px solid rgba(233,69,96,0.28)' : fadeStatusBadge.border,
                                color: activeFadeCount > 0 ? '#f4a6b4' : fadeStatusBadge.color,
                              }}
                            >
                              {activeFadeCount > 0 ? `${activeFadeCount}/2` : 'Off'}
                            </div>
                          </div>
                          <div style={fadeToggleGrid}>
                            {([
                              ['in', 'Entrée', !!clip.fadeIn],
                              ['out', 'Sortie', !!clip.fadeOut],
                            ] as const).map(([kind, label, checked]) => (
                              <label
                                key={kind}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.34rem',
                                  minHeight: 30,
                                  padding: '0.34rem 0.42rem',
                                  borderRadius: 5,
                                  border: checked ? '1px solid rgba(233,69,96,0.36)' : '1px solid rgba(255,255,255,0.08)',
                                  background: checked ? 'rgba(233,69,96,0.12)' : 'rgba(255,255,255,0.035)',
                                  color: checked ? '#f2d5db' : 'rgba(232,236,248,0.68)',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  aria-label={kind === 'in' ? 'Fondu d’entrée' : 'Fondu de sortie'}
                                  onChange={(e) => {
                                    const nextFadeIn = kind === 'in' ? e.target.checked : !!clip.fadeIn
                                    const nextFadeOut = kind === 'out' ? e.target.checked : !!clip.fadeOut
                                    updateClipFade(clip.id, nextFadeIn, nextFadeOut, fadeInDuration, fadeOutDuration)
                                  }}
                                  style={fadeCheckbox}
                                />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                          {(clip.fadeIn || clip.fadeOut) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {clip.fadeIn && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <label htmlFor={`fade-in-dur-${clip.id}`} style={{ flex: 1, minWidth: 0, fontSize: '0.68rem', color: 'rgba(232,236,248,0.56)', whiteSpace: 'nowrap' }}>
                                    Entrée
                                  </label>
                                  <input
                                    id={`fade-in-dur-${clip.id}`}
                                    type="number"
                                    min={0.1}
                                    max={5}
                                    step={0.1}
                                    value={fadeInDuration}
                                    aria-label="Durée fondu d’entrée"
                                    onChange={(e) => updateClipFade(clip.id, !!clip.fadeIn, !!clip.fadeOut, parseFloat(e.target.value), fadeOutDuration)}
                                    style={fadeDurationInput}
                                  />
                                  <span style={{ flexShrink: 0, fontSize: '0.68rem', color: 'rgba(232,236,248,0.44)' }}>s</span>
                                </div>
                              )}
                              {clip.fadeOut && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <label htmlFor={`fade-out-dur-${clip.id}`} style={{ flex: 1, minWidth: 0, fontSize: '0.68rem', color: 'rgba(232,236,248,0.56)', whiteSpace: 'nowrap' }}>
                                    Sortie
                                  </label>
                                  <input
                                    id={`fade-out-dur-${clip.id}`}
                                    type="number"
                                    min={0.1}
                                    max={5}
                                    step={0.1}
                                    value={fadeOutDuration}
                                    aria-label="Durée fondu de sortie"
                                    onChange={(e) => updateClipFade(clip.id, !!clip.fadeIn, !!clip.fadeOut, fadeInDuration, parseFloat(e.target.value))}
                                    style={fadeDurationInput}
                                  />
                                  <span style={{ flexShrink: 0, fontSize: '0.68rem', color: 'rgba(232,236,248,0.44)' }}>s</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={divider} />

          {/* Section Musique */}
          <div style={panelSection}>
            <div style={panelSectionHeader}>
              <span>🎵 Musique</span>
              <button
                type="button"
                style={smallAddBtn}
                onClick={() => audioInputRef.current?.click()}
              >
                + Importer une piste
              </button>
            </div>

            {audioTracks.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                Aucune piste
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {audioTracks.map((track) => (
                  <div
                    key={track.id}
                    style={{
                      ...rowItem,
                      background: 'rgba(100,255,218,0.04)',
                      border: '1px solid rgba(100,255,218,0.14)',
                    }}
                  >
                    <span style={{ flexShrink: 0, fontSize: '0.75rem' }}>♪</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64ffda', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.name}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                        {track.duration > 0 ? fmtTime(track.duration) : '—'}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Supprimer ${track.name}`}
                      onClick={() => handleRemoveAudioTrack(track.id)}
                      style={deleteBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={divider} />

          {/* Section Infos */}
          <div style={panelSection}>
            <div style={panelSectionHeader}>
              <span>📊 Infos</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {([
                ['Durée totale', fmtDuration(totalDuration)],
                ['Clips', `${clips.length}`],
                ['Pistes audio', `${audioTracks.length}`],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-muted, #8892b0)' }}>{label}</span>
                  <span style={{ color: '#e8ecf8', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ══ Timeline (bas) ══════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0, height: timelinePanelHeight,
        borderTop: '2px solid var(--color-border, #2a2a4a)',
        background: 'var(--color-panel, #13132a)',
        overflowY: 'hidden', overflowX: 'hidden',
        padding: '0.4rem 0.75rem',
      }}>
        <AssemblageTimeline
          clips={clips}
          onRemoveClip={removeClip}
          onReorderClips={reorderClips}
          onVideoTrimChange={updateClipTrim}
          onVideoOffsetChange={updateClipOffset}
          audioTracks={audioTracks}
          onAudioDurationReady={updateAudioTrackDuration}
          onAudioTrimChange={updateAudioTrackTrim}
          onAudioOffsetChange={updateAudioTrackOffset}
          annotations={storeAnnotations}
          isGloballyPlaying={timelinePlaybackActive && activeVideoActuallyPlaying}
          globalTimelineTime={globalTimelineTime}
          videoVolume={videoVolume}
          videoMuted={videoMuted}
          onVideoVolumeChange={setVideoVolume}
          onVideoMutedChange={setVideoMuted}
          onPlayFromTime={playFromTimelineTime}
        />
      </div>

      {/* Input audio caché */}
      <input
        ref={audioInputRef}
        type="file"
        multiple
        accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
        style={{ display: 'none' }}
        onChange={handleAudioImport}
      />

      {/* Modal import vidéos */}
      {showImportModal && (
        <VideoImportModal
          project={project}
          onClose={() => setShowImportModal(false)}
          onAddSelection={handleAddSelection}
        />
      )}

      {/* Panneau export assemblage */}
      {showExportPanel && (
        <ExportPanel
          clips={clips}
          audioTracks={audioTracks}
          onClose={() => setShowExportPanel(false)}
        />
      )}
    </div>
  )
}

export default AssemblagePage
