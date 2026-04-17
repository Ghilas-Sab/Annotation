import { useEffect, useRef } from 'react'
import { getInterAnnotationStep, Annotation } from '../utils/bpmUtils'

interface UseVideoKeyboardOptions {
  currentFrame: number
  totalFrames: number
  fps: number
  seek: (frame: number) => void
  annotations: Annotation[] // Gardé pour compatibilité signature
  createAnnotation?: (frame: number) => void
  startFrame?: number
}

export const useVideoKeyboard = (opts: UseVideoKeyboardOptions) => {
  const { currentFrame, totalFrames, seek, annotations, createAnnotation, startFrame = 0 } = opts

  // Garder les valeurs fraîches dans des refs pour éviter de recréer le listener
  const currentFrameRef = useRef(currentFrame)
  currentFrameRef.current = currentFrame
  const totalFramesRef = useRef(totalFrames)
  totalFramesRef.current = totalFrames
  const startFrameRef = useRef(startFrame)
  startFrameRef.current = startFrame
  const annotationsRef = useRef(annotations)
  annotationsRef.current = annotations

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      const cur = currentFrameRef.current
      const tot = totalFramesRef.current
      const start = startFrameRef.current
      const anns = annotationsRef.current
      const clamp = (f: number) => Math.max(start, Math.min(tot, f))

      if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); seek(clamp(cur + 1))
      } else if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); seek(clamp(cur - 1))
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault(); seek(clamp(cur + 5))
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault(); seek(clamp(cur - 5))
      } else if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault(); seek(tot)
      } else if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault(); seek(0)
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault()
        const step = getInterAnnotationStep(cur, anns)
        seek(clamp(cur + step))
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault()
        const step = getInterAnnotationStep(cur, anns)
        seek(clamp(cur - step))
      } else if (e.key === ' ') {
        e.preventDefault(); createAnnotation?.(cur)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [seek, createAnnotation]) // Liste de dépendances réduite et stable
}
