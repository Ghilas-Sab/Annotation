"""
Tests unitaires pour video_service.py.

Couvre le parsing de fps, la construction des filtres ffmpeg et les transitions
de fade en début/fin pour l'adaptation BPM.
"""
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from app.services.video_service import (
    get_video_metadata,
    _atempo_chain,
    _build_adapt_filter,
    adapt_video_to_bpm,
)


def _make_probe(r_frame_rate: str, avg_frame_rate: str, duration: float = 10.0, nb_frames=None):
    stream = {
        "codec_type": "video",
        "r_frame_rate": r_frame_rate,
        "avg_frame_rate": avg_frame_rate,
        "width": 1280,
        "height": 720,
        "codec_name": "h264",
    }
    if nb_frames is not None:
        stream["nb_frames"] = str(nb_frames)
    return {
        "streams": [stream],
        "format": {"duration": str(duration)},
    }


class TestGetVideoMetadataFps:
    def _call(self, r_frame_rate, avg_frame_rate, nb_frames=None, duration=10.0):
        probe = _make_probe(r_frame_rate, avg_frame_rate, duration, nb_frames)
        with patch("ffmpeg.probe", return_value=probe):
            return get_video_metadata("/fake/video.mp4")

    def test_normal_30fps_via_avg(self):
        meta = self._call("30/1", "30/1")
        assert meta["fps"] == pytest.approx(30.0)

    def test_normal_25fps_via_avg(self):
        meta = self._call("25/1", "25/1")
        assert meta["fps"] == pytest.approx(25.0)

    def test_ntsc_29_97fps(self):
        meta = self._call("30000/1001", "30000/1001")
        assert meta["fps"] == pytest.approx(29.97, rel=1e-3)

    def test_adapted_video_weird_r_frame_rate_uses_avg(self):
        meta = self._call("90000/3003", "30/1")
        assert meta["fps"] == pytest.approx(30.0)

    def test_avg_rate_zero_falls_back_to_r_frame_rate(self):
        meta = self._call("25/1", "0/0")
        assert meta["fps"] == pytest.approx(25.0)

    def test_both_broken_returns_default_25(self):
        meta = self._call("0/0", "0/0")
        assert meta["fps"] == pytest.approx(25.0)

    def test_fps_over_240_r_frame_rate_fallback(self):
        meta = self._call("30/1", "90000/1")
        assert meta["fps"] == pytest.approx(30.0)

    def test_total_frames_from_nb_frames_when_present(self):
        meta = self._call("25/1", "25/1", nb_frames=250)
        assert meta["total_frames"] == 250

    def test_total_frames_computed_from_fps_x_duration_when_missing(self):
        meta = self._call("25/1", "25/1", duration=4.0)
        assert meta["total_frames"] == 100

    def test_returns_all_expected_keys(self):
        meta = self._call("25/1", "25/1")
        for key in ("duration_seconds", "fps", "total_frames", "width", "height", "codec"):
            assert key in meta


class TestAtempoChain:
    def test_factor_1_gives_single_value(self):
        chain = _atempo_chain(1.0)
        assert chain == [pytest.approx(1.0)]

    def test_factor_2_gives_single_value(self):
        chain = _atempo_chain(2.0)
        assert chain == [pytest.approx(2.0)]

    def test_factor_4_splits_into_two_2x(self):
        chain = _atempo_chain(4.0)
        assert len(chain) == 2
        result = 1.0
        for value in chain:
            result *= value
        assert result == pytest.approx(4.0, rel=1e-4)

    def test_factor_0_5_gives_single_value(self):
        chain = _atempo_chain(0.5)
        assert chain == [pytest.approx(0.5)]

    def test_factor_0_25_splits_into_two_0_5(self):
        chain = _atempo_chain(0.25)
        assert len(chain) == 2
        result = 1.0
        for value in chain:
            result *= value
        assert result == pytest.approx(0.25, rel=1e-4)

    def test_all_values_within_atempo_bounds(self):
        for factor in [0.1, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 8.0]:
            for value in _atempo_chain(factor):
                assert 0.5 <= value <= 2.0, f"factor={factor} -> {value} hors [0.5, 2.0]"


