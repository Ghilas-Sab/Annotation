export interface Project {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  videos?: Video[]
}

export interface Video {
  id: string
  project_id: string
  filename: string
  original_filename: string
  fps: number
  duration_seconds: number
  total_frames: number
  width: number
  height: number
  codec: string
  created_at: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
}
