import io
import json
import os
import zipfile as _zipfile


def format_timestamp(timestamp_ms: float) -> str:
    """Convertit timestamp_ms en format MM:SS.mmm"""
    total_ms = int(timestamp_ms)
    ms = total_ms % 1000
    total_s = total_ms // 1000
    seconds = total_s % 60
    minutes = total_s // 60
    return f"{minutes:02d}:{seconds:02d}.{ms:03d}"


def build_json_export(video: dict) -> dict:
    annotations = [
        {
            "frame_number": a["frame_number"],
            "timestamp_ms": a["timestamp_ms"],
            "label": a["label"],
            "created_at": a["created_at"],
        }
        for a in sorted(video.get("annotations", []), key=lambda x: x["frame_number"])
    ]
    return {
        "video": {
            "id": video["id"],
            "filename": video.get("original_name", video["filename"]),
            "fps": video["fps"],
            "duration_seconds": video["duration_seconds"],
            "total_frames": video["total_frames"],
        },
        "annotations": annotations,
    }


def build_csv_export(video: dict) -> str:
    lines = ["frame_number,timestamp_ms,timestamp_formatted,label"]
    for a in sorted(video.get("annotations", []), key=lambda x: x["frame_number"]):
        ts_fmt = format_timestamp(a["timestamp_ms"])
        label = a["label"].replace(",", ";")  # échapper les virgules dans le label
        lines.append(f"{a['frame_number']},{a['timestamp_ms']},{ts_fmt},{label}")
    return "\n".join(lines)


_SCALAR_STATS_KEYS = (
    "bpm_global", "bpm_mean", "bpm_median", "bpm_variation",
    "interval_std_seconds", "annotation_density_per_minute",
)


def build_statistics_csv(stats: dict) -> str:
    """Exporte les métriques scalaires de stats en CSV (metric,value)."""
    lines = ["metric,value"]
    for key in _SCALAR_STATS_KEYS:
        if key in stats:
            lines.append(f"{key},{stats[key]}")
    return "\n".join(lines)


def compute_segment_speeds(
    annotations: list[dict],
    fps: float,
    target_bpm: float,
) -> list[float]:
    """
    Calcule le facteur de vitesse pour chaque segment inter-annotation.

    speed_factor = actual_interval_s / target_interval_s
    - factor > 1 → segment plus long que la cible → accélérer la vidéo
    - factor < 1 → segment plus court que la cible → ralentir la vidéo
    Utilisé avec setpts=(1/speed_factor)*(PTS-STARTPTS) dans ffmpeg.
    """
    if len(annotations) < 2:
        return []
    sorted_anns = sorted(annotations, key=lambda a: a["timestamp_ms"])
    target_interval_s = 60.0 / target_bpm
    speeds = []
    for i in range(len(sorted_anns) - 1):
        actual_s = (sorted_anns[i + 1]["timestamp_ms"] - sorted_anns[i]["timestamp_ms"]) / 1000.0
        if actual_s > 0:
            speeds.append(actual_s / target_interval_s)
    return speeds


def generate_project_zip(
    project_id: str,
    video_ids: list[str] | None,
    formats: list[str],
    video_bpm: dict[str, float] | None = None,
    output_path: str | None = None,
    progress_cb: "Callable[[int], None] | None" = None,
    cancel_event: "threading.Event | None" = None,
) -> bytes | None:
    import threading
    from typing import Callable
    from app.storage.json_store import get_project
    from app.services.stats_service import compute_bpm_metrics

    project = get_project(project_id)
    if project is None:
        return None

    videos = project.get("videos", [])
    if video_ids is not None:
        video_id_set = set(video_ids)
        videos = [v for v in videos if v["id"] in video_id_set]

    total_videos = max(len(videos), 1)
    tmp_files: list[str] = []

    # Écriture dans un fichier ou en mémoire
    use_file = output_path is not None
    buf = open(output_path, "wb") if use_file else io.BytesIO()  # type: ignore[assignment]

    try:
        with _zipfile.ZipFile(buf, "w", _zipfile.ZIP_DEFLATED) as zf:
            for idx, video in enumerate(videos):
                if cancel_event and cancel_event.is_set():
                    raise RuntimeError("Export annulé par l'utilisateur")
                # Progression globale : début du traitement de cette vidéo
                if progress_cb:
                    progress_cb(int(idx / total_videos * 100))

                stem = os.path.splitext(video.get("original_name", video["filename"]))[0]
                annotations = sorted(video.get("annotations", []), key=lambda x: x["frame_number"])
                fps = video.get("fps", 25.0)

                if "json" in formats:
                    export_data = build_json_export(video)
                    zf.writestr(
                        f"{stem}_annotations.json",
                        json.dumps(export_data, ensure_ascii=False, indent=2).encode("utf-8"),
                    )
                    stats = compute_bpm_metrics(annotations, fps)
                    zf.writestr(
                        f"{stem}_statistics.json",
                        json.dumps(stats, ensure_ascii=False, indent=2).encode("utf-8"),
                    )

                if "csv" in formats:
                    zf.writestr(
                        f"{stem}_annotations.csv",
                        build_csv_export(video).encode("utf-8"),
                    )

                if "video" in formats and video.get("filepath"):
                    target_bpm_val = (video_bpm or {}).get(video["id"])
                    if target_bpm_val and len(annotations) >= 2:
                        from app.services.video_service import adapt_video_to_bpm

                        # Sous-progression ffmpeg mappée sur la tranche de cette vidéo
                        base = int(idx / total_videos * 100)
                        share = int(1 / total_videos * 100)

                        def _video_progress(pct: int, _b: int = base, _s: int = share) -> None:
                            if progress_cb:
                                progress_cb(min(99, _b + int(pct / 100 * _s)))

                        clip_path = adapt_video_to_bpm(
                            video["filepath"], annotations, target_bpm_val,
                            progress_cb=_video_progress,
                            cancel_event=cancel_event,
                        )
                        tmp_files.append(clip_path)
                        zf.write(clip_path, f"{stem}_adapted.mp4")
                    else:
                        zf.write(video["filepath"], f"{stem}_adapted.mp4")

                if progress_cb:
                    progress_cb(int((idx + 1) / total_videos * 100))
    finally:
        for f in tmp_files:
            try:
                os.remove(f)
            except OSError:
                pass
        if use_file:
            buf.close()  # type: ignore[union-attr]

    if use_file:
        return None  # résultat dans le fichier
    buf.seek(0)  # type: ignore[union-attr]
    return buf.read()  # type: ignore[union-attr]