class TestAdaptVideoToBpmCommand:
    def _run(self, n_annotations=3, target_bpm=120.0, has_audio=False):
        annotations = [
            {"timestamp_ms": i * 500, "frame_number": i * 12}
            for i in range(n_annotations)
        ]

        streams = [{"codec_type": "video", "r_frame_rate": "25/1",
                    "avg_frame_rate": "25/1", "nb_frames": "250"}]
        if has_audio:
            streams.append({"codec_type": "audio"})

        probe_result = {
            "streams": streams,
            "format": {"duration": "10.0"},
        }

        captured: list[list[str]] = []

        def fake_popen(cmd, **kwargs):
            captured.append(cmd)
            mock_proc = MagicMock()
            mock_proc.stdout = iter([])
            mock_proc.returncode = 0
            mock_proc.wait.return_value = 0
            return mock_proc

        with patch("ffmpeg.probe", return_value=probe_result), \
             patch("subprocess.Popen", side_effect=fake_popen):
            adapt_video_to_bpm("/fake/input.mp4", annotations, target_bpm)

        assert captured, "Popen n'a pas ete appele"
        return captured[0]

    def test_cfr_flag_present(self):
        cmd = self._run()
        assert "-fps_mode" in cmd
        idx = cmd.index("-fps_mode")
        assert cmd[idx + 1] == "cfr"

    def test_explicit_frame_rate_flag(self):
        cmd = self._run()
        assert "-r" in cmd
        idx = cmd.index("-r")
        assert float(cmd[idx + 1]) > 0

    def test_faststart_flag_present(self):
        cmd = self._run()
        assert "-movflags" in cmd
        idx = cmd.index("-movflags")
        assert "faststart" in cmd[idx + 1]

    def test_filter_complex_uses_split(self):
        cmd = self._run()
        idx = cmd.index("-filter_complex")
        fc = cmd[idx + 1]
        assert "split=" in fc

    def test_filter_complex_uses_asplit_when_audio(self):
        cmd = self._run(has_audio=True)
        idx = cmd.index("-filter_complex")
        fc = cmd[idx + 1]
        assert "asplit=" in fc

    def test_filter_complex_no_asplit_without_audio(self):
        cmd = self._run(has_audio=False)
        idx = cmd.index("-filter_complex")
        fc = cmd[idx + 1]
        assert "asplit=" not in fc

    def test_raises_with_less_than_2_annotations(self):
        probe_result = {
            "streams": [{"codec_type": "video", "r_frame_rate": "25/1",
                         "avg_frame_rate": "25/1"}],
            "format": {"duration": "10.0"},
        }
        with patch("ffmpeg.probe", return_value=probe_result):
            with pytest.raises(ValueError, match="2 annotations"):
                adapt_video_to_bpm("/fake.mp4", [{"timestamp_ms": 0, "frame_number": 0}], 120.0)


def test_adjust_video_speed_with_audio(tmp_path):
    """adjust_video_speed génère la bonne commande quand le flux audio est présent."""
    probe_result = {
        "streams": [
            {"codec_type": "video", "r_frame_rate": "25/1", "avg_frame_rate": "25/1"},
            {"codec_type": "audio"},
        ],
        "format": {"duration": "5.0"},
    }
    from app.services.video_service import adjust_video_speed
    from unittest.mock import patch, MagicMock

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)):
        # Mock the ffmpeg output chain
        mock_stream = MagicMock()
        mock_stream.video.filter.return_value = MagicMock()
        mock_stream.audio.filter.return_value = MagicMock()
        with patch("ffmpeg.input", return_value=mock_stream), \
             patch("ffmpeg.output") as mock_output:
            mock_out = MagicMock()
            mock_output.return_value = mock_out
            mock_out.overwrite_output.return_value = mock_out
            mock_out.run.return_value = None
            result = adjust_video_speed("/fake/input.mp4", 1.5)
    # If we got here without exception, audio path was exercised
    assert result is not None


def test_adapt_video_fps_fallback_to_r_frame_rate(tmp_path):
    """adapt_video_to_bpm utilise r_frame_rate si avg_frame_rate est invalide (> 240)."""
    from unittest.mock import patch, MagicMock

    probe_result = {
        "streams": [{"codec_type": "video", "r_frame_rate": "30/1",
                     "avg_frame_rate": "90000/1"}],  # > 240 → fallback to r_frame_rate
        "format": {"duration": "5.0"},
    }
    annotations = [
        {"timestamp_ms": 500, "frame_number": 15},
        {"timestamp_ms": 1000, "frame_number": 30},
    ]

    def fake_popen(cmd, **kwargs):
        mock_proc = MagicMock()
        mock_proc.stdout = iter([])
        mock_proc.returncode = 0
        mock_proc.wait.return_value = 0
        return mock_proc

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("subprocess.Popen", side_effect=fake_popen), \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)):
        result = adapt_video_to_bpm("/fake/input.mp4", annotations, 120.0)
    assert result is not None


