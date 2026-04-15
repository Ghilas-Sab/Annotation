from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response
from app.storage.json_store import get_video
from app.services.export_service import build_json_export, build_csv_export

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
