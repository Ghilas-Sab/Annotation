import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProject } from '../api/projects'
import type { Project, Video } from '../types/project'
import AssemblageTimeline from '../components/assemblage/AssemblageTimeline'
import VideoImportModal from '../components/assemblage/VideoImportModal'
import {
  buildAssemblageClipFromVideo,
  type AssemblageClip,
  useAssemblageStore,
} from '../stores/assemblageStore'
import { deleteAudioTrackBlob, saveAudioTrackBlob } from '../utils/audioPersistence'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface AssemblagePageProps {
  project?: Project
  initialClips?: AssemblageClip[]
}

const getClipUrl = (clip: AssemblageClip) =>
  clip.sourceType === 'adapted'
    ? `${API_BASE}/videos/${clip.videoId}/preview-adapted/stream`
    : `${API_BASE}/videos/${clip.videoId}/stream`

const fmtDuration = (s: number) => {
  if (s === 0) return '0 s'
  if (s < 60) return `${Math.round(s)} s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60).toString().padStart(2, '0')}s`
}

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Lecture impossible'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// ─── Style constants ─────────────────────────────────────────────────────────

const panelSection: React.CSSProperties = { padding: '0.85rem' }

const panelSectionHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: '0.55rem',
  fontSize: '0.68rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--color-text-muted, #8892b0)',
}

const smallAddBtn: React.CSSProperties = {
  fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: 4,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  color: 'var(--color-text, #e8ecf8)', cursor: 'pointer',
}

const rowItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.45rem',
  padding: '0.4rem 0.5rem', borderRadius: 6,
  transition: 'background 0.1s',
}

const deleteBtn: React.CSSProperties = {
  flexShrink: 0, border: 'none', background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.4)', borderRadius: 999, width: 18, height: 18,
  fontSize: '0.55rem', cursor: 'pointer', lineHeight: 1, padding: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const navBtn: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
  color: 'var(--color-text-muted, #8892b0)', borderRadius: 6,
  padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem',
}

const divider: React.CSSProperties = { height: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }

// ─── Component ────────────────────────────────────────────────────────────────

