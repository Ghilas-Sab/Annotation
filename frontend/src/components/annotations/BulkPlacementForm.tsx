import React, { useState } from 'react'
import { useCreateBulkAnnotations } from '../../api/annotations'

interface BulkPlacementFormProps {
  videoId: string
  totalFrames: number
  fps: number
}

const BulkPlacementForm: React.FC<BulkPlacementFormProps> = ({ videoId, totalFrames, fps }) => {
  const [startFrame, setStartFrame] = useState(0)
  const [endFrame, setEndFrame] = useState(totalFrames)
  const [count, setCount] = useState(4)
  const [prefix, setPrefix] = useState('beat')

  const bulkMutation = useCreateBulkAnnotations(videoId)

  const interval = count >= 2 ? (endFrame - startFrame) / (count - 1) : 0
  const intervalSeconds = interval / fps

  const isValid = 
    startFrame >= 0 && 
    endFrame > startFrame && 
    endFrame <= totalFrames && 
    count >= 2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    
    try {
      await bulkMutation.mutateAsync({
        start_frame: startFrame,
        end_frame: endFrame,
        count: count,
        prefix: prefix
      })
      // Reset ou notification de succès
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div 
      className="bulk-form"
      style={{
        backgroundColor: 'var(--color-panel)',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid var(--color-surface)'
      }}
    >
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
        Placement Automatique
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label htmlFor="start-frame" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Début (frame)</label>
            <input
              id="start-frame"
              type="number"
              value={startFrame}
              onChange={(e) => setStartFrame(Number(e.target.value))}
              min={0}
              max={totalFrames}
            />
          </div>
          <div>
            <label htmlFor="end-frame" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Fin (frame)</label>
            <input
              id="end-frame"
              type="number"
              value={endFrame}
              onChange={(e) => setEndFrame(Number(e.target.value))}
              min={0}
              max={totalFrames}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label htmlFor="count" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Nombre d'annotations</label>
            <input
              id="count"
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={2}
            />
          </div>
          <div>
            <label htmlFor="prefix" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Préfixe label</label>
            <input
              id="prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="ex: beat"
            />
          </div>
        </div>

        <div 
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            padding: '0.75rem', 
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: 'var(--color-accent2)'
          }}
        >
          <strong>Aperçu :</strong> {count} annotations avec un intervalle de {interval.toFixed(1)} frames ({intervalSeconds.toFixed(3)}s)
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!isValid || bulkMutation.isPending}
          style={{ marginTop: '0.5rem' }}
        >
          {bulkMutation.isPending ? 'Placement...' : 'Placer les annotations →'}
        </button>

        {bulkMutation.isError && (
          <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', margin: 0 }}>
            Erreur lors du placement automatique.
          </p>
        )}
      </form>
    </div>
  )
}

export default BulkPlacementForm
