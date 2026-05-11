from typing import List
from pydantic import BaseModel, field_validator


class AssemblageClipRequest(BaseModel):
    video_id: str
    order: int


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
