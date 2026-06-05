import React, { useEffect, useMemo, useRef } from 'react'
import { Annotation } from '../../types/annotation'
import { AnnotationItem } from './AnnotationItem'

interface AnnotationListProps {
  annotations: Annotation[]
  fps: number
  totalFrames: number
  currentFrame?: number
  selectedAnnotationId?: string | null
  onSeek: (frame: number) => void
  onSelect?: (id: string) => void
  onUpdate: (id: string, frame: number, label: string) => void
  onDelete: (id: string) => void
  onClearAll?: () => void
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations, fps, totalFrames, currentFrame, selectedAnnotationId, onSeek, onSelect, onUpdate, onDelete, onClearAll,
}) => {
  const sorted = useMemo(() => [...annotations].sort((a, b) => a.frame_number - b.frame_number), [annotations])
  const activeAnnotationId = currentFrame == null
    ? null
    : sorted.find(ann => ann.frame_number === currentFrame)?.id ?? null
  const activeItemRef = useRef<HTMLDivElement | null>(null)
  const lastAutoScrolledIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeAnnotationId || lastAutoScrolledIdRef.current === activeAnnotationId) return
    if (typeof activeItemRef.current?.scrollIntoView === 'function') {
      activeItemRef.current.scrollIntoView({ block: 'nearest' })
    }
    lastAutoScrolledIdRef.current = activeAnnotationId
  }, [activeAnnotationId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {sorted.length === 0 ? (
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
            Aucune annotation — appuie sur <kbd>Espace</kbd> pour en créer
          </p>
        ) : (
          sorted.map((ann, idx) => (
            <AnnotationItem
              key={ann.id}
              ref={ann.id === activeAnnotationId ? activeItemRef : undefined}
              annotation={ann}
              fps={fps}
              totalFrames={totalFrames}
              idx={idx}
              active={ann.id === activeAnnotationId}
              selected={selectedAnnotationId === ann.id}
              onSeek={onSeek}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {onClearAll && sorted.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-c)', flexShrink: 0 }}>
          <button
            style={{ background: 'transparent', border: 'none', fontSize: 11.5, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s', padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger-c)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            onClick={() => { if (confirm('Supprimer toutes les annotations ?')) onClearAll() }}
          >
            Supprimer toutes les annotations
          </button>
        </div>
      )}
    </div>
  )
}
