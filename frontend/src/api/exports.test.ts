import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  downloadExportJson,
  downloadExportCsv,
  downloadExportVideo,
  downloadExportBundle,
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
