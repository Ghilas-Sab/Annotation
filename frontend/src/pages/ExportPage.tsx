import React, { useState } from 'react'
import type { Video } from '../types/project'
import { createExportJob, type ProjectExportRequest } from '../api/exports'
import { useExportJobs } from '../contexts/ExportJobsContext'

interface ExportPageProps {
  projectId: string
  videos: Video[]
  onExport?: (projectId: string, request: ProjectExportRequest) => Promise<Blob>
}

const panel: React.CSSProperties = {
  background: 'var(--color-panel, #13132a)',
  border: '1px solid var(--color-border, #2a2a4a)',
  borderRadius: 8,
  padding: '1.5rem',
  marginBottom: '1.5rem',
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted, #8892b0)',
  marginBottom: '1rem',
  display: 'block',
}

const divider: React.CSSProperties = {
  height: 1,
  background: 'var(--color-border, #2a2a4a)',
  margin: '0.75rem 0',
}

const bpmInput: React.CSSProperties = {
  width: 80,
  padding: '0.3rem 0.5rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  fontFamily: 'JetBrains Mono, monospace',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 5,
  color: 'var(--color-text, #cdd6f4)',
  textAlign: 'center',
  outline: 'none',
}

const FORMAT_OPTIONS = [
  { value: 'json', label: 'JSON', icon: '📄', desc: 'Annotations + stats' },
  { value: 'csv',  label: 'CSV',  icon: '📊', desc: 'Tableur' },
  { value: 'video', label: 'Vidéo', icon: '🎬', desc: 'Clip adapté (BPM requis)' },
] as const

