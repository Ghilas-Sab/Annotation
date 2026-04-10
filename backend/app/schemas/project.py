from pydantic import BaseModel, field_validator
from app.schemas.video import VideoRead


class ProjectCreate(BaseModel):
    name: str
    description: str = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name ne peut pas être vide")
        return v.strip()


class ProjectRead(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
    videos: list[VideoRead] = []
