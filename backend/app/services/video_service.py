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
    # r_frame_rate peut valoir "0/0" ou un timebase irréaliste sur les vidéos réencodées
    # avg_frame_rate est plus fiable pour un flux CFR réel
    def _parse_fps(s: str) -> float:
        num, den = s.split('/')
        return float(num) / float(den) if float(den) > 0 else 0.0

    fps = _parse_fps(video_stream.get('avg_frame_rate', '0/0'))
    if fps <= 0 or fps > 240:
        fps = _parse_fps(video_stream['r_frame_rate'])
    if fps <= 0:
        fps = 25.0

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


def _build_adapt_filter(
    segs: list[tuple[float, float, float]],
    has_audio: bool,
) -> tuple[str, list[str], list[str]]:
    """
    Construit le filter_complex ffmpeg pour l'adaptation BPM segment par segment.

    Utilise split/asplit pour éviter les références multiples au même flux — la
    cause réelle des coupures sur les longues vidéos avec ffmpeg-python.

    Retourne (filter_complex, map_args, codec_args).
    """
    n = len(segs)
    parts: list[str] = []

    # split video en n copies
    v_labels = "".join(f"[vin{i}]" for i in range(n))
    parts.append(f"[0:v]split={n}{v_labels}")

    if has_audio:
        a_labels = "".join(f"[ain{i}]" for i in range(n))
        parts.append(f"[0:a]asplit={n}{a_labels}")

    # Traitement par segment
    for i, (start, end, sf) in enumerate(segs):
        pts = 1.0 / sf
        parts.append(
            f"[vin{i}]trim=start={start:.6f}:end={end:.6f},"
            f"setpts={pts:.6f}*(PTS-STARTPTS)[v{i}]"
        )
        if has_audio:
            atempo = ",".join(f"atempo={v:.6f}" for v in _atempo_chain(sf))
            parts.append(
                f"[ain{i}]atrim=start={start:.6f}:end={end:.6f},"
                f"{atempo},asetpts=PTS-STARTPTS[a{i}]"
            )

    # Concat
    if has_audio:
        concat_in = "".join(f"[v{i}][a{i}]" for i in range(n))
        parts.append(f"{concat_in}concat=n={n}:v=1:a=1[vout][aout]")
        maps = ["-map", "[vout]", "-map", "[aout]"]
        codec = ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac"]
    else:
        concat_in = "".join(f"[v{i}]" for i in range(n))
        parts.append(f"{concat_in}concat=n={n}:v=1:a=0[vout]")
        maps = ["-map", "[vout]"]
        codec = ["-c:v", "libx264", "-preset", "fast", "-crf", "23"]

    return ";".join(parts), maps, codec


def adapt_video_to_bpm(
    input_path: str,
    annotations: list[dict],
    target_bpm: float,
    progress_cb: "Callable[[int], None] | None" = None,
    cancel_event: "threading.Event | None" = None,
) -> str:
    """
    Adapte la vidéo pour que chaque segment inter-annotation corresponde exactement
    à 60/target_bpm secondes.  Chaque segment est accéléré/ralenti indépendamment.

    progress_cb(0-100) est appelé en continu depuis un thread de lecture ffmpeg.
    """
    import subprocess
    import threading
    from typing import Callable
    from app.services.export_service import compute_segment_speeds

    sorted_anns = sorted(annotations, key=lambda a: a["timestamp_ms"])
    if len(sorted_anns) < 2:
        raise ValueError("Au moins 2 annotations requises pour l'adaptation BPM")

    timestamps = [a["timestamp_ms"] / 1000.0 for a in sorted_anns]
    probe = ffmpeg.probe(input_path)
    video_duration = float(probe["format"]["duration"])
    has_audio = any(s["codec_type"] == "audio" for s in probe["streams"])

    # FPS de la vidéo source — on le force en sortie pour garantir un flux CFR
    video_stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
    def _parse_fps(s: str) -> float:
        n, d = s.split('/')
        return float(n) / float(d) if float(d) > 0 else 0.0
    source_fps = _parse_fps(video_stream.get('avg_frame_rate', '0/0'))
    if source_fps <= 0 or source_fps > 240:
        source_fps = _parse_fps(video_stream['r_frame_rate'])
    if source_fps <= 0:
        source_fps = 25.0

    speed_factors = compute_segment_speeds(sorted_anns, fps=0, target_bpm=target_bpm)
    target_interval_s = 60.0 / target_bpm

    # Construire la liste des segments
    segs: list[tuple[float, float, float]] = []
    if timestamps[0] > 0.001:
        segs.append((0.0, timestamps[0], 1.0))
    for i, sf in enumerate(speed_factors):
        segs.append((timestamps[i], timestamps[i + 1], sf))
    if timestamps[-1] < video_duration - 0.001:
        segs.append((timestamps[-1], video_duration, 1.0))

    # Durée totale attendue en sortie (pour estimer la progression)
    out_duration_s = sum((end - start) / sf for start, end, sf in segs)

    filter_complex, maps, codec = _build_adapt_filter(segs, has_audio)

    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
    output_path = os.path.join(settings.TEMP_DIR, f"adapted_{uuid.uuid4().hex}.mp4")

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-filter_complex", filter_complex,
        *maps,
        *codec,
        "-r", str(source_fps),      # force CFR identique à la source
        "-fps_mode", "cfr",         # drop/dup frames pour respecter exactement fps
        "-movflags", "+faststart",  # index mp4 en tête pour un seeking fiable
        "-progress", "pipe:1",
        "-nostats",
        output_path,
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)

    # Lire la progression ffmpeg ; tuer le processus si annulation demandée
    for line in proc.stdout:  # type: ignore[union-attr]
        if cancel_event and cancel_event.is_set():
            proc.kill()
            proc.wait()
            raise RuntimeError("Export annulé par l'utilisateur")
        line = line.strip()
        if line.startswith("out_time_us=") and progress_cb and out_duration_s > 0:
            try:
                us = int(line.split("=")[1])
                pct = min(99, int(us / (out_duration_s * 1_000_000) * 100))
                progress_cb(pct)
            except ValueError:
                pass

    proc.wait()
    if cancel_event and cancel_event.is_set():
        raise RuntimeError("Export annulé par l'utilisateur")
    if proc.returncode != 0:
        raise RuntimeError("ffmpeg adapt_video_to_bpm a échoué (returncode non-zéro)")

    if progress_cb:
        progress_cb(100)

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
