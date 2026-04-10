import { Annotation } from './annotation'

export interface Video {
  id: string
  project_id: string
  filename: string
  original_name: string
  filepath: string
  duration_seconds: number
  fps: number
  total_frames: number
  width: number
  height: number
  codec: string
  uploaded_at: string
  annotations: Annotation[]
}

export interface Project {
  id: string
  name: string
  description: string
  created_at: string
  videos: Video[]
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
}
