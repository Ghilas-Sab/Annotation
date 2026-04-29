import React from 'react'
import { Annotation } from '../../types/annotation'
import { AnnotationItem } from './AnnotationItem'

interface AnnotationListProps {
  annotations: Annotation[]
  fps: number
  totalFrames: number
  selectedAnnotationId?: string | null
  onSeek: (frame: number) => void
  onSelect?: (id: string) => void
  onUpdate: (id: string, frame: number, label: string) => void
  onDelete: (id: string) => void
}

export const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations, fps, totalFrames, selectedAnnotationId, onSeek, onSelect, onUpdate, onDelete,
}) => {
  const sorted = [...annotations].sort((a, b) => a.frame_number - b.frame_number)

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {sorted.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted, #888)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
          Aucune annotation — appuie sur <kbd>Entrée</kbd> pour en créer
        </p>
      ) : (
        sorted.map(ann => (
          <AnnotationItem
            key={ann.id}
            annotation={ann}
            fps={fps}
            totalFrames={totalFrames}
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
