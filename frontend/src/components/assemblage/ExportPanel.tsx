import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { AssemblageClip, AudioTrack } from '../../stores/assemblageStore'
import { startAssemblageExport, getAssemblageDownloadUrl } from '../../api/assemblage'
import { getJobStatus, type JobStatus } from '../../api/exports'

interface ExportPanelProps {
  clips: AssemblageClip[]
  audioTracks: AudioTrack[]
  onClose: () => void
}

const RESOLUTION_OPTIONS = [
  { value: '720p',     label: '720p HD' },
  { value: '1080p',    label: '1080p Full HD' },
  { value: 'Original', label: 'Original' },
] as const

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const panel: React.CSSProperties = {
  background: 'var(--color-panel, #13132a)',
  border: '1px solid var(--color-border, #2a2a4a)',
  borderRadius: 10,
  padding: '1.75rem',
  width: 480,
  maxWidth: '95vw',
  maxHeight: '90vh',
  overflowY: 'auto',
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted, #8892b0)',
  display: 'block',
  marginBottom: '0.85rem',
}

const divider: React.CSSProperties = {
  height: 1,
  background: 'var(--color-border, #2a2a4a)',
  margin: '1.1rem 0',
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 1rem',
  borderRadius: 7,
  border: 'none',
  background: 'var(--color-accent, #e94560)',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: '0.03em',
}

const secondaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 1rem',
  borderRadius: 7,
  border: '1px solid var(--color-border, #2a2a4a)',
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--color-text, #cdd6f4)',
  fontSize: '0.88rem',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: '0.55rem',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.65rem',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.3)',
  color: 'var(--color-text, #cdd6f4)',
  fontSize: '0.88rem',
  outline: 'none',
}

const progressTrack: React.CSSProperties = {
  width: '100%',
  height: 8,
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 4,
  overflow: 'hidden',
  margin: '0.75rem 0',
}

const POLL_INTERVAL_MS = 1200

