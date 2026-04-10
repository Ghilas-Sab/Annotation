import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Project, Video } from '../types/project'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects`)
      if (!res.ok) throw new Error('Erreur chargement projets')
      return res.json() as Promise<Project[]>
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects/${id}`)
      if (!res.ok) throw new Error('Erreur chargement projet')
      return res.json() as Promise<Project>
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur création projet')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression projet')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUploadVideo(projectId: string, onProgress?: (pct: number) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      return new Promise<Video>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_BASE}/projects/${projectId}/videos`)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('Erreur upload vidéo'))
          }
        }

        xhr.onerror = () => reject(new Error('Erreur réseau lors de l\'upload'))

        const formData = new FormData()
        formData.append('file', file)
        xhr.send(formData)
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

export function useDeleteVideo(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (videoId: string) => {
      const res = await fetch(`${API_BASE}/videos/${videoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression vidéo')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}
