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
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations, fps, totalFrames, currentFrame, selectedAnnotationId, onSeek, onSelect, onUpdate, onDelete,
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
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {sorted.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted, #888)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
          Aucune annotation — appuie sur <kbd>Espace</kbd> pour en créer
        </p>
      ) : (
        sorted.map(ann => (
          <AnnotationItem
            key={ann.id}
            ref={ann.id === activeAnnotationId ? activeItemRef : undefined}
            annotation={ann}
            fps={fps}
            totalFrames={totalFrames}
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
  )
}
