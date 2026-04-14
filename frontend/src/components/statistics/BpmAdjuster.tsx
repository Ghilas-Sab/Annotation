import { useState } from 'react'
import { usePlaybackSpeed } from '../../api/statistics'

interface BpmAdjusterProps {
  videoId: string
  currentBpm: number
  onSpeedChange: (speed: number) => void
}

export default function BpmAdjuster({ videoId, currentBpm, onSpeedChange }: BpmAdjusterProps) {
  const [targetBpm, setTargetBpm] = useState('')
  const [validationError, setValidationError] = useState('')
  const { mutate, data, isPending } = usePlaybackSpeed(videoId)

  const handleSubmit = () => {
    const bpm = parseFloat(targetBpm)
    if (!targetBpm || isNaN(bpm) || bpm <= 0) {
      setValidationError('Le BPM doit être strictement positif')
      return
    }
    setValidationError('')
    mutate(bpm, {
      onSuccess: (result) => {
        onSpeedChange(result.playback_speed)
      },
    })
  }

  return (
    <div>
      <h3 style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--color-text-secondary, #aaa)' }}>
        Ajustement vitesse de lecture
      </h3>
      {currentBpm > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #aaa)', marginBottom: '0.5rem' }}>
          BPM courant : {currentBpm.toFixed(1)}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label
            htmlFor="target-bpm"
            style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem', color: 'var(--color-text-secondary, #aaa)' }}
          >
            BPM cible
          </label>
          <input
            id="target-bpm"
            type="number"
            value={targetBpm}
            onChange={(e) => setTargetBpm(e.target.value)}
            min="0.1"
            step="1"
            placeholder="ex: 120"
            style={{ width: '100px', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--color-border, #444)', background: 'var(--color-bg-input, #0f0f23)', color: 'inherit' }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="btn-primary"
          style={{ padding: '0.4rem 1rem' }}
        >
          {isPending ? 'Calcul…' : 'Calculer'}
        </button>
      </div>

      {validationError && (
        <p style={{ color: '#e94560', fontSize: '0.8rem', marginTop: '0.4rem' }}>{validationError}</p>
      )}

      {data && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-panel, #1a1a2e)', borderRadius: '6px' }}>
          <p style={{ fontSize: '1.1rem', fontFamily: 'monospace', margin: 0 }}>
            Vitesse : <strong>×{data.playback_speed.toFixed(2)}</strong>
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #aaa)', marginTop: '0.3rem' }}>
            {data.current_bpm.toFixed(1)} BPM → {data.target_bpm.toFixed(1)} BPM
          </p>
        </div>
      )}
    </div>
  )
}
