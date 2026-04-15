import ffmpeg
import os
import uuid
from pathlib import Path
from app.config import settings


def get_video_metadata(filepath: str) -> dict:
    probe = ffmpeg.probe(filepath)
    video_stream = next(
        s for s in probe['streams'] if s['codec_type'] == 'video'
    )
    fps_num, fps_den = video_stream['r_frame_rate'].split('/')
    fps = float(fps_num) / float(fps_den)
    duration = float(probe['format']['duration'])
    nb_frames = video_stream.get('nb_frames')
    total_frames = int(nb_frames) if nb_frames else int(fps * duration)
    return {
        "duration_seconds": duration,
        "fps": fps,
        "total_frames": total_frames,
        "width": video_stream['width'],
        "height": video_stream['height'],
        "codec": video_stream['codec_name'],
    }


def extract_clip(input_path: str, start_ms: float, end_ms: float) -> str:
    """
    Découpe la vidéo [start_ms, end_ms] sans ré-encodage (stream copy).
    Retourne le chemin du fichier temporaire produit.
    Le caller est responsable de supprimer le fichier après envoi.
    """
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
    output_path = os.path.join(settings.TEMP_DIR, f"clip_{uuid.uuid4().hex}.mp4")
    (
        ffmpeg
        .input(input_path, ss=start_ms / 1000, to=end_ms / 1000)
        .output(output_path, c='copy')
        .overwrite_output()
        .run(quiet=True)
    )
    return output_path
