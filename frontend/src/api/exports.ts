const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

async function triggerDownload(url: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.click()
  URL.revokeObjectURL(objectUrl)
}

export async function downloadExportJson(videoId: string): Promise<void> {
  await triggerDownload(`${API_BASE}/videos/${videoId}/export/json`)
}

export async function downloadExportCsv(videoId: string): Promise<void> {
  await triggerDownload(`${API_BASE}/videos/${videoId}/export/csv`)
}

export async function downloadExportVideo(videoId: string): Promise<void> {
  await triggerDownload(`${API_BASE}/videos/${videoId}/export/video`)
}

export interface BundleExportParams {
  targetBpm: number
  clipOnly: boolean
  format: 'json' | 'csv'
}

export interface ProjectExportRequest {
  video_ids: string[] | null
  formats: string[]
  video_bpm?: Record<string, number>
}

export async function exportProject(
  projectId: string,
  request: ProjectExportRequest,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? `Export failed: ${res.status}`)
  }
  return res.blob()
}

export async function createExportJob(
  projectId: string,
  request: ProjectExportRequest,
): Promise<string> {
  const res = await fetch(`${API_BASE}/exports/jobs?project_id=${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? `Job creation failed: ${res.status}`)
  }
  const data = await res.json()
  return data.job_id as string
}

export async function downloadExportBundle(
  videoId: string,
  params: BundleExportParams,
): Promise<void> {
  const res = await fetch(`${API_BASE}/videos/${videoId}/export/bundle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_bpm: params.targetBpm,
      clip_only: params.clipOnly,
      format: params.format,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? `Export failed: ${res.status}`)
  }
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.click()
  URL.revokeObjectURL(objectUrl)
}
