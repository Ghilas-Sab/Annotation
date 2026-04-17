import { useEffect, useRef } from 'react'
import { getInterAnnotationStep, Annotation } from '../utils/bpmUtils'

interface UseVideoKeyboardOptions {
  currentFrame: number
  totalFrames: number
  fps: number
  seek: (frame: number) => void
  annotations: Annotation[]
  createAnnotation?: (frame: number) => void
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
}

export const useVideoKeyboard = (opts: UseVideoKeyboardOptions): VideoKeyboardHandlers => {
  const { currentFrame, totalFrames, seek, annotations, createAnnotation, startFrame = 0 } = opts

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
  }

  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      const h = handlersRef.current

      if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); h.seekNextFrame()
      } else if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); h.seekPrevFrame()
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault(); h.seek5Forward()
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault(); h.seek5Back()
      } else if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault(); h.seekEnd()
      } else if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault(); h.seekStart()
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault(); h.seekNextAnnotation()
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault(); h.seekPrevAnnotation()
      } else if (e.key === ' ') {
        e.preventDefault(); h.annotate()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, []) // Stable — tout passe par les refs

  return handlers
}
