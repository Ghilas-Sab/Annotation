import React, { useEffect, useState } from 'react'
import type { Video } from '../types/project'
import { createExportJob, downloadSavedPreview, type ProjectExportRequest } from '../api/exports'
import { useExportJobs } from '../contexts/ExportJobsContext'
import { Icon, Spinner } from '../components/ui'

interface ExportPageProps {
  projectId: string
  videos: Video[]
  onExport?: (projectId: string, request: ProjectExportRequest) => Promise<Blob>
}

const FORMAT_OPTIONS = [
  { value: 'json',  label: 'JSON',   desc: 'Annotations + stats' },
  { value: 'csv',   label: 'CSV',    desc: 'Tableur annotations' },
  { value: 'video', label: 'Vidéo',  desc: 'Clip adapté (BPM)' },
] as const

export const ExportPage: React.FC<ExportPageProps> = ({ projectId, videos, onExport }) => {
  const { startJob } = useExportJobs()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formats, setFormats]         = useState<Set<string>>(new Set(['json']))
  const [videoBpm, setVideoBpm]       = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [queued, setQueued]           = useState(false)

  useEffect(() => {
    setVideoBpm(prev => {
      const next = { ...prev }
      let changed = false
      videos.forEach(video => {
        if (video.adapted_preview && !next[video.id]) {
          next[video.id] = String(video.adapted_preview.bpm)
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [videos])

  const allSelected = videos.length > 0 && selectedIds.size === videos.length
  const noneSelected = selectedIds.size === 0

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(videos.map(v => v.id)))

  const toggleVideo = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleFormat = (fmt: string) =>
    setFormats(prev => { const n = new Set(prev); n.has(fmt) ? n.delete(fmt) : n.add(fmt); return n })

  const setBpm = (videoId: string, val: string) =>
    setVideoBpm(prev => ({ ...prev, [videoId]: val }))

  const handleExport = async () => {
    setLoading(true); setError(null); setQueued(false)
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
        const blob = await onExport(projectId, request)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `export_${projectId}.zip`; a.click()
        URL.revokeObjectURL(url)
      } else {
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

  const zipFiles = [
    ...formats.has('json') ? videoList.flatMap(v => {
      const stem = v.original_name.replace(/\.[^.]+$/, '')
      return [{ name: `${stem}_annotations.json`, type: 'json' }, { name: `${stem}_statistics.json`, type: 'json' }]
    }) : [],
    ...formats.has('csv') ? videoList.map(v => ({ name: `${v.original_name.replace(/\.[^.]+$/, '')}_annotations.csv`, type: 'csv' })) : [],
    ...formats.has('video') ? videoList.map(v => ({ name: `${v.original_name.replace(/\.[^.]+$/, '')}_adapted.mp4`, type: 'video', bpm: videoBpm[v.id] })) : [],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Step 1 — Sélection des vidéos */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-primary">1</span>
            <span className="text-h3">Sélection des vidéos</span>
          </div>
          {/* Accessible "select all" checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              aria-label="Tout sélectionner"
              checked={allSelected}
              onChange={toggleSelectAll}
              style={{ width: 15, height: 15, accentColor: 'var(--ac)', cursor: 'pointer' }}
            />
            Tout sélectionner
          </label>
        </div>

        {formats.has('video') && (
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 10 }}>
            BPM cible par vidéo requis pour l'export vidéo adapté
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {videos.map(v => {
            const bpmVal = Number(videoBpm[v.id])
            const previewMatchesBpm = v.adapted_preview && bpmVal > 0 && bpmVal === v.adapted_preview.bpm
            const isSelected = selectedIds.has(v.id)
            return (
              <div key={v.id} style={{
                border: `1.5px solid ${isSelected ? 'var(--border-ac)' : 'var(--border-c)'}`,
                borderRadius: 8, overflow: 'hidden',
                background: isSelected ? 'var(--ac-muted)' : 'var(--elevated)',
                transition: 'all 0.15s',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    aria-label={v.original_name}
                    checked={isSelected}
                    onChange={() => toggleVideo(v.id)}
                    style={{ width: 15, height: 15, accentColor: 'var(--ac)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.original_name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'monospace' }}>{v.fps}fps · {v.total_frames.toLocaleString()} frames · {v.duration_seconds.toFixed(1)}s</span>
                      {v.adapted_preview && (
                        <span className="badge badge-adapted" style={{ fontSize: 9 }}>Aperçu adapté · {Number(v.adapted_preview.bpm).toFixed(2)} BPM</span>
                      )}
                    </div>
                  </div>
                  {formats.has('video') && isSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.preventDefault()}>
                      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>BPM</span>
                      <input
                        type="number" min={1} step={1}
                        value={videoBpm[v.id] ?? ''}
                        onChange={e => setBpm(v.id, e.target.value)}
                        placeholder="—"
                        aria-label={`BPM cible ${v.original_name}`}
                        className="input input-sm"
                        style={{ width: 80, fontFamily: 'monospace', textAlign: 'center' }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                </label>

                {v.adapted_preview && isSelected && (
                  <div style={{ padding: '6px 14px 8px 42px', borderTop: '1px solid var(--border-c)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--adapted, hsl(160 60% 50%))' }}>Aperçu sauvegardé</span>
                    {previewMatchesBpm && <span className="badge badge-adapted" style={{ fontSize: 9 }}>✓ sera réutilisé</span>}
                    <button className="btn btn-ghost btn-xs" onClick={() => void downloadSavedPreview(v.id)} style={{ marginLeft: 'auto' }}>
                      <Icon.Download /> Télécharger
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {noneSelected && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: 'hsl(var(--danger)/0.07)', border: '1px solid hsl(var(--danger)/0.2)', fontSize: 12, color: 'var(--danger-c)' }}>
            Sélectionnez au moins une vidéo pour exporter.
          </div>
        )}
      </div>

      {/* Step 2 — Formats */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span className="badge badge-primary">2</span>
          <span className="text-h3">Formats d'export</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {FORMAT_OPTIONS.map(fmt => {
            const active = formats.has(fmt.value)
            return (
              <label key={fmt.value} style={{
                display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 16px',
                borderRadius: 8, cursor: 'pointer',
                background: active ? 'var(--ac-muted)' : 'var(--elevated)',
                border: `1.5px solid ${active ? 'var(--border-ac)' : 'var(--border-c)'}`,
                transition: 'all 0.15s', minWidth: 140,
              }}>
                <input
                  type="checkbox"
                  aria-label={fmt.label}
                  checked={active}
                  onChange={() => toggleFormat(fmt.value)}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                />
                <span style={{ fontWeight: 600, fontSize: 13, color: active ? 'var(--ac)' : 'var(--fg)' }}>{fmt.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{fmt.desc}</span>
              </label>
            )
          })}
        </div>

        {formats.has('video') && (
          <div className="fade-up" style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'hsl(var(--adapted-preview,160 60% 50%)/0.06)', border: '1px solid hsl(var(--adapted-preview,160 60% 50%)/0.2)', fontSize: 12, color: 'var(--text-2)' }}>
            Si une vidéo adaptée a déjà été sauvegardée, son BPM est prérempli et sera réutilisée automatiquement.
          </div>
        )}
      </div>

      {/* Step 3 — Contenu du ZIP */}
      {formats.size > 0 && (
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span className="badge badge-primary">3</span>
            <span className="text-h3">Contenu du ZIP</span>
          </div>
          {zipFiles.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Sélectionnez des vidéos et formats ci-dessus.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {zipFiles.map((f, i) => (
                <div key={i} className="fade-up" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 6,
                  background: 'var(--elevated)', border: '1px solid var(--border-c)',
                  animationDelay: `${i * 40}ms`,
                }}>
                  <span style={{ fontSize: 11, color: f.type === 'video' ? 'var(--adapted, hsl(160 60% 50%))' : 'var(--ac)', fontFamily: 'monospace', width: 40 }}>
                    {f.type.toUpperCase()}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  {f.type === 'video' && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', flexShrink: 0 }}>
                      {(f as { bpm?: string }).bpm ? `@ ${(f as { bpm?: string }).bpm} BPM` : '(clip brut)'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 14px', borderRadius: 7,
          background: 'hsl(var(--danger)/0.08)', border: '1px solid hsl(var(--danger)/0.25)',
          fontSize: 13, color: 'var(--danger-c)',
        }}>
          <Icon.AlertTriangle style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Queued banner */}
      {queued && (
        <div style={{
          padding: '10px 14px', borderRadius: 7,
          background: 'hsl(var(--success,158 64% 38%)/0.06)', border: '1px solid hsl(var(--success,158 64% 38%)/0.2)',
          fontSize: 13, color: 'var(--success-c, hsl(158 64% 50%))',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon.Check />
          <span>Export lancé en arrière-plan — vous pouvez continuer à annoter. Le téléchargement démarrera automatiquement.</span>
        </div>
      )}

      {/* Progressbar */}
      {loading && (
        <div role="progressbar" aria-label="Export en cours" style={{ height: 3, borderRadius: 2, background: 'var(--border-c)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '40%', background: 'var(--ac)', borderRadius: 2, animation: 'slide 1.2s ease-in-out infinite' }} />
        </div>
      )}

      {/* CTA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-primary" disabled={!canExport} onClick={handleExport} aria-label="Exporter" style={{ minWidth: 160 }}>
          {loading ? <><Spinner size={13} /> Export…</> : <><Icon.Export /> Exporter le projet</>}
        </button>
      </div>

      <style>{`
        @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
      `}</style>
    </div>
  )
}

export default ExportPage
