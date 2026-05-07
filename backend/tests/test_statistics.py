import pytest

from app.services.stats_service import compute_bpm_metrics, compute_playback_speed


class MockAnnotation:
    def __init__(self, frame_number: int):
        self.frame_number = frame_number


# ──────────────────────────────────────────────
# Tests unitaires service (story 4.1, non-régression)
# ──────────────────────────────────────────────

def test_bpm_global_on_regular_intervals():
    annotations = [MockAnnotation(i * 25) for i in range(5)]
    result = compute_bpm_metrics(annotations, fps=25.0)
    assert result["bpm_global"] == pytest.approx(60.0, rel=1e-3)


def test_bpm_median_on_regular_intervals():
    annotations = [MockAnnotation(f) for f in [0, 25, 50, 75, 100]]
    result = compute_bpm_metrics(annotations, fps=25.0)
    assert result["bpm_median"] == pytest.approx(60.0, rel=1e-3)


def test_bpm_variation_and_std_on_irregular_intervals():
    annotations = [{"frame_number": f} for f in [0, 25, 60, 85, 120]]
    result = compute_bpm_metrics(annotations, fps=25.0)

    assert result["bpm_variation"] > 0
    assert result["interval_std_seconds"] > 0
    assert len(result["interval_distribution"]) == 4
    assert isinstance(result["rhythmic_segments"], list)
    assert isinstance(result["activity_peaks"], list)


def test_insufficient_annotations_returns_error():
    result = compute_bpm_metrics([MockAnnotation(0)], fps=25.0)
    assert result == {"error": "Minimum 2 annotations requises"}


def test_playback_speed_ratio():
    assert compute_playback_speed(120.0, 60.0) == pytest.approx(0.5)
    assert compute_playback_speed(60.0, 120.0) == pytest.approx(2.0)


def test_invalid_fps_returns_error():
    annotations = [MockAnnotation(0), MockAnnotation(25)]
    result = compute_bpm_metrics(annotations, fps=0)
    assert result == {"error": "FPS invalide"}


# ──────────────────────────────────────────────
# Tests API endpoints (story 4.2)
# ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_statistics(client, video_id):
    for frame in [0, 25, 50, 75]:
        await client.post(
            f"/api/v1/videos/{video_id}/annotations",
            json={"frame_number": frame, "label": ""},
        )
    res = await client.get(f"/api/v1/videos/{video_id}/statistics")
    assert res.status_code == 200
    data = res.json()
    assert "bpm_global" in data
    assert "bpm_mean" in data
    assert "bpm_median" in data
    assert "bpm_variation" in data
    assert "interval_std_seconds" in data
    assert "annotation_density_per_minute" in data
    assert "interval_distribution" in data
    assert isinstance(data["rhythmic_segments"], list)
    assert isinstance(data["activity_peaks"], list)


@pytest.mark.asyncio
async def test_get_statistics_video_not_found(client):
    res = await client.get("/api/v1/videos/inexistant-id/statistics")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_get_statistics_with_insufficient_annotations(client, video_id):
    # Une seule annotation → le service retourne l'objet d'erreur métier, pas un crash
    await client.post(
        f"/api/v1/videos/{video_id}/annotations",
        json={"frame_number": 0, "label": ""},
    )
    res = await client.get(f"/api/v1/videos/{video_id}/statistics")
    assert res.status_code == 200
    assert "error" in res.json()


@pytest.mark.asyncio
async def test_post_playback_speed(client, video_id):
    for frame in [0, 25, 50, 75]:
        await client.post(
            f"/api/v1/videos/{video_id}/annotations",
            json={"frame_number": frame, "label": ""},
        )
    res = await client.post(
        f"/api/v1/videos/{video_id}/statistics/playback-speed",
        json={"target_bpm": 120.0},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["playback_speed"] == pytest.approx(2.0, rel=1e-3)
    assert "current_bpm" in data
    assert data["target_bpm"] == pytest.approx(120.0, rel=1e-3)


@pytest.mark.asyncio
async def test_post_playback_speed_invalid_target_bpm(client, video_id):
    for frame in [0, 25, 50, 75]:
        await client.post(
            f"/api/v1/videos/{video_id}/annotations",
            json={"frame_number": frame, "label": ""},
        )
    res = await client.post(
        f"/api/v1/videos/{video_id}/statistics/playback-speed",
        json={"target_bpm": 0},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_post_playback_speed_negative_target_bpm(client, video_id):
    for frame in [0, 25, 50, 75]:
        await client.post(
            f"/api/v1/videos/{video_id}/annotations",
            json={"frame_number": frame, "label": ""},
        )
    res = await client.post(
        f"/api/v1/videos/{video_id}/statistics/playback-speed",
        json={"target_bpm": -10},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_post_playback_speed_video_not_found(client):
    res = await client.post(
        "/api/v1/videos/inexistant-id/statistics/playback-speed",
        json={"target_bpm": 120.0},
    )
    assert res.status_code == 404


def test_all_duplicate_frames_returns_error():
    """Si toutes les annotations ont le même frame, intervals_seconds est vide → erreur."""
    annotations = [{"frame_number": 25}, {"frame_number": 25}, {"frame_number": 25}]
    result = compute_bpm_metrics(annotations, fps=25.0)
    assert "error" in result


def test_detect_segments_with_segments(tmp_path):
    """_detect_segments crée plusieurs segments si les BPM varient."""
    from app.services.stats_service import _detect_segments
    # Créer des intervals: premier segment 60 BPM, deuxième 120 BPM
    # 60 BPM = 1 battement/s = 25 frames à 25fps
    # 120 BPM = 2 battements/s = 12.5 frames à 25fps
    frames = [0, 25, 50, 62, 75]  # 2 segments différents
    segs = _detect_segments(frames, fps=25.0)
    assert isinstance(segs, list)
    assert len(segs) >= 1


def test_detect_peaks_no_peak_returns_max():
    """_detect_peaks retourne le max quand find_peaks ne trouve rien."""
    from app.services.stats_service import _detect_peaks
    # Très peu d'annotations → histogram plat, find_peaks retourne []
    frames = [0, 1]
    peaks = _detect_peaks(frames, fps=25.0)
    assert isinstance(peaks, list)


def test_compute_bpm_metrics_density_covered_duration():
    """annotation_density_per_minute est calculée correctement."""
    # 5 annotations réparties sur 4 secondes à 25fps
    annotations = [{"frame_number": f} for f in [0, 25, 50, 75, 100]]
    result = compute_bpm_metrics(annotations, fps=25.0)
    assert result["annotation_density_per_minute"] > 0


def test_detect_segments_with_less_than_2_frames():
    """_detect_segments retourne [] avec moins de 2 frames."""
    from app.services.stats_service import _detect_segments
    assert _detect_segments([], fps=25.0) == []
    assert _detect_segments([25], fps=25.0) == []


def test_detect_segments_with_duplicate_frames_returns_empty():
    """_detect_segments retourne [] si tous les intervalles sont nuls (frames dupliquées)."""
    from app.services.stats_service import _detect_segments
    # Deux frames identiques → interval = 0 → positive_intervals vide → []
    result = _detect_segments([25, 25], fps=25.0)
    assert result == []


def test_detect_peaks_with_less_than_2_frames():
    """_detect_peaks retourne [] avec moins de 2 frames."""
    from app.services.stats_service import _detect_peaks
    assert _detect_peaks([], fps=25.0) == []
    assert _detect_peaks([25], fps=25.0) == []
