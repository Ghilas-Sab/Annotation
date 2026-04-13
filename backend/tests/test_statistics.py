import pytest

from app.services.stats_service import compute_bpm_metrics, compute_playback_speed


class MockAnnotation:
    def __init__(self, frame_number: int):
        self.frame_number = frame_number


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
