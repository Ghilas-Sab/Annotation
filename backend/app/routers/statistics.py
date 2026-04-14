from fastapi import APIRouter, HTTPException
from app.storage import json_store
from app.services.stats_service import compute_bpm_metrics, compute_playback_speed
from app.schemas.statistics import PlaybackSpeedRequest, PlaybackSpeedResponse

router = APIRouter(tags=["statistics"])


@router.get("/videos/{video_id}/statistics")
async def get_statistics(video_id: str):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    annotations = video.get("annotations", [])
    fps = video.get("fps", 25.0)
    return compute_bpm_metrics(annotations, fps)


@router.post("/videos/{video_id}/statistics/playback-speed", response_model=PlaybackSpeedResponse)
async def get_playback_speed(video_id: str, body: PlaybackSpeedRequest):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    annotations = video.get("annotations", [])
    fps = video.get("fps", 25.0)
    metrics = compute_bpm_metrics(annotations, fps)

    if "error" in metrics:
        raise HTTPException(
            status_code=422,
            detail=f"Impossible de calculer le BPM courant : {metrics['error']}",
        )

    current_bpm = metrics["bpm_global"]
    speed = compute_playback_speed(current_bpm, body.target_bpm)

    return PlaybackSpeedResponse(
        playback_speed=speed,
        current_bpm=current_bpm,
        target_bpm=body.target_bpm,
    )
