import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createExportJob,
  createPreviewJob,
  deletePreview,
  exportProject,
  downloadExportJson,
  downloadExportCsv,
  downloadExportVideo,
  downloadExportBundle,
  downloadSavedPreview,
  getJobDownloadUrl,
  getJobStatus,
  getSavedPreviewStreamUrl,
  savePreview,
} from './exports'

const API = 'http://localhost:8000/api/v1'

global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake-object')
global.URL.revokeObjectURL = vi.fn()
HTMLAnchorElement.prototype.click = vi.fn()

const okBlob = () => new Response(new Blob(['data']), { status: 200 })
const failJson = (status = 500, detail?: string) =>
  new Response(JSON.stringify(detail ? { detail } : {}), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => vi.restoreAllMocks())

// ─── downloadExportJson ───────────────────────────────────────────────────────

describe('downloadExportJson', () => {
  it('appelle fetch avec la bonne URL', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())
    downloadExportJson('v1') // ne pas await — URL.createObjectURL est asynchrone
    expect(mockFetch).toHaveBeenCalledWith(`${API}/videos/v1/export/json`)
  })

  it('lève une erreur si la réponse est non-ok', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(404))
    await expect(downloadExportJson('v1')).rejects.toThrow('Export failed: 404')
  })

  it('appelle URL.createObjectURL après succès', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())
    await downloadExportJson('v1')
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  it('appelle URL.revokeObjectURL pour nettoyer', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())
    await downloadExportJson('v1')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/fake-object')
  })
})

// ─── downloadExportCsv ────────────────────────────────────────────────────────

describe('downloadExportCsv', () => {
  it('appelle fetch avec la bonne URL CSV', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())
    downloadExportCsv('v1')
    expect(mockFetch).toHaveBeenCalledWith(`${API}/videos/v1/export/csv`)
  })

  it('lève une erreur si non-ok', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(500))
    await expect(downloadExportCsv('v1')).rejects.toThrow('Export failed: 500')
  })
})

// ─── downloadExportVideo ──────────────────────────────────────────────────────

describe('downloadExportVideo', () => {
  it('appelle fetch avec la bonne URL vidéo', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())
    downloadExportVideo('v1')
    expect(mockFetch).toHaveBeenCalledWith(`${API}/videos/v1/export/video`)
  })

  it('lève une erreur si non-ok', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(500))
    await expect(downloadExportVideo('v1')).rejects.toThrow('Export failed: 500')
  })
})

// ─── downloadExportBundle ─────────────────────────────────────────────────────

describe('downloadExportBundle', () => {
  it('POST avec les bons paramètres JSON', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())
    downloadExportBundle('v1', { targetBpm: 120, clipOnly: true, format: 'json' })
    expect(mockFetch).toHaveBeenCalledWith(
      `${API}/videos/v1/export/bundle`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ target_bpm: 120, clip_only: true, format: 'json' }),
      }),
    )
  })

  it('format csv est transmis correctement', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())
    downloadExportBundle('v1', { targetBpm: 90, clipOnly: false, format: 'csv' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ target_bpm: 90, clip_only: false, format: 'csv' }),
      }),
    )
  })

  it('lève une erreur avec le detail si présent', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(400, 'Paramètre manquant'))
    await expect(
      downloadExportBundle('v1', { targetBpm: 0, clipOnly: false, format: 'json' }),
    ).rejects.toThrow('Paramètre manquant')
  })

  it('lève une erreur générique si pas de detail', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(500))
    await expect(
      downloadExportBundle('v1', { targetBpm: 120, clipOnly: false, format: 'json' }),
    ).rejects.toThrow('Export failed: 500')
  })

  it('headers Content-Type sont application/json', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())
    downloadExportBundle('v1', { targetBpm: 120, clipOnly: false, format: 'json' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })
})

describe('project export jobs API', () => {
  it('exportProject POSTe la requête projet et retourne le blob', async () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('zip', { status: 200 }))

    const result = await exportProject('p1', { video_ids: ['v1'], formats: ['json'], video_bpm: { v1: 120 } })

    expect(mockFetch).toHaveBeenCalledWith(
      `${API}/projects/p1/export`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_ids: ['v1'], formats: ['json'], video_bpm: { v1: 120 } }),
      }),
    )
    await expect(result.text()).resolves.toBe('zip')
  })

  it('exportProject lève le detail backend si présent', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(422, 'Format invalide'))

    await expect(exportProject('p1', { video_ids: null, formats: [] })).rejects.toThrow('Format invalide')
  })

  it('createExportJob retourne job_id', async () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ job_id: 'job-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(createExportJob('p1', { video_ids: ['v1'], formats: ['csv'] })).resolves.toBe('job-1')
    expect(mockFetch).toHaveBeenCalledWith(
      `${API}/exports/jobs?project_id=p1`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('createExportJob lève une erreur générique sans detail', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(500))
    await expect(createExportJob('p1', { video_ids: [], formats: [] })).rejects.toThrow('Job creation failed: 500')
  })
})

describe('preview jobs API', () => {
  it('createPreviewJob POSTe target_bpm et retourne job_id', async () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ job_id: 'preview-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(createPreviewJob('v1', 128)).resolves.toBe('preview-1')
    expect(mockFetch).toHaveBeenCalledWith(
      `${API}/videos/v1/preview-jobs`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ target_bpm: 128 }),
      }),
    )
  })

  it('createPreviewJob lève le detail backend', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(400, 'BPM invalide'))
    await expect(createPreviewJob('v1', 0)).rejects.toThrow('BPM invalide')
  })

  it('getJobStatus charge le statut', async () => {
    const status = { id: 'job-1', label: 'Export', status: 'running', progress: 50, estimated_remaining_s: 10, error: null }
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(status), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(getJobStatus('job-1')).resolves.toEqual(status)
  })

  it('getJobStatus lève si le job est introuvable', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(404))
    await expect(getJobStatus('missing')).rejects.toThrow('Job not found: 404')
  })
})

describe('saved preview API', () => {
  it('savePreview POSTe job_id et target_bpm', async () => {
    const body = { adapted_preview: { bpm: 120, created_at: '2026-05-06T00:00:00Z' } }
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(savePreview('v1', 'job-1', 120)).resolves.toEqual(body)
    expect(mockFetch).toHaveBeenCalledWith(
      `${API}/videos/v1/preview-adapted/save`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ job_id: 'job-1', target_bpm: 120 }),
      }),
    )
  })

  it('savePreview lève une erreur si la sauvegarde échoue', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(409, 'Déjà sauvegardé'))
    await expect(savePreview('v1', 'job-1', 120)).rejects.toThrow('Déjà sauvegardé')
  })

  it('deletePreview appelle DELETE', async () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await deletePreview('v1')

    expect(mockFetch).toHaveBeenCalledWith(`${API}/videos/v1/preview-adapted`, { method: 'DELETE' })
  })

  it('deletePreview lève si DELETE échoue', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(failJson(500))
    await expect(deletePreview('v1')).rejects.toThrow('Delete preview failed: 500')
  })

  it('downloadSavedPreview télécharge depuis la bonne URL', () => {
    const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(okBlob())

    downloadSavedPreview('v1')

    expect(mockFetch).toHaveBeenCalledWith(`${API}/videos/v1/preview-adapted/download`)
  })

  it('construit les URLs publiques', () => {
    expect(getJobDownloadUrl('job-1')).toBe(`${API}/exports/jobs/job-1/download`)
    expect(getSavedPreviewStreamUrl('v1')).toBe(`${API}/videos/v1/preview-adapted/stream`)
  })
})