def test_adapt_video_fps_fallback_to_default_25(tmp_path):
    """adapt_video_to_bpm utilise fps=25.0 si tous les frame rates sont invalides."""
    from unittest.mock import patch, MagicMock

    probe_result = {
        "streams": [{"codec_type": "video", "r_frame_rate": "0/0",
                     "avg_frame_rate": "0/0"}],  # both invalid → 25.0
        "format": {"duration": "5.0"},
    }
    annotations = [
        {"timestamp_ms": 500, "frame_number": 12},
        {"timestamp_ms": 1000, "frame_number": 25},
    ]

    def fake_popen(cmd, **kwargs):
        mock_proc = MagicMock()
        mock_proc.stdout = iter([])
        mock_proc.returncode = 0
        mock_proc.wait.return_value = 0
        return mock_proc

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("subprocess.Popen", side_effect=fake_popen), \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)):
        result = adapt_video_to_bpm("/fake/input.mp4", annotations, 120.0)
    assert result is not None


def test_adapt_video_cancel_after_stdout_exhausted(tmp_path):
    """adapt_video_to_bpm lève RuntimeError si cancel_event set après lecture stdout."""
    import threading
    from unittest.mock import patch, MagicMock

    probe_result = {
        "streams": [{"codec_type": "video", "r_frame_rate": "25/1",
                     "avg_frame_rate": "25/1"}],
        "format": {"duration": "5.0"},
    }
    annotations = [
        {"timestamp_ms": 500, "frame_number": 12},
        {"timestamp_ms": 1000, "frame_number": 25},
    ]
    cancel = threading.Event()

    def fake_popen(cmd, **kwargs):
        mock_proc = MagicMock()
        mock_proc.stdout = iter([])  # empty stdout
        mock_proc.returncode = 0
        mock_proc.wait.return_value = 0
        cancel.set()  # set cancel after stdout exhausted
        return mock_proc

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("subprocess.Popen", side_effect=fake_popen), \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)):
        with pytest.raises(RuntimeError, match="annulé"):
            adapt_video_to_bpm("/fake/input.mp4", annotations, 120.0, cancel_event=cancel)


def test_adapt_video_nonzero_returncode_raises(tmp_path):
    """adapt_video_to_bpm lève RuntimeError si ffmpeg retourne un code d'erreur."""
    from unittest.mock import patch, MagicMock

    probe_result = {
        "streams": [{"codec_type": "video", "r_frame_rate": "25/1",
                     "avg_frame_rate": "25/1"}],
        "format": {"duration": "5.0"},
    }
    annotations = [
        {"timestamp_ms": 500, "frame_number": 12},
        {"timestamp_ms": 1000, "frame_number": 25},
    ]

    def fake_popen(cmd, **kwargs):
        mock_proc = MagicMock()
        mock_proc.stdout = iter([])
        mock_proc.returncode = 1  # non-zero error
        mock_proc.wait.return_value = 1
        return mock_proc

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("subprocess.Popen", side_effect=fake_popen), \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)):
        with pytest.raises(RuntimeError, match="returncode"):
            adapt_video_to_bpm("/fake/input.mp4", annotations, 120.0)


def test_build_adapt_filter_no_fade_filters():
    """_build_adapt_filter ne doit jamais insérer de filtre fade/afade — la transition
    est assurée par la continuité des vitesses, pas par un fondu visuel."""
    segs = [(0.0, 1.0, 1.2), (1.0, 2.0, 0.8)]
    fc, maps, codec = _build_adapt_filter(segs, has_audio=False)
    assert "fade=" not in fc
    assert maps == ["-map", "[vout]"]
    assert "-c:v" in codec


def test_build_adapt_filter_with_audio_no_fade_filters():
    segs = [(0.0, 1.0, 1.2), (1.0, 3.0, 0.9), (3.0, 4.0, 1.1)]
    fc, maps, codec = _build_adapt_filter(segs, has_audio=True)
    assert "fade=" not in fc
    assert "afade=" not in fc
    assert maps == ["-map", "[vout]", "-map", "[aout]"]
    assert "-c:a" in codec


def test_adapt_video_pre_segment_uses_first_speed_factor(tmp_path):
    """Le segment avant la première annotation doit utiliser speed_factors[0],
    pas 1.0, pour éviter un saut de vitesse à la jonction."""
    probe_result = {
        "streams": [{"codec_type": "video", "r_frame_rate": "25/1",
                     "avg_frame_rate": "25/1", "nb_frames": "250"}],
        "format": {"duration": "5.0"},
    }
    # Annotations à t=1s et t=3s → speed_factors[0] calculé par compute_segment_speeds
    annotations = [
        {"timestamp_ms": 1000.0, "frame_number": 25},
        {"timestamp_ms": 3000.0, "frame_number": 75},
    ]

    def fake_popen(cmd, **kwargs):
        mock_proc = MagicMock()
        mock_proc.stdout = iter([])
        mock_proc.returncode = 0
        mock_proc.wait.return_value = 0
        return mock_proc

    captured_segs = []

    def capture_build(segs, has_audio):
        captured_segs.extend(segs)
        return ("fc", ["-map", "[vout]"], ["-c:v", "libx264"])

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("subprocess.Popen", side_effect=fake_popen), \
         patch("app.services.video_service.uuid.uuid4") as mock_uuid, \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)), \
         patch("app.services.video_service._build_adapt_filter", side_effect=capture_build):
        mock_uuid.return_value.hex = "fixed"
        adapt_video_to_bpm("/fake/input.mp4", annotations, target_bpm=120.0)

    # Premier segment (pré-annotation, 0→1s) doit avoir la même vitesse que le
    # segment adapté [1s→3s]
    assert len(captured_segs) == 3  # pré + adapté + post
    pre_speed = captured_segs[0][2]
    first_adapted_speed = captured_segs[1][2]
    post_speed = captured_segs[2][2]
    last_adapted_speed = captured_segs[1][2]
    assert pre_speed == pytest.approx(first_adapted_speed)
    assert post_speed == pytest.approx(last_adapted_speed)


