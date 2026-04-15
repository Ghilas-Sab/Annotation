import os
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, JSONResponse, Response
from app.storage.json_store import get_video
from app.services.export_service import build_json_export, build_csv_export
from app.services.video_service import extract_clip

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
