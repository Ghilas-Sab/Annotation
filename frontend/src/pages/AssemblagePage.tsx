import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProject } from '../api/projects'
import type { Project, Video } from '../types/project'
import AssemblageTimeline from '../components/assemblage/AssemblageTimeline'
import AssemblagePreviewPanel from '../components/assemblage/AssemblagePreviewPanel'
import VideoImportModal from '../components/assemblage/VideoImportModal'
import {
  buildAssemblageClipFromVideo,
  type AssemblageClip,
  useAssemblageStore,
} from '../stores/assemblageStore'

interface AssemblagePageProps {
  project?: Project
  initialClips?: AssemblageClip[]
}

const fmtDuration = (s: number) => {
  if (s === 0) return '0 s'
  if (s < 60) return `${Math.round(s)} s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60).toString().padStart(2, '0')}s`
}

const AssemblagePage: React.FC<AssemblagePageProps> = ({
  project: projectOverride,
  initialClips,
}) => {
  const navigate = useNavigate()
  const { projectId = '' } = useParams<{ projectId: string }>()
  const { data: fetchedProject, isLoading, error } = useProject(projectOverride ? '' : projectId)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSequencePreview, setShowSequencePreview] = useState(false)

  const clips = useAssemblageStore((s) => s.clips)
  const addClips = useAssemblageStore((s) => s.addClips)
  const removeClip = useAssemblageStore((s) => s.removeClip)
  const reorderClips = useAssemblageStore((s) => s.reorderClips)
  const replaceClips = useAssemblageStore((s) => s.replaceClips)

  useEffect(() => {
    replaceClips(initialClips ?? [])
  }, [initialClips, replaceClips])

  // Ferme la preview si on retire tous les clips
  useEffect(() => {
    if (clips.length === 0) setShowSequencePreview(false)
  }, [clips.length])

  const project = projectOverride ?? fetchedProject

  const totalDuration = useMemo(
    () => clips.reduce((sum, c) => sum + c.duration, 0),
    [clips],
  )

  const handleAddSelection = (sources: Array<{ video: Video; sourceType: 'original' | 'adapted' }>) => {
    addClips(sources.map(({ video, sourceType }) => buildAssemblageClipFromVideo(video, sourceType)))
  }

  if (!projectOverride && isLoading) {
    return (
      <div className="container" style={{ paddingTop: '2rem', color: 'var(--color-text-muted, #8892b0)' }}>
        Chargement…
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div style={{ color: 'var(--color-danger, #e94560)' }}>
          {error ? 'Projet introuvable.' : 'Projet introuvable.'}
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <button
            type="button"
            onClick={() => navigate(`/projects/${project.id}`)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted, #8892b0)', fontSize: '0.8rem',
              padding: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            ← {project.name}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text, #e8ecf8)' }}>
            Assemblage
          </h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--color-text-muted, #8892b0)', fontSize: '0.85rem' }}>
            Composez une séquence de clips vidéo
          </p>
        </div>

        {clips.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowImportModal(true)}
            style={{ alignSelf: 'flex-end' }}
          >
            + Ajouter des vidéos
          </button>
        )}
      </div>

      {/* ── Zone principale ── */}
      {clips.length === 0 ? (
        /* État vide */
        <div style={{
          minHeight: 220, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1rem',
          borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.02)', color: 'var(--color-text-muted, #8892b0)',
          textAlign: 'center', padding: '2rem',
        }}>
          <div style={{ fontSize: '2rem', opacity: 0.4 }}>🎬</div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.3rem' }}>
              Ajoutez des vidéos pour commencer l&apos;assemblage
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>
              Importez des clips depuis vos projets et organisez-les sur la timeline.
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={() => setShowImportModal(true)}>
            + Ajouter des vidéos
          </button>
        </div>
      ) : (
        /* Timeline + actions */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Barre stats + actions */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.75rem', flexWrap: 'wrap',
            padding: '0.65rem 1rem',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e8ecf8' }}>
                  Durée totale : {fmtDuration(totalDuration)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)', marginTop: '0.1rem' }}>
                  {clips.length} clip{clips.length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted, #8892b0)' }}>Clips</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e8ecf8', marginTop: '0.1rem' }}>
                  {clips.length}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowImportModal(true)}
              >
                + Ajouter des vidéos
              </button>
              <button
                type="button"
                className={showSequencePreview ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setShowSequencePreview((v) => !v)}
              >
                {showSequencePreview ? '▶ Masquer les vidéos concaténées' : '▶ Voir les vidéos concaténées'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div style={{
            padding: '1.25rem',
            borderRadius: 14,
            background: 'var(--color-panel, #13132a)',
            border: '1px solid var(--color-border, #2a2a4a)',
          }}>
            <AssemblageTimeline
              clips={clips}
              onRemoveClip={removeClip}
              onReorderClips={reorderClips}
            />
          </div>

          {/* Preview séquentielle */}
          {showSequencePreview && (
            <AssemblagePreviewPanel
              clips={clips}
              onClose={() => setShowSequencePreview(false)}
            />
          )}
        </div>
      )}

      {/* Modal import */}
      {showImportModal && (
        <VideoImportModal
          project={project}
          onClose={() => setShowImportModal(false)}
          onAddSelection={handleAddSelection}
        />
      )}
    </div>
  )
}

export default AssemblagePage
