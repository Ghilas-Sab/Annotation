import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useExportJobs } from '../../contexts/ExportJobsContext'

function formatEta(s: number | null): string {
  if (s === null || s <= 0) return ''
  if (s < 60) return `~${Math.ceil(s)}s`
  return `~${Math.ceil(s / 60)}min`
}

const statusIcon: Record<string, string> = {
  pending: '⏳',
  running: '⚙️',
  done: '✅',
  error: '❌',
}

const ExportJobsWidget: React.FC = () => {
  const { jobs, dismissJob, cancelJob } = useExportJobs()
  const [collapsed, setCollapsed] = useState(false)

  // Draggable state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from header
    dragging.current = true
    const rect = widgetRef.current!.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  if (jobs.length === 0) return null

  const activeCount = jobs.filter(j => j.status === 'pending' || j.status === 'running').length

  const style: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', zIndex: 2000 }
    : { position: 'fixed', top: '1rem', right: '1rem', zIndex: 2000 }

  return (
    <div
      ref={widgetRef}
      data-testid="export-jobs-widget"
      style={{
        ...style,
        width: 320,
        background: 'var(--color-panel, #13132a)',
        border: '1px solid var(--color-border, #2a2a4a)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Header — drag handle */}
      <div
        onMouseDown={onMouseDown}
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.65rem 0.9rem',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border, #2a2a4a)',
          cursor: 'grab',
          userSelect: 'none',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text, #cdd6f4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Exports
          </span>
          {activeCount > 0 && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 700,
              background: 'var(--color-accent, #e94560)',
              color: '#fff', borderRadius: 10,
              padding: '0 5px', lineHeight: '16px',
            }}>
              {activeCount}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #8892b0)' }}>
          {collapsed ? '▲' : '▼'}
        </span>
      </div>

      {/* Job list */}
      {!collapsed && (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {jobs.map(job => (
            <div
              key={job.job_id}
              style={{
                padding: '0.75rem 0.9rem',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {/* Nom + état + actions */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text, #cdd6f4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {statusIcon[job.status]} {job.label}
                  </div>
                  {job.status === 'error' && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-danger, #ff6b6b)', marginTop: 2 }}>
                      {job.error}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  {(job.status === 'pending' || job.status === 'running') && (
                    <button
                      onClick={() => cancelJob(job.job_id)}
                      aria-label="Annuler"
                      title="Annuler"
                      style={{ background: 'transparent', border: '1px solid rgba(255,107,107,0.4)', color: 'var(--color-danger, #ff6b6b)', cursor: 'pointer', fontSize: '0.72rem', padding: '1px 6px', borderRadius: 4 }}
                    >
                      Annuler
                    </button>
                  )}
                  {(job.status === 'done' || job.status === 'error') && (
                    <button
                      onClick={() => dismissJob(job.job_id)}
                      aria-label="Fermer"
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted, #8892b0)', cursor: 'pointer', fontSize: '0.9rem', padding: '0 2px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Barre de progression */}
              {(job.status === 'pending' || job.status === 'running') && (
                <>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: '0.3rem' }}>
                    <div
                      role="progressbar"
                      aria-valuenow={job.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{
                        height: '100%',
                        width: `${job.progress}%`,
                        background: 'var(--color-accent, #e94560)',
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted, #8892b0)' }}>
                    <span>{job.progress}%</span>
                    <span>{formatEta(job.estimated_remaining_s)}</span>
                  </div>
                </>
              )}

              {job.status === 'done' && (
                <div style={{ fontSize: '0.72rem', color: '#64ffda', marginTop: 2 }}>
                  Téléchargement démarré
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExportJobsWidget
