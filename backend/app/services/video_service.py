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


def _atempo_chain(speed_factor: float) -> list:
    """Chaîne de valeurs atempo pour atteindre speed_factor (chaque valeur ∈ [0.5, 2.0])."""
    result = []
    remaining = speed_factor
    while remaining > 2.0:
        result.append(2.0)
        remaining /= 2.0
    while remaining < 0.5:
        result.append(0.5)
        remaining /= 0.5
    result.append(round(remaining, 6))
    return result


def adjust_video_speed(
    input_path: str,
    speed_factor: float,
    start_ms: float = None,
    end_ms: float = None,
) -> str:
    """
    Réencode la vidéo en ajustant la vitesse par speed_factor.
    Découpe optionnelle [start_ms, end_ms] avant l'ajustement.
    Retourne le chemin du fichier temporaire produit.
    """
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
    output_path = os.path.join(settings.TEMP_DIR, f"adjusted_{uuid.uuid4().hex}.mp4")

    input_kwargs: dict = {}
    if start_ms is not None:
        input_kwargs["ss"] = start_ms / 1000
    if end_ms is not None:
        input_kwargs["to"] = end_ms / 1000

    probe = ffmpeg.probe(input_path)
    has_audio = any(s["codec_type"] == "audio" for s in probe["streams"])

    stream = ffmpeg.input(input_path, **input_kwargs)
    video = stream.video.filter("setpts", f"PTS/{speed_factor:.6f}")

    if has_audio:
        audio = stream.audio
        for val in _atempo_chain(speed_factor):
            audio = audio.filter("atempo", val)
        out = ffmpeg.output(
            video, audio, output_path,
            vcodec="libx264", preset="fast", crf=23, acodec="aac",
        )
    else:
        out = ffmpeg.output(video, output_path, vcodec="libx264", preset="fast", crf=23)

    out.overwrite_output().run(quiet=True)
    return output_path


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
