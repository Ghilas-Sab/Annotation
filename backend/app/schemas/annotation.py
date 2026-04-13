from pydantic import BaseModel


class AnnotationCreate(BaseModel):
    frame_number: int
    label: str = ""


class AnnotationRead(BaseModel):
    id: str
    video_id: str
    frame_number: int
    timestamp_ms: float
    label: str
    created_at: str
    updated_at: str


class BulkCreate(BaseModel):
    start_frame: int
    end_frame: int
    count: int
    prefix: str = ""


class ShiftRequest(BaseModel):
    offset_ms: float
