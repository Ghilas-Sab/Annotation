"""
Tests unitaires pour video_service.py

Couvre particulièrement le parsing de fps, qui est la cause du bug
'frames aléatoires + boutons cassés' sur les vidéos réencodées (adapted).
"""
import subprocess
from unittest.mock import patch, MagicMock

import pytest

from app.services.video_service import get_video_metadata, _atempo_chain


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
# get_video_metadata — parsing fps
# ─────────────────────────────────────────────────────────────────────────────

class TestGetVideoMetadataFps:
    """
    Régression : les vidéos réencodées par adapt_video_to_bpm avaient un
    r_frame_rate irréaliste (ex: '90000/3003'), ce qui donnait fps ≈ 30000
    et cassait tous les boutons de navigation.

    avg_frame_rate est fiable après ré-encodage ; on l'utilise en priorité.
    """

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
        """
        Bug de régression : vidéo issue de adapt_video_to_bpm avait
        r_frame_rate='90000/3003' (timebase ffmpeg) mais avg_frame_rate='30/1'.
        On doit retourner 30, pas ~30000.
        """
        meta = self._call("90000/3003", "30/1")
        assert meta["fps"] == pytest.approx(30.0)

    def test_avg_rate_zero_falls_back_to_r_frame_rate(self):
        """avg_frame_rate='0/0' → fallback sur r_frame_rate."""
        meta = self._call("25/1", "0/0")
        assert meta["fps"] == pytest.approx(25.0)

    def test_both_broken_returns_default_25(self):
        """Si les deux sont inutilisables, on retourne 25 par défaut."""
        meta = self._call("0/0", "0/0")
        assert meta["fps"] == pytest.approx(25.0)

    def test_fps_over_240_r_frame_rate_fallback(self):
        """avg > 240 (timebase gonflé) → on ignore et on prend r_frame_rate."""
        meta = self._call("30/1", "90000/1")  # avg = 90000 fps absurde
        assert meta["fps"] == pytest.approx(30.0)

    def test_total_frames_from_nb_frames_when_present(self):
        meta = self._call("25/1", "25/1", nb_frames=250)
        assert meta["total_frames"] == 250

    def test_total_frames_computed_from_fps_x_duration_when_missing(self):
        meta = self._call("25/1", "25/1", duration=4.0)  # pas de nb_frames
        assert meta["total_frames"] == 100  # 25 * 4

    def test_returns_all_expected_keys(self):
        meta = self._call("25/1", "25/1")
        for key in ("duration_seconds", "fps", "total_frames", "width", "height", "codec"):
            assert key in meta


# ─────────────────────────────────────────────────────────────────────────────
# _atempo_chain
# ─────────────────────────────────────────────────────────────────────────────

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
        for v in chain:
            result *= v
        assert result == pytest.approx(4.0, rel=1e-4)

    def test_factor_0_5_gives_single_value(self):
        chain = _atempo_chain(0.5)
        assert chain == [pytest.approx(0.5)]

    def test_factor_0_25_splits_into_two_0_5(self):
        chain = _atempo_chain(0.25)
        assert len(chain) == 2
        result = 1.0
        for v in chain:
            result *= v
        assert result == pytest.approx(0.25, rel=1e-4)

    def test_all_values_within_atempo_bounds(self):
        for factor in [0.1, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 8.0]:
            for v in _atempo_chain(factor):
                assert 0.5 <= v <= 2.0, f"factor={factor} → {v} hors [0.5, 2.0]"


# ─────────────────────────────────────────────────────────────────────────────
# adapt_video_to_bpm — vérifie que la commande ffmpeg est correcte
# ─────────────────────────────────────────────────────────────────────────────

class TestAdaptVideoToBpmCommand:
    """
    Vérifie que adapt_video_to_bpm génère une commande ffmpeg qui :
    - inclut -fps_mode cfr  (force framerate constant — correction du bug)
    - inclut -r <fps>       (force le fps source en sortie)
    - inclut -movflags +faststart (seeking fiable)
    - utilise filter_complex avec split/asplit (pas de référence multiple)
    """

    def _run(self, n_annotations=3, target_bpm=120.0, has_audio=False):
        from app.services.video_service import adapt_video_to_bpm

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

        assert captured, "Popen n'a pas été appelé"
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
        assert "-filter_complex" in cmd
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
        from app.services.video_service import adapt_video_to_bpm
        probe_result = {
            "streams": [{"codec_type": "video", "r_frame_rate": "25/1",
                          "avg_frame_rate": "25/1"}],
            "format": {"duration": "10.0"},
        }
        with patch("ffmpeg.probe", return_value=probe_result):
            with pytest.raises(ValueError, match="2 annotations"):
                adapt_video_to_bpm("/fake.mp4", [{"timestamp_ms": 0, "frame_number": 0}], 120.0)
