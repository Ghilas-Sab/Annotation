import { useEffect, useRef } from 'react'
import { useVideoStore } from '../stores/videoStore'
import { useAudioStore } from '../stores/audioStore'
import { useAudioBeep } from './useAudioBeep'
import type { Annotation } from '../utils/bpmUtils'

export const useRequestVideoFrame = (
  videoRef: React.RefObject<HTMLVideoElement>,
  fps: number,
  annotations: Annotation[] = []
) => {
  const setCurrentFrame = useVideoStore(s => s.setCurrentFrame)
  const callbackIdRef = useRef<number>(0)
  const { beep } = useAudioBeep()

  useEffect(() => {
    const video = videoRef.current
    if (!video || fps === 0) return

    const callback: VideoFrameRequestCallback = (_now, metadata) => {
      const frame = Math.round(metadata.mediaTime * fps)
      setCurrentFrame(frame)

      const audioEnabled = useAudioStore.getState().enabled
      const hasAnnotation = annotations.some(a => a.frame_number === frame)
      if (audioEnabled && hasAnnotation) {
        beep()
      }

      callbackIdRef.current = video.requestVideoFrameCallback(callback)
    }

    callbackIdRef.current = video.requestVideoFrameCallback(callback)
    return () => {
      video.cancelVideoFrameCallback(callbackIdRef.current)
    }
  }, [videoRef, fps, setCurrentFrame, annotations, beep])
}
