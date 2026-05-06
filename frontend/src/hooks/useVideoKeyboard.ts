import { useEffect, useRef } from 'react'
import { getInterAnnotationStep, Annotation } from '../utils/bpmUtils'
import { blurNonTextFocus, isTextEditingTarget } from '../utils/keyboardTargets'

interface UseVideoKeyboardOptions {
  currentFrame: number
  totalFrames: number
  fps: number
  seek: (frame: number) => void
  annotations: Annotation[]
  createAnnotation?: (frame: number) => void
  togglePlayPause?: () => void
  startFrame?: number
}

export interface VideoKeyboardHandlers {
  seekPrevFrame: () => void
  seekNextFrame: () => void
  seek5Back: () => void
  seek5Forward: () => void
  seekPrevAnnotation: () => void
  seekNextAnnotation: () => void
  seekStart: () => void
  seekEnd: () => void
  annotate: () => void
  togglePlayPause: () => void
}

export const useVideoKeyboard = (opts: UseVideoKeyboardOptions): VideoKeyboardHandlers => {
  const { currentFrame, totalFrames, seek, annotations, createAnnotation, togglePlayPause, startFrame = 0 } = opts

  // Refs pour éviter les closures stale dans le listener clavier
  const currentFrameRef = useRef(currentFrame)
  currentFrameRef.current = currentFrame
  const totalFramesRef = useRef(totalFrames)
  totalFramesRef.current = totalFrames
  const startFrameRef = useRef(startFrame)
  startFrameRef.current = startFrame
  const annotationsRef = useRef(annotations)
  annotationsRef.current = annotations
  const seekRef = useRef(seek)
  seekRef.current = seek
  const createAnnotationRef = useRef(createAnnotation)
  createAnnotationRef.current = createAnnotation
  const togglePlayPauseRef = useRef(togglePlayPause)
  togglePlayPauseRef.current = togglePlayPause

  const clamp = (f: number) => {
    const start = startFrameRef.current
    const tot = totalFramesRef.current
    return Math.max(start, Math.min(tot, f))
  }

  // Handlers exposés (utilisés par les boutons ET le listener clavier)
  const handlers: VideoKeyboardHandlers = {
    seekPrevFrame: () => seekRef.current(clamp(currentFrameRef.current - 1)),
    seekNextFrame: () => seekRef.current(clamp(currentFrameRef.current + 1)),
    seek5Back: () => seekRef.current(clamp(currentFrameRef.current - 5)),
    seek5Forward: () => seekRef.current(clamp(currentFrameRef.current + 5)),
    seekPrevAnnotation: () => {
      const cur = currentFrameRef.current
      const step = getInterAnnotationStep(cur, annotationsRef.current)
      seekRef.current(clamp(cur - step))
    },
    seekNextAnnotation: () => {
      const cur = currentFrameRef.current
      const step = getInterAnnotationStep(cur, annotationsRef.current)
      seekRef.current(clamp(cur + step))
    },
    seekStart: () => seekRef.current(startFrameRef.current),
    seekEnd: () => seekRef.current(Math.max(0, totalFramesRef.current - 1)),
    annotate: () => createAnnotationRef.current?.(currentFrameRef.current),
    togglePlayPause: () => togglePlayPauseRef.current?.(),
  }

  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTextEditingTarget(e.target)) return

      const h = handlersRef.current
      const runShortcut = (fn: () => void) => {
        e.preventDefault()
        blurNonTextFocus(e.target)
        fn()
      }

      if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        runShortcut(h.seekNextFrame)
      } else if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        runShortcut(h.seekPrevFrame)
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        runShortcut(h.seek5Forward)
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        runShortcut(h.seek5Back)
      } else if (e.key === 'ArrowRight' && e.altKey) {
        runShortcut(h.seekEnd)
      } else if (e.key === 'ArrowLeft' && e.altKey) {
        runShortcut(h.seekStart)
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        runShortcut(h.seekNextAnnotation)
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        runShortcut(h.seekPrevAnnotation)
      } else if (e.key === 'Enter') {
        runShortcut(h.annotate)
      } else if (e.key === ' ' || e.code === 'Space') {
        runShortcut(h.togglePlayPause)
      }
    }

    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, []) // Stable — tout passe par les refs

  return handlers
}
