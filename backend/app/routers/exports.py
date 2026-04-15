import io
import json
import os
import zipfile
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, JSONResponse, Response
from app.storage.json_store import get_video
from app.services.export_service import build_json_export, build_csv_export, build_statistics_csv
from app.services.video_service import extract_clip, adjust_video_speed
from app.services.stats_service import compute_bpm_metrics
from app.schemas.export import BundleExportRequest

router = APIRouter()


@router.get("/videos/{video_id}/export/json")
async def export_json(video_id: str):
    video = get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    data = build_json_export(video)
    filename = f"annotations_{video.get('original_name', video['filename'])}.json"
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/videos/{video_id}/export/csv")
async def export_csv(video_id: str):
    video = get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    csv_content = build_csv_export(video)
    filename = f"annotations_{video.get('original_name', video['filename'])}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/videos/{video_id}/export/video")
async def export_video(video_id: str, background_tasks: BackgroundTasks):
    video = get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    annotations = sorted(video.get("annotations", []), key=lambda a: a["frame_number"])
    if len(annotations) < 2:
        raise HTTPException(
            status_code=422,
            detail="Au moins 2 annotations requises pour définir l'intervalle de découpe"
        )

    start_ms = annotations[0]["timestamp_ms"]
    end_ms = annotations[-1]["timestamp_ms"]
    input_path = video["filepath"]
    original_name = video.get("original_name", video["filename"])
    stem = os.path.splitext(original_name)[0]
    filename = f"clip_{stem}.mp4"

    clip_path = extract_clip(input_path, start_ms, end_ms)
    background_tasks.add_task(os.remove, clip_path)

    return FileResponse(
        path=clip_path,
        media_type="video/mp4",
        filename=filename,
    )


@router.post("/videos/{video_id}/export/bundle")
async def export_bundle(
    video_id: str,
    body: BundleExportRequest,
    background_tasks: BackgroundTasks,
):
    video = get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    annotations = sorted(video.get("annotations", []), key=lambda a: a["frame_number"])
    fps = video.get("fps", 25.0)

    # Calcul du BPM courant (nécessite >= 2 annotations)
    metrics = compute_bpm_metrics(annotations, fps)
    if "error" in metrics:
        raise HTTPException(status_code=422, detail=metrics["error"])

    # Bornes de découpe (optionnel)
    start_ms: float | None = None
    end_ms: float | None = None
    if body.clip_only:
        if len(annotations) < 2:
            raise HTTPException(
                status_code=422,
                detail="Au moins 2 annotations requises pour la découpe",
            )
        start_ms = annotations[0]["timestamp_ms"]
        end_ms = annotations[-1]["timestamp_ms"]

    # Génération de la vidéo ajustée
    speed_factor = body.target_bpm / metrics["bpm_global"]
    input_path = video["filepath"]
    clip_path = adjust_video_speed(input_path, speed_factor, start_ms, end_ms)
    background_tasks.add_task(os.remove, clip_path)

    # Sérialisation des données
    if body.format == "csv":
        annotations_data = build_csv_export(video).encode("utf-8")
        annotations_filename = "annotations.csv"
        statistics_data = build_statistics_csv(metrics).encode("utf-8")
        statistics_filename = "statistics.csv"
    else:
        annotations_data = json.dumps(
            build_json_export(video), ensure_ascii=False, indent=2
        ).encode("utf-8")
        annotations_filename = "annotations.json"
        statistics_data = json.dumps(metrics, ensure_ascii=False, indent=2).encode("utf-8")
        statistics_filename = "statistics.json"

    # Construction du ZIP en mémoire
    original_name = video.get("original_name", video["filename"])
    stem = os.path.splitext(original_name)[0]
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(annotations_filename, annotations_data)
        zf.writestr(statistics_filename, statistics_data)
        zf.write(clip_path, "video_adjusted.mp4")
    buf.seek(0)

    return Response(
        content=buf.read(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="export_{stem}.zip"'},
    )
