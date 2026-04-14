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

// Epic 4 — Métriques BPM
export interface RhythmicSegment {
  start_frame: number
  end_frame: number
  start_seconds: number
  end_seconds: number
  bpm: number
  annotation_count: number
}

export interface BpmStatisticsResponse {
  bpm_global: number
  bpm_mean: number
  bpm_median: number
  bpm_variation: number
  interval_std_seconds: number
  annotation_density_per_minute: number
  interval_distribution: number[]
  rhythmic_segments: RhythmicSegment[]
  activity_peaks: Record<string, number>[]
  error?: string
}
