import json
import os
import shutil
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.schemas.assemblage import AssemblageExportRequest
from app.services.assemblage_service import assemble_videos, mix_audio_with_video
from app.services.job_manager import job_manager
from app.storage.json_store import get_video
from app.config import settings

router = APIRouter()

_AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'}


@router.post("/assemblage/export", status_code=202)
async def export_assemblage(
    config: str = Form(...),
    audio_file: Optional[UploadFile] = File(None),
):
    """Lance l'assemblage FFmpeg en arrière-plan. Retourne {job_id} immédiatement.

    config  : JSON stringifié de AssemblageExportRequest
    audio_file : piste audio optionnelle à mixer sur la vidéo finale
    """
    try:
        body = AssemblageExportRequest.model_validate_json(config)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    clips_paths: list[dict] = []
    for clip_req in sorted(body.clips, key=lambda c: c.order):
        video = get_video(clip_req.video_id)
        if video is None:
            raise HTTPException(status_code=404, detail=f"Video not found: {clip_req.video_id}")
        filepath = video.get("filepath") or video.get("path")
        if not filepath or not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail=f"Video file missing: {clip_req.video_id}")
        clips_paths.append({
            "path": filepath,
            "duration": float(video.get("duration_seconds") or 0),
        })

    job = job_manager.create_job(label="assemblage-export")
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)

    ts = int(time.time())
    video_path = os.path.join(settings.TEMP_DIR, f"assemblage_raw_{ts}_{job.id}.mp4")
    output_path = os.path.join(settings.TEMP_DIR, f"assemblage_{ts}_{job.id}.mp4")

    # Sauvegarder la piste audio si fournie
    audio_path: Optional[str] = None
    if audio_file and audio_file.filename:
        ext = Path(audio_file.filename).suffix.lower()
        if ext not in _AUDIO_EXTENSIONS:
            ext = ".mp3"
        audio_path = os.path.join(settings.TEMP_DIR, f"audio_{job.id}{ext}")
        with open(audio_path, "wb") as f:
            shutil.copyfileobj(audio_file.file, f)

    use_transitions = body.use_transitions
    transition_duration_s = body.transition_duration_s
    resolution = body.resolution

    def _run() -> str:
        def _progress(pct: int) -> None:
            # 70% pour l'assemblage, 30% pour le mix audio
            job_manager.update(job.id, progress=int(pct * (0.7 if audio_path else 1.0)))

        assembled = assemble_videos(
            clips_paths,
            video_path if audio_path else output_path,
            use_transitions=use_transitions,
            transition_duration_s=transition_duration_s,
            resolution=resolution,
            progress_cb=_progress,
            cancel_event=job.cancel_event,
        )

        if audio_path:
            job_manager.update(job.id, progress=70)
            result = mix_audio_with_video(assembled, audio_path, output_path)
            try:
                os.remove(assembled)
                os.remove(audio_path)
            except OSError:
                pass
            job_manager.update(job.id, progress=100)
            return result

        return assembled

    job_manager.launch(job, _run)
    return {"job_id": job.id}


@router.get("/assemblage/jobs/{job_id}/download")
async def download_assemblage_job(job_id: str):
    """Télécharge le MP4 assemblé quand le job est terminé."""
    job = job_manager.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "done":
        raise HTTPException(status_code=409, detail=f"Job not done (status={job.status})")
    if not job.result_path or not os.path.exists(job.result_path):
        raise HTTPException(status_code=410, detail="Result file no longer available")

    ts = int(time.time())
    filename = f"assemblage_{ts}.mp4"
    return FileResponse(
        path=job.result_path,
        media_type="video/mp4",
        filename=filename,
    )
