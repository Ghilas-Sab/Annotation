const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export interface AssemblageClipRequest {
  video_id: string
  order: number
}

export interface AssemblageExportRequest {
  clips: AssemblageClipRequest[]
  use_transitions: boolean
  transition_duration_s: number
  resolution: string
  include_music: boolean
}

export async function startAssemblageExport(
  request: AssemblageExportRequest,
  audioBlob?: Blob | null,
  audioName?: string,
): Promise<string> {
  const formData = new FormData()
  formData.append('config', JSON.stringify(request))
  if (audioBlob) {
    formData.append('audio_file', audioBlob, audioName ?? 'music.mp3')
  }
  const res = await fetch(`${API_BASE}/assemblage/export`, {
    method: 'POST',
    body: formData,
    // Pas de Content-Type : le navigateur définit automatiquement le boundary multipart
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? `Export failed: ${res.status}`)
  }
  const data = await res.json()
  return data.job_id as string
}

export function getAssemblageDownloadUrl(jobId: string): string {
  return `${API_BASE}/assemblage/jobs/${jobId}/download`
}
