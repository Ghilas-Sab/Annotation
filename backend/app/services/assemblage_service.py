import os
import subprocess
import tempfile
import threading
from typing import Any, Callable, Optional


def _clip_duration(clip: dict[str, Any]) -> float:
    try:
        duration = float(clip.get('duration', 0) or 0)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, duration)


def _fade_duration(clip: dict[str, Any], key: str = 'fadeDurationS') -> float:
    try:
        requested = float(clip.get(key, clip.get('fadeDurationS', 0.5)) or 0.5)
    except (TypeError, ValueError):
        requested = 0.5

    duration = _clip_duration(clip)
    max_duration = max(0.1, min(5.0, duration / 2 if duration > 0 else 0.5))
    return min(max(requested, 0.1), max_duration)


def build_clip_filter(clip: dict[str, Any]) -> str:
    """Return the vf filter string for a single clip's fade in/out.

    Returns empty string when no fade is configured.
    """
    parts: list[str] = []
    if clip.get('fadeIn'):
        d = _fade_duration(clip, 'fadeInDurationS')
        parts.append(f'fade=t=in:duration={d}')
    if clip.get('fadeOut'):
        d = _fade_duration(clip, 'fadeOutDurationS')
        start = max(0.0, _clip_duration(clip) - d)
        parts.append(f'fade=t=out:start_time={start:.4f}:duration={d}')
    return ','.join(parts)


def _video_labels_with_clip_fades(clips: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
    labels: list[str] = []
    filters: list[str] = []

    for i, clip in enumerate(clips):
        clip_filter = build_clip_filter(clip)
        if clip_filter:
            label = f'[vf{i}]'
            filters.append(f'[{i}:v]{clip_filter}{label}')
            labels.append(label)
        else:
            labels.append(f'[{i}:v]')

    return labels, filters


def build_concat_filter(
    clips: list[dict[str, Any]],
    use_transitions: bool = False,
    transition_duration_s: float = 0.5,
) -> tuple[str, list[str]]:
    """Return (filter_complex, output_map_labels) for the given clips.

    With use_transitions=True and 2+ clips, uses xfade (video) + acrossfade (audio).
    Falls back to simple concat otherwise.
    """
    n = len(clips)

    if n == 0:
        return ('', [])

    video_labels, parts = _video_labels_with_clip_fades(clips)

    if n == 1 or not use_transitions:
        concat_streams = ''.join(f'{video_labels[i]}[{i}:a]' for i in range(n))
        parts.append(f'{concat_streams}concat=n={n}:v=1:a=1[v][a]')
        fc = ';'.join(parts)
        return (fc, ['[v]', '[a]'])

    d = transition_duration_s

    # Video xfade chain
    cumulative = 0.0
    prev_v = video_labels[0]
    for i in range(1, n):
        offset = cumulative + clips[i - 1]['duration'] - d * i
        label = f'[v{i}]' if i < n - 1 else '[vout]'
        parts.append(f'{prev_v}{video_labels[i]}xfade=transition=fade:duration={d}:offset={offset:.4f}{label}')
        prev_v = label
        cumulative += clips[i - 1]['duration']

    # Audio acrossfade chain
    prev_a = '[0:a]'
    for i in range(1, n):
        label = f'[a{i}]' if i < n - 1 else '[aout]'
        parts.append(f'{prev_a}[{i}:a]acrossfade=d={d}{label}')
        prev_a = label

    fc = ';'.join(parts)
    return (fc, ['[vout]', '[aout]'])


_SCALE_MAP = {
    "720p": "scale=-2:720",
    "1080p": "scale=-2:1080",
}


def _has_audio(path: str) -> bool:
    """Return True if the media file has at least one audio stream."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-select_streams", "a:0",
         "-show_entries", "stream=codec_type", "-of", "csv=p=0", path],
        capture_output=True, text=True,
    )
    return bool(result.stdout.strip())


def mix_audio_with_video(video_path: str, audio_path: str, output_path: str) -> str:
    """Pose une piste audio sur la vidéo assemblée.

    - Si la vidéo a déjà de l'audio : le remplace par la musique.
    - Si la vidéo est video-only : ajoute directement la musique.
    La durée est celle du plus court des deux streams (-shortest).
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", audio_path,
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        "-movflags", "+faststart",
        output_path,
    ]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg audio-mix error: {proc.stderr.decode()[-400:]}")
    return output_path


