import { APIRequestContext } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:8000/api/v1'

export const TINY_VIDEO = path.join(__dirname, '../../fixtures/tiny.mp4')

export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  async createProject(name: string): Promise<{ id: string; name: string }> {
    const res = await this.request.post(`${API_BASE}/projects`, {
      data: { name, description: '' },
    })
    if (!res.ok()) throw new Error(`createProject failed ${res.status()}: ${await res.text()}`)
    return res.json()
  }

  async deleteProject(id: string): Promise<void> {
    await this.request.delete(`${API_BASE}/projects/${id}`)
  }

  async listProjects(): Promise<Array<{ id: string; name: string }>> {
    const res = await this.request.get(`${API_BASE}/projects`)
    return res.json()
  }

  async cleanupByPrefix(prefix: string): Promise<void> {
    const projects = await this.listProjects()
    for (const p of projects) {
      if (p.name.startsWith(prefix)) {
        await this.deleteProject(p.id)
      }
    }
  }

  // ── Videos ────────────────────────────────────────────────────────────────

  async uploadVideo(
    projectId: string,
    name = 'test-video.mp4'
  ): Promise<{ id: string; original_name: string; fps: number; total_frames: number }> {
    const buffer = readFileSync(TINY_VIDEO)
    const res = await this.request.post(`${API_BASE}/projects/${projectId}/videos`, {
      multipart: {
        file: { name, mimeType: 'video/mp4', buffer },
        display_name: name,
      },
    })
    if (!res.ok()) throw new Error(`uploadVideo failed ${res.status()}: ${await res.text()}`)
    return res.json()
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.request.delete(`${API_BASE}/videos/${videoId}`)
  }

  // ── Annotations ───────────────────────────────────────────────────────────

  async createAnnotation(
    videoId: string,
    frameNumber: number,
    label = 'Beat'
  ): Promise<{ id: string; frame_number: number; label: string }> {
    const res = await this.request.post(`${API_BASE}/videos/${videoId}/annotations`, {
      data: { frame_number: frameNumber, label },
    })
    if (!res.ok()) throw new Error(`createAnnotation failed ${res.status()}: ${await res.text()}`)
    return res.json()
  }

  async deleteAnnotation(id: string): Promise<void> {
    await this.request.delete(`${API_BASE}/annotations/${id}`)
  }

  async listAnnotations(videoId: string): Promise<Array<{ id: string; frame_number: number }>> {
    const res = await this.request.get(`${API_BASE}/videos/${videoId}/annotations`)
    return res.json()
  }

  async clearAnnotations(videoId: string): Promise<void> {
    await this.request.delete(`${API_BASE}/videos/${videoId}/annotations`)
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async createCategory(
    videoId: string,
    name: string,
    color = '#e94560'
  ): Promise<{ id: string; name: string; color: string }> {
    const res = await this.request.post(`${API_BASE}/videos/${videoId}/categories`, {
      data: { name, color },
    })
    if (!res.ok()) throw new Error(`createCategory failed ${res.status()}: ${await res.text()}`)
    return res.json()
  }

  async listCategories(videoId: string): Promise<Array<{ id: string; name: string }>> {
    const res = await this.request.get(`${API_BASE}/videos/${videoId}/categories`)
    return res.json()
  }
}