export default function ExportPanel({ clips, audioTracks, onClose }: ExportPanelProps) {
  const [resolution, setResolution] = useState<string>('720p')
  const [includeMusic, setIncludeMusic] = useState(audioTracks.length > 0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const [audioPreview, setAudioPreview] = useState<{ name: string; size: number } | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Garder includeMusic synchronisé si l'utilisateur ajoute des pistes après ouverture
  useEffect(() => {
    if (audioTracks.length > 0 && !jobId) {
      setIncludeMusic(true)
    }
  }, [audioTracks.length, jobId])

  // Précharger le blob audio dès qu'on coche "Inclure la musique" → feedback immédiat
  useEffect(() => {
    if (!includeMusic || audioTracks.length === 0 || jobId) {
      setAudioPreview(null)
      setAudioError(null)
      return
    }
    let cancelled = false
    const track = audioTracks[0]
    fetch(track.url)
      .then((r) => r.blob())
      .then((b) => {
        if (cancelled) return
        setAudioPreview({ name: track.name, size: b.size })
        setAudioError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setAudioError(e instanceof Error ? e.message : 'Audio illisible')
        setAudioPreview(null)
      })
    return () => { cancelled = true }
  }, [includeMusic, audioTracks, jobId])

  const stopPoll = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPoll(), [stopPoll])

  const startPoll = useCallback((id: string) => {
    stopPoll()
    const tick = async () => {
      try {
        const s = await getJobStatus(id)
        setJobStatus(s)
        if (s.status === 'done' || s.status === 'error' || s.status === 'cancelled') {
          stopPoll()
          return
        }
      } catch {
        stopPoll()
        return
      }
      pollRef.current = setInterval(async () => {
        try {
          const s = await getJobStatus(id)
          setJobStatus(s)
          if (s.status === 'done' || s.status === 'error' || s.status === 'cancelled') {
            stopPoll()
          }
        } catch {
          stopPoll()
        }
      }, POLL_INTERVAL_MS)
    }
    tick()
  }, [stopPoll])

  const handleLaunch = useCallback(async () => {
    setError(null)
    setLaunching(true)
    try {
      const sortedClips = [...clips].map((c, i) => ({
        video_id: c.videoId,
        order: i,
        source_type: c.sourceType ?? 'original',
      } as const))
      const withMusic = includeMusic && audioTracks.length > 0

      let audioBlob: Blob | null = null
      let audioName: string | undefined
      if (withMusic) {
        const track = audioTracks[0]
        const resp = await fetch(track.url)
        if (!resp.ok) {
          throw new Error(`Audio illisible (HTTP ${resp.status}). Réimportez la piste.`)
        }
        audioBlob = await resp.blob()
        audioName = track.name
        if (!audioBlob || audioBlob.size === 0) {
          throw new Error('Le fichier audio est vide. Réimportez la piste.')
        }
      }

      const id = await startAssemblageExport(
        {
          clips: sortedClips,
          use_transitions: false,
          transition_duration_s: 0.5,
          resolution,
          include_music: withMusic && audioBlob !== null,
        },
        audioBlob,
        audioName,
      )
      setJobId(id)
      setJobStatus({ id, label: 'assemblage-export', status: 'pending', progress: 0, estimated_remaining_s: null, error: null })
      startPoll(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du lancement")
    } finally {
      setLaunching(false)
    }
  }, [clips, resolution, includeMusic, audioTracks, startPoll])

  const handleDownload = useCallback(() => {
    if (!jobId) return
    const url = getAssemblageDownloadUrl(jobId)
    const a = document.createElement('a')
    a.href = url
    a.download = `assemblage_${Date.now()}.mp4`
    a.click()
  }, [jobId])

  const isRunning = jobStatus?.status === 'pending' || jobStatus?.status === 'running'
  const isDone = jobStatus?.status === 'done'
  const isError = jobStatus?.status === 'error'
  const progress = jobStatus?.progress ?? 0

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={panel} role="dialog" aria-modal="true">

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text, #cdd6f4)' }}>
              Options d'export
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted, #8892b0)' }}>
              {clips.length} clip{clips.length > 1 ? 's' : ''} · assemblage MP4
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #8892b0)', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Section résolution */}
        <span style={sectionLabel}>Résolution</span>
        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          style={selectStyle}
          disabled={isRunning || isDone}
          aria-label="Résolution"
        >
          {RESOLUTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Section musique — toujours visible pour clarifier ce qui sera exporté */}
        <div style={divider} />
        <span style={sectionLabel}>Piste musicale</span>
        {audioTracks.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted, #8892b0)', fontStyle: 'italic' }}>
            Aucune piste importée — la vidéo sera exportée muette.
          </p>
        ) : (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--color-text, #cdd6f4)' }}>
              <input
                type="checkbox"
                checked={includeMusic}
                onChange={(e) => setIncludeMusic(e.target.checked)}
                disabled={isRunning || isDone}
                style={{ width: 16, height: 16, accentColor: 'var(--color-accent, #e94560)', cursor: 'pointer' }}
              />
              Inclure la musique
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)', marginLeft: 'auto' }}>
                {audioTracks.length} piste{audioTracks.length > 1 ? 's' : ''}
              </span>
            </label>

            {/* Statut du fichier audio qui sera envoyé */}
            {includeMusic && (
              <div style={{ marginTop: '0.55rem', padding: '0.5rem 0.7rem', borderRadius: 6, background: audioError ? 'rgba(233,69,96,0.08)' : 'rgba(100,255,218,0.06)', border: `1px solid ${audioError ? 'rgba(233,69,96,0.3)' : 'rgba(100,255,218,0.18)'}`, fontSize: '0.74rem' }}>
                {audioError ? (
                  <span style={{ color: 'var(--color-error, #e94560)' }}>✗ {audioError}</span>
                ) : audioPreview ? (
                  <span style={{ color: '#64ffda' }}>
                    ✓ {audioPreview.name} ({(audioPreview.size / 1024 / 1024).toFixed(2)} MB) sera ajoutée
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-text-muted, #8892b0)' }}>Préparation de l'audio…</span>
                )}
              </div>
            )}
          </>
        )}

        <div style={divider} />

        {/* Progression */}
        {(isRunning || isDone || isError) && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted, #8892b0)', marginBottom: '0.3rem' }}>
              <span>
                {isDone ? 'Export terminé' : isError ? 'Erreur' : 'Génération en cours…'}
              </span>
              <span>{progress}%</span>
            </div>
            <div
              style={progressTrack}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: isDone
                  ? 'var(--color-success, #64ffda)'
                  : isError
                  ? 'var(--color-error, #e94560)'
                  : 'var(--color-accent, #e94560)',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }} />
            </div>
            {isError && jobStatus?.error && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--color-error, #e94560)' }}>
                {jobStatus.error}
              </p>
            )}
          </div>
        )}

        {error && (
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--color-error, #e94560)', padding: '0.5rem 0.75rem', background: 'rgba(233,69,96,0.08)', borderRadius: 5 }}>
            {error}
          </p>
        )}

        {/* Actions */}
        {!jobId && (
          <button
            type="button"
            style={primaryBtn}
            onClick={handleLaunch}
            disabled={launching}
          >
            {launching ? 'Lancement…' : 'Lancer l\'export'}
          </button>
        )}

        {isDone && (
          <button
            type="button"
            style={primaryBtn}
            onClick={handleDownload}
          >
            Télécharger
          </button>
        )}

        {(isRunning || isError) && !isDone && (
          <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted, #8892b0)', padding: '0.5rem 0' }}>
            {isRunning ? 'Génération en arrière-plan…' : 'Une erreur est survenue'}
          </div>
        )}

        <button type="button" style={secondaryBtn} onClick={onClose}>
          {isDone ? 'Fermer' : 'Annuler'}
        </button>
      </div>
    </div>
  )
}
