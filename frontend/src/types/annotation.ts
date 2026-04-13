export interface Annotation {
  id: string
  video_id: string
  frame_number: number
  timestamp_ms: number
  label: string
  created_at: string
  updated_at: string
}

export interface CreateAnnotationRequest {
  frame_number: number
  label: string
}

export interface UpdateAnnotationRequest {
  frame_number: number
  label: string
}
