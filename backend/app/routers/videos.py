import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.storage import json_store
from app.services.video_service import get_video_metadata

router = APIRouter(tags=["videos"])


def _videos_dir() -> str:
    return os.getenv("VIDEOS_DIR", "/videos")


@router.post("/projects/{project_id}/videos", status_code=201)
async def upload_video(project_id: str, file: UploadFile = File(...)):
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    ext = Path(file.filename).suffix.lower()
    filename = f"{uuid.uuid4()}{ext}"
    videos_dir = _videos_dir()
    filepath = os.path.join(videos_dir, filename)
    os.makedirs(videos_dir, exist_ok=True)

    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)

    try:
        meta = get_video_metadata(filepath)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=422, detail=f"Erreur FFmpeg: {e}")

    video = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "filename": filename,
        "original_name": file.filename,
        "filepath": filepath,
        "duration_seconds": meta["duration_seconds"],
        "fps": meta["fps"],
        "total_frames": meta["total_frames"],
        "width": meta["width"],
        "height": meta["height"],
        "codec": meta["codec"],
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "annotations": [],
    }
    json_store.add_video_to_project(project_id, video)
    return video


@router.get("/projects/{project_id}/videos")
async def list_videos(project_id: str):
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project.get("videos", [])


@router.get("/videos/{video_id}")
async def get_video(video_id: str):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    return video


@router.delete("/videos/{video_id}", status_code=204)
async def delete_video(video_id: str):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    if os.path.exists(video.get("filepath", "")):
        os.remove(video["filepath"])
    json_store.delete_video(video_id)
