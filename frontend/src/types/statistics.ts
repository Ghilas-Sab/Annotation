export interface ProjectStatistics {
  project_id: string
  total_videos: number
  total_annotations: number
  annotated_frames: number
  annotation_rate: number
}

export interface VideoStatistics {
  video_id: string
  total_frames: number
  annotated_frames: number
  annotation_rate: number
  labels_distribution: Record<string, number>
}

export interface GlobalStatistics {
  total_projects: number
  total_videos: number
  total_annotations: number
  projects: ProjectStatistics[]
}
