import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Project } from '../types/project'

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
