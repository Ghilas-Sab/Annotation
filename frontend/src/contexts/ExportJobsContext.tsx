import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export interface ExportJob {
  job_id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  estimated_remaining_s: number | null
  error: string | null
}

interface ExportJobsCtx {
  jobs: ExportJob[]
  startJob: (projectId: string, jobId: string, label: string) => void
  dismissJob: (jobId: string) => void
  cancelJob: (jobId: string) => void
}

const ExportJobsContext = createContext<ExportJobsCtx>({
  jobs: [],
  startJob: () => {},
  dismissJob: () => {},
  cancelJob: () => {},
})

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const POLL_INTERVAL = 2000

export const ExportJobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<ExportJob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateJob = useCallback((jobId: string, patch: Partial<ExportJob>) => {
    setJobs(prev => prev.map(j => j.job_id === jobId ? { ...j, ...patch } : j))
  }, [])

  const poll = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE}/exports/jobs/${jobId}`)
      if (!res.ok) return
      const data = await res.json()
      updateJob(jobId, {
        status: data.status,
        progress: data.progress,
        estimated_remaining_s: data.estimated_remaining_s,
        error: data.error,
      })

      if (data.status === 'done') {
        // Téléchargement automatique
        const a = document.createElement('a')
        a.href = `${API_BASE}/exports/jobs/${jobId}/download`
        a.click()

        // Notification navigateur
        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'granted') {
            new Notification('Export terminé', { body: `"${data.label}" est prêt.` })
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => {
              if (p === 'granted') new Notification('Export terminé', { body: `"${data.label}" est prêt.` })
            })
          }
        }
      }
    } catch {
      // réseau indisponible — on réessaie au prochain tick
    }
  }, [updateJob])

  // Polling de tous les jobs actifs
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      jobs.filter(j => j.status === 'pending' || j.status === 'running').forEach(j => poll(j.job_id))
    }, POLL_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [jobs, poll])

  const startJob = useCallback((_projectId: string, jobId: string, label: string) => {
    setJobs(prev => [...prev, {
      job_id: jobId,
      label,
      status: 'pending',
      progress: 0,
      estimated_remaining_s: null,
      error: null,
    }])
  }, [])

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
    <ExportJobsContext.Provider value={{ jobs, startJob, dismissJob, cancelJob }}>
      {children}
    </ExportJobsContext.Provider>
  )
}

export const useExportJobs = () => useContext(ExportJobsContext)
