from pydantic import BaseModel, field_validator
from typing import Any


class PlaybackSpeedRequest(BaseModel):
    target_bpm: float

    @field_validator("target_bpm")
    @classmethod
    def target_bpm_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("target_bpm doit être strictement positif")
        return v


class PlaybackSpeedResponse(BaseModel):
    playback_speed: float
    current_bpm: float
    target_bpm: float


class BpmStatisticsResponse(BaseModel):
    bpm_global: float
    bpm_mean: float
    bpm_median: float
    bpm_variation: float
    interval_std_seconds: float
    annotation_density_per_minute: float
    interval_distribution: list[float]
    rhythmic_segments: list[dict[str, Any]]
    activity_peaks: list[dict[str, Any]]
    error: str | None = None
