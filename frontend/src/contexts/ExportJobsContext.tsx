import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type JobType = 'export' | 'preview'

export interface ExportJob {
  job_id: string
  label: string
  type: JobType
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  estimated_remaining_s: number | null
  error: string | null
  // preview only
  projectId?: string
  videoId?: string
  targetBpm?: number
  previewUrl?: string | null
  saved?: boolean
}

interface ExportJobsCtx {
  jobs: ExportJob[]
  startJob: (projectId: string, jobId: string, label: string) => void
  startPreviewJob: (projectId: string, videoId: string, jobId: string, label: string, targetBpm: number) => void
  savePreviewJob: (jobId: string) => Promise<void>
  dismissJob: (jobId: string) => void
  cancelJob: (jobId: string) => void
}

const ExportJobsContext = createContext<ExportJobsCtx>({
  jobs: [],
  startJob: () => {},
  startPreviewJob: () => {},
  savePreviewJob: async () => {},
  dismissJob: () => {},
  cancelJob: () => {},
})

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const POLL_INTERVAL = 2000

export const ExportJobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobsRef = useRef<ExportJob[]>([])
  const queryClient = useQueryClient()

  useEffect(() => { jobsRef.current = jobs }, [jobs])

  const updateJob = useCallback((jobId: string, patch: Partial<ExportJob>) => {
    setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, ...patch } : j))
  }, [])

  const poll = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE}/exports/jobs/${jobId}`)
      if (!res.ok) return
      const data = await res.json()
      const job = jobsRef.current.find(j => j.job_id === jobId)

      updateJob(jobId, {
        status: data.status,
        progress: data.progress,
        estimated_remaining_s: data.estimated_remaining_s,
        error: data.error,
      })

      if (data.status === 'done') {
        if (job?.type === 'preview') {
          updateJob(jobId, {
            previewUrl: `${API_BASE}/exports/jobs/${jobId}/stream`,
            progress: 100,
          })
          if (typeof Notification !== 'undefined') {
            const show = () => new Notification('Prévisualisation prête', {
              body: `La vidéo adaptée à ${job.targetBpm} BPM est disponible.`,
            })
            if (Notification.permission === 'granted') show()
            else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') show() })
          }
        } else {
          const a = document.createElement('a')
          a.href = `${API_BASE}/exports/jobs/${jobId}/download`
          a.click()
          if (typeof Notification !== 'undefined') {
            const show = () => new Notification('Export terminé', { body: `"${data.label}" est prêt.` })
            if (Notification.permission === 'granted') show()
            else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') show() })
          }
        }
      }
    } catch {
      // réseau indisponible — réessayer au prochain tick
    }
  }, [updateJob])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      jobs.filter(j => j.status === 'pending' || j.status === 'running').forEach(j => poll(j.job_id))
    }, POLL_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [jobs, poll])

  const startJob = useCallback((_projectId: string, jobId: string, label: string) => {
    setJobs(prev => [...prev, {
      job_id: jobId, label, type: 'export',
      status: 'pending', progress: 0,
      estimated_remaining_s: null, error: null,
    }])
  }, [])

  const startPreviewJob = useCallback((projectId: string, videoId: string, jobId: string, label: string, targetBpm: number) => {
    setJobs(prev => [...prev, {
      job_id: jobId, label, type: 'preview',
      status: 'pending', progress: 0,
      estimated_remaining_s: null, error: null,
      projectId, videoId, targetBpm, previewUrl: null, saved: false,
    }])
  }, [])

  const savePreviewJob = useCallback(async (jobId: string) => {
    const job = jobsRef.current.find(j => j.job_id === jobId)
    if (!job?.videoId || !job?.targetBpm) return
    try {
      const res = await fetch(`${API_BASE}/videos/${job.videoId}/preview-adapted/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, target_bpm: job.targetBpm }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        updateJob(jobId, { error: `Sauvegarde échouée: ${res.status} ${text}` })
        return
      }
      updateJob(jobId, { saved: true })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['video', job.videoId] })
    } catch (err) {
      updateJob(jobId, { error: `Sauvegarde échouée: ${(err as Error).message}` })
    }
  }, [updateJob, queryClient])

  const dismissJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(j => j.job_id !== jobId))
  }, [])

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      await fetch(`${API_BASE}/exports/jobs/${jobId}`, { method: 'DELETE' })
      updateJob(jobId, { status: 'error', error: 'Annulé' })
    } catch {
      // ignore
    }
  }, [updateJob])

  return (
    <ExportJobsContext.Provider value={{ jobs, startJob, startPreviewJob, savePreviewJob, dismissJob, cancelJob }}>
      {children}
    </ExportJobsContext.Provider>
  )
}

export const useExportJobs = () => useContext(ExportJobsContext)
