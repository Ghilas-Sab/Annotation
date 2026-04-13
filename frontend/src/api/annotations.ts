import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Annotation } from '../types/annotation'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export function useAnnotations(videoId: string) {
  return useQuery({
    queryKey: ['annotations', videoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/annotations`)
      if (!res.ok) throw new Error('Erreur chargement annotations')
      return res.json() as Promise<Annotation[]>
    },
    enabled: !!videoId,
  })
}

export function useCreateBulkAnnotations(videoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { start_frame: number; end_frame: number; count: number; prefix: string }) => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/annotations/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur placement automatique')
      return res.json() as Promise<Annotation[]>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annotations', videoId] })
      qc.invalidateQueries({ queryKey: ['project'] }) // Pour mettre à jour les compteurs dans les autres pages
    },
  })
}

export function useDeleteAllAnnotations(videoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/annotations`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erreur suppression annotations')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annotations', videoId] })
      qc.invalidateQueries({ queryKey: ['project'] })
    },
  })
}
