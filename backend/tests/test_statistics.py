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
