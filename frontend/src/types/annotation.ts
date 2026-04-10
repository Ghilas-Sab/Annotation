export interface Annotation {
  id: string
  video_id: string
  frame_number: number
  timestamp_seconds: number
  label: string
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateAnnotationRequest {
  frame_number: number
  timestamp_seconds: number
  label: string
  data?: Record<string, unknown>
}

export interface UpdateAnnotationRequest {
  label?: string
  data?: Record<string, unknown>
}
