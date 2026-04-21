from pydantic import BaseModel, field_validator
from typing import Literal, List, Optional, Dict


class ExportAnnotation(BaseModel):
    frame_number: int
    timestamp_ms: float
    label: str
    created_at: str


class ExportVideo(BaseModel):
    id: str
    filename: str
    fps: float
    duration_seconds: float
    total_frames: int


class JsonExportResponse(BaseModel):
    video: ExportVideo
    annotations: list[ExportAnnotation]


class BundleExportRequest(BaseModel):
    target_bpm: float
    clip_only: bool = False
    format: Literal["json", "csv"] = "json"


_ALLOWED_FORMATS = {"json", "csv", "video"}


class ProjectExportRequest(BaseModel):
    video_ids: Optional[List[str]] = None
    formats: List[str]
    video_bpm: Optional[Dict[str, float]] = None

    @field_validator("formats")
    @classmethod
    def validate_formats(cls, v: List[str]) -> List[str]:
        invalid = [f for f in v if f not in _ALLOWED_FORMATS]
        if invalid:
            raise ValueError(f"Formats invalides : {invalid}. Valeurs acceptées : {_ALLOWED_FORMATS}")
        return v
