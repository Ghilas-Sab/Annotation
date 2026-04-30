import React, { useMemo, useRef, useState } from 'react'
import type { AssemblageClip } from '../../stores/assemblageStore'

interface AssemblageTimelineProps {
  clips: AssemblageClip[]
  onRemoveClip: (id: string) => void
  onReorderClips: (clips: AssemblageClip[]) => void
}

const TRACK_HEIGHT = 72
const RULER_HEIGHT = 28

// Palette distincte par index (ne dépend pas des maths hasardeux)
const CLIP_COLORS = [
  { bg: 'rgba(59,130,246,0.22)', accent: '#3b82f6', text: '#bfdbfe' },
  { bg: 'rgba(168,85,247,0.22)', accent: '#a855f7', text: '#e9d5ff' },
  { bg: 'rgba(20,184,166,0.22)', accent: '#14b8a6', text: '#99f6e4' },
  { bg: 'rgba(245,158,11,0.22)', accent: '#f59e0b', text: '#fde68a' },
  { bg: 'rgba(239,68,68,0.22)', accent: '#ef4444', text: '#fecaca' },
  { bg: 'rgba(34,197,94,0.22)', accent: '#22c55e', text: '#bbf7d0' },
]

const ADAPTED_COLOR = { bg: 'rgba(244,63,94,0.20)', accent: '#f43f5e', text: '#fda4af' }

const getClipColor = (clip: AssemblageClip, index: number) =>
  clip.sourceType === 'adapted' ? ADAPTED_COLOR : CLIP_COLORS[index % CLIP_COLORS.length]

const fmtTime = (s: number) => {
  if (s < 60) return `${Math.round(s)}s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60).toString().padStart(2, '0')}`
}

