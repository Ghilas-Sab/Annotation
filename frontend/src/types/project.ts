import { Annotation } from './annotation'

export interface Project {
  id: string
  name: string
  description: string
  created_at: string
  updated_at?: string
  videos: Video[]
}

export interface AdaptedPreview {
  path?: string
  bpm: number
  created_at: string
}

export interface Video {
  id: string
  project_id: string
  filename: string
  original_name: string
  fps: number
  duration_seconds: number
  total_frames: number
  width: number
  height: number
  codec: string
  uploaded_at: string
  annotations: Annotation[]
  adapted_preview?: AdaptedPreview
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
}
