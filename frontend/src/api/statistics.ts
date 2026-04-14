import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BpmStatisticsResponse } from '../types/statistics'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export function useVideoStatistics(videoId: string) {
  return useQuery({
    queryKey: ['statistics', videoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/statistics`)
      if (!res.ok) throw new Error('Erreur chargement statistiques')
      return res.json() as Promise<BpmStatisticsResponse>
    },
    enabled: !!videoId,
  })
}

export function useInvalidateStatistics() {
  const qc = useQueryClient()
  return (videoId: string) => {
    qc.invalidateQueries({ queryKey: ['statistics', videoId] })
  }
}