const AssemblageTimeline: React.FC<AssemblageTimelineProps> = ({
  clips,
  onRemoveClip,
  onReorderClips,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const dragOverRef = useRef<string | null>(null)

  const totalDuration = useMemo(
    () => clips.reduce((sum, c) => sum + c.duration, 0),
    [clips],
  )

  // Calcule les ticks de la règle temporelle
  const ticks = useMemo(() => {
    if (totalDuration <= 0) return []
    // Intervalle de tick adapté à la durée totale
    const candidates = [1, 2, 5, 10, 15, 30, 60, 120, 300]
    const targetTicks = 8
    const interval = candidates.find((c) => totalDuration / c <= targetTicks) ?? 300
    const result: { time: number; label: string; pct: number }[] = []
    for (let t = 0; t <= totalDuration; t += interval) {
      result.push({ time: t, label: fmtTime(t), pct: (t / totalDuration) * 100 })
    }
    // Toujours le dernier tick
    if (result[result.length - 1]?.time < totalDuration - 0.5) {
      result.push({ time: totalDuration, label: fmtTime(totalDuration), pct: 100 })
    }
    return result
  }, [totalDuration])

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDropTargetId(null)
      return
    }
    const srcIdx = clips.findIndex((c) => c.id === draggedId)
    const tgtIdx = clips.findIndex((c) => c.id === targetId)
    if (srcIdx < 0 || tgtIdx < 0) {
      setDraggedId(null)
      setDropTargetId(null)
      return
    }
    const next = [...clips]
    const [moved] = next.splice(srcIdx, 1)
    next.splice(tgtIdx, 0, moved)
    onReorderClips(next)
    setDraggedId(null)
    setDropTargetId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Label de piste */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <div style={{
          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--color-text-muted, #8892b0)',
          padding: '0.2rem 0.55rem', background: 'rgba(255,255,255,0.06)',
          borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
        }}>
          Vidéo
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted, #8892b0)' }}>
          {clips.length} clip{clips.length > 1 ? 's' : ''} · {fmtTime(totalDuration)}
        </div>
      </div>

      {/* Règle temporelle */}
      <div
        style={{
          position: 'relative',
          height: RULER_HEIGHT,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px 8px 0 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        {ticks.map((tick) => (
          <div
            key={tick.time}
            style={{
              position: 'absolute',
              left: `${tick.pct}%`,
              top: 0,
              height: '100%',
              transform: tick.pct > 95 ? 'translateX(-100%)' : tick.pct === 0 ? 'none' : 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: 1, height: 6, background: 'rgba(255,255,255,0.25)', marginTop: 4 }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #8892b0)', whiteSpace: 'nowrap', marginTop: 3 }}>
              {tick.label}
            </span>
          </div>
        ))}
      </div>

      {/* Piste clips */}
      <div
        data-testid="assemblage-timeline"
        style={{
          display: 'flex',
          height: TRACK_HEIGHT,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '0 0 8px 8px',
          background: 'rgba(8,12,28,0.85)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {clips.map((clip, index) => {
          const widthPct = totalDuration > 0 ? (clip.duration / totalDuration) * 100 : 100 / clips.length
          const color = getClipColor(clip, index)
          const isDragged = draggedId === clip.id
          const isDropTarget = dropTargetId === clip.id

          return (
            <div
              key={clip.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                setDraggedId(clip.id)
              }}
              onDragEnter={() => {
                dragOverRef.current = clip.id
                setDropTargetId(clip.id)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => {
                if (dragOverRef.current === clip.id) setDropTargetId(null)
              }}
              onDrop={() => handleDrop(clip.id)}
              onDragEnd={() => {
                setDraggedId(null)
                setDropTargetId(null)
              }}
              style={{
                width: `${widthPct}%`,
                minWidth: 80,
                height: '100%',
                flexShrink: 0,
                position: 'relative',
                background: isDragged ? 'rgba(255,255,255,0.06)' : color.bg,
                borderRight: index < clips.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none',
                borderLeft: isDropTarget ? `2px solid ${color.accent}` : 'none',
                opacity: isDragged ? 0.45 : 1,
                cursor: 'grab',
                overflow: 'hidden',
                transition: 'opacity 0.15s, border-left 0.1s',
              }}
            >
              {/* Accent bar gauche */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                background: color.accent,
              }} />

              {/* Contenu */}
              <div style={{
                position: 'absolute', inset: 0, padding: '0.5rem 0.5rem 0.4rem 0.75rem',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                {/* Ligne haute : numéro + nom + delete */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', minWidth: 0 }}>
                  <span style={{
                    flexShrink: 0,
                    fontSize: '0.62rem', fontWeight: 700,
                    background: color.accent, color: '#fff',
                    padding: '0.1rem 0.3rem', borderRadius: 4,
                    lineHeight: 1.4,
                  }}>
                    {index + 1}
                  </span>
                  <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: '0.78rem', fontWeight: 700,
                    color: '#e8ecf8',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}>
                    {clip.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Supprimer ${clip.name}`}
                    onClick={(e) => { e.stopPropagation(); onRemoveClip(clip.id) }}
                    style={{
                      flexShrink: 0,
                      border: 'none', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                      width: 18, height: 18, borderRadius: 999, fontSize: '0.6rem',
                      cursor: 'pointer', lineHeight: 1, padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Ligne basse : durée + badge type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)' }}>
                    {fmtTime(clip.duration)}
                  </span>
                  {clip.sourceType === 'adapted' && (
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 700,
                      background: 'rgba(244,63,94,0.25)', color: '#fda4af',
                      padding: '0.1rem 0.35rem', borderRadius: 4,
                    }}>
                      ADAPTÉ
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Indicateur de position des clips (ticks aux frontières) */}
      <div style={{ position: 'relative', height: 12, marginTop: 2 }}>
        {clips.map((clip, index) => {
          const pct = totalDuration > 0
            ? (clips.slice(0, index + 1).reduce((s, c) => s + c.duration, 0) / totalDuration) * 100
            : 0
          if (index === clips.length - 1) return null
          return (
            <div
              key={clip.id}
              style={{
                position: 'absolute',
                left: `${pct}%`,
                top: 0,
                width: 1,
                height: 8,
                background: 'rgba(255,255,255,0.2)',
                transform: 'translateX(-50%)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default AssemblageTimeline
