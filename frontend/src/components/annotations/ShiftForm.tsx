import React, { useState } from 'react'
import { Icon, Spinner } from '../ui'

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
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
        Décaler toutes les annotations
      </div>

      <div style={{
        background: 'hsl(var(--warning, 38 90% 52%) / 0.1)', border: '1px solid hsl(var(--warning, 38 90% 52%) / 0.3)',
        borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Icon.AlertTriangle />
        <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
          Les valeurs <strong style={{ color: 'var(--warn-c, hsl(38 90% 52%))' }}>positives</strong> avancent les annotations.{' '}
          Les valeurs <strong style={{ color: 'var(--warn-c, hsl(38 90% 52%))' }}>négatives</strong> les reculent.
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label htmlFor="shift-frames" style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
            Décalage en frames
          </label>
          <input
            id="shift-frames"
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="ex: 5 ou -3"
            className="input"
            style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isValid || isPending}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {isPending && <Spinner size={14} />}
          {isPending ? 'Décalage...' : `Décaler de ${isValid ? (frames > 0 ? '+' : '') + frames : '…'} frames`}
        </button>

        {isError && (
          <p style={{ color: 'var(--danger-c)', fontSize: '0.8rem', margin: 0 }}>
            Erreur lors du décalage.
          </p>
        )}
      </form>
    </div>
  )
}

export default ShiftForm
