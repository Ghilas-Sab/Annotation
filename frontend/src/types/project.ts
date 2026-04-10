export interface Project {
  id: string
  name: string
  description: string
  created_at: string
  updated_at?: string
  videos: Video[]
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
}

export interface Annotation {
  id: string
  frame: number
  label: string
  data?: Record<string, unknown>
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
}
