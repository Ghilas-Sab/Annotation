from __future__ import annotations

from typing import Any

import numpy as np
from scipy.signal import find_peaks


def _extract_sorted_frames(annotations: list[Any]) -> list[int]:
    frames = [
        annotation["frame_number"] if isinstance(annotation, dict) else annotation.frame_number
        for annotation in annotations
    ]
    return sorted(int(frame) for frame in frames)


def _positive_intervals_seconds(frames: list[int], fps: float) -> np.ndarray:
    intervals_frames = np.diff(frames)
    positive_intervals = intervals_frames[intervals_frames > 0]
    return positive_intervals / fps


def _detect_segments(frames: list[int], fps: float) -> list[dict[str, float | int]]:
    if len(frames) < 2:
        return []

    intervals_seconds = _positive_intervals_seconds(frames, fps)
    if len(intervals_seconds) == 0:
        return []

    intervals_bpm = 60.0 / intervals_seconds
    tolerance_bpm = 5.0
    segments: list[dict[str, float | int]] = []
    start_idx = 0

    for idx in range(1, len(intervals_bpm)):
        if abs(float(intervals_bpm[idx] - intervals_bpm[idx - 1])) > tolerance_bpm:
            end_interval_idx = idx - 1
            start_frame = frames[start_idx]
            end_frame = frames[end_interval_idx + 1]
            segment_bpms = intervals_bpm[start_idx : end_interval_idx + 1]
            segments.append(
                {
                    "start_frame": start_frame,
                    "end_frame": end_frame,
                    "start_seconds": float(start_frame / fps),
                    "end_seconds": float(end_frame / fps),
                    "bpm": float(np.mean(segment_bpms)),
                    "annotation_count": int(end_interval_idx - start_idx + 2),
                }
            )
            start_idx = idx

    start_frame = frames[start_idx]
    end_frame = frames[len(intervals_bpm)]
    segment_bpms = intervals_bpm[start_idx:]
    segments.append(
        {
            "start_frame": start_frame,
            "end_frame": end_frame,
            "start_seconds": float(start_frame / fps),
            "end_seconds": float(end_frame / fps),
            "bpm": float(np.mean(segment_bpms)),
            "annotation_count": int(len(segment_bpms) + 1),
        }
    )
    return segments


def _detect_peaks(frames: list[int], fps: float) -> list[dict[str, float | int]]:
    if len(frames) < 2:
        return []

    times_seconds = np.array(frames, dtype=float) / fps
    bin_count = max(1, int(np.ceil(times_seconds[-1])) + 1)
    counts, edges = np.histogram(times_seconds, bins=bin_count, range=(0, bin_count))
    peak_indices, _ = find_peaks(counts)

    if len(peak_indices) == 0 and counts.size > 0 and counts.max() > 0:
        peak_indices = np.array([int(np.argmax(counts))])

    peaks: list[dict[str, float | int]] = []
    for peak_idx in peak_indices:
        peaks.append(
            {
                "start_seconds": float(edges[peak_idx]),
                "end_seconds": float(edges[peak_idx + 1]),
                "peak_time_seconds": float((edges[peak_idx] + edges[peak_idx + 1]) / 2),
                "annotation_count": int(counts[peak_idx]),
            }
        )
    return peaks


def compute_bpm_metrics(annotations: list[Any], fps: float) -> dict[str, Any]:
    if fps <= 0:
        return {"error": "FPS invalide"}
    if len(annotations) < 2:
        return {"error": "Minimum 2 annotations requises"}

    frames = _extract_sorted_frames(annotations)
    intervals_seconds = _positive_intervals_seconds(frames, fps)

    if len(intervals_seconds) == 0:
        return {"error": "Minimum 2 annotations requises"}

    intervals_bpm = 60.0 / intervals_seconds
    mean_interval_seconds = float(np.mean(intervals_seconds))
    covered_duration_minutes = (frames[-1] / fps) / 60
    density = len(frames) / covered_duration_minutes if covered_duration_minutes > 0 else 0.0

    return {
        "bpm_global": float(60.0 / mean_interval_seconds),
        "bpm_mean": float(np.mean(intervals_bpm)),
        "bpm_median": float(np.median(intervals_bpm)),
        "bpm_variation": float(np.max(intervals_bpm) - np.min(intervals_bpm)),
        "interval_std_seconds": float(np.std(intervals_seconds)),
        "annotation_density_per_minute": float(density),
        "interval_distribution": [float(value) for value in intervals_seconds.tolist()],
        "rhythmic_segments": _detect_segments(frames, fps),
        "activity_peaks": _detect_peaks(frames, fps),
    }


def compute_playback_speed(current_bpm: float, target_bpm: float) -> float:
    return target_bpm / current_bpm
