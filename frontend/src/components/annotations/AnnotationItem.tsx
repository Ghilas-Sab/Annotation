import { forwardRef, useState } from 'react'
import { Annotation } from '../../types/annotation'
import { frameToTimestamp } from '../../utils/frameUtils'

interface AnnotationItemProps {
  annotation: Annotation
  fps: number
  totalFrames: number
  active?: boolean
  selected?: boolean
  onSeek: (frame: number) => void
  onSelect?: (id: string) => void
  onUpdate: (id: string, frame: number, label: string) => void
  onDelete: (id: string) => void
}

export const AnnotationItem = forwardRef<HTMLDivElement, AnnotationItemProps>(({
  annotation, fps, totalFrames, active = false, selected = false, onSeek, onSelect, onUpdate, onDelete,
}, ref) => {
  const [editingLabel, setEditingLabel] = useState(false)
  const [editingFrame, setEditingFrame] = useState(false)
  const [label, setLabel] = useState(annotation.label)
  const [frameInput, setFrameInput] = useState(String(annotation.frame_number))

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

  const badgeColor = annotation.category?.color ?? '#9CA3AF'

  return (
    <div
      ref={ref}
      data-testid="annotation-item"
      tabIndex={0}
      onClick={(e) => {
        e.currentTarget.focus()
        onSelect?.(annotation.id)
      }}
      onKeyDown={(e) => {
        const tag = (e.target as HTMLElement).tagName
        if (editingFrame || editingLabel || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.6rem',
        borderBottom: '1px solid var(--color-surface, #2a2a3e)',
        fontSize: '0.82rem',
        background: selected ? 'var(--ac-muted)' : active ? 'hsl(var(--accent) / 0.08)' : 'transparent',
        outline: selected ? '1px solid var(--border-ac)' : active ? '1px solid hsl(var(--accent) / 0.25)' : 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          color: active ? 'var(--ac)' : 'transparent',
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        ▶
      </span>
      {/* Badge catégorie */}
      <span
        data-testid="category-badge"
        title={annotation.category?.name ?? 'Par défaut'}
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: badgeColor,
          flexShrink: 0,
        }}
      />
      {/* Frame number — cliquable pour seek, double-clic pour éditer */}
      {editingFrame ? (
        <input
          value={frameInput}
          type="number"
          min={0}
          max={totalFrames}
          autoFocus
          onChange={e => setFrameInput(e.target.value)}
          onBlur={saveFrame}
          onKeyDown={e => { if (e.key === 'Enter') saveFrame(); if (e.key === 'Escape') { setFrameInput(String(annotation.frame_number)); setEditingFrame(false) } }}
          style={{ width: '5ch', fontSize: '0.8rem', textAlign: 'center' }}
        />
      ) : (
        <span
          onClick={() => {
            onSelect?.(annotation.id)
            onSeek(annotation.frame_number)
          }}
          onDoubleClick={() => setEditingFrame(true)}
          title="Clic : aller à cette frame — Double-clic : modifier la frame"
          style={{ minWidth: '4ch', color: 'var(--color-accent, #e94560)', cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}
        >
          {annotation.frame_number}
        </span>
      )}

      {/* Timestamp */}
      <span style={{ minWidth: '7ch', color: 'var(--color-text-muted, #888)', fontSize: '0.72rem' }}>
        {frameToTimestamp(annotation.frame_number, fps)}
      </span>

      {/* Label — double-clic pour éditer */}
      {editingLabel ? (
        <input
          value={label}
          autoFocus
          placeholder="label..."
          onChange={e => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={e => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') { setLabel(annotation.label); setEditingLabel(false) } }}
          onClick={e => e.stopPropagation()}
          style={{ flex: 1, fontSize: '0.82rem' }}
        />
      ) : (
        <span
          onDoubleClick={() => setEditingLabel(true)}
          title="Double-clic pour modifier le label"
          style={{
            flex: 1,
            color: label ? 'var(--color-text, #e0e0e0)' : 'var(--color-text-muted, #888)',
            fontStyle: label ? 'normal' : 'italic',
            cursor: 'text',
            minWidth: '3ch',
            padding: '2px 4px',
            borderRadius: 3,
            border: '1px solid transparent',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
        >
          {label || 'sans label'}
        </span>
      )}

      {/* Bouton supprimer */}
      <button
        aria-label="Supprimer"
        onClick={e => { e.stopPropagation(); onDelete(annotation.id) }}
        title="Supprimer cette annotation"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger, #e94560)', fontSize: '0.9rem', lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}
      >
        🗑
      </button>
    </div>
  )
})

AnnotationItem.displayName = 'AnnotationItem'
