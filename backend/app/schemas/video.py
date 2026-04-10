from pydantic import BaseModel


class VideoCreate(BaseModel):
    filename: str
    original_name: str
    filepath: str
    duration_seconds: float
    fps: float
    total_frames: int
    width: int
    height: int
    codec: str


class VideoRead(BaseModel):
    id: str
    project_id: str
    filename: str
    original_name: str
    filepath: str
    duration_seconds: float
    fps: float
    total_frames: int
    width: int
    height: int
    codec: str
    uploaded_at: str
