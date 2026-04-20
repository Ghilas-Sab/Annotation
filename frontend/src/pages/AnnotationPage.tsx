import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVideoStore } from '../stores/videoStore'
import { useAudioStore } from '../stores/audioStore'
import { useAudioBeep } from '../hooks/useAudioBeep'
import { useAnnotations, useCreateAnnotation, useUpdateAnnotation, useDeleteAnnotation, useShiftAnnotations, useCategories } from '../api/annotations'
import { CategorySelector } from '../components/annotations/CategorySelector'
import { CategoryManager } from '../components/annotations/CategoryManager'
import { useVideo } from '../api/projects'
import VideoPlayer from '../components/video/VideoPlayer'
import PlaybackControls from '../components/video/PlaybackControls'
import { VideoTimeline } from '../components/video/VideoTimeline'
import { AnnotationList } from '../components/annotations/AnnotationList'
import BulkPlacementForm from '../components/annotations/BulkPlacementForm'
import ShiftForm from '../components/annotations/ShiftForm'
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal'
import ExportButtons from '../components/exports/ExportButtons'
import type { Annotation } from '../types/annotation'

type Tab = 'annotations' | 'categories' | 'placement' | 'decalage'

type UndoAction =
  | { type: 'create'; annotation: Annotation }
  | { type: 'delete'; annotation: Annotation }
  | { type: 'move'; id: string; oldFrame: number; label: string }
  | { type: 'shift'; offsetMs: number }

interface AnnotationPageProps {
  videoId: string
}

