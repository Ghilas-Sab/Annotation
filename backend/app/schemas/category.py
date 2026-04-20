from pydantic import BaseModel, field_validator


class CategoryCreate(BaseModel):
    name: str
    color: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name ne peut pas être vide")
        return v


class CategoryUpdate(BaseModel):
    name: str
    color: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name ne peut pas être vide")
        return v


class CategoryResponse(BaseModel):
    id: str
    video_id: str
    name: str
    color: str
    created_at: str