const AssemblagePage: React.FC<AssemblagePageProps> = ({
  project: projectOverride,
  initialClips,
}) => {
  const navigate = useNavigate()
  const { projectId = '' } = useParams<{ projectId: string }>()
  const { data: fetchedProject, isLoading, error } = useProject(projectOverride ? '' : projectId)

  const [showImportModal, setShowImportModal] = useState(false)
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoVolume, setVideoVolume]   = useState(1)
  const [videoMuted, setVideoMuted]     = useState(false)

  const clips         = useAssemblageStore((s) => s.clips)
  const addClips      = useAssemblageStore((s) => s.addClips)
  const removeClip    = useAssemblageStore((s) => s.removeClip)
  const reorderClips  = useAssemblageStore((s) => s.reorderClips)
  const replaceClips  = useAssemblageStore((s) => s.replaceClips)

  const audioTracks            = useAssemblageStore((s) => s.audioTracks)
  const addAudioTracks         = useAssemblageStore((s) => s.addAudioTracks)
  const removeAudioTrack       = useAssemblageStore((s) => s.removeAudioTrack)
  const updateAudioTrackDuration = useAssemblageStore((s) => s.updateAudioTrackDuration)
  const updateAudioTrackTrim   = useAssemblageStore((s) => s.updateAudioTrackTrim)
  const updateAudioTrackOffset = useAssemblageStore((s) => s.updateAudioTrackOffset)
  const restoreAudioTrackUrls  = useAssemblageStore((s) => s.restoreAudioTrackUrls)

  const audioInputRef      = useRef<HTMLInputElement>(null)
  const videoRef           = useRef<HTMLVideoElement>(null)
  const shouldAutoplay     = useRef(false)
  const isTransitioningRef = useRef(false)
  const pendingSeekRef     = useRef<number | null>(null)

  const project = projectOverride ?? fetchedProject
  const timelinePanelHeight = audioTracks.length > 0 ? 198 : 142

  useEffect(() => {
    if (initialClips !== undefined) replaceClips(initialClips)
  }, [initialClips, replaceClips])

  useEffect(() => {
    void restoreAudioTrackUrls()
  }, [restoreAudioTrackUrls])

  // Maintenir l'index dans les bornes
  useEffect(() => {
    if (clips.length > 0 && currentClipIndex >= clips.length) {
      setCurrentClipIndex(clips.length - 1)
    }
  }, [clips.length, currentClipIndex])

  const currentClip = clips[currentClipIndex] ?? null

  // Durée cumulée avant le clip courant (pour le temps global de timeline)
  const cumulativeBefore = useMemo(
    () => clips.slice(0, currentClipIndex).reduce((s, c) => s + c.duration, 0),
    [clips, currentClipIndex],
  )
  const globalTimelineTime = cumulativeBefore + videoCurrentTime

  // Sync volume/mute sur l'élément vidéo
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = videoMuted ? 0 : videoVolume
  }, [videoVolume, videoMuted])

  // Changer la source vidéo quand le clip actif change
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentClip) return
    video.src = getClipUrl(currentClip)
    video.load()
  }, [currentClipIndex, currentClip])

  const applyPendingSeek = useCallback(() => {
    const video = videoRef.current
    if (!video || !currentClip) return

    if (pendingSeekRef.current != null) {
      const seekTime = Math.max(0, Math.min(currentClip.duration, pendingSeekRef.current))
      video.currentTime = seekTime
      setVideoCurrentTime(seekTime)
      pendingSeekRef.current = null
    }

    if (shouldAutoplay.current) {
      shouldAutoplay.current = false
      video.play().catch(() => {})
    }
  }, [currentClip])

  const totalDuration = useMemo(
    () => clips.reduce((sum, c) => sum + c.duration, 0),
    [clips],
  )

  const handleAddSelection = (
    sources: Array<{ video: Video; sourceType: 'original' | 'adapted' }>,
  ) => {
    addClips(
      sources.map(({ video, sourceType }) =>
        buildAssemblageClipFromVideo(video, sourceType),
      ),
    )
  }

  const handleAudioImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length === 0) return

    const tracks = await Promise.all(
      files.map(async (file) => {
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const storageKey = `assemblage-audio-${id}`
        const storedInIndexedDb = await saveAudioTrackBlob(storageKey, file)

        let url = URL.createObjectURL(file)
        if (!storedInIndexedDb) {
          try { url = await readFileAsDataUrl(file) }
          catch { url = URL.createObjectURL(file) }
        }

        return {
          id,
          name: file.name,
          url,
          storageKey: storedInIndexedDb ? storageKey : undefined,
          duration: 0,
          trimStart: 0,
          trimEnd: 0,
          startOffset: 0,
        }
      }),
    )
    addAudioTracks(tracks)
  }

  const handleRemoveAudioTrack = useCallback((id: string) => {
    const track = audioTracks.find((t) => t.id === id)
    removeAudioTrack(id)
    if (track?.storageKey) void deleteAudioTrackBlob(track.storageKey)
  }, [audioTracks, removeAudioTrack])

  const handleVideoEnded = useCallback(() => {
    if (currentClipIndex < clips.length - 1) {
      isTransitioningRef.current = true
      shouldAutoplay.current = true
      setCurrentClipIndex((i) => i + 1)
    } else {
      setIsPlaying(false)
    }
  }, [currentClipIndex, clips.length])

  const handleVideoPlay  = useCallback(() => { isTransitioningRef.current = false; setIsPlaying(true) }, [])
  const handleVideoPause = useCallback(() => { if (!isTransitioningRef.current) setIsPlaying(false) }, [])

  const handleGlobalPlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video || clips.length === 0) return
    if (isPlaying) video.pause()
    else video.play().catch(() => {})
  }, [isPlaying, clips.length])

  const goToClip = useCallback((index: number) => {
    if (index < 0 || index >= clips.length) return
    shouldAutoplay.current = true
    pendingSeekRef.current = 0
    setCurrentClipIndex(index)
  }, [clips.length])

  const playFromTimelineTime = useCallback((targetTime: number) => {
    if (clips.length === 0) return

    let accumulated = 0
    for (let index = 0; index < clips.length; index += 1) {
      const clip = clips[index]
      const clipEnd = accumulated + clip.duration
      if (targetTime < clipEnd || index === clips.length - 1) {
        const localTime = Math.max(0, Math.min(clip.duration, targetTime - accumulated))
        shouldAutoplay.current = true

        if (index === currentClipIndex && videoRef.current) {
          videoRef.current.currentTime = localTime
          setVideoCurrentTime(localTime)
          videoRef.current.play().catch(() => {})
        } else {
          pendingSeekRef.current = localTime
          setCurrentClipIndex(index)
        }
        return
      }
      accumulated = clipEnd
    }
  }, [clips, currentClipIndex])

  // ── États de chargement ──────────────────────────────────────────────────
  if (!projectOverride && isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted, #8892b0)' }}>
        Chargement…
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-danger, #e94560)' }}>
          {error ? 'Projet introuvable.' : 'Projet introuvable.'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--color-bg, #0f0f1a)',
    }}>

      {/* ══ Barre supérieure ══════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0 0.65rem', height: 40, flexShrink: 0,
        borderBottom: '1px solid var(--color-border, #2a2a4a)',
        background: 'var(--color-panel, #13132a)',
      }}>
        <button
          type="button"
          onClick={() => navigate(`/projects/${project.id}`)}
          style={{ background: 'none', border: 'none', color: 'var(--color-accent, #e94560)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.15rem 0.45rem', flexShrink: 0 }}
        >
          ← {project.name}
        </button>
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
        <h1 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text, #e8ecf8)', flexShrink: 0 }}>
          Assemblage
        </h1>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted, #8892b0)', fontFamily: 'monospace' }}>
          {clips.length} clip{clips.length !== 1 ? 's' : ''}
          {audioTracks.length > 0 && ` · ${audioTracks.length} piste${audioTracks.length !== 1 ? 's' : ''}`}
          {' · '}{fmtDuration(totalDuration)}
        </span>
      </div>

      {/* ══ Zone principale : preview + panneau droite ══════════════════════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── Prévisualisation (centre) ──────────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          background: '#050710',
          borderRight: '1px solid var(--color-border, #2a2a4a)',
        }}>
          {clips.length === 0 ? (
            /* État vide */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '1rem', padding: '2rem',
              color: 'var(--color-text-muted, #8892b0)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '3rem', opacity: 0.2 }}>🎬</div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#c8d0e8', marginBottom: '0.3rem' }}>
                  Ajoutez des vidéos pour commencer l&apos;assemblage
                </div>
                <div style={{ fontSize: '0.82rem', opacity: 0.6 }}>
                  Importez des clips via le panneau à droite.
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowImportModal(true)}
              >
                + Ajouter des vidéos
              </button>
            </div>
          ) : (
            <>
              {/* Player vidéo */}
              <div style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at center, rgba(32,42,68,0.95), #050710 72%)',
                padding: '0.35rem',
              }}>
                <video
                  className="assemblage-video-player"
                  ref={videoRef}
                  controls
                  preload="auto"
                  onLoadedMetadata={applyPendingSeek}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnded={handleVideoEnded}
                  onTimeUpdate={() => setVideoCurrentTime(videoRef.current?.currentTime ?? 0)}
                  onSeeked={() => setVideoCurrentTime(videoRef.current?.currentTime ?? 0)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: 10,
                    display: 'block',
                    background: '#050710',
                    boxShadow: '0 18px 48px rgba(0,0,0,0.32)',
                  }}
                />
              </div>

              {/* Barre info clip + navigation */}
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.26rem 0.65rem',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(8,12,28,0.95)',
              }}>
                {/* Barre de progression séquence */}
                <div style={{ display: 'flex', height: 4, flex: 1, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.07)', gap: 1 }}>
                  {clips.map((clip, i) => {
                    const pct = totalDuration > 0 ? (clip.duration / totalDuration) * 100 : 100 / clips.length
                    return (
                      <div
                        key={clip.id}
                        style={{
                          width: `${pct}%`, height: '100%',
                          background: i < currentClipIndex
                            ? 'rgba(255,255,255,0.3)'
                            : i === currentClipIndex
                              ? 'var(--color-accent, #e94560)'
                              : 'rgba(255,255,255,0.1)',
                          cursor: 'pointer', transition: 'background 0.2s',
                        }}
                        onClick={() => goToClip(i)}
                      />
                    )
                  })}
                </div>

                {/* Nom + position clip */}
                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 70 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e8ecf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                    {currentClip?.name}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted, #8892b0)' }}>
                    {currentClipIndex + 1}/{clips.length}
                    {currentClip && ` · ${fmtTime(currentClip.duration)}`}
                  </div>
                </div>

                {/* Volume vidéo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    aria-label={videoMuted ? 'Activer son vidéo' : 'Couper son vidéo'}
                    onClick={() => setVideoMuted(m => !m)}
                    style={{ border: 'none', background: 'transparent', color: videoMuted ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.6)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >
                    {videoMuted ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={videoMuted ? 0 : videoVolume}
                    onChange={(e) => { setVideoVolume(+e.target.value); if (+e.target.value > 0) setVideoMuted(false) }}
                    style={{ width: 52, height: 3, accentColor: '#e94560', cursor: 'pointer' }}
                    aria-label="Volume vidéo"
                  />
                </div>

                {/* Navigation + Play global */}
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => goToClip(currentClipIndex - 1)}
                    disabled={currentClipIndex === 0}
                    style={{ ...navBtn, opacity: currentClipIndex === 0 ? 0.3 : 1 }}
                  >◀</button>

                  <button
                    type="button"
                    aria-label={isPlaying ? 'Pause' : 'Lecture'}
                    onClick={handleGlobalPlayPause}
                    style={{
                      border: '1px solid rgba(233,69,96,0.5)',
                      background: isPlaying ? 'rgba(233,69,96,0.2)' : 'rgba(233,69,96,0.1)',
                      color: '#e94560', borderRadius: 999,
                      width: 28, height: 28, fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>

                  <button
                    type="button"
                    onClick={() => goToClip(currentClipIndex + 1)}
                    disabled={currentClipIndex === clips.length - 1}
                    style={{ ...navBtn, opacity: currentClipIndex === clips.length - 1 ? 0.3 : 1 }}
                  >▶
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Panneau droite ─────────────────────────────────────────────── */}
        <div style={{
          width: 232, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'var(--color-panel, #13132a)',
          overflowY: 'auto',
        }}>

          {/* Section Vidéos */}
          <div style={panelSection}>
            <div style={panelSectionHeader}>
              <span>🎬 Vidéos</span>
              <button type="button" style={smallAddBtn} onClick={() => setShowImportModal(true)}>
                + Ajouter
              </button>
            </div>

            {clips.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                Aucun clip
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {clips.map((clip, i) => {
                  const isActive = i === currentClipIndex
                  return (
                    <div
                      key={clip.id}
                      onClick={() => setCurrentClipIndex(i)}
                      style={{
                        ...rowItem,
                        background: isActive ? 'rgba(233,69,96,0.13)' : 'rgba(255,255,255,0.03)',
                        border: isActive
                          ? '1px solid rgba(233,69,96,0.35)'
                          : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{
                        flexShrink: 0, width: 18, height: 18, borderRadius: 999,
                        background: isActive ? 'var(--color-accent, #e94560)' : 'rgba(255,255,255,0.1)',
                        color: '#fff', fontSize: '0.58rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isActive ? '▶' : i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 400, color: isActive ? '#e8ecf8' : '#b0bcd4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {clip.name}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                          {fmtTime(clip.duration)}
                          {clip.sourceType === 'adapted' && (
                            <span style={{ marginLeft: 4, color: '#f43f5e', fontWeight: 700 }}>ADAPTÉ</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Supprimer ${clip.name}`}
                        onClick={(e) => { e.stopPropagation(); removeClip(clip.id) }}
                        style={deleteBtn}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={divider} />

          {/* Section Musique */}
          <div style={panelSection}>
            <div style={panelSectionHeader}>
              <span>🎵 Musique</span>
              <button
                type="button"
                style={smallAddBtn}
                onClick={() => audioInputRef.current?.click()}
              >
                + Importer une piste
              </button>
            </div>

            {audioTracks.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                Aucune piste
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {audioTracks.map((track) => (
                  <div
                    key={track.id}
                    style={{
                      ...rowItem,
                      background: 'rgba(100,255,218,0.04)',
                      border: '1px solid rgba(100,255,218,0.14)',
                    }}
                  >
                    <span style={{ flexShrink: 0, fontSize: '0.75rem' }}>♪</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64ffda', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.name}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                        {track.duration > 0 ? fmtTime(track.duration) : '—'}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Supprimer ${track.name}`}
                      onClick={() => handleRemoveAudioTrack(track.id)}
                      style={deleteBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={divider} />

          {/* Section Infos */}
          <div style={panelSection}>
            <div style={panelSectionHeader}>
              <span>📊 Infos</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {([
                ['Durée totale', fmtDuration(totalDuration)],
                ['Clips', `${clips.length}`],
                ['Pistes audio', `${audioTracks.length}`],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-muted, #8892b0)' }}>{label}</span>
                  <span style={{ color: '#e8ecf8', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Timeline (bas) ══════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0, height: timelinePanelHeight,
        borderTop: '2px solid var(--color-border, #2a2a4a)',
        background: 'var(--color-panel, #13132a)',
        overflowY: 'hidden', overflowX: 'hidden',
        padding: '0.4rem 0.75rem',
      }}>
        <AssemblageTimeline
          clips={clips}
          onRemoveClip={removeClip}
          onReorderClips={reorderClips}
          audioTracks={audioTracks}
          onAudioDurationReady={updateAudioTrackDuration}
          onAudioTrimChange={updateAudioTrackTrim}
          onAudioOffsetChange={updateAudioTrackOffset}
          videos={project.videos}
          isGloballyPlaying={isPlaying}
          globalTimelineTime={globalTimelineTime}
          videoVolume={videoVolume}
          videoMuted={videoMuted}
          onVideoVolumeChange={setVideoVolume}
          onVideoMutedChange={setVideoMuted}
          onPlayFromTime={playFromTimelineTime}
        />
      </div>

      {/* Input audio caché */}
      <input
        ref={audioInputRef}
        type="file"
        multiple
        accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
        style={{ display: 'none' }}
        onChange={handleAudioImport}
      />

      {/* Modal import vidéos */}
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
