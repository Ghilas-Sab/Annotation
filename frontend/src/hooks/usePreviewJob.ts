import { useState, useEffect, useRef, useCallback } from 'react'
import { createPreviewJob, getJobStatus, getJobDownloadUrl } from '../api/exports'

export type PreviewStatus = 'idle' | 'creating' | 'running' | 'done' | 'error'

export interface PreviewJobState {
  status: PreviewStatus
  jobId: string | null
  progress: number
  estimatedRemaining: number | null
  previewUrl: string | null
  error: string | null
}

export interface UsePreviewJobReturn extends PreviewJobState {
  start: (videoId: string, targetBpm: number) => Promise<void>
  cancel: (jobId: string) => void
  reset: () => void
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const POLL_INTERVAL = 2000

const INITIAL_STATE: PreviewJobState = {
  status: 'idle',
  jobId: null,
  progress: 0,
  estimatedRemaining: null,
  previewUrl: null,
  error: null,
}

export function usePreviewJob(
  overrideCreateJob?: (videoId: string, targetBpm: number) => Promise<string>
): UsePreviewJobReturn {
  const [state, setState] = useState<PreviewJobState>(INITIAL_STATE)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeJobId = useRef<string | null>(null)

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const poll = useCallback(async (jobId: string) => {
    try {
      const data = await getJobStatus(jobId)
      if (activeJobId.current !== jobId) return

      setState(prev => ({
        ...prev,
        progress: data.progress,
        estimatedRemaining: data.estimated_remaining_s,
        status: data.status === 'pending' ? 'running' : data.status as PreviewStatus,
        error: data.error,
      }))

      if (data.status === 'done') {
        stopPolling()
        const url = getJobDownloadUrl(jobId)
        setState(prev => ({ ...prev, previewUrl: url, status: 'done', progress: 100 }))

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Prévisualisation prête', { body: 'Votre vidéo adaptée est disponible.' })
        } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => {
            if (p === 'granted') {
              new Notification('Prévisualisation prête', { body: 'Votre vidéo adaptée est disponible.' })
            }
          })
        }
      } else if (data.status === 'error' || data.status === 'cancelled') {
        stopPolling()
        setState(prev => ({ ...prev, status: 'error' }))
      }
    } catch {
      // réseau indisponible — réessayer au prochain tick
    }
  }, [stopPolling])

  const start = useCallback(async (videoId: string, targetBpm: number) => {
    stopPolling()
    setState({ ...INITIAL_STATE, status: 'creating' })

    try {
      const createFn = overrideCreateJob ?? createPreviewJob
      const jobId = await createFn(videoId, targetBpm)
      activeJobId.current = jobId
      setState(prev => ({ ...prev, jobId, status: 'running' }))

      intervalRef.current = setInterval(() => poll(jobId), POLL_INTERVAL)
    } catch (e) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: e instanceof Error ? e.message : 'Erreur lors du lancement',
      }))
    }
  }, [poll, stopPolling, overrideCreateJob])

  const cancel = useCallback((jobId: string) => {
    stopPolling()
    activeJobId.current = null
    fetch(`${API_BASE}/exports/jobs/${jobId}`, { method: 'DELETE' }).catch(() => {})
    setState(prev => ({ ...prev, status: 'idle', jobId: null }))
  }, [stopPolling])

  const reset = useCallback(() => {
    stopPolling()
    activeJobId.current = null
    setState(INITIAL_STATE)
  }, [stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  return { ...state, start, cancel, reset }
}
