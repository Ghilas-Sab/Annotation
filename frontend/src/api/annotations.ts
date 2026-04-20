import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Annotation, Category, CreateAnnotationRequest, UpdateAnnotationRequest } from '../types/annotation'

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
    mutationFn: async (data: { start_frame: number; end_frame: number; count: number; prefix: string; category_id?: string }) => {
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
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['statistics', videoId] })
    },
  })
}

export function useCreateAnnotation(videoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateAnnotationRequest) => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur création annotation')
      return res.json() as Promise<Annotation>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annotations', videoId] })
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['statistics', videoId] })
    },
  })
}

export function useUpdateAnnotation(videoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAnnotationRequest }) => {
      const res = await fetch(`${API_BASE}/annotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur mise à jour annotation')
      return res.json() as Promise<Annotation>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annotations', videoId] })
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['statistics', videoId] })
    },
  })
}

export function useDeleteAnnotation(videoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (annotationId: string) => {
      const res = await fetch(`${API_BASE}/annotations/${annotationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erreur suppression annotation')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annotations', videoId] })
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['statistics', videoId] })
    },
  })
}

export function useShiftAnnotations(videoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (offsetMs: number) => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/annotations/shift`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset_ms: offsetMs }),
      })
      if (!res.ok) throw new Error('Erreur décalage annotations')
      return res.json() as Promise<Annotation[]>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annotations', videoId] })
      qc.invalidateQueries({ queryKey: ['project'] })
      qc.invalidateQueries({ queryKey: ['statistics', videoId] })
    },
  })
}

export function useCategories(videoId: string) {
  return useQuery({
    queryKey: ['categories', videoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/categories`)
      if (!res.ok) throw new Error('Erreur chargement catégories')
      return res.json() as Promise<Category[]>
    },
    enabled: !!videoId,
  })
}

export function useCreateCategory(videoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur création catégorie')
      return res.json() as Promise<Category>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', videoId] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const res = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) throw new Error('Erreur mise à jour catégorie')
      return res.json() as Promise<Category>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await fetch(`${API_BASE}/categories/${categoryId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression catégorie')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
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
      qc.invalidateQueries({ queryKey: ['statistics', videoId] })
    },
  })
}
