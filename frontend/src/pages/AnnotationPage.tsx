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
import { Logo, ThemeToggle, Breadcrumb, Icon, Spinner } from '../components/ui'
import type { Annotation } from '../types/annotation'
import { blurNonTextFocus, isTextEditingTarget } from '../utils/keyboardTargets'

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
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)

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
  const [filterCategoryId, setFilterCategoryId] = useState('')

  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      const def = categories.find(c => c.name === 'Par défaut')
      setActiveCategoryId(def ? def.id : categories[0].id)
    }
  }, [categories, activeCategoryId])

  const seenIds = new Set<string>()
  const annotations = rawAnnotations
    .filter(ann => { if (seenIds.has(ann.id)) return false; seenIds.add(ann.id); return true })
    .map(ann => ({ ...ann, category: categories.find(c => c.id === ann.category_id) }))

  const annotationsInRange = (trimEnd !== undefined || trimStart > 0)
    ? annotations.filter(ann => ann.frame_number >= trimStart && ann.frame_number <= (trimEnd ?? Infinity))
    : annotations

  const displayedAnnotations = filterCategoryId
    ? annotationsInRange.filter(ann => ann.category_id === filterCategoryId)
    : annotationsInRange

  useEffect(() => {
    if (!selectedAnnotationId) return
    if (!displayedAnnotations.some(a => a.id === selectedAnnotationId)) setSelectedAnnotationId(null)
  }, [displayedAnnotations, selectedAnnotationId])

  const createMutation = useCreateAnnotation(videoId)
  const updateMutation = useUpdateAnnotation(videoId)
  const deleteMutation = useDeleteAnnotation(videoId)
  const shiftMutation = useShiftAnnotations(videoId)

  const effectiveFps = fps || video?.fps || 25
  const effectiveTotalFrames = totalFrames || video?.total_frames || 0
  const effectiveTrimEnd = trimEnd ?? effectiveTotalFrames

  useEffect(() => {
    if (fps > 0 && trimStart > 0) videoRef.current?.seekToFrame(trimStart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fps])

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

  useEffect(() => {
    if (!audioEnabledRef.current) return
    const has = annotationsRef.current.some(a => a.frame_number === currentFrame)
    if (has) beep()
  }, [currentFrame, beep])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (isTextEditingTarget(e.target)) return
        e.preventDefault()
        blurNonTextFocus(e.target)
        const hist = historyRef.current
        if (hist.length === 0) return
        const last = hist[hist.length - 1]
        setHistory(prev => prev.slice(0, -1))
        switch (last.type) {
          case 'create': deleteMutateRef.current(last.annotation.id); break
          case 'delete': createMutateRef.current({ frame_number: last.annotation.frame_number, label: last.annotation.label }); break
          case 'move': updateMutateRef.current({ id: last.id, data: { frame_number: last.oldFrame, label: last.label } }); break
          case 'shift': shiftMutateRef.current(-last.offsetMs); break
        }
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [])

  const seek = useCallback((frame: number) => { videoRef.current?.seekToFrame(frame) }, [])

  const handleCreate = (frame: number) => {
    const activeCategory = categories.find(c => c.id === activeCategoryId)
    const countInCategory = annotations.filter(a => a.category_id === activeCategoryId).length
    const autoLabel = activeCategory ? `${activeCategory.name} ${countInCategory + 1}` : ''
    createMutation.mutate(
      { frame_number: frame, label: autoLabel, category_id: activeCategoryId || undefined },
      { onSuccess: (ann) => pushHistory({ type: 'create', annotation: ann }) }
    )
  }

  const handleDelete = (id: string) => {
    const ann = annotationsRef.current.find(a => a.id === id)
    if (!ann) return
    if (selectedAnnotationId === id) setSelectedAnnotationId(null)
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

  if (videoLoading || !video) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar"><Logo /></header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-2)' }}>
          <Spinner /> Chargement…
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'annotations', label: filterCategoryId ? `Liste (${displayedAnnotations.length}/${annotations.length})` : `Liste (${annotations.length})` },
    { id: 'categories', label: 'Catégories' },
    { id: 'placement', label: 'Placement auto' },
    { id: 'decalage', label: 'Décaler tout' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Topbar */}
      <header className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ gap: 5 }}>
          <Icon.Back /> Projets
        </button>
        <div className="sep-v" style={{ height: 18 }} />
        <Breadcrumb items={[
          { label: 'Projets', onClick: () => navigate('/projects') },
          { label: video.original_name ?? videoId },
        ]} />
        {(trimStart > 0 || trimEnd !== undefined) && (
          <span className="badge badge-warn" style={{ fontFamily: 'monospace', fontSize: 10 }}>
            ✂ f{trimStart}–{effectiveTrimEnd}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span data-testid="current-frame-display" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)' }}>
          {trimStart || currentFrame}
        </span>

        {/* Beep toggle */}
        <div className="tooltip-wrap">
          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleAudio}
            style={{
              gap: 6,
              background: audioEnabled ? 'hsl(var(--success)/0.12)' : 'transparent',
              border: `1px solid ${audioEnabled ? 'hsl(var(--success)/0.4)' : 'transparent'}`,
              color: audioEnabled ? 'var(--success-c)' : 'var(--text-2)',
            }}
          >
            <Icon.Beep on={audioEnabled} />
            Bip {audioEnabled ? 'ON' : 'OFF'}
          </button>
          <span className="tooltip">Bip audio à chaque annotation</span>
        </div>

        {/* Undo */}
        <div className="tooltip-wrap">
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => {
            const hist = history
            if (!hist.length) return
            const last = hist[hist.length - 1]
            setHistory(prev => prev.slice(0, -1))
            switch (last.type) {
              case 'create': deleteMutation.mutate(last.annotation.id); break
              case 'delete': createMutation.mutate({ frame_number: last.annotation.frame_number, label: last.annotation.label }); break
              case 'move': updateMutation.mutate({ id: last.id, data: { frame_number: last.oldFrame, label: last.label } }); break
              case 'shift': shiftMutation.mutate(-last.offsetMs); break
            }
          }} disabled={!history.length}>
            <Icon.Undo />
          </button>
          <span className="tooltip">Annuler (Ctrl+Z)</span>
        </div>

        {/* Shortcuts */}
        <div className="tooltip-wrap">
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowShortcuts(true)}>
            <Icon.Keyboard />
          </button>
          <span className="tooltip">Raccourcis clavier</span>
        </div>

        <ExportButtons videoId={videoId} annotationCount={annotations.length} />

        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/statistics/${videoId}`)}>
          <Icon.Stats /> Stats
        </button>
        <ThemeToggle />
      </header>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Video + controls */}
        <div style={{ flex: 7, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <VideoPlayer
            ref={videoRef}
            videoId={videoId}
            fps={video.fps}
            totalFrames={video.total_frames}
            duration={video.duration_seconds}
            width={video.width}
            height={video.height}
            startFrame={trimStart || undefined}
            endFrame={trimEnd}
          />
          <div style={{ flexShrink: 0, padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-c)', background: 'hsl(var(--card))' }}>
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

        {/* Right panel */}
        <div className="panel-right" style={{ flex: 3, minWidth: 0 }}>

          {/* Tabs */}
          <div className="tabs" style={{ overflowX: 'auto' }}>
            {tabs.map(t => (
              <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`} style={{ fontSize: 11.5, padding: '0 10px' }} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'annotations' && (
              <>
                {categories.length > 0 && (
                  <div style={{ padding: '0.3rem 0.75rem', borderBottom: '1px solid var(--border-c)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', flexShrink: 0 }}>Créer dans :</span>
                    <CategorySelector categories={categories} value={activeCategoryId} onChange={setActiveCategoryId} />
                  </div>
                )}
                <div style={{ padding: '0.3rem 0.75rem', borderBottom: '1px solid var(--border-c)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', flexShrink: 0 }}>Afficher :</span>
                  <select
                    aria-label="Filtrer par catégorie"
                    value={filterCategoryId}
                    onChange={e => setFilterCategoryId(e.target.value)}
                    style={{ padding: '0.25rem 0.4rem', borderRadius: '4px', height: 28, fontSize: '0.8rem', flex: 1 }}
                  >
                    <option value="">Tout afficher</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <AnnotationList
                    annotations={displayedAnnotations}
                    fps={effectiveFps}
                    totalFrames={effectiveTotalFrames}
                    selectedAnnotationId={selectedAnnotationId}
                    onSeek={seek}
                    onSelect={setSelectedAnnotationId}
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
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-c)' }}>
        <VideoTimeline
          currentFrame={currentFrame}
          totalFrames={effectiveTotalFrames}
          fps={effectiveFps}
          annotations={displayedAnnotations}
          categories={categories}
          selectedAnnotationId={selectedAnnotationId}
          onSeek={seek}
          onSelectAnnotation={setSelectedAnnotationId}
          onMoveAnnotation={handleMoveAnnotation}
          startFrame={trimStart}
          endFrame={effectiveTrimEnd}
        />
      </div>

      {/* Keyboard hints bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '5px 16px', borderTop: '1px solid var(--border-c)', background: 'hsl(var(--card))', flexShrink: 0, flexWrap: 'wrap' }}>
        {[['← →', 'frame'], ['Shift+← →', '±5'], ['Ctrl+← →', 'annotation'], ['Alt+← →', 'début/fin'], ['Enter', 'annoter'], ['Espace', 'play'], ['Ctrl+Z', 'annuler']].map(([k, l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <kbd>{k}</kbd>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{l}</span>
          </div>
        ))}
      </div>

      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
