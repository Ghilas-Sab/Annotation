export interface Category {
  id: string
  video_id: string
  name: string
  color: string
  created_at: string
}

export interface Annotation {
  id: string
  video_id: string
  frame_number: number
  timestamp_ms: number
  label: string
  category_id?: string
  category?: Category
  created_at: string
  updated_at: string
}

export interface CreateAnnotationRequest {
  frame_number: number
  label: string
  category_id?: string
}

export interface UpdateAnnotationRequest {
  frame_number: number
  label: string
}