export const AnnotationPage: React.FC<AnnotationPageProps> = ({ videoId }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const trimStart = searchParams.get('start') ? Number(searchParams.get('start')) : 0
  const trimEnd = searchParams.get('end') ? Number(searchParams.get('end')) : undefined
  const videoRef = useRef<import('../components/video/VideoPlayer').VideoPlayerHandle>(null)
  const [activeTab, setActiveTab] = useState<Tab>('annotations')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [history, setHistory] = useState<UndoAction[]>([])

  const currentFrame = useVideoStore(s => s.currentFrame)
  const fps = useVideoStore(s => s.fps)
  const totalFrames = useVideoStore(s => s.totalFrames)

  const audioEnabled = useAudioStore(s => s.enabled)
  const toggleAudio = useAudioStore(s => s.toggle)
  const { beep } = useAudioBeep()

  const { data: video, isLoading: videoLoading } = useVideo(videoId)
  const { data: rawAnnotations = [] } = useAnnotations(videoId)
  const { data: categories = [] } = useCategories(videoId)
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('') // '' = tout afficher

  // Sélectionner la catégorie par défaut dès le chargement
  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      const def = categories.find(c => c.name === 'Par défaut')
      setActiveCategoryId(def ? def.id : categories[0].id)
    }
  }, [categories, activeCategoryId])

  // Enrichir les annotations avec l'objet category, dédupliquées par id
  const seenIds = new Set<string>()
  const annotations = rawAnnotations
    .filter(ann => { if (seenIds.has(ann.id)) return false; seenIds.add(ann.id); return true })
    .map(ann => ({ ...ann, category: categories.find(c => c.id === ann.category_id) }))

  // Annotations filtrées pour l'affichage dans la liste
  const displayedAnnotations = filterCategoryId
    ? annotations.filter(ann => ann.category_id === filterCategoryId)
    : annotations

  const createMutation = useCreateAnnotation(videoId)
  const updateMutation = useUpdateAnnotation(videoId)
  const deleteMutation = useDeleteAnnotation(videoId)
  const shiftMutation = useShiftAnnotations(videoId)

  const effectiveFps = fps || video?.fps || 25
  const effectiveTotalFrames = totalFrames || video?.total_frames || 0
  const effectiveTrimEnd = trimEnd ?? effectiveTotalFrames

  // Refs stables pour les closures (évite les dépendances dans useEffect)
  const audioEnabledRef = useRef(audioEnabled)
  audioEnabledRef.current = audioEnabled
  const annotationsRef = useRef(annotations)
  annotationsRef.current = annotations
  const historyRef = useRef<UndoAction[]>([])
  historyRef.current = history

  const createMutateRef = useRef(createMutation.mutate)
  createMutateRef.current = createMutation.mutate
  const updateMutateRef = useRef(updateMutation.mutate)
  updateMutateRef.current = updateMutation.mutate
  const deleteMutateRef = useRef(deleteMutation.mutate)
  deleteMutateRef.current = deleteMutation.mutate
  const shiftMutateRef = useRef(shiftMutation.mutate)
  shiftMutateRef.current = shiftMutation.mutate

  const pushHistory = useCallback((action: UndoAction) => {
    setHistory(prev => [...prev.slice(-19), action])
  }, [])

  // Bip à chaque frame annotée
  useEffect(() => {
    if (!audioEnabledRef.current) return
    const has = annotationsRef.current.some(a => a.frame_number === currentFrame)
    if (has) beep()
  }, [currentFrame, beep])

  // Ctrl+Z — annuler la dernière action
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const tag = (e.target as HTMLElement).tagName
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
        e.preventDefault()
        const hist = historyRef.current
        if (hist.length === 0) return
        const last = hist[hist.length - 1]
        setHistory(prev => prev.slice(0, -1))
        switch (last.type) {
          case 'create':
            deleteMutateRef.current(last.annotation.id)
            break
          case 'delete':
            createMutateRef.current({ frame_number: last.annotation.frame_number, label: last.annotation.label })
            break
          case 'move':
            updateMutateRef.current({ id: last.id, data: { frame_number: last.oldFrame, label: last.label } })
            break
          case 'shift':
            shiftMutateRef.current(-last.offsetMs)
            break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const seek = useCallback((frame: number) => {
    videoRef.current?.seekToFrame(frame)
  }, [])

  const handleCreate = (frame: number) => {
    const activeCategory = categories.find(c => c.id === activeCategoryId)
    const countInCategory = annotations.filter(a => a.category_id === activeCategoryId).length
    const autoLabel = activeCategory ? `${activeCategory.name} ${countInCategory + 1}` : ''
    createMutation.mutate(
      { frame_number: frame, label: autoLabel, category_id: activeCategoryId || undefined },
      {
        onSuccess: (ann) => pushHistory({ type: 'create', annotation: ann }),
      }
    )
  }

  const handleDelete = (id: string) => {
    const ann = annotationsRef.current.find(a => a.id === id)
    if (!ann) return
    pushHistory({ type: 'delete', annotation: ann })
    deleteMutation.mutate(id)
  }

  const handleUpdate = (id: string, frame: number, label: string) => {
    const ann = annotationsRef.current.find(a => a.id === id)
    if (ann) pushHistory({ type: 'move', id, oldFrame: ann.frame_number, label: ann.label })
    updateMutation.mutate({ id, data: { frame_number: frame, label } })
  }

  const handleShift = (frames: number) => {
    const offsetMs = (frames / effectiveFps) * 1000
    pushHistory({ type: 'shift', offsetMs })
    shiftMutation.mutate(offsetMs)
  }

  const handleMoveAnnotation = (id: string, newFrame: number) => {
    const ann = annotations.find(a => a.id === id)
    if (!ann) return
    pushHistory({ type: 'move', id, oldFrame: ann.frame_number, label: ann.label })
    updateMutation.mutate({ id, data: { frame_number: newFrame, label: ann.label } })
  }

  const lastActionLabel = () => {
    if (history.length === 0) return ''
    const last = history[history.length - 1]
    switch (last.type) {
      case 'create': return `annuler ajout fr.${last.annotation.frame_number}`
      case 'delete': return `annuler suppression fr.${last.annotation.frame_number}`
      case 'move':   return `annuler déplacement fr.${last.oldFrame}`
      case 'shift':  return `annuler décalage`
    }
  }

  if (videoLoading || !video) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-accent)' }}>Chargement...</div>
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'annotations', label: filterCategoryId ? `Liste (${displayedAnnotations.length}/${annotations.length})` : `Liste (${annotations.length})` },
    { id: 'categories',  label: 'Catégories' },
    { id: 'placement',   label: 'Placement auto' },
    { id: 'decalage',    label: 'Décaler tout' },
  ]

  const tabStyle = (id: Tab): React.CSSProperties => ({
    flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.78rem',
    fontWeight: activeTab === id ? 600 : 400, cursor: 'pointer',
    border: 'none',
    borderBottom: activeTab === id ? '2px solid var(--color-accent, #e94560)' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: activeTab === id ? 'var(--color-accent, #e94560)' : 'var(--color-text-muted, #888)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--color-bg, #0f0f1a)' }}>

      {/* Barre de navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderBottom: '1px solid var(--color-surface, #2a2a3e)', flexShrink: 0, backgroundColor: 'var(--color-panel, #1a1a2e)' }}>
        <button
          onClick={() => navigate('/projects')}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent, #e94560)', cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0.5rem' }}
        >
          ← Projets
        </button>
        <span style={{ color: 'var(--color-text-muted, #888)', fontSize: '0.8rem', flex: 1 }}>
          {video.original_name ?? videoId}
          {(trimStart > 0 || trimEnd !== undefined) && (
            <span style={{ marginLeft: '0.75rem', color: '#4a9eff', fontSize: '0.72rem' }}>
              ✂ frames {trimStart}–{effectiveTrimEnd}
            </span>
          )}
        </span>
        <ExportButtons videoId={videoId} annotationCount={annotations.length} />
        <button
          onClick={() => setShowShortcuts(true)}
          title="Raccourcis clavier"
          style={{ fontSize: '0.85rem', padding: '0.2rem 0.6rem', borderRadius: 4, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted, #888)' }}
        >
          ⌨ ?
        </button>
      </div>

      {/* Zone principale */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Vidéo + contrôles */}
        <div style={{ flex: 7, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <VideoPlayer
            ref={videoRef}
            videoId={videoId}
            fps={video.fps}
            totalFrames={video.total_frames}
            duration={video.duration_seconds}
            width={video.width}
            height={video.height}
          />
          {/* Panneau contrôles (keyboard + boutons tablette) */}
          <div style={{ flexShrink: 0, padding: '0.5rem 0.75rem', borderTop: '1px solid var(--color-surface, #2a2a3e)', backgroundColor: 'var(--color-panel, #1a1a2e)' }}>
            <PlaybackControls
              videoRef={videoRef}
              currentFrame={currentFrame}
              totalFrames={effectiveTrimEnd}
              fps={effectiveFps}
              annotations={annotations}
              startFrame={trimStart}
              onSeek={seek}
              onAnnotate={handleCreate}
            />
          </div>
        </div>

        {/* Panneau droit */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--color-surface, #2a2a3e)', minWidth: 0 }}>

          {/* Bip + onglets */}
          <div style={{ flexShrink: 0, borderBottom: '1px solid var(--color-surface, #2a2a3e)' }}>
            <div style={{ padding: '0.4rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #888)' }}>
                {history.length > 0
                  ? <><span style={{ opacity: 0.6 }}>Ctrl+Z ←</span> {lastActionLabel()}</>
                  : 'Ctrl+Z : rien à annuler'}
              </span>
              <button
                onClick={toggleAudio}
                title={audioEnabled ? 'Désactiver le bip' : 'Activer le bip à chaque annotation'}
                style={{
                  padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderRadius: 4, cursor: 'pointer', border: '1px solid',
                  backgroundColor: audioEnabled ? 'var(--color-accent, #e94560)' : 'transparent',
                  borderColor: audioEnabled ? 'var(--color-accent, #e94560)' : 'rgba(255,255,255,0.3)',
                  color: audioEnabled ? '#fff' : 'var(--color-text-muted, #888)',
                }}
              >
                🔔 Bip {audioEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid var(--color-surface, #2a2a3e)' }}>
              {tabs.map(t => (
                <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenu onglet */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'annotations' && (
              <>
                {/* Sélecteur catégorie active (pour nouvelles annotations) */}
                {categories.length > 0 && (
                  <div style={{ padding: '0.3rem 0.75rem', borderBottom: '1px solid var(--color-surface, #2a2a3e)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #888)', flexShrink: 0 }}>Créer dans :</span>
                    <CategorySelector categories={categories} value={activeCategoryId} onChange={setActiveCategoryId} />
                  </div>
                )}
                {/* Filtre d'affichage */}
                <div style={{ padding: '0.3rem 0.75rem', borderBottom: '1px solid var(--color-surface, #2a2a3e)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #888)', flexShrink: 0 }}>Afficher :</span>
                  <select
                    aria-label="Filtrer par catégorie"
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    style={{ padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid var(--color-surface)', backgroundColor: 'var(--color-panel)', color: 'var(--color-text)', fontSize: '0.8rem', flex: 1 }}
                  >
                    <option value="">Tout afficher</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <AnnotationList
                    annotations={displayedAnnotations}
                    fps={effectiveFps}
                    totalFrames={effectiveTotalFrames}
                    onSeek={seek}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                </div>
              </>
            )}
            {activeTab === 'categories' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <CategoryManager videoId={videoId} />
              </div>
            )}
            {activeTab === 'placement' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <BulkPlacementForm videoId={videoId} totalFrames={video.total_frames} fps={video.fps} />
              </div>
            )}
            {activeTab === 'decalage' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <ShiftForm onShift={handleShift} isPending={shiftMutation.isPending} isError={shiftMutation.isError} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--color-surface, #2a2a3e)' }}>
        <VideoTimeline
          currentFrame={currentFrame}
          totalFrames={effectiveTotalFrames}
          fps={effectiveFps}
          annotations={displayedAnnotations}
          categories={categories}
          onSeek={seek}
          onMoveAnnotation={handleMoveAnnotation}
          startFrame={trimStart}
          endFrame={effectiveTrimEnd}
        />
      </div>

      {/* Modal raccourcis */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
