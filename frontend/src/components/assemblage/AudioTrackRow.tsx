import React, { useCallback, useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import {
  getAudioTrackEffectiveDuration,
  getAudioTrackTimelineEnd,
  getAudioTrackTrimEnd,
  type AudioTrack,
} from '../../stores/assemblageStore'

const MIN_TRIM_DURATION = 0.5

interface AudioTrackRowProps {
  track: AudioTrack
  totalDuration: number
  isGloballyPlaying: boolean
  globalTimelineTime: number
  volume: number
  isMuted: boolean
  onDurationReady: (id: string, duration: number) => void
  onTrimChange: (id: string, trimStart: number, trimEnd: number) => void
  onOffsetChange: (id: string, startOffset: number) => void
}

const AudioTrackRow: React.FC<AudioTrackRowProps> = ({
  track, totalDuration, isGloballyPlaying, globalTimelineTime,
  volume, isMuted,
  onDurationReady, onTrimChange, onOffsetChange,
}) => {
  const rowRef          = useRef<HTMLDivElement>(null)
  const clipRef         = useRef<HTMLDivElement>(null)
  const waveContainerRef = useRef<HTMLDivElement>(null)
  const wsRef           = useRef<WaveSurfer | null>(null)

  const [playing, setPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const endedByTrimRef = useRef(false)
  const trimEndRef     = useRef(track.trimEnd > 0 ? track.trimEnd : track.duration)
  const playingRef     = useRef(false)
  const currentTimeRef = useRef(0)

  useEffect(() => { trimEndRef.current = track.trimEnd > 0 ? track.trimEnd : track.duration }, [track.trimEnd, track.duration])
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])

  const duration        = track.duration
  const trimStart       = track.trimStart
  const trimEnd         = getAudioTrackTrimEnd(track)
  const effectiveDuration = getAudioTrackEffectiveDuration(track)

  // Utiliser totalDuration comme référence unique pour garantir la même échelle que le ruler
  const safeTotalDuration = Math.max(totalDuration, 0.5)

  const clipLeftPct   = (track.startOffset / safeTotalDuration) * 100
  const clipWidthPct  = duration > 0 ? (effectiveDuration / safeTotalDuration) * 100 : 100
  const waveWidthPct  = effectiveDuration > 0 ? (duration / effectiveDuration) * 100 : 100
  const waveOffsetPct = effectiveDuration > 0 ? -(trimStart / effectiveDuration) * 100 : 0

  // ── WaveSurfer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!waveContainerRef.current || !track.url) return
    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: 'rgba(100,255,218,0.55)',
      progressColor: 'rgba(100,255,218,0.85)',
      cursorWidth: 1, cursorColor: '#64ffda',
      height: 34, barWidth: 2, barGap: 1, barRadius: 2,
      interact: false, normalize: true,
    })
    wsRef.current = ws
    ws.on('ready', (dur: number) => { onDurationReady(track.id, dur) })
    ws.on('play',  () => setPlaying(true))
    ws.on('pause', () => { setPlaying(false); endedByTrimRef.current = false })
    ws.on('finish', () => setPlaying(false))
    ws.on('timeupdate', (time: number) => {
      setCurrentTime(time)
      if (time >= trimEndRef.current && trimEndRef.current > 0) {
        endedByTrimRef.current = true
        ws.pause()
      }
    })
    ws.load(track.url)
    return () => { ws.destroy(); wsRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id, track.url])

  // ── Volume ──────────────────────────────────────────────────────────────
  useEffect(() => {
    wsRef.current?.setVolume(isMuted ? 0 : volume)
  }, [isMuted, volume])

  // ── Synchronisation globale ─────────────────────────────────────────────
  useEffect(() => {
    const ws = wsRef.current
    if (!ws || duration === 0) return
    const trackEnd  = getAudioTrackTimelineEnd(track)
    const inRange   = globalTimelineTime >= track.startOffset && globalTimelineTime < trackEnd
    const shouldPlay = isGloballyPlaying && inRange
    if (shouldPlay) {
      const expectedWsTime = track.trimStart + (globalTimelineTime - track.startOffset)
      const clamped = Math.max(0, Math.min(duration, expectedWsTime))
      const drift   = Math.abs(currentTimeRef.current - clamped)
      if (drift > 0.4) ws.seekTo(Math.max(0, Math.min(1, clamped / duration)))
      if (!playingRef.current) void ws.play()
    } else {
      if (playingRef.current) ws.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGloballyPlaying, globalTimelineTime, track.startOffset, track.trimStart, duration])

  // ── Trim drag ───────────────────────────────────────────────────────────
  const startTrimDrag = useCallback((e: React.MouseEvent, handle: 'start' | 'end') => {
    e.preventDefault()
    e.stopPropagation()
    if (duration === 0) return
    const startX   = e.clientX
    const rowWidth = rowRef.current?.getBoundingClientRect().width ?? 1
    const timePerPx = safeTotalDuration / rowWidth
    const initStart = trimStart
    const initEnd   = trimEnd
    const onMove = (ev: MouseEvent) => {
      const delta = (ev.clientX - startX) * timePerPx
      if (handle === 'start') {
        onTrimChange(track.id, Math.max(0, Math.min(initEnd - MIN_TRIM_DURATION, initStart + delta)), initEnd)
      } else {
        onTrimChange(track.id, initStart, Math.min(duration, Math.max(initStart + MIN_TRIM_DURATION, initEnd + delta)))
      }
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [track.id, trimStart, trimEnd, duration, onTrimChange, safeTotalDuration])

  // ── Move drag (via glisser directement le clip) ─────────────────────────
  const startMoveDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (safeTotalDuration === 0) return
    const startX    = e.clientX
    const rowWidth  = rowRef.current?.getBoundingClientRect().width ?? 1
    const timePerPx = safeTotalDuration / rowWidth
    const initOffset = track.startOffset
    const maxOffset  = Math.max(0, safeTotalDuration - effectiveDuration)
    const onMove = (ev: MouseEvent) => {
      onOffsetChange(track.id, Math.max(0, Math.min(maxOffset, initOffset + (ev.clientX - startX) * timePerPx)))
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [effectiveDuration, onOffsetChange, safeTotalDuration, track.id, track.startOffset])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', userSelect: 'none', pointerEvents: 'none' }}>
      <div
        ref={rowRef}
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 100%',
        }}
      >
        <div
          ref={clipRef}
          onMouseDown={startMoveDrag}
          style={{
            position: 'absolute',
            left: `${clipLeftPct}%`,
            width: `${Math.max(clipWidthPct, 0)}%`,
            top: 0, bottom: 0,
            background: 'rgba(100,255,218,0.08)',
            borderLeft: '3px solid #64ffda',
            borderRight: '1px solid rgba(100,255,218,0.22)',
            boxShadow: 'inset 0 0 0 1px rgba(100,255,218,0.12)',
            overflow: 'hidden',
            pointerEvents: 'auto',
            cursor: 'grab',
          }}
        >
          {/* Waveform */}
          <div
            ref={waveContainerRef}
            data-testid={`waveform-${track.id}`}
            style={{
              position: 'absolute', top: 6, bottom: 4,
              left: `${waveOffsetPct}%`,
              width: `${waveWidthPct}%`,
              pointerEvents: 'none',
            }}
          />

          <div style={{
            position: 'absolute',
            left: 10,
            top: 4,
            maxWidth: 'calc(100% - 20px)',
            color: '#d1fae5',
            fontSize: '0.66rem',
            fontWeight: 700,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 1px 4px rgba(0,0,0,0.65)',
            pointerEvents: 'none',
            zIndex: 8,
          }}>
            {track.name}
          </div>

          {/* Curseur de lecture */}
          {effectiveDuration > 0 && currentTime >= trimStart && currentTime <= trimEnd && (
            <div style={{
              position: 'absolute',
              left: `${((currentTime - trimStart) / effectiveDuration) * 100}%`,
              top: 5, bottom: 5, width: 2,
              background: '#d1fae5',
              boxShadow: '0 0 0 1px rgba(8,12,28,0.35)',
              transform: 'translateX(-50%)',
              zIndex: 7, pointerEvents: 'none',
            }} />
          )}

          {/* Poignée trim gauche */}
          <div
            data-testid="trim-start-handle"
            onMouseDown={(e) => startTrimDrag(e, 'start')}
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
              background: 'rgba(100,255,218,0.88)', cursor: 'ew-resize',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            }}
          >
            <div style={{ width: 2, height: 18, background: 'rgba(0,0,0,0.35)', borderRadius: 1 }} />
          </div>

          {/* Poignée trim droite */}
          <div
            data-testid="trim-end-handle"
            onMouseDown={(e) => startTrimDrag(e, 'end')}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 10,
              background: 'rgba(100,255,218,0.88)', cursor: 'ew-resize',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            }}
          >
            <div style={{ width: 2, height: 18, background: 'rgba(0,0,0,0.35)', borderRadius: 1 }} />
          </div>

        </div>
      </div>
    </div>
  )
}

export default AudioTrackRow
