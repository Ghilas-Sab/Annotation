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
