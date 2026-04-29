import React, { useState } from 'react'
import { useExportJobs } from '../../contexts/ExportJobsContext'
import { createPreviewJob } from '../../api/exports'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface TestState {
  status?: 'idle' | 'creating' | 'running' | 'done' | 'error'
  jobId?: string | null
  progress?: number
  estimatedRemaining?: number | null
  previewUrl?: string | null
  error?: string | null
}

interface PreviewPanelProps {
  videoId: string
  currentBpm: number
  annotationCount: number
  onClose?: () => void
  onCreateJob?: (videoId: string, targetBpm: number) => Promise<string>
  onSave?: (videoId: string, jobId: string) => Promise<void>
  onCancel?: (jobId: string) => void
  _testState?: TestState
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  videoId, currentBpm, annotationCount, onClose, onCreateJob, onSave, onCancel, _testState,
}) => {
  const [targetBpm, setTargetBpm] = useState(currentBpm)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const { jobs, startPreviewJob, savePreviewJob, cancelJob } = useExportJobs()

  // Trouver le job preview le plus récent pour cette vidéo
  const previewJobs = jobs.filter(j => j.type === 'preview' && j.videoId === videoId)
  const contextJob = previewJobs.length > 0 ? previewJobs[previewJobs.length - 1] : undefined

  // _testState permet d'injecter un état pour les tests sans dépendre du context
  const status = _testState?.status ?? (
    launching ? 'creating'
    : contextJob?.status === 'pending' ? 'running'
    : (contextJob?.status as 'running' | 'done' | 'error' | undefined)
    ?? 'idle'
  )
  const jobId = _testState?.jobId !== undefined ? _testState.jobId : (contextJob?.job_id ?? null)
  const progress = _testState?.progress ?? contextJob?.progress ?? 0
  const estimatedRemaining = _testState?.estimatedRemaining !== undefined
    ? _testState.estimatedRemaining
    : contextJob?.estimated_remaining_s ?? null
  const previewUrl = _testState?.previewUrl !== undefined
    ? _testState.previewUrl
    : contextJob?.previewUrl ?? null
  const error = _testState?.error ?? contextJob?.error ?? null

  const canPreview = annotationCount >= 2 && targetBpm > 0
  const isActive = status === 'creating' || status === 'running'

  const handleClose = () => {
    if (isActive) {
      const shouldClose = window.confirm('Annuler le job en cours ?')
      if (!shouldClose) return
      handleCancel()
    }
    onClose?.()
  }

  const handlePreview = async () => {
    setLaunchError(null)
    setLaunching(true)
    try {
      const createFn = onCreateJob ?? createPreviewJob
      const newJobId = await createFn(videoId, targetBpm)
      if (!onCreateJob) {
        startPreviewJob(videoId, newJobId, `Prévisualisation ${targetBpm} BPM`, targetBpm)
      }
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : 'Erreur lors du lancement')
    } finally {
      setLaunching(false)
    }
  }

  const handleCancel = () => {
    if (onCancel && jobId) { onCancel(jobId); return }
    if (jobId) cancelJob(jobId)
  }

  const handleSave = async () => {
    if (!jobId) return
    if (onSave) { await onSave(videoId, jobId); return }
    await savePreviewJob(jobId)
  }

  const handleDownload = () => {
    if (!jobId) return
    const a = document.createElement('a')
    a.href = `${API_BASE}/exports/jobs/${jobId}/download`
    a.download = 'preview.mp4'
    a.click()
  }

  return (
    <div data-testid="bpm-preview-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text, #cdd6f4)' }}>
          Prévisualisation BPM
        </h3>
        {onClose && (
          <button
            onClick={handleClose}
            style={{
              padding: '0.28rem 0.75rem', fontSize: '0.78rem', borderRadius: 5,
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)',
              color: 'var(--color-text-muted, #8892b0)', cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label htmlFor="preview-target-bpm" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #8892b0)' }}>
          BPM de prévisualisation
        </label>
        <input
          id="preview-target-bpm"
          type="number"
          min={1}
          value={targetBpm}
          onChange={e => setTargetBpm(Number(e.target.value))}
          disabled={isActive}
          style={{
            width: 80, padding: '0.3rem 0.5rem', fontSize: '0.85rem',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5, color: 'var(--color-text, #cdd6f4)', textAlign: 'center',
          }}
        />
        <button
          onClick={handlePreview}
          disabled={!canPreview || isActive}
          style={{
            padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: 6,
            border: '1px solid var(--color-accent, #7aa2f7)',
            background: canPreview && !isActive ? 'rgba(122,162,247,0.12)' : 'transparent',
            color: canPreview && !isActive ? '#7aa2f7' : 'var(--color-text-muted, #888)',
            cursor: canPreview && !isActive ? 'pointer' : 'not-allowed',
          }}
        >
          Prévisualiser
        </button>
        {!canPreview && annotationCount < 2 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #8892b0)' }}>
            (min. 2 annotations)
          </span>
        )}
      </div>

      {launchError && (
        <div role="alert" style={{ fontSize: '0.82rem', color: 'var(--color-danger, #ff6b6b)' }}>
          {launchError}
        </div>
      )}

      {isActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <progress
            role="progressbar"
            value={progress}
            max={100}
            style={{ width: '100%', height: 6, accentColor: '#7aa2f7' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #8892b0)' }}>
              {progress}% — génération en arrière-plan
              {estimatedRemaining != null && estimatedRemaining > 0 && ` (~${Math.ceil(estimatedRemaining)}s restant)`}
            </span>
            <button
              onClick={handleCancel}
              style={{
                padding: '0.25rem 0.65rem', fontSize: '0.78rem', borderRadius: 5,
                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)',
                color: 'var(--color-text-muted, #8892b0)', cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #8892b0)', fontStyle: 'italic' }}>
            Vous pouvez naviguer — le traitement continue et vous recevrez une notification.
          </div>
        </div>
      )}

      {status === 'done' && previewUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <video
            data-testid="preview-player"
            src={previewUrl}
            controls
            autoPlay
            style={{ width: '100%', borderRadius: 6, maxHeight: 360, background: '#000' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleDownload}
              style={{
                padding: '0.4rem 0.9rem', fontSize: '0.82rem', borderRadius: 5,
                border: '1px solid rgba(100,255,218,0.3)', background: 'rgba(100,255,218,0.06)',
                color: '#64ffda', cursor: 'pointer',
              }}
            >
              Télécharger cette version
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '0.4rem 0.9rem', fontSize: '0.82rem', borderRadius: 5,
                border: '1px solid var(--color-accent, #e94560)', background: 'rgba(233,69,96,0.08)',
                color: 'var(--color-accent, #e94560)', cursor: 'pointer',
              }}
            >
              Sauvegarder pour le projet
            </button>
          </div>
          {contextJob?.saved && (
            <span style={{ fontSize: '0.78rem', color: '#64ffda' }}>✓ Sauvegardée pour l'export projet</span>
          )}
        </div>
      )}

      {status === 'error' && (
        <div role="alert" style={{
          padding: '0.65rem 0.9rem', borderRadius: 6,
          background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
          fontSize: '0.82rem', color: 'var(--color-danger, #ff6b6b)',
        }}>
          {error ?? 'Erreur lors de la génération'}
        </div>
      )}
    </div>
  )
}

export default PreviewPanel
