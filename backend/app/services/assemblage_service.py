from typing import Any


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
