import { useEffect } from 'react'
import { getInterAnnotationStep, Annotation } from '../utils/bpmUtils'

interface UseVideoKeyboardOptions {
  currentFrame: number
  totalFrames: number
  fps: number
  seek: (frame: number) => void
  annotations: Annotation[]
  createAnnotation?: (frame: number) => void
}

export const useVideoKeyboard = (opts: UseVideoKeyboardOptions) => {
  const { currentFrame, totalFrames, fps, seek, annotations, createAnnotation } = opts

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      const clamp = (f: number) => Math.max(0, Math.min(totalFrames, f))

      if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault(); seek(clamp(currentFrame + 1))
      } else if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault(); seek(clamp(currentFrame - 1))
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault(); seek(clamp(currentFrame + 5))
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault(); seek(clamp(currentFrame - 5))
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault()
        const step = getInterAnnotationStep(currentFrame, annotations)
        seek(clamp(currentFrame + step))
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault()
        const step = getInterAnnotationStep(currentFrame, annotations)
        seek(clamp(currentFrame - step))
      } else if (e.key === ' ') {
        e.preventDefault(); createAnnotation?.(currentFrame)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentFrame, totalFrames, fps, seek, annotations, createAnnotation])
}
