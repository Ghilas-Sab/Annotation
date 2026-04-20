import mimetypes
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from typing import Optional
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Response

from app.storage import json_store
from app.services.video_service import get_video_metadata

router = APIRouter(tags=["videos"])


def _videos_dir() -> str:
    return os.getenv("VIDEOS_DIR", "/videos")


@router.post("/projects/{project_id}/videos", status_code=201)
async def upload_video(
    project_id: str,
    file: UploadFile = File(...),
    display_name: Optional[str] = Form(None),
):
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    ext = Path(file.filename).suffix.lower()
    filename = f"{uuid.uuid4()}{ext}"
    videos_dir = _videos_dir()
    filepath = os.path.join(videos_dir, filename)
    os.makedirs(videos_dir, exist_ok=True)

    # `UploadFile.read()` hangs under the current ASGI test setup.
    # Stream-copy from the underlying file object keeps uploads reliable
    # both in tests and in runtime.
    file.file.seek(0)
    with open(filepath, "wb") as destination:
        shutil.copyfileobj(file.file, destination)

    try:
        meta = get_video_metadata(filepath)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=422, detail=f"Erreur FFmpeg: {e}")

    video = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "filename": filename,
        "original_name": display_name if display_name else file.filename,
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


@router.get("/videos/{video_id}/stream")
async def stream_video(video_id: str, request: Request):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    filepath = video.get("filepath", "")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Fichier vidéo introuvable")

    file_size = os.path.getsize(filepath)
    mime_type, _ = mimetypes.guess_type(filepath)
    if not mime_type or not mime_type.startswith("video/"):
        mime_type = "video/mp4"

    range_header = request.headers.get("Range")

    if range_header:
        range_spec = range_header.replace("bytes=", "")
        start_str, end_str = range_spec.split("-")
        start = int(start_str)
        end = int(end_str) if end_str else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        with open(filepath, "rb") as f:
            f.seek(start)
            payload = f.read(chunk_size)

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(payload)),
        }
        return Response(content=payload, status_code=206, media_type=mime_type, headers=headers)
    else:
        with open(filepath, "rb") as f:
            payload = f.read()

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(len(payload)),
        }
        return Response(content=payload, status_code=200, media_type=mime_type, headers=headers)


@router.delete("/videos/{video_id}", status_code=204)
async def delete_video(video_id: str):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    if os.path.exists(video.get("filepath", "")):
        os.remove(video["filepath"])
    json_store.delete_video(video_id)
