import { useEffect, useRef } from 'react'
import { useVideoStore } from '../stores/videoStore'

export const useRequestVideoFrame = (
  videoRef: React.RefObject<HTMLVideoElement>,
  fps: number
) => {
  const setCurrentFrame = useVideoStore(s => s.setCurrentFrame)
  const callbackIdRef = useRef<number>(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video || fps === 0) return

    const callback: VideoFrameRequestCallback = (_now, metadata) => {
      const frame = Math.round(metadata.mediaTime * fps)
      setCurrentFrame(frame)
      callbackIdRef.current = video.requestVideoFrameCallback(callback)
    }

    callbackIdRef.current = video.requestVideoFrameCallback(callback)
    return () => {
      video.cancelVideoFrameCallback(callbackIdRef.current)
    }
  }, [videoRef, fps, setCurrentFrame])
}
