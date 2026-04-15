from pydantic import BaseModel
from typing import Literal


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