export const ExportPage: React.FC<ExportPageProps> = ({ projectId, videos, onExport }) => {
  const { startJob } = useExportJobs()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formats, setFormats]         = useState<Set<string>>(new Set(['json']))
  const [videoBpm, setVideoBpm]       = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [queued, setQueued]           = useState(false)

  const allSelected = videos.length > 0 && selectedIds.size === videos.length
  const noneSelected = selectedIds.size === 0

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(videos.map(v => v.id)))
  }

  const toggleVideo = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleFormat = (fmt: string) => {
    setFormats(prev => {
      const next = new Set(prev)
      next.has(fmt) ? next.delete(fmt) : next.add(fmt)
      return next
    })
  }

  const setBpm = (videoId: string, val: string) => {
    setVideoBpm(prev => ({ ...prev, [videoId]: val }))
  }

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    setQueued(false)
    try {
      const video_bpm: Record<string, number> = {}
      for (const [id, val] of Object.entries(videoBpm)) {
        if (val && Number(val) > 0) video_bpm[id] = Number(val)
      }
      const selectedList = videos.filter(v => selectedIds.has(v.id))
      const request: ProjectExportRequest = {
        video_ids: Array.from(selectedIds),
        formats: Array.from(formats),
        video_bpm: Object.keys(video_bpm).length > 0 ? video_bpm : undefined,
      }

      if (onExport) {
        // Mode test — appel direct
        const blob = await onExport(projectId, request)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `export_${projectId}.zip`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Mode normal — job en arrière-plan
        const jobId = await createExportJob(projectId, request)
        const label = selectedList.length === 1
          ? selectedList[0].original_name
          : `${selectedList.length} vidéo${selectedList.length > 1 ? 's' : ''}`
        startJob(projectId, jobId, label)
        setQueued(true)
        setTimeout(() => setQueued(false), 4000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'export")
    } finally {
      setLoading(false)
    }
  }

  const videoList = videos.filter(v => selectedIds.has(v.id))
  const canExport = formats.size > 0 && !loading && selectedIds.size > 0

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-text, #cdd6f4)' }}>
            Export du projet
          </h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted, #8892b0)' }}>
            Générez un ZIP avec les annotations, statistiques et vidéos adaptées
          </p>
        </div>
        <span style={{
          fontSize: '0.78rem', padding: '0.25rem 0.65rem',
          borderRadius: 20, border: '1px solid var(--color-border, #2a2a4a)',
          color: 'var(--color-text-muted, #8892b0)', background: 'rgba(0,0,0,0.2)',
        }}>
          {videos.length} vidéo{videos.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Sélection des vidéos ── */}
      <div style={panel}>
        <span style={sectionLabel}>1 — Sélection des vidéos</span>

        {/* Header "Tout sélectionner" */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: '0.75rem',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              aria-label="Tout sélectionner"
              checked={allSelected}
              onChange={toggleSelectAll}
              style={{ width: 16, height: 16, accentColor: 'var(--color-accent, #e94560)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text, #cdd6f4)' }}>
              Tout sélectionner
            </span>
          </label>
          {formats.has('video') && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)', fontStyle: 'italic' }}>
              BPM cible par vidéo
            </span>
          )}
        </div>

        <div style={divider} />

        {/* Liste des vidéos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {videos.map((v, i) => (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.7rem 0',
              borderBottom: i < videos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <input
                type="checkbox"
                aria-label={v.original_name}
                checked={selectedIds.has(v.id)}
                onChange={() => toggleVideo(v.id)}
                style={{ width: 16, height: 16, accentColor: 'var(--color-accent, #e94560)', cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text, #cdd6f4)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.original_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)', marginTop: 2 }}>
                  {v.fps} fps · {v.total_frames} frames · {v.duration_seconds.toFixed(1)}s
                </div>
              </div>

              {/* BPM cible par vidéo */}
              {formats.has('video') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)' }}>BPM</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={videoBpm[v.id] ?? ''}
                    onChange={e => setBpm(v.id, e.target.value)}
                    placeholder="—"
                    aria-label={`BPM cible ${v.original_name}`}
                    style={bpmInput}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {noneSelected && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(233,69,96,0.07)', border: '1px solid rgba(233,69,96,0.2)', fontSize: '0.78rem', color: 'var(--color-accent, #e94560)' }}>
            Sélectionnez au moins une vidéo pour exporter.
          </div>
        )}
      </div>

      {/* ── Formats ── */}
      <div style={panel}>
        <span style={sectionLabel}>2 — Formats d'export</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {FORMAT_OPTIONS.map(fmt => {
            const active = formats.has(fmt.value)
            return (
              <label
                key={fmt.value}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '0.3rem',
                  padding: '0.85rem 1rem', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--color-accent, #e94560)' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? 'rgba(233,69,96,0.08)' : 'rgba(0,0,0,0.15)',
                  transition: 'border-color 0.15s, background 0.15s',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    aria-label={fmt.label}
                    checked={active}
                    onChange={() => toggleFormat(fmt.value)}
                    style={{ accentColor: 'var(--color-accent, #e94560)', width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: active ? 'var(--color-accent, #e94560)' : 'var(--color-text, #cdd6f4)' }}>
                    {fmt.icon} {fmt.label}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)', paddingLeft: '1.3rem' }}>
                  {fmt.desc}
                </span>
              </label>
            )
          })}
        </div>

        {formats.has('video') && (
          <div style={{ marginTop: '1rem', padding: '0.65rem 0.9rem', borderRadius: 6, background: 'rgba(100,255,218,0.05)', border: '1px solid rgba(100,255,218,0.15)', fontSize: '0.78rem', color: 'var(--color-text-muted, #8892b0)' }}>
            La vidéo adaptée nécessite un BPM cible par vidéo (défini dans la section ci-dessus). Sans BPM, un clip brut sera inclus.
          </div>
        )}
      </div>

      {/* ── Contenu prévu ── */}
      {(selectedIds.size > 0 || noneSelected) && formats.size > 0 && (
        <div style={panel}>
          <span style={sectionLabel}>3 — Contenu du ZIP</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {videoList.map(v => {
              const stem = v.original_name.replace(/\.[^.]+$/, '')
              return (
                <div key={v.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted, #8892b0)', marginBottom: '0.1rem' }}>
                    {v.original_name}
                  </span>
                  {formats.has('json') && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span style={fileEntry}>📄 {stem}_annotations.json</span>
                      <span style={fileEntry}>📊 {stem}_statistics.json</span>
                    </div>
                  )}
                  {formats.has('csv') && (
                    <span style={fileEntry}>📊 {stem}_annotations.csv</span>
                  )}
                  {formats.has('video') && (
                    <span style={fileEntry}>
                      🎬 {stem}_adapted.mp4
                      {videoBpm[v.id] ? <span style={{ color: 'var(--color-accent, #e94560)', marginLeft: 6 }}>@ {videoBpm[v.id]} BPM</span> : <span style={{ color: 'var(--color-text-muted, #8892b0)', marginLeft: 6 }}>(clip brut)</span>}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Erreur / succès ── */}
      {error && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          padding: '0.75rem 1rem', marginBottom: '1.25rem',
          background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
          borderRadius: 7, fontSize: '0.82rem', color: 'var(--color-danger, #ff6b6b)',
        }}>
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      {queued && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1.25rem',
          background: 'rgba(100,255,218,0.06)', border: '1px solid rgba(100,255,218,0.2)',
          borderRadius: 7, fontSize: '0.82rem', color: '#64ffda',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span>⚙️</span>
          <span>Export lancé en arrière-plan — vous pouvez continuer à annoter. Le téléchargement démarrera automatiquement.</span>
        </div>
      )}

      {/* Progressbar */}
      {loading && (
        <div
          role="progressbar"
          aria-label="Export en cours"
          style={{
            height: 3, borderRadius: 2, marginBottom: '1.25rem',
            background: 'var(--color-border, #2a2a4a)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%', width: '40%',
            background: 'var(--color-accent, #e94560)',
            borderRadius: 2,
            animation: 'slide 1.2s ease-in-out infinite',
          }} />
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleExport}
          disabled={!canExport}
          aria-label="Exporter"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: 700,
            background: canExport ? 'var(--color-accent, #e94560)' : 'rgba(233,69,96,0.3)',
            border: 'none', borderRadius: 8,
            color: '#fff',
            cursor: canExport ? 'pointer' : 'not-allowed',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Export…</> : <>⬇ Exporter le projet</>}
        </button>
      </div>

      <style>{`
        @keyframes slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const fileEntry: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--color-text-muted, #8892b0)',
  fontFamily: 'JetBrains Mono, monospace',
}

export default ExportPage
