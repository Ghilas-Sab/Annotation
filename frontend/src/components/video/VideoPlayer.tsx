import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useVideoStore } from '../../stores/videoStore'
import { useRequestVideoFrame } from '../../hooks/useRequestVideoFrame'
import { seekToFrame } from '../../hooks/useFrameSeek'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

interface VideoPlayerProps {
  videoId: string
  fps: number
  totalFrames: number
  duration: number
}

export interface VideoPlayerHandle {
  seekToFrame: (frame: number) => void
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ videoId, fps, totalFrames, duration }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const setIsPlaying = useVideoStore(s => s.setIsPlaying)
    const setVideoMetadata = useVideoStore(s => s.setVideoMetadata)

    useEffect(() => {
      setVideoMetadata({ fps, totalFrames, duration, videoId })
    }, [fps, totalFrames, duration, videoId, setVideoMetadata])

    useRequestVideoFrame(videoRef, fps)

    useImperativeHandle(ref, () => ({
      seekToFrame: (frame: number) => {
        if (videoRef.current) seekToFrame(videoRef.current, frame, fps)
      },
    }))

    return (
      <video
        ref={videoRef}
        src={`${API_BASE}/videos/${videoId}/stream`}
        style={{ width: '100%', maxHeight: '60vh', backgroundColor: '#000' }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        controls={false}
        preload="metadata"
      />
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer
