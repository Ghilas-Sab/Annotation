import React, { useState } from 'react'

interface ShiftFormProps {
  onShift: (frames: number) => void
  isPending: boolean
  isError: boolean
}

const ShiftForm: React.FC<ShiftFormProps> = ({ onShift, isPending, isError }) => {
  const [value, setValue] = useState('')

  const frames = parseInt(value)
  const isValid = !isNaN(frames) && frames !== 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    onShift(frames)
    setValue('')
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--color-panel)',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        border: '1px solid var(--color-surface)',
        margin: '0',
      }}
    >
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--color-text)', margin: '0 0 0.75rem 0' }}>
        Décaler toutes les annotations
      </h3>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label htmlFor="shift-frames" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>
            Décalage en frames
          </label>
          <input
            id="shift-frames"
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="ex: 5 ou -3"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Positif = avancer · Négatif = reculer
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!isValid || isPending}
        >
          {isPending ? 'Décalage...' : `Décaler de ${isValid ? (frames > 0 ? '+' : '') + frames : '…'} frames`}
        </button>

        {isError && (
          <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', margin: 0 }}>
            Erreur lors du décalage.
          </p>
        )}
      </form>
    </div>
  )
}

export default ShiftForm
