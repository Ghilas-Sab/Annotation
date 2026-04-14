import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { BpmStatisticsResponse, PlaybackSpeedResponse } from '../types/statistics'

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

export function usePlaybackSpeed(videoId: string) {
  return useMutation({
    mutationFn: async (targetBpm: number): Promise<PlaybackSpeedResponse> => {
      const res = await fetch(`${API_BASE}/videos/${videoId}/statistics/playback-speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_bpm: targetBpm }),
      })
      if (!res.ok) throw new Error('Erreur calcul vitesse de lecture')
      return res.json()
    },
  })
}
