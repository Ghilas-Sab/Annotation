import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useExportJobs } from '../../contexts/ExportJobsContext'
import { Icon, Spinner } from '../ui'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const AUTO_DISMISS_MS = 5000

function formatEta(s: number | null): string {
  if (s === null || s <= 0) return ''
  if (s < 60) return `~${Math.ceil(s)}s`
  return `~${Math.ceil(s / 60)}min`
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--text-3)',
  running: 'var(--ac)',
  done:    'var(--success-c, hsl(130 60% 55%))',
  error:   'var(--danger-c)',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  running: 'En cours',
  done:    'Terminé',
  error:   'Erreur',
}

const CountdownBar: React.FC<{ color: string; onExpire: () => void }> = ({ color, onExpire }) => {
  const [paused, setPaused] = useState(false)
  return (
    <div
      className="progress-track"
      style={{ marginTop: 8 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{
          height: '100%', background: color, borderRadius: 2, width: '100%',
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

type JobEntry = ReturnType<typeof useExportJobs>['jobs'][number]

function JobRow({ job, onDismiss, onDownload, onCancel, onSave, saving }: {
  job: JobEntry
  onDismiss: (id: string) => void
  onDownload: (id: string) => void
  onCancel: (id: string) => void
  onSave: (id: string) => void
  saving: boolean
}) {
  const isFinished = job.status === 'done' || job.status === 'error'
  const isActive = job.status === 'pending' || job.status === 'running'

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7, borderBottom: '1px solid var(--border-c)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
          background: STATUS_COLORS[job.status] ?? 'var(--text-3)',
          boxShadow: job.status === 'running' ? `0 0 6px ${STATUS_COLORS['running']}55` : 'none',
          animation: job.status === 'running' ? 'pulseGlow 1.5s ease infinite' : 'none',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.label}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: STATUS_COLORS[job.status] ?? 'var(--text-2)', fontWeight: 500 }}>
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
          </div>
          {job.status === 'error' && job.error && (
            <div style={{ fontSize: 10, color: 'var(--danger-c)', background: 'hsl(var(--danger)/0.1)', borderRadius: 4, padding: '2px 6px', marginTop: 3 }}>
              {job.error}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
          <span className={`badge ${job.type === 'preview' ? 'badge-adapted' : 'badge-primary'}`} style={{ fontSize: 9 }}>
            {job.type === 'preview' ? 'Preview' : 'Export'}
          </span>
          {isActive && (
            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger-c)', fontSize: 10 }} onClick={() => onCancel(job.job_id)}>
              Annuler
            </button>
          )}
          {isFinished && (
            <button className="btn btn-ghost btn-xs btn-icon" onClick={() => onDismiss(job.job_id)} aria-label="Fermer" title="Fermer">
              <Icon.X />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isActive && (
        <>
          <div className="progress-track">
            <div
              role="progressbar"
              aria-valuenow={job.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="progress-bar"
              style={{ width: `${job.progress}%`, background: job.type === 'preview' ? 'hsl(var(--chart-1))' : 'var(--ac)' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-2)' }}>
            <span>{job.progress}%</span>
            <span>{formatEta(job.estimated_remaining_s)}</span>
          </div>
        </>
      )}

      {/* Done progress (full) */}
      {job.status === 'done' && (
        <div className="progress-track">
          <div className="progress-bar progress-bar-success" style={{ width: '100%' }} />
        </div>
      )}

      {/* Actions — export done */}
      {job.status === 'done' && job.type === 'export' && (
        <div style={{ fontSize: 11, color: 'var(--success-c, hsl(130 60% 55%))' }}>Téléchargement démarré</div>
      )}

      {/* Actions — preview done */}
      {job.status === 'done' && job.type === 'preview' && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-xs" onClick={() => onDownload(job.job_id)}>
            <Icon.Download /> Télécharger
          </button>
          {!job.saved ? (
            <button className="btn btn-ghost btn-xs" onClick={() => onSave(job.job_id)} disabled={saving}>
              {saving ? '…' : 'Sauvegarder'}
            </button>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--success-c, hsl(130 60% 55%))' }}>✓ Sauvegardé</span>
          )}
          {job.videoId && job.projectId && (
            <Link
              to={`/projects/${job.projectId}#video-${job.videoId}`}
              style={{ fontSize: 11, color: 'var(--text-2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px' }}
            >
              Voir
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

const ExportJobsWidget: React.FC = () => {
  const { jobs, dismissJob, cancelJob, savePreviewJob } = useExportJobs()
  const [collapsed, setCollapsed] = useState(false)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
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
    try { await savePreviewJob(jobId) }
    finally { setSavingIds(prev => { const s = new Set(prev); s.delete(jobId); return s }) }
  }

  if (jobs.length === 0) return null

  const activeCount = jobs.filter(j => j.status === 'pending' || j.status === 'running').length

  const widgetStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', zIndex: 2000 }
    : { position: 'fixed', top: '1rem', right: '1rem', zIndex: 2000 }

  return (
    <>
      <style>{`
        @keyframes countdown-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @keyframes notif-rise { 0% { transform: translateY(0); opacity: 1; } 40% { transform: translateY(-10px); opacity: 0.85; } 100% { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div
        ref={widgetRef}
        data-testid="export-jobs-widget"
        style={{
          ...widgetStyle,
          width: 300,
          background: 'var(--card-bg)',
          border: '1px solid var(--border-c)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-xl, 0 8px 32px rgba(0,0,0,0.45))',
          overflow: 'hidden',
          fontFamily: 'inherit',
        }}
      >
        {/* Header — drag handle */}
        <div
          onMouseDown={onMouseDown}
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', cursor: 'grab', userSelect: 'none',
            borderBottom: collapsed ? 'none' : '1px solid var(--border-c)',
            background: 'var(--elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            {activeCount > 0 ? <Spinner size={14} /> : <Icon.Check />}
            <span style={{ fontSize: 12, fontWeight: 600 }}>Traitements</span>
            {activeCount > 0 && (
              <span style={{ background: 'var(--ac)', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 700, lineHeight: '1.5' }}>
                {activeCount}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{collapsed ? '▲' : '▼'}</span>
        </div>

        {/* Job list */}
        {!collapsed && (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {jobs.map(job => {
              const isFinished = job.status === 'done' || job.status === 'error'
              const barColor = job.status === 'error' ? 'var(--danger-c)' : 'var(--success-c, hsl(130 60% 55%))'
              const hasRisen = risenIds.has(job.job_id)
              return (
                <div
                  key={job.job_id}
                  style={{ animation: hasRisen ? 'notif-rise 0.5s ease-out' : undefined }}
                >
                  <JobRow
                    job={job}
                    onDismiss={dismissJob}
                    onDownload={handleDownload}
                    onCancel={cancelJob}
                    onSave={handleSave}
                    saving={savingIds.has(job.job_id)}
                  />
                  {isFinished && !hasRisen && (
                    <div style={{ padding: '0 12px 10px' }}>
                      <CountdownBar
                        key={`countdown-${job.job_id}`}
                        color={barColor}
                        onExpire={() => setRisenIds(prev => new Set(prev).add(job.job_id))}
                      />
                    </div>
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