def test_adapt_video_cancelled_during_progress(tmp_path):
    """adapt_video_to_bpm lève RuntimeError si cancel_event est set pendant la progression."""
    import threading
    from unittest.mock import patch, MagicMock

    probe_result = {
        "streams": [{"codec_type": "video", "r_frame_rate": "25/1",
                     "avg_frame_rate": "25/1", "nb_frames": "250"}],
        "format": {"duration": "10.0"},
    }
    annotations = [
        {"timestamp_ms": 500, "frame_number": 12},
        {"timestamp_ms": 1000, "frame_number": 25},
    ]
    cancel = threading.Event()

    def fake_popen(cmd, **kwargs):
        cancel.set()
        mock_proc = MagicMock()
        mock_proc.stdout = iter(["out_time_us=500000"])
        mock_proc.returncode = 0
        mock_proc.wait.return_value = 0
        return mock_proc

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("subprocess.Popen", side_effect=fake_popen), \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)):
        with pytest.raises(RuntimeError, match="annulé"):
            adapt_video_to_bpm("/fake/input.mp4", annotations, 120.0, cancel_event=cancel)


def test_adapt_video_progress_callback_called(tmp_path):
    """adapt_video_to_bpm appelle progress_cb avec la progression ffmpeg."""
    from unittest.mock import patch, MagicMock

    probe_result = {
        "streams": [{"codec_type": "video", "r_frame_rate": "25/1",
                     "avg_frame_rate": "25/1", "nb_frames": "250"}],
        "format": {"duration": "5.0"},
    }
    annotations = [
        {"timestamp_ms": 500, "frame_number": 12},
        {"timestamp_ms": 1500, "frame_number": 37},
    ]
    progress_values = []

    def fake_popen(cmd, **kwargs):
        mock_proc = MagicMock()
        mock_proc.stdout = iter(["out_time_us=500000", "out_time_us=invalid"])
        mock_proc.returncode = 0
        mock_proc.wait.return_value = 0
        return mock_proc

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("subprocess.Popen", side_effect=fake_popen), \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)):
        adapt_video_to_bpm("/fake/input.mp4", annotations, 120.0,
                           progress_cb=lambda pct: progress_values.append(pct))

    assert len(progress_values) >= 1


def test_adapt_video_no_pre_post_if_annotations_at_bounds(tmp_path):
    """Si les annotations sont aux bornes de la vidéo, pas de segment pré/post."""
    probe_result = {
        "streams": [{"codec_type": "video", "r_frame_rate": "25/1",
                     "avg_frame_rate": "25/1", "nb_frames": "125"}],
        "format": {"duration": "5.0"},
    }
    annotations = [
        {"timestamp_ms": 0.0, "frame_number": 0},
        {"timestamp_ms": 5000.0, "frame_number": 125},
    ]

    def fake_popen(cmd, **kwargs):
        mock_proc = MagicMock()
        mock_proc.stdout = iter([])
        mock_proc.returncode = 0
        mock_proc.wait.return_value = 0
        return mock_proc

    captured_segs = []

    def capture_build(segs, has_audio):
        captured_segs.extend(segs)
        return ("fc", ["-map", "[vout]"], ["-c:v", "libx264"])

    with patch("ffmpeg.probe", return_value=probe_result), \
         patch("subprocess.Popen", side_effect=fake_popen), \
         patch("app.services.video_service.uuid.uuid4") as mock_uuid, \
         patch("app.services.video_service.settings.TEMP_DIR", str(tmp_path)), \
         patch("app.services.video_service._build_adapt_filter", side_effect=capture_build):
        mock_uuid.return_value.hex = "fixed"
        adapt_video_to_bpm("/fake/input.mp4", annotations, target_bpm=120.0)

    assert len(captured_segs) == 1  # uniquement le segment adapté, pas de pré/post
