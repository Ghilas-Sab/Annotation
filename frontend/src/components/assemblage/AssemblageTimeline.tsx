import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getClipEffectiveDuration,
  getClipTimelineEnd,
  getClipTimelineAnnotations,
  getClipTimelineStart,
  getClipTrimEnd,
  getAudioTrackTimelineEnd,
  type AssemblageClip,
  type AudioTrack,
} from '../../stores/assemblageStore'
import type { Annotation } from '../../types/annotation'
import AudioTrackRow from './AudioTrackRow'

interface AssemblageTimelineProps {
  clips: AssemblageClip[]
  onRemoveClip: (id: string) => void
  onReorderClips: (clips: AssemblageClip[]) => void
  onVideoTrimChange?: (id: string, trimStart: number, trimEnd: number) => void
  onVideoOffsetChange?: (id: string, startOffset: number) => void
  audioTracks?: AudioTrack[]
  onAudioDurationReady?: (id: string, duration: number) => void
  onAudioTrimChange?: (id: string, trimStart: number, trimEnd: number) => void
  onAudioOffsetChange?: (id: string, startOffset: number) => void
  annotations?: Record<string, Annotation[]>
  isGloballyPlaying?: boolean
  globalTimelineTime?: number
  videoVolume?: number
  videoMuted?: boolean
  onVideoVolumeChange?: (value: number) => void
  onVideoMutedChange?: (muted: boolean) => void
  onPlayFromTime?: (time: number) => void
}

