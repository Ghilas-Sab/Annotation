from typing import List
from pydantic import BaseModel, field_validator


class AssemblageClipRequest(BaseModel):
    video_id: str
    order: int
    source_type: str = "original"
    trim_start: float = 0.0
    trim_end: float = 0.0
    fade_in: bool = False
    fade_out: bool = False
    fade_in_duration_s: float = 0.5
    fade_out_duration_s: float = 0.5


class AssemblageExportRequest(BaseModel):
    clips: List[AssemblageClipRequest]
    use_transitions: bool = False
    transition_duration_s: float = 0.5
    resolution: str = "720p"
    include_music: bool = False

    @field_validator("clips")
    @classmethod
    def clips_not_empty(cls, v: List[AssemblageClipRequest]) -> List[AssemblageClipRequest]:
        if not v:
            raise ValueError("clips must contain at least one item")
        return v
