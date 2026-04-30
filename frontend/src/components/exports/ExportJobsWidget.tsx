import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useExportJobs } from '../../contexts/ExportJobsContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const AUTO_DISMISS_MS = 5000

function formatEta(s: number | null): string {
  if (s === null || s <= 0) return ''
  if (s < 60) return `~${Math.ceil(s)}s`
  return `~${Math.ceil(s / 60)}min`
}

// Barre de décompte avec animation CSS — démarre dès l'apparition, auto-dismiss à la fin
const CountdownBar: React.FC<{ color: string; onExpire: () => void }> = ({ color, onExpire }) => {
  const [paused, setPaused] = useState(false)
  return (
    <div
      style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginTop: '0.55rem', overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{
          height: '100%',
          background: color,
          borderRadius: 2,
          width: '100%',
          transformOrigin: 'left center',
          animationName: 'countdown-shrink',
          animationDuration: `${AUTO_DISMISS_MS}ms`,
          animationTimingFunction: 'linear',
          animationFillMode: 'forwards',
          animationPlayState: paused ? 'paused' : 'running',
        }}
        onAnimationEnd={onExpire}
      />
    </div>
  )
}

const ExportJobsWidget: React.FC = () => {
  const { jobs, dismissJob, cancelJob, savePreviewJob } = useExportJobs()
  const [collapsed, setCollapsed] = useState(false)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  // IDs des jobs dont le décompte est terminé → animation "montée"
  const [risenIds, setRisenIds] = useState<Set<string>>(new Set())

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
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

  const handleDownload = (jobId: string) => {
    const a = document.createElement('a')
    a.href = `${API_BASE}/exports/jobs/${jobId}/download`
    a.download = 'preview.mp4'
    a.click()
  }

  const handleSave = async (jobId: string) => {
    setSavingIds(prev => new Set(prev).add(jobId))
    try {
      await savePreviewJob(jobId)
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(jobId); return s })
    }
  }

  if (jobs.length === 0) return null

  const activeCount = jobs.filter(j => j.status === 'pending' || j.status === 'running').length

  const widgetStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', zIndex: 2000 }
    : { position: 'fixed', top: '1rem', right: '1rem', zIndex: 2000 }

  return (
    <>
      <style>{`
        @keyframes countdown-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
        @keyframes notif-rise {
          0%   { transform: translateY(0);    opacity: 1; }
          40%  { transform: translateY(-10px); opacity: 0.85; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div
        ref={widgetRef}
        data-testid="export-jobs-widget"
        style={{
          ...widgetStyle,
          width: 320,
          background: 'var(--color-panel, #13132a)',
          border: '1px solid var(--color-border, #2a2a4a)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          fontFamily: 'inherit',
        }}
      >
        {/* Header */}
        <div
          onMouseDown={onMouseDown}
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.65rem 0.9rem',
            borderBottom: collapsed ? 'none' : '1px solid var(--color-border, #2a2a4a)',
            cursor: 'grab', userSelect: 'none',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text, #cdd6f4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Traitements
            </span>
            {activeCount > 0 && (
              <span style={{
                fontSize: '0.7rem', fontWeight: 700,
                background: 'var(--color-accent, #e94560)',
                color: '#fff', borderRadius: 10, padding: '0 5px', lineHeight: '16px',
              }}>
                {activeCount}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #8892b0)' }}>
            {collapsed ? '▲' : '▼'}
          </span>
        </div>

        {!collapsed && (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {jobs.map(job => {
              const isFinished = job.status === 'done' || job.status === 'error'
              const barColor = job.status === 'error' ? 'var(--color-danger, #ff6b6b)' : '#64ffda'
              const hasRisen = risenIds.has(job.job_id)

              return (
                <div
                  key={job.job_id}
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    animation: hasRisen ? 'notif-rise 0.5s ease-out' : undefined,
                  }}
                >
                  {/* Ligne titre + bouton fermer */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text, #cdd6f4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.status === 'done' ? '✅' : job.status === 'error' ? '❌' : '⚙️'}{' '}
                        {job.label}
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
                          title="Annuler"
                          style={{ background: 'transparent', border: '1px solid rgba(255,107,107,0.4)', color: 'var(--color-danger, #ff6b6b)', cursor: 'pointer', fontSize: '0.72rem', padding: '1px 6px', borderRadius: 4 }}
                        >
                          Annuler
                        </button>
                      )}
                      {isFinished && (
                        <button
                          onClick={() => dismissJob(job.job_id)}
                          title="Fermer"
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted, #8892b0)', cursor: 'pointer', fontSize: '0.9rem', padding: '0 2px' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Barre de progression du job en cours */}
                  {(job.status === 'pending' || job.status === 'running') && (
                    <>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: '0.3rem' }}>
                        <div
                          role="progressbar"
                          aria-valuenow={job.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          style={{
                            height: '100%', width: `${job.progress}%`,
                            background: job.type === 'preview' ? '#7aa2f7' : 'var(--color-accent, #e94560)',
                            borderRadius: 2, transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted, #8892b0)' }}>
                        <span>{job.progress}%</span>
                        <span>{formatEta(job.estimated_remaining_s)}</span>
                      </div>
                    </>
                  )}

                  {/* Actions export terminé */}
                  {job.status === 'done' && job.type === 'export' && (
                    <div style={{ fontSize: '0.72rem', color: '#64ffda', marginTop: 2 }}>
                      Téléchargement démarré
                    </div>
                  )}

                  {/* Actions preview terminée */}
                  {job.status === 'done' && job.type === 'preview' && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleDownload(job.job_id)}
                        style={{
                          fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 4,
                          border: '1px solid rgba(100,255,218,0.4)', background: 'rgba(100,255,218,0.06)',
                          color: '#64ffda', cursor: 'pointer',
                        }}
                      >
                        Télécharger
                      </button>
                      {!job.saved ? (
                        <button
                          onClick={() => handleSave(job.job_id)}
                          disabled={savingIds.has(job.job_id)}
                          style={{
                            fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 4,
                            border: '1px solid rgba(233,69,96,0.4)', background: 'rgba(233,69,96,0.06)',
                            color: 'var(--color-accent, #e94560)', cursor: 'pointer',
                          }}
                        >
                          {savingIds.has(job.job_id) ? '…' : 'Sauvegarder'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#64ffda' }}>✓ Sauvegardé</span>
                      )}
                      {job.videoId && job.projectId && (
                        <Link
                          to={`/projects/${job.projectId}#video-${job.videoId}`}
                          style={{
                            fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 4,
                            border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                            color: 'var(--color-text-muted, #8892b0)', textDecoration: 'none',
                            display: 'inline-block',
                          }}
                        >
                          Voir
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Barre de décompte — anime la notif vers le haut après 5s, sans la supprimer */}
                  {isFinished && !hasRisen && (
                    <CountdownBar
                      key={`countdown-${job.job_id}`}
                      color={barColor}
                      onExpire={() =>
                        setRisenIds((prev) => new Set(prev).add(job.job_id))
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export default ExportJobsWidget