def assemble_videos(
    clips_paths: list[dict[str, Any]],
    output_path: str,
    use_transitions: bool = False,
    transition_duration_s: float = 0.5,
    resolution: str = "720p",
    progress_cb: Optional[Callable[[int], None]] = None,
    cancel_event: Optional[threading.Event] = None,
) -> str:
    """Assemble les clips en un fichier MP4 via FFmpeg.

    clips_paths: list de dicts avec 'path' et 'duration'.
    - Clips avec audio : audio conservé dans le concat.
    - Clips sans audio (vidéo-only) : pas de flux audio dans la sortie
      (l'audio sera ajouté via mix_audio_with_video si une piste est fournie).
    Retourne output_path.
    """
    n = len(clips_paths)
    if n == 0:
        raise ValueError("clips_paths is empty")

    scale_filter = _SCALE_MAP.get(resolution, "")
    augmented = []
    for clip in clips_paths:
        entry = dict(clip)
        entry.setdefault("fadeIn", False)
        entry.setdefault("fadeOut", False)
        if scale_filter:
            entry["_scale"] = scale_filter
        augmented.append(entry)

    # Sonder l'audio de chaque clip
    has_audio_list = [_has_audio(clip["path"]) for clip in augmented]
    any_has_audio = any(has_audio_list)

    input_args: list[str] = []
    for clip in augmented:
        input_args += ["-i", clip["path"]]

    # Pour les clips sans audio (quand d'autres en ont), on injecte anullsrc
    null_audio_map: dict[int, int] = {}
    null_idx = n
    if any_has_audio:
        for i, has_aud in enumerate(has_audio_list):
            if not has_aud:
                dur = max(1.0, float(augmented[i].get("duration") or 1.0)) + 1
                input_args += [
                    "-f", "lavfi", "-t", str(dur),
                    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                ]
                null_audio_map[i] = null_idx
                null_idx += 1

    def audio_ref(i: int) -> str:
        if has_audio_list[i]:
            return f"[{i}:a]"
        return f"[{null_audio_map[i]}:a]"

    # Labels vidéo avec scale + fade
    def _build_video_labels(clips: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
        labels: list[str] = []
        filters: list[str] = []
        for i, clip in enumerate(clips):
            clip_filter = build_clip_filter(clip)
            sc = clip.get("_scale", "")
            chain = ",".join(f for f in [sc, clip_filter] if f)
            if chain:
                label = f"[vs{i}]"
                filters.append(f"[{i}:v]{chain}{label}")
                labels.append(label)
            else:
                labels.append(f"[{i}:v]")
        return labels, filters

    video_labels, filter_parts = _build_video_labels(augmented)

    if n == 1 or not use_transitions:
        if any_has_audio:
            concat_in = "".join(f"{video_labels[i]}{audio_ref(i)}" for i in range(n))
            filter_parts.append(f"{concat_in}concat=n={n}:v=1:a=1[v][a]")
            filter_complex = ";".join(filter_parts)
            map_args = ["-map", "[v]", "-map", "[a]"]
            codec_args = ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac"]
        else:
            # Tous les clips sont video-only → sortie video-only
            concat_in = "".join(f"{video_labels[i]}" for i in range(n))
            filter_parts.append(f"{concat_in}concat=n={n}:v=1:a=0[v]")
            filter_complex = ";".join(filter_parts)
            map_args = ["-map", "[v]"]
            codec_args = ["-c:v", "libx264", "-preset", "fast", "-crf", "23"]
    else:
        d = transition_duration_s
        cumulative = 0.0
        prev_v = video_labels[0]
        for i in range(1, n):
            offset = cumulative + augmented[i - 1]["duration"] - d * i
            label = f"[v{i}]" if i < n - 1 else "[vout]"
            filter_parts.append(
                f"{prev_v}{video_labels[i]}xfade=transition=fade:duration={d}:offset={offset:.4f}{label}"
            )
            prev_v = label
            cumulative += augmented[i - 1]["duration"]

        if any_has_audio:
            prev_a = audio_ref(0)
            for i in range(1, n):
                label = f"[a{i}]" if i < n - 1 else "[aout]"
                filter_parts.append(f"{prev_a}{audio_ref(i)}acrossfade=d={d}{label}")
                prev_a = label
            filter_complex = ";".join(filter_parts)
            map_args = ["-map", "[vout]", "-map", "[aout]"]
            codec_args = ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac"]
        else:
            filter_complex = ";".join(filter_parts)
            map_args = ["-map", "[vout]"]
            codec_args = ["-c:v", "libx264", "-preset", "fast", "-crf", "23"]

    cmd = ["ffmpeg", "-y"] + input_args + [
        "-filter_complex", filter_complex,
        *map_args,
        *codec_args,
        "-movflags", "+faststart",
        output_path,
    ]

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg error: {proc.stderr.decode()[-500:]}")

    if progress_cb:
        progress_cb(100)
    return output_path
