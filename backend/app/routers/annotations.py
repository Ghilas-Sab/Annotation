from fastapi import APIRouter, HTTPException, status
from app.storage import json_store
from app.schemas.annotation import AnnotationCreate, AnnotationRead, BulkCreate, ShiftRequest
from typing import Optional
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["annotations"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/videos/{video_id}/annotations", response_model=AnnotationRead, status_code=201)
async def create_annotation(video_id: str, body: AnnotationCreate):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    if body.frame_number < 0:
        raise HTTPException(status_code=422, detail="frame_number ne peut pas être négatif")
    
    if body.frame_number > video["total_frames"]:
        raise HTTPException(status_code=422, detail=f"frame_number ({body.frame_number}) dépasse total_frames ({video['total_frames']})")

    # Calcul timestamp_ms = frame_number / fps * 1000
    timestamp_ms = (body.frame_number / video["fps"]) * 1000

    # Résoudre category_id : utiliser la catégorie par défaut si absent
    category_id = body.category_id
    if not category_id:
        default_cat = json_store.get_default_category(video_id)
        category_id = default_cat["id"] if default_cat else None

    annotation = {
        "id": str(uuid.uuid4()),
        "video_id": video_id,
        "frame_number": body.frame_number,
        "timestamp_ms": timestamp_ms,
        "label": body.label,
        "category_id": category_id,
        "created_at": _now(),
        "updated_at": _now(),
    }

    json_store.add_annotation(video_id, annotation)
    return annotation


@router.get("/videos/{video_id}/annotations", response_model=list[AnnotationRead])
async def list_annotations(video_id: str):
    annotations = json_store.get_annotations(video_id)
    if annotations is None:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    
    return sorted(annotations, key=lambda a: a["frame_number"])


@router.put("/annotations/{annotation_id}", response_model=AnnotationRead)
async def update_annotation(annotation_id: str, body: AnnotationCreate):
    # On cherche la vidéo parente pour le FPS
    parent_video = None
    target_ann = None
    
    for project in json_store.get_projects():
        for video in project.get("videos", []):
            for ann in video.get("annotations", []):
                if ann["id"] == annotation_id:
                    parent_video = video
                    target_ann = ann
                    break
    
    if not target_ann:
        raise HTTPException(status_code=404, detail="Annotation introuvable")

    if body.frame_number < 0:
        raise HTTPException(status_code=422, detail="frame_number ne peut pas être négatif")
    
    if body.frame_number > parent_video["total_frames"]:
        raise HTTPException(status_code=422, detail=f"frame_number ({body.frame_number}) dépasse total_frames ({parent_video['total_frames']})")

    timestamp_ms = (body.frame_number / parent_video["fps"]) * 1000

    updated = json_store.update_annotation(
        annotation_id, 
        frame_number=body.frame_number, 
        label=body.label,
        timestamp_ms=timestamp_ms
    )
    return updated


@router.delete("/annotations/{annotation_id}", status_code=204)
async def delete_annotation(annotation_id: str):
    if not json_store.delete_annotation(annotation_id):
        raise HTTPException(status_code=404, detail="Annotation introuvable")


@router.delete("/videos/{video_id}/annotations", status_code=204)
async def delete_all_annotations(video_id: str):
    if not json_store.delete_all_annotations(video_id):
        raise HTTPException(status_code=404, detail="Vidéo introuvable")


@router.post("/videos/{video_id}/annotations/bulk", response_model=list[AnnotationRead], status_code=201)
async def bulk_create_annotations(video_id: str, body: BulkCreate):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    if body.count < 2:
        raise HTTPException(status_code=422, detail="count doit être ≥ 2")
    if body.start_frame < 0:
        raise HTTPException(status_code=422, detail="start_frame ne peut pas être négatif")
    if body.end_frame <= body.start_frame:
        raise HTTPException(status_code=422, detail="end_frame doit être > start_frame")
    if body.end_frame > video["total_frames"]:
        raise HTTPException(status_code=422, detail=f"end_frame ({body.end_frame}) dépasse total_frames ({video['total_frames']})")

    fps = video["fps"]
    interval = (body.end_frame - body.start_frame) / (body.count - 1)
    now = _now()

    category_id = body.category_id
    if not category_id:
        default_cat = json_store.get_default_category(video_id)
        category_id = default_cat["id"] if default_cat else None

    annotations = []
    for i in range(body.count):
        frame = round(body.start_frame + i * interval)
        label = f"{body.prefix} {i + 1}" if body.prefix else str(i + 1)
        annotations.append({
            "id": str(uuid.uuid4()),
            "video_id": video_id,
            "frame_number": frame,
            "timestamp_ms": frame / fps * 1000,
            "label": label,
            "category_id": category_id,
            "created_at": now,
            "updated_at": now,
        })

    json_store.bulk_add_annotations(video_id, annotations)
    return annotations


@router.patch("/videos/{video_id}/annotations/shift", response_model=list[AnnotationRead])
async def shift_annotations(video_id: str, body: ShiftRequest):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    fps = video["fps"]
    offset_frames = round(body.offset_ms / 1000 * fps)
    annotations = json_store.get_annotations(video_id)

    for ann in annotations:
        if ann["frame_number"] + offset_frames < 0:
            raise HTTPException(
                status_code=422,
                detail="Shift invalide : une annotation passerait sous la frame 0"
            )

    updated = json_store.shift_video_annotations(video_id, offset_frames)
    return sorted(updated, key=lambda a: a["frame_number"])