const formatTimestamp = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  const frames = Math.floor((ms % 1000) / (1000 / 25))
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(frames).padStart(2, '0')}`
}

const LABEL_COL       = 136
const TRACK_HEIGHT    = 58
const RULER_HEIGHT    = 22
const AUDIO_LANE_HEIGHT = 48
const AUDIO_GAP       = 8
const MIN_ZOOM        = 1
const MAX_ZOOM        = 8
const MIN_VIDEO_TRIM_DURATION = 0.1
const EMPTY_AUDIO_TRACKS: AudioTrack[] = []
const EMPTY_ANNOTATIONS: Record<string, Annotation[]> = {}

const CLIP_COLORS = [
  { bg: 'rgba(59,130,246,0.22)',  accent: '#3b82f6' },
  { bg: 'rgba(168,85,247,0.22)',  accent: '#a855f7' },
  { bg: 'rgba(20,184,166,0.22)',  accent: '#14b8a6' },
  { bg: 'rgba(245,158,11,0.22)',  accent: '#f59e0b' },
  { bg: 'rgba(239,68,68,0.22)',   accent: '#ef4444' },
  { bg: 'rgba(34,197,94,0.22)',   accent: '#22c55e' },
]
const ADAPTED_COLOR = { bg: 'rgba(244,63,94,0.20)', accent: '#f43f5e' }

const getClipColor = (clip: AssemblageClip, index: number) =>
  clip.sourceType === 'adapted' ? ADAPTED_COLOR : CLIP_COLORS[index % CLIP_COLORS.length]

const fmtTime = (s: number) => {
  if (s < 60) return `${Math.round(s)}s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60).toString().padStart(2, '0')}`
}

const zoomBtnStyle: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 700,
  padding: '0.1rem 0.42rem', borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.07)',
  color: 'var(--color-text-muted, #8892b0)',
  cursor: 'pointer', lineHeight: 1,
}

const labelColBase: React.CSSProperties = {
  width: LABEL_COL, flexShrink: 0, display: 'flex', flexDirection: 'column',
  userSelect: 'none',
}

interface VerticalMixControlProps {
  ariaLabel: string
  dataTestId: string
  volume: number
  muted: boolean
  accentColor: string
  title?: string
  onVolumeChange: (value: number) => void
  onMutedChange: (muted: boolean) => void
}

const MixPillControl: React.FC<VerticalMixControlProps> = ({
  ariaLabel,
  dataTestId,
  volume,
  muted,
  accentColor,
  title,
  onVolumeChange,
  onMutedChange,
}) => {
  const handleVolumeInput = (value: number) => {
    onVolumeChange(value)
    if (value > 0) onMutedChange(false)
  }

  return (
    <div
      title={title}
      style={{
        width: 128,
        height: 30,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 0.45rem',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        type="button"
        aria-label={muted ? `Réactiver ${title ?? ariaLabel}` : `Couper ${title ?? ariaLabel}`}
        onClick={() => onMutedChange(!muted)}
        style={{
          border: 'none',
          background: 'transparent',
          color: muted ? 'rgba(255,255,255,0.28)' : accentColor,
          cursor: 'pointer',
          fontSize: '0.68rem',
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <span style={{
        maxWidth: 42,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 1,
      }}>
        {title ?? ariaLabel}
      </span>
      <input
        data-testid={dataTestId}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        onChange={(e) => handleVolumeInput(+e.target.value)}
        aria-label={ariaLabel}
        style={{
          flex: 1,
          minWidth: 34,
          height: 3,
          margin: 0,
          padding: 0,
          border: 'none',
          borderRadius: 999,
          background: 'transparent',
          cursor: 'pointer',
          accentColor,
        }}
      />
    </div>
  )
}

const AssemblageTimeline: React.FC<AssemblageTimelineProps> = ({
  clips,
  onRemoveClip,
  onReorderClips,
  onVideoTrimChange,
  onVideoOffsetChange,
  audioTracks = EMPTY_AUDIO_TRACKS,
  onAudioDurationReady,
  onAudioTrimChange,
  onAudioOffsetChange,
  annotations = EMPTY_ANNOTATIONS,
  isGloballyPlaying = false,
  globalTimelineTime = 0,
  videoVolume = 1,
  videoMuted = false,
  onVideoVolumeChange,
  onVideoMutedChange,
  onPlayFromTime,
}) => {
  const [draggedId,    setDraggedId]    = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [zoom,         setZoom]         = useState(1)
  const [audioMix, setAudioMix] = useState<Record<string, { volume: number; muted: boolean }>>({})
  const [hoveredAnnotation, setHoveredAnnotation] = useState<{ clipId: string; annotationId: string } | null>(null)
  const [syncedBeatMarkers, setSyncedBeatMarkers] = useState<{ annotationId: string; time: number }[]>([])
  const dragOverRef = useRef<string | null>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)
  const videoLaneRef = useRef<HTMLDivElement>(null)

  const videoDuration = useMemo(
    () => clips.reduce((max, c) => Math.max(max, getClipTimelineEnd(c)), 0),
    [clips],
  )
  const maxAudioDuration = useMemo(
    () => audioTracks.reduce((max, t) => Math.max(max, getAudioTrackTimelineEnd(t)), 0),
    [audioTracks],
  )
  const totalDuration = Math.max(videoDuration, maxAudioDuration)

  const sortedAudioTracks = useMemo(
    () => [...audioTracks].sort((a, b) => a.startOffset - b.startOffset),
    [audioTracks],
  )

  const syncCandidates = useMemo(() => {
    return clips.filter((clip) => (
      Number.isFinite(clip.bpm) && (clip.bpm ?? 0) > 0 &&
      getClipTimelineAnnotations(clip, annotations[clip.videoId] ?? []).some((ann) => {
        const annotationTime = ann.timestamp_ms / 1000
        return annotationTime >= (clip.trimStart ?? 0) && annotationTime <= getClipTrimEnd(clip)
      })
    ))
  }, [annotations, clips])

  const canSynchronize = audioTracks.length > 0 && !!onAudioOffsetChange && syncCandidates.length > 0

  useEffect(() => {
    setAudioMix((prev) => {
      const next: Record<string, { volume: number; muted: boolean }> = {}
      sortedAudioTracks.forEach((t) => { next[t.id] = prev[t.id] ?? { volume: 0.8, muted: false } })
      return next
    })
  }, [sortedAudioTracks])

  const ticks = useMemo(() => {
    if (totalDuration <= 0) return []
    const candidates = [1, 2, 5, 10, 15, 30, 60, 120, 300]
    const interval = candidates.find((c) => totalDuration / c <= 8) ?? 300
    const result: { time: number; label: string; pct: number }[] = []
    for (let t = 0; t <= totalDuration; t += interval) {
      result.push({ time: t, label: fmtTime(t), pct: (t / totalDuration) * 100 })
    }
    if ((result[result.length - 1]?.time ?? 0) < totalDuration - 0.5) {
      result.push({ time: totalDuration, label: fmtTime(totalDuration), pct: 100 })
    }
    return result
  }, [totalDuration])

  // Zoom via Ctrl + molette sur la zone scrollable
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2
      setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleDrop = useCallback((targetId: string, droppedId?: string) => {
    const sourceId = droppedId || draggedId
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null); setDropTargetId(null); return
    }
    const srcIdx = clips.findIndex((c) => c.id === sourceId)
    const tgtIdx = clips.findIndex((c) => c.id === targetId)
    if (srcIdx < 0 || tgtIdx < 0) { setDraggedId(null); setDropTargetId(null); return }
    const next = [...clips]
    const [moved] = next.splice(srcIdx, 1)
    next.splice(tgtIdx, 0, moved)
    onReorderClips(next)
    setDraggedId(null)
    setDropTargetId(null)
  }, [draggedId, clips, onReorderClips])

  const handleReorderDragStart = useCallback((e: React.DragEvent, clipId: string) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', clipId)
    setDraggedId(clipId)
  }, [])

  const zoomIn    = useCallback(() => setZoom(z => Math.min(MAX_ZOOM, +(z * 1.5).toFixed(2))), [])
  const zoomOut   = useCallback(() => setZoom(z => Math.max(MIN_ZOOM, +(z / 1.5).toFixed(2))), [])
  const zoomReset = useCallback(() => setZoom(1), [])

  const synchronizeToMusic = useCallback(() => {
    if (!canSynchronize || !onAudioOffsetChange) return

    const primaryAudioTrack = sortedAudioTracks[0]
    if (!primaryAudioTrack) return

    const nextMarkers: { annotationId: string; time: number }[] = []
    const anchorClip = syncCandidates[0]
    const anchorBpm = anchorClip?.bpm ?? 0
    if (!anchorClip || !Number.isFinite(anchorBpm) || anchorBpm <= 0) return

    const anchorBeatInterval = 60 / anchorBpm
    const anchorTrimStart = anchorClip.trimStart ?? 0
    const anchorAnnotations = getClipTimelineAnnotations(anchorClip, annotations[anchorClip.videoId] ?? [])
      .filter((ann) => {
        const annotationTime = ann.timestamp_ms / 1000
        return annotationTime >= anchorTrimStart && annotationTime <= getClipTrimEnd(anchorClip)
      })
      .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
    const anchor = anchorAnnotations[0]
    if (!anchor) return

    const anchorGlobalTime = getClipTimelineStart(anchorClip) + (anchor.timestamp_ms / 1000) - anchorTrimStart
    const rawAnchorBeat = (anchorGlobalTime + primaryAudioTrack.trimStart - primaryAudioTrack.startOffset) / anchorBeatInterval
    const candidateBeatIndexes = Array.from(new Set([
      0,
      Math.max(0, Math.floor(rawAnchorBeat) - 1),
      Math.max(0, Math.floor(rawAnchorBeat)),
      Math.max(0, Math.ceil(rawAnchorBeat)),
      Math.max(0, Math.ceil(rawAnchorBeat) + 1),
    ]))

    const nextPrimaryAudioOffset = candidateBeatIndexes
      .map((beatIndex) => ({
        beatIndex,
        offset: anchorGlobalTime + primaryAudioTrack.trimStart - beatIndex * anchorBeatInterval,
      }))
      .filter(({ offset }) => offset >= 0)
      .sort((a, b) => Math.abs(a.offset - primaryAudioTrack.startOffset) - Math.abs(b.offset - primaryAudioTrack.startOffset))[0]?.offset

    if (nextPrimaryAudioOffset == null) return

    const offsetDelta = nextPrimaryAudioOffset - primaryAudioTrack.startOffset
    sortedAudioTracks.forEach((track) => {
      const nextOffset = Math.max(0, track.startOffset + offsetDelta)
      onAudioOffsetChange(track.id, Math.abs(nextOffset) < 1e-6 ? 0 : Number(nextOffset.toFixed(6)))
    })

    syncCandidates.forEach((clip) => {
      const bpm = clip.bpm ?? 0
      if (!Number.isFinite(bpm) || bpm <= 0) return

      const beatInterval = 60 / bpm
      const clipStart = getClipTimelineStart(clip)
      const trimStart = clip.trimStart ?? 0
      const clipAnnotations = getClipTimelineAnnotations(clip, annotations[clip.videoId] ?? [])
        .filter((ann) => {
          const annotationTime = ann.timestamp_ms / 1000
          return annotationTime >= trimStart && annotationTime <= getClipTrimEnd(clip)
        })
        .sort((a, b) => a.timestamp_ms - b.timestamp_ms)

      clipAnnotations.forEach((ann) => {
        const localTime = (ann.timestamp_ms / 1000) - trimStart
        const annotationGlobalTime = clipStart + localTime
        const annBeatIndex = Math.max(
          0,
          Math.round((annotationGlobalTime + primaryAudioTrack.trimStart - nextPrimaryAudioOffset) / beatInterval),
        )
        nextMarkers.push({
          annotationId: ann.id,
          time: nextPrimaryAudioOffset - primaryAudioTrack.trimStart + annBeatIndex * beatInterval,
        })
      })
    })

    setSyncedBeatMarkers(nextMarkers)
  }, [annotations, canSynchronize, onAudioOffsetChange, sortedAudioTracks, syncCandidates])

  const seekFromClientX = useCallback((clientX: number, element: HTMLElement) => {
    if (!onPlayFromTime || totalDuration === 0) return
    const rect = element.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    onPlayFromTime(Math.max(0, Math.min(totalDuration, ratio * totalDuration)))
  }, [onPlayFromTime, totalDuration])

  const startTimelineScrub = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!onPlayFromTime || totalDuration === 0) return
    e.preventDefault()
    const target = e.currentTarget
    seekFromClientX(e.clientX, target)

    const onMove = (ev: MouseEvent) => seekFromClientX(ev.clientX, target)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onPlayFromTime, seekFromClientX, totalDuration])

  const startVideoMoveDrag = useCallback((e: React.MouseEvent, clip: AssemblageClip) => {
    if (!onVideoOffsetChange) return
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const rowWidth = videoLaneRef.current?.getBoundingClientRect().width ?? 1
    const safeTotalDuration = Math.max(totalDuration, 0.5)
    const timePerPx = safeTotalDuration / rowWidth
    const initOffset = getClipTimelineStart(clip)
    const onMove = (ev: MouseEvent) => {
      onVideoOffsetChange(clip.id, Math.max(0, initOffset + (ev.clientX - startX) * timePerPx))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onVideoOffsetChange, totalDuration])

  const startVideoTrimDrag = useCallback((e: React.MouseEvent, clip: AssemblageClip, handle: 'start' | 'end') => {
    if (!onVideoTrimChange) return
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const rowWidth = videoLaneRef.current?.getBoundingClientRect().width ?? 1
    const safeTotalDuration = Math.max(totalDuration, 0.5)
    const timePerPx = safeTotalDuration / rowWidth
    const initStart = clip.trimStart ?? 0
    const initEnd = getClipTrimEnd(clip)
    const onMove = (ev: MouseEvent) => {
      const delta = (ev.clientX - startX) * timePerPx
      if (handle === 'start') {
        onVideoTrimChange(
          clip.id,
          Math.max(0, Math.min(initEnd - MIN_VIDEO_TRIM_DURATION, initStart + delta)),
          initEnd,
        )
      } else {
        onVideoTrimChange(
          clip.id,
          initStart,
          Math.min(clip.duration, Math.max(initStart + MIN_VIDEO_TRIM_DURATION, initEnd + delta)),
        )
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onVideoTrimChange, totalDuration])

  const playheadPct = totalDuration > 0 ? (globalTimelineTime / totalDuration) * 100 : -1

  const playheadLine = (zIndex = 10): React.CSSProperties => ({
    position: 'absolute',
    left: `${playheadPct}%`,
    top: 0, bottom: 0,
    width: 2,
    background: '#e94560',
    transform: 'translateX(-50%)',
    zIndex, pointerEvents: 'none',
    boxShadow: '0 0 4px rgba(233,69,96,0.6)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Barre outils : zoom ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.55rem',
        marginBottom: '0.35rem',
      }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #8892b0)', fontFamily: 'monospace', marginRight: 4 }}>
          🎬 {fmtTime(videoDuration)}
          {audioTracks.length > 0 && (
            <span style={{ marginLeft: 8 }}>🎵 {fmtTime(maxAudioDuration)}</span>
          )}
        </span>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.18rem 0.42rem',
          borderRadius: 6,
          background: 'rgba(100,255,218,0.055)',
          border: '1px solid rgba(100,255,218,0.14)',
        }}>
          <span style={{ fontSize: '0.64rem', color: '#64ffda', fontWeight: 700, whiteSpace: 'nowrap' }}>
            BPM vidéo
          </span>
          <button
            type="button"
            onClick={synchronizeToMusic}
            disabled={!canSynchronize}
            title={canSynchronize ? 'Caler les beats de la musique sur les annotations vidéo' : 'Piste audio, BPM vidéo et annotations requis'}
            style={{
              ...zoomBtnStyle,
              color: canSynchronize ? '#64ffda' : 'rgba(255,255,255,0.32)',
              borderColor: canSynchronize ? 'rgba(100,255,218,0.4)' : 'rgba(255,255,255,0.12)',
              background: syncedBeatMarkers.length > 0 ? 'rgba(100,255,218,0.14)' : 'rgba(255,255,255,0.05)',
              opacity: canSynchronize ? 1 : 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            Synchroniser
          </button>
        </div>
        <MixPillControl
          dataTestId="source-video-volume-slider"
          ariaLabel="Son d'origine vidéo"
          title="Vidéo"
          volume={videoVolume}
          muted={videoMuted}
          accentColor="#e94560"
          onVolumeChange={(value) => onVideoVolumeChange?.(value)}
          onMutedChange={(muted) => onVideoMutedChange?.(muted)}
        />
        {sortedAudioTracks.map((track) => {
          const mix = audioMix[track.id] ?? { volume: 0.8, muted: false }
          return (
            <MixPillControl
              key={track.id}
              dataTestId={`audio-volume-slider-${track.id}`}
              ariaLabel={`Volume ${track.name}`}
              title={track.name}
              volume={mix.volume}
              muted={mix.muted}
              accentColor="#64ffda"
              onVolumeChange={(value) => setAudioMix(prev => ({
                ...prev,
                [track.id]: { ...(prev[track.id] ?? mix), volume: value },
              }))}
              onMutedChange={(muted) => setAudioMix(prev => ({
                ...prev,
                [track.id]: { ...(prev[track.id] ?? mix), muted },
              }))}
            />
          )
        })}
        {zoom > 1 && (
          <span style={{ fontSize: '0.65rem', color: '#4a9eff', fontFamily: 'monospace' }}>
            {zoom.toFixed(1)}×
          </span>
        )}
        {zoom > 1 && (
          <button type="button" onClick={zoomReset} style={{ ...zoomBtnStyle, color: '#4a9eff', borderColor: 'rgba(74,158,255,0.5)', fontSize: '0.62rem' }}>
            ×1
          </button>
        )}
        <button type="button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} title="Dézoomer (Ctrl+molette)" style={{ ...zoomBtnStyle, opacity: zoom <= MIN_ZOOM ? 0.35 : 1 }}>−</button>
        <button type="button" onClick={zoomIn}  disabled={zoom >= MAX_ZOOM} title="Zoomer (Ctrl+molette)" style={{ ...zoomBtnStyle, opacity: zoom >= MAX_ZOOM ? 0.35 : 1 }}>+</button>
      </div>

      {/* ── Layout principal : colonne labels fixes + zone scrollable ─────── */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* ════ Colonne labels ════════════════════════════════════════════ */}
        <div style={labelColBase}>

          {/* Espace ruler */}
          <div style={{
            height: RULER_HEIGHT, flexShrink: 0,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px 0 0 0',
            border: '1px solid rgba(255,255,255,0.08)', borderRight: 'none',
          }} />

          {/* Label piste Vidéo */}
          <div style={{
            height: TRACK_HEIGHT, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.25rem 0.45rem 0.25rem 0.6rem', gap: '0.35rem',
            background: 'rgba(8,12,28,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderTop: 'none', borderRight: 'none',
            borderRadius: '0 0 0 8px',
          }}>
            <div style={{ minWidth: 0, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.38rem', minWidth: 0 }}>
                <span style={{ fontSize: '0.82rem', lineHeight: 1, flexShrink: 0 }}>🎬</span>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#e8ecf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Vidéo</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.56rem', color: '#5a6480', fontFamily: 'monospace' }}>
                  {videoDuration > 0 ? fmtTime(videoDuration) : ''}
                </span>
              </div>
              <div style={{ fontSize: '0.58rem', color: '#8892b0', paddingLeft: '1.52rem', lineHeight: 1.2 }}>
                {clips.length} clip{clips.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Label piste Audio */}
          {audioTracks.length > 0 && (
            <>
              <div style={{ height: AUDIO_GAP, flexShrink: 0 }} />
              <div style={{
                height: AUDIO_LANE_HEIGHT, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.25rem 0.45rem 0.25rem 0.6rem', gap: '0.35rem',
                background: 'rgba(8,12,28,0.85)',
                border: '1px solid rgba(100,255,218,0.15)',
                borderRight: 'none',
                borderRadius: '8px 0 0 8px',
                overflowY: 'hidden',
              }}>
                <div style={{ minWidth: 0, width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.38rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.82rem', lineHeight: 1, flexShrink: 0 }}>🎵</span>
                    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#64ffda', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Musique</span>
                  </div>
                  <div style={{ fontSize: '0.58rem', color: '#8892b0', paddingLeft: '1.52rem', lineHeight: 1.2 }}>
                    {audioTracks.length} clip{audioTracks.length !== 1 ? 's' : ''} audio
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ════ Zone scrollable ════════════════════════════════════════════ */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, minWidth: 0,
            overflowX: zoom > 1 ? 'auto' : 'hidden', overflowY: 'hidden',
            cursor: zoom > 1 ? 'default' : undefined,
          }}
          title={zoom < MAX_ZOOM ? 'Ctrl + molette pour zoomer' : undefined}
        >
          <div style={{ minWidth: `${zoom * 100}%` }}>

            {/* ── Règle temporelle ──────────────────────────────────────── */}
            <div
              onMouseDown={startTimelineScrub}
              style={{
                position: 'relative', height: RULER_HEIGHT,
                background: 'rgba(255,255,255,0.025)',
                borderRadius: '0 8px 0 0',
                border: '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
                cursor: onPlayFromTime && totalDuration > 0 ? 'pointer' : 'default',
              }}
            >
              {ticks.map((tick) => (
                <div
                  key={tick.time}
                  style={{
                    position: 'absolute', left: `${tick.pct}%`, top: 0, height: '100%',
                    transform: tick.pct > 95 ? 'translateX(-100%)' : tick.pct === 0 ? 'none' : 'translateX(-50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ width: 1, height: 6, background: 'rgba(255,255,255,0.22)', marginTop: 4 }} />
                  <span style={{ fontSize: '0.62rem', color: '#8892b0', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {tick.label}
                  </span>
                </div>
              ))}
              {playheadPct >= 0 && <div style={playheadLine(12)} />}
            </div>

            {/* ── Piste clips vidéo ──────────────────────────────────────── */}
            <div
              ref={videoLaneRef}
              data-testid="assemblage-timeline"
              onMouseDown={startTimelineScrub}
              style={{
                height: TRACK_HEIGHT,
                border: '1px solid rgba(255,255,255,0.1)',
                borderTop: 'none', borderRadius: '0 0 8px 8px',
                background: 'rgba(8,12,28,0.85)',
                backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px)',
                backgroundSize: '48px 100%',
                overflow: 'hidden', position: 'relative',
              }}
            >
              {clips.length === 0 ? (
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', fontStyle: 'italic',
                }}>
                  Aucun clip
                </div>
              ) : clips.map((clip, index) => {
                const effectiveDuration = getClipEffectiveDuration(clip)
                const clipStart = getClipTimelineStart(clip)
                const trimStart = clip.trimStart ?? 0
                const trimEnd = getClipTrimEnd(clip)
                const widthPct  = totalDuration > 0 ? (effectiveDuration / totalDuration) * 100 : 100 / clips.length
                const leftPct = totalDuration > 0 ? (clipStart / totalDuration) * 100 : 0
                const color     = getClipColor(clip, index)
                const isDragged = draggedId    === clip.id
                const isDropTarget = dropTargetId === clip.id
                const annots    = getClipTimelineAnnotations(clip, annotations[clip.videoId] ?? [])
                const hoveredAnn = hoveredAnnotation?.clipId === clip.id
                  ? annots.find(a => a.id === hoveredAnnotation.annotationId) ?? null
                  : null

                return (
                  <div
                    key={clip.id}
                    data-testid={`video-clip-${clip.id}`}
                    onMouseDown={(e) => startVideoMoveDrag(e, clip)}
                    onDragEnter={() => { dragOverRef.current = clip.id; setDropTargetId(clip.id) }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={() => { if (dragOverRef.current === clip.id) setDropTargetId(null) }}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleDrop(clip.id, e.dataTransfer.getData('text/plain'))
                    }}
                    onDragEnd={() => { setDraggedId(null); setDropTargetId(null) }}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 0)}%`,
                      minWidth: 28,
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      background: isDragged ? 'rgba(255,255,255,0.06)' : color.bg,
                      borderRight: '1px solid rgba(255,255,255,0.12)',
                      borderLeft: isDropTarget ? `2px solid ${color.accent}` : 'none',
                      opacity: isDragged ? 0.45 : 1,
                      cursor: onVideoOffsetChange ? 'grab' : 'default',
                      overflow: 'visible',
                      transition: 'opacity 0.15s, border-left 0.1s',
                    }}
                  >
                    {/* Barre accent gauche */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color.accent }} />

                    {/* Marqueurs d'annotation */}
                    {annots.map(ann => {
                      const annotationTime = ann.timestamp_ms / 1000
                      const markerLeftPct = effectiveDuration > 0 ? ((annotationTime - trimStart) / effectiveDuration) * 100 : 0
                      if (annotationTime < trimStart || annotationTime > trimEnd || markerLeftPct < 0 || markerLeftPct > 100) return null
                      return (
                        <div
                          key={ann.id}
                          data-testid={`annotation-marker-${ann.id}`}
                          style={{
                            position: 'absolute', left: `${markerLeftPct}%`,
                            top: 4, bottom: 4, width: 2,
                            backgroundColor: ann.category?.color ?? 'rgba(255,255,255,0.6)',
                            zIndex: 4, cursor: 'pointer',
                          }}
                          onMouseEnter={() => setHoveredAnnotation({ clipId: clip.id, annotationId: ann.id })}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                        />
                      )
                    })}

                    {/* Tooltip annotation au survol */}
                    {hoveredAnn && (
                      <div style={{
                        position: 'absolute',
                        left: `${effectiveDuration > 0 ? (((hoveredAnn.timestamp_ms / 1000) - trimStart) / effectiveDuration) * 100 : 0}%`,
                        top: -36, zIndex: 20,
                        background: 'rgba(15,20,40,0.95)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 6, padding: '0.25rem 0.5rem',
                        fontSize: '0.7rem', color: '#e8ecf8', whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        transform: 'translateX(-50%)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}>
                        <span>{hoveredAnn.label || 'Sans label'}</span>
                        <span> — {formatTimestamp(hoveredAnn.timestamp_ms)}</span>
                      </div>
                    )}

                    {/* Contenu clip */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      padding: '0.5rem 0.5rem 0.4rem 0.75rem',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      overflow: 'hidden',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', minWidth: 0 }}>
                        <span style={{
                          flexShrink: 0, fontSize: '0.62rem', fontWeight: 700,
                          background: color.accent, color: '#fff',
                          padding: '0.1rem 0.3rem', borderRadius: 4, lineHeight: 1.4,
                        }}>
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          draggable
                          data-testid={`video-reorder-handle-${clip.id}`}
                          aria-label={`Déplacer ${clip.name}`}
                          title="Glisser pour changer l'ordre"
                          onMouseDown={(e) => e.stopPropagation()}
                          onDragStart={(e) => handleReorderDragStart(e, clip.id)}
                          onDragEnd={() => { setDraggedId(null); setDropTargetId(null) }}
                          style={{
                            flexShrink: 0,
                            width: 18,
                            height: 18,
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 4,
                            background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.68)',
                            cursor: 'grab',
                            fontSize: '0.72rem',
                            lineHeight: 1,
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ⋮
                        </button>
                        <span style={{
                          flex: 1, minWidth: 0, fontSize: '0.78rem', fontWeight: 700,
                          color: '#e8ecf8', overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', lineHeight: 1.4,
                        }}>
                          {clip.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`Supprimer ${clip.name}`}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); onRemoveClip(clip.id) }}
                          style={{
                            flexShrink: 0, border: 'none', background: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)', width: 18, height: 18, borderRadius: 999,
                            fontSize: '0.6rem', cursor: 'pointer', lineHeight: 1, padding: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >✕</button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)' }}>
                          {fmtTime(effectiveDuration)}
                        </span>
                        {clipStart > 0 && (
                          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace' }}>
                            @{fmtTime(clipStart)}
                          </span>
                        )}
                        {(trimStart > 0 || trimEnd < clip.duration - 0.01) && (
                          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                            {fmtTime(trimStart)}-{fmtTime(trimEnd)}
                          </span>
                        )}
                        {annots.length > 0 && (
                          <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                            {annots.length} ann.
                          </span>
                        )}
                        {clip.sourceType === 'adapted' && (
                          <span style={{
                            fontSize: '0.58rem', fontWeight: 700,
                            background: 'rgba(244,63,94,0.25)', color: '#fda4af',
                            padding: '0.1rem 0.35rem', borderRadius: 4,
                          }}>ADAPTÉ</span>
                        )}
                      </div>
                    </div>
                    <div
                      data-testid="video-trim-start-handle"
                      onMouseDown={(e) => startVideoTrimDrag(e, clip, 'start')}
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
                        background: `${color.accent}cc`, cursor: 'ew-resize',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12,
                      }}
                    >
                      <div style={{ width: 2, height: 22, background: 'rgba(0,0,0,0.35)', borderRadius: 1 }} />
                    </div>
                    <div
                      data-testid="video-trim-end-handle"
                      onMouseDown={(e) => startVideoTrimDrag(e, clip, 'end')}
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0, width: 10,
                        background: `${color.accent}cc`, cursor: 'ew-resize',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12,
                      }}
                    >
                      <div style={{ width: 2, height: 22, background: 'rgba(0,0,0,0.35)', borderRadius: 1 }} />
                    </div>
                  </div>
                )
              })}

              {/* Playhead */}
              {playheadPct >= 0 && clips.length > 0 && <div style={playheadLine(10)} />}
            </div>

            {/* ── Piste audio ───────────────────────────────────────────── */}
            {audioTracks.length > 0 && (
              <>
                <div style={{ height: AUDIO_GAP }} />
                <div
                  data-testid="assemblage-audio-lane"
                  onMouseDown={startTimelineScrub}
                  style={{
                    height: AUDIO_LANE_HEIGHT,
                    border: '1px solid rgba(100,255,218,0.15)',
                    borderRadius: '0 8px 8px 0',
                    background: 'rgba(8,12,28,0.85)',
                    overflow: 'hidden', position: 'relative',
                  }}
                >
                  {sortedAudioTracks.map((track) => {
                    const mix = audioMix[track.id] ?? { volume: 0.8, muted: false }
                    return (
                      <AudioTrackRow
                        key={track.id}
                        track={track}
                        totalDuration={totalDuration > 0 ? totalDuration : 1}
                        isGloballyPlaying={isGloballyPlaying}
                        globalTimelineTime={globalTimelineTime}
                        volume={mix.volume}
                        isMuted={mix.muted}
                        onDurationReady={(id, dur) => onAudioDurationReady?.(id, dur)}
                        onTrimChange={(id, s, e) => onAudioTrimChange?.(id, s, e)}
                        onOffsetChange={(id, offset) => onAudioOffsetChange?.(id, offset)}
                      />
                    )
                  })}
                  {syncedBeatMarkers.map((marker) => {
                    if (marker.time < 0 || marker.time > totalDuration) return null
                    return (
                      <div
                        key={`${marker.annotationId}-${marker.time}`}
                        data-testid={`audio-beat-marker-${marker.annotationId}`}
                        style={{
                          position: 'absolute',
                          left: `${totalDuration > 0 ? (marker.time / totalDuration) * 100 : 0}%`,
                          top: 3,
                          bottom: 3,
                          width: 2,
                          background: '#64ffda',
                          transform: 'translateX(-50%)',
                          zIndex: 14,
                          boxShadow: '0 0 6px rgba(100,255,218,0.75)',
                          pointerEvents: 'none',
                        }}
                      />
                    )
                  })}
                  {playheadPct >= 0 && <div style={playheadLine(10)} />}
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default AssemblageTimeline
