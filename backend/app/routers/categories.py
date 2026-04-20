import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from app.storage import json_store
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(tags=["categories"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/videos/{video_id}/categories", response_model=list[CategoryResponse])
async def list_categories(video_id: str):
    result = json_store.get_categories(video_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    return result


@router.post("/videos/{video_id}/categories", response_model=CategoryResponse, status_code=201)
async def create_category(video_id: str, body: CategoryCreate):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    existing = json_store.get_categories(video_id) or []
    if any(c["name"].lower() == body.name.lower() for c in existing):
        raise HTTPException(status_code=409, detail="Une catégorie avec ce nom existe déjà")
    if any(c["color"].lower() == body.color.lower() for c in existing):
        raise HTTPException(status_code=409, detail="Une catégorie avec cette couleur existe déjà")

    category = {
        "id": str(uuid.uuid4()),
        "video_id": video_id,
        "name": body.name,
        "color": body.color,
        "created_at": _now(),
        "is_default": False,
    }
    json_store.add_category(video_id, category)
    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, body: CategoryUpdate):
    cat = json_store.get_category(category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    if cat.get("is_default"):
        raise HTTPException(status_code=409, detail="La catégorie par défaut ne peut pas être modifiée")
    updated = json_store.update_category(category_id, name=body.name, color=body.color)
    return updated


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(category_id: str):
    cat = json_store.get_category(category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    if cat.get("is_default"):
        raise HTTPException(status_code=409, detail="La catégorie par défaut ne peut pas être supprimée")
    json_store.delete_category(category_id)
