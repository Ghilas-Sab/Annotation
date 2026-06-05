import { forwardRef, useState } from 'react'
import { Annotation } from '../../types/annotation'
import { frameToTimestamp } from '../../utils/frameUtils'
import { Icon } from '../ui'

interface AnnotationItemProps {
  annotation: Annotation
  fps: number
  totalFrames: number
  active?: boolean
  selected?: boolean
  idx?: number
  onSeek: (frame: number) => void
  onSelect?: (id: string) => void
  onUpdate: (id: string, frame: number, label: string) => void
  onDelete: (id: string) => void
}

export const AnnotationItem = forwardRef<HTMLDivElement, AnnotationItemProps>(({
  annotation, fps, totalFrames, active = false, selected = false, idx = 0, onSeek, onSelect, onUpdate, onDelete,
}, ref) => {
  const [editingLabel, setEditingLabel] = useState(false)
  const [editingFrame, setEditingFrame] = useState(false)
  const [label, setLabel] = useState(annotation.label)
  const [frameInput, setFrameInput] = useState(String(annotation.frame_number))
  const [hov, setHov] = useState(false)

  const catColor = annotation.category?.color ?? '#9CA3AF'
  const isHighlighted = selected || active

  const saveLabel = () => {
    setEditingLabel(false)
    onUpdate(annotation.id, annotation.frame_number, label)
  }

  const saveFrame = () => {
    setEditingFrame(false)
    const f = Math.max(0, Math.min(totalFrames, parseInt(frameInput) || annotation.frame_number))
    setFrameInput(String(f))
    onUpdate(annotation.id, f, annotation.label)
  }

  return (
    <div
      ref={ref}
      data-testid="annotation-item"
      tabIndex={0}
      onClick={(e) => { e.currentTarget.focus(); onSelect?.(annotation.id) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer',
        background: selected ? 'var(--ac-muted)' : active ? `${catColor}14` : hov ? 'var(--elevated)' : 'transparent',
        borderLeft: `2px solid ${selected ? 'var(--ac)' : active ? catColor : 'transparent'}`,
        outline: selected ? '1px solid var(--border-ac)' : active ? `1px solid ${catColor}40` : 'none',
        transition: 'all 0.12s', minHeight: 36,
      }}
    >
      {/* Index */}
      <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-3)', width: 16, textAlign: 'right', flexShrink: 0 }}>
        {String(idx + 1).padStart(2, '0')}
      </span>

      {/* Category dot */}
      <span
        data-testid="category-badge"
        title={annotation.category?.name ?? 'Par défaut'}
        style={{ width: 6, height: 6, borderRadius: '50%', background: catColor, flexShrink: 0, display: 'inline-block' }}
      />

      {/* Timestamp + label column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 11.5,
          color: isHighlighted ? 'var(--fg)' : 'var(--text-2)',
          fontWeight: isHighlighted ? 600 : 400,
        }}>
          {frameToTimestamp(annotation.frame_number, fps)}
        </div>
        {editingLabel ? (
          <input
            value={label}
            autoFocus
            placeholder="label..."
            onChange={e => setLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') { setLabel(annotation.label); setEditingLabel(false) } }}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: '0.82rem', width: '100%' }}
          />
        ) : (
          <div
            onDoubleClick={() => setEditingLabel(true)}
            title="Double-clic pour modifier le label"
            style={{
              fontSize: 10, color: 'var(--text-3)',
              fontStyle: label ? 'normal' : 'italic',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {label || 'sans label'}
          </div>
        )}
      </div>

      {/* Frame number */}
      {editingFrame ? (
        <input
          value={frameInput}
          type="number"
          min={0}
          max={totalFrames}
          autoFocus
          onChange={e => setFrameInput(e.target.value)}
          onBlur={saveFrame}
          onKeyDown={e => {
            if (e.key === 'Enter') saveFrame()
            if (e.key === 'Escape') { setFrameInput(String(annotation.frame_number)); setEditingFrame(false) }
          }}
          style={{ width: '5ch', fontSize: '0.8rem', textAlign: 'center' }}
        />
      ) : (
        <span
          onClick={() => { onSelect?.(annotation.id); onSeek(annotation.frame_number) }}
          onDoubleClick={() => setEditingFrame(true)}
          title="Clic : aller à cette frame — Double-clic : modifier la frame"
          style={{ fontFamily: 'monospace', fontSize: 9.5, color: 'var(--text-3)', flexShrink: 0, cursor: 'pointer' }}
        >
          {annotation.frame_number}
        </span>
      )}

      {/* Delete button */}
      <button
        aria-label="Supprimer"
        onClick={e => { e.stopPropagation(); onDelete(annotation.id) }}
        title="Supprimer cette annotation"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-3)', padding: '2px 3px', borderRadius: 4,
          display: 'flex', flexShrink: 0, opacity: hov ? 1 : 0.25,
          transition: 'opacity 0.1s, color 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger-c)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        <Icon.Trash />
      </button>
    </div>
  )
})

AnnotationItem.displayName = 'AnnotationItem'
