import json
import pytest

pytestmark = pytest.mark.anyio


def _export_form(clips_data: dict) -> dict:
    """Prépare un payload multipart pour POST /assemblage/export."""
    return {"data": {"config": json.dumps(clips_data)}}


async def test_list_projects_with_videos_for_assemblage(client, project_with_two_videos):
    resp = await client.get("/api/v1/projects")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "videos" in data[0]


async def test_get_project_videos_returns_video_list(client, project_with_two_videos):
    project_id, _ = project_with_two_videos
    resp = await client.get(f"/api/v1/projects/{project_id}/videos")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_build_clip_filter_with_fade_in():
    """Clip avec fadeIn=True → filtre fade=t=in."""
    from app.services.assemblage_service import build_clip_filter
    f = build_clip_filter({'path': 'a.mp4', 'duration': 5.0, 'fadeIn': True, 'fadeOut': False, 'fadeDurationS': 0.5})
    assert 'fade=t=in' in f


def test_build_clip_filter_with_fade_out():
    """Clip avec fadeOut=True → filtre fade=t=out."""
    from app.services.assemblage_service import build_clip_filter
    f = build_clip_filter({'path': 'a.mp4', 'duration': 5.0, 'fadeIn': False, 'fadeOut': True, 'fadeDurationS': 0.5})
    assert 'fade=t=out' in f


def test_build_clip_filter_no_fade():
    """Clip sans fade → filtre vide."""
    from app.services.assemblage_service import build_clip_filter
    f = build_clip_filter({'path': 'a.mp4', 'duration': 5.0, 'fadeIn': False, 'fadeOut': False})
    assert 'fade' not in f


def test_build_clip_filter_with_separate_fade_durations():
    """Les durées entrée/sortie peuvent être différentes."""
    from app.services.assemblage_service import build_clip_filter
    f = build_clip_filter({
        'path': 'a.mp4',
        'duration': 10.0,
        'fadeIn': True,
        'fadeOut': True,
        'fadeInDurationS': 2.0,
        'fadeOutDurationS': 3.0,
    })
    assert 'fade=t=in:duration=2.0' in f
    assert 'fade=t=out:start_time=7.0000:duration=3.0' in f


def test_build_concat_filter_applies_clip_fades_without_transitions():
    """Le concat simple doit inclure les filtres fade par clip."""
    from app.services.assemblage_service import build_concat_filter
    clips = [
        {'path': 'a.mp4', 'duration': 5.0, 'fadeIn': True, 'fadeOut': False, 'fadeDurationS': 0.5},
        {'path': 'b.mp4', 'duration': 4.0, 'fadeIn': False, 'fadeOut': True, 'fadeDurationS': 0.5},
    ]
    fc, maps = build_concat_filter(clips, use_transitions=False)
    assert '[0:v]fade=t=in:duration=0.5[vf0]' in fc
    assert '[1:v]fade=t=out:start_time=3.5000:duration=0.5[vf1]' in fc
    assert '[vf0][0:a][vf1][1:a]concat=n=2:v=1:a=1[v][a]' in fc
    assert maps == ['[v]', '[a]']


def test_build_concat_filter_applies_clip_fades_with_xfade():
    """Les fondus par clip doivent rester présents avec les transitions xfade."""
    from app.services.assemblage_service import build_concat_filter
    clips = [
        {'path': 'a.mp4', 'duration': 5.0, 'fadeIn': True, 'fadeDurationS': 0.5},
        {'path': 'b.mp4', 'duration': 4.0, 'fadeOut': True, 'fadeDurationS': 0.5},
    ]
    fc, maps = build_concat_filter(clips, use_transitions=True, transition_duration_s=0.5)
    assert '[0:v]fade=t=in:duration=0.5[vf0]' in fc
    assert '[1:v]fade=t=out:start_time=3.5000:duration=0.5[vf1]' in fc
    assert '[vf0][vf1]xfade=transition=fade:duration=0.5:offset=4.5000[vout]' in fc
    assert maps == ['[vout]', '[aout]']


# ── Tests des chemins manquants dans assemblage_service ──────────────────────

def test_clip_duration_with_invalid_value():
    """_clip_duration retourne 0.0 pour une valeur non-numérique."""
    from app.services.assemblage_service import _clip_duration
    assert _clip_duration({'duration': 'not-a-number'}) == 0.0
    assert _clip_duration({'duration': None}) == 0.0
    assert _clip_duration({}) == 0.0


def test_clip_duration_negative_returns_zero():
    """_clip_duration retourne 0.0 pour une durée négative."""
    from app.services.assemblage_service import _clip_duration
    assert _clip_duration({'duration': -5.0}) == 0.0


def test_fade_duration_with_invalid_value():
    """_fade_duration retourne la durée par défaut 0.5 si valeur invalide."""
    from app.services.assemblage_service import _fade_duration
    result = _fade_duration({'fadeDurationS': 'bad', 'duration': 5.0})
    assert result == 0.5


def test_fade_duration_clamped_to_max():
    """_fade_duration est plafonnée à duration/2."""
    from app.services.assemblage_service import _fade_duration
    # Durée 2s, fade demandé 5s → max = 1s
    result = _fade_duration({'fadeDurationS': 5.0, 'duration': 2.0})
    assert result == pytest.approx(1.0)


def test_fade_duration_clamped_to_min():
    """_fade_duration est au moins 0.1 quand la valeur demandée est très petite."""
    from app.services.assemblage_service import _fade_duration
    # 0.05 est petit mais non-falsy, donc pas remplacé par 0.5
    result = _fade_duration({'fadeDurationS': 0.05, 'duration': 5.0})
    assert result == pytest.approx(0.1)


def test_build_concat_filter_empty_clips():
    """build_concat_filter avec liste vide retourne chaînes vides."""
    from app.services.assemblage_service import build_concat_filter
    fc, maps = build_concat_filter([])
    assert fc == ''
    assert maps == []


def test_build_concat_filter_single_clip_with_transitions():
    """build_concat_filter avec un seul clip + use_transitions → concat simple (pas de xfade)."""
    from app.services.assemblage_service import build_concat_filter
    clips = [{'path': 'a.mp4', 'duration': 5.0, 'fadeIn': False, 'fadeOut': False}]
    fc, maps = build_concat_filter(clips, use_transitions=True, transition_duration_s=0.5)
    assert 'concat=n=1' in fc
    assert maps == ['[v]', '[a]']


# ── Tests S7.10 : POST /assemblage/export ────────────────────────────────────

async def test_export_assemblage_returns_job_id(client, two_videos):
    """POST /assemblage/export retourne un job_id immédiatement (202)."""
    config = json.dumps({
        "clips": [
            {"video_id": two_videos[0], "order": 0},
            {"video_id": two_videos[1], "order": 1},
        ],
        "use_transitions": False,
        "transition_duration_s": 0.5,
        "resolution": "720p",
        "include_music": False,
    })
    resp = await client.post("/api/v1/assemblage/export", data={"config": config})
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data


async def test_export_assemblage_empty_clips_returns_422(client):
    """422 si clips est vide."""
    config = json.dumps({"clips": [], "use_transitions": False})
    resp = await client.post("/api/v1/assemblage/export", data={"config": config})
    assert resp.status_code in (400, 422)


async def test_export_assemblage_invalid_video_id_returns_404(client):
    """404 si un video_id est invalide."""
    config = json.dumps({
        "clips": [{"video_id": "00000000-0000-0000-0000-000000000000", "order": 0}],
        "use_transitions": False,
    })
    resp = await client.post("/api/v1/assemblage/export", data={"config": config})
    assert resp.status_code == 404


async def test_export_assemblage_job_is_trackable(client, two_videos):
    """Le job créé est interrogeable via GET /exports/jobs/{id}."""
    config = json.dumps({
        "clips": [{"video_id": two_videos[0], "order": 0}],
        "use_transitions": False,
    })
    resp = await client.post("/api/v1/assemblage/export", data={"config": config})
    assert resp.status_code == 202
    job_id = resp.json()["job_id"]
    status_resp = await client.get(f"/api/v1/exports/jobs/{job_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] in ("pending", "running", "done", "error")


# ── Tests bug-fix : source_type adapted ──────────────────────────────────────

def test_assemblage_clip_request_accepts_source_type():
    """AssemblageClipRequest accepte source_type='adapted' et défaut 'original'."""
    from app.schemas.assemblage import AssemblageClipRequest
    req = AssemblageClipRequest(video_id="abc", order=0, source_type="adapted")
    assert req.source_type == "adapted"
    req2 = AssemblageClipRequest(video_id="abc", order=0)
    assert req2.source_type == "original"


async def test_export_assemblage_adapted_without_preview_returns_404(client, two_videos):
    """source_type=adapted sur une vidéo sans aperçu adapté → 404."""
    config = json.dumps({
        "clips": [{"video_id": two_videos[0], "order": 0, "source_type": "adapted"}],
        "use_transitions": False,
    })
    resp = await client.post("/api/v1/assemblage/export", data={"config": config})
    assert resp.status_code == 404


async def test_export_assemblage_adapted_with_preview_returns_202(client, project_with_saved_preview):
    """source_type=adapted sur une vidéo avec aperçu adapté → 202."""
    vid_id = project_with_saved_preview["video_id"]
    config = json.dumps({
        "clips": [{"video_id": vid_id, "order": 0, "source_type": "adapted"}],
        "use_transitions": False,
    })
    resp = await client.post("/api/v1/assemblage/export", data={"config": config})
    assert resp.status_code == 202


# ── Tests bug-fix : n=1 no-concat + format=yuv420p ───────────────────────────

def _run_assemble_capture(monkeypatch, tmp_path, clips_data, resolution="Original", has_audio=False):
    """Helper : exécute assemble_videos avec subprocess.run mocké, retourne la cmd capturée."""
    import subprocess
    import app.services.assemblage_service as svc

    captured = {}

    def mock_run(cmd, **kwargs):
        captured["cmd"] = cmd
        return subprocess.CompletedProcess(cmd, 0, stdout=b"", stderr=b"")

    monkeypatch.setattr(subprocess, "run", mock_run)
    monkeypatch.setattr(svc, "_has_audio", lambda _: has_audio)

    out = str(tmp_path / "out.mp4")
    svc.assemble_videos(clips_data, out, resolution=resolution)
    return captured.get("cmd", [])


def test_assemble_single_clip_no_concat_in_filter(tmp_path, monkeypatch):
    """n=1, video-only → filter_complex ne doit PAS contenir 'concat'."""
    fake = str(tmp_path / "clip.mp4")
    open(fake, "wb").close()
    cmd = _run_assemble_capture(monkeypatch, tmp_path, [{"path": fake, "duration": 5.0}])
    cmd_str = " ".join(cmd)
    assert "concat" not in cmd_str


def test_assemble_single_clip_with_audio_no_concat(tmp_path, monkeypatch):
    """n=1, avec audio → filter_complex sans concat, audio mappé directement."""
    fake = str(tmp_path / "clip.mp4")
    open(fake, "wb").close()
    cmd = _run_assemble_capture(
        monkeypatch, tmp_path, [{"path": fake, "duration": 5.0}], has_audio=True
    )
    cmd_str = " ".join(cmd)
    assert "concat" not in cmd_str
    # audio doit être mappé via référence directe au stream
    assert "0:a" in cmd_str


def test_assemble_filter_complex_contains_yuv420p_single(tmp_path, monkeypatch):
    """n=1 → filter_complex contient format=yuv420p (compatibilité libx264)."""
    fake = str(tmp_path / "clip.mp4")
    open(fake, "wb").close()
    cmd = _run_assemble_capture(monkeypatch, tmp_path, [{"path": fake, "duration": 5.0}])
    cmd_str = " ".join(cmd)
    assert "format=yuv420p" in cmd_str


def test_assemble_filter_complex_contains_yuv420p_multi(tmp_path, monkeypatch):
    """n=2 → filter_complex contient format=yuv420p (compatibilité libx264)."""
    f1 = str(tmp_path / "a.mp4")
    f2 = str(tmp_path / "b.mp4")
    for p in [f1, f2]:
        open(p, "wb").close()
    cmd = _run_assemble_capture(
        monkeypatch, tmp_path,
        [{"path": f1, "duration": 5.0}, {"path": f2, "duration": 4.0}],
    )
    cmd_str = " ".join(cmd)
    assert "format=yuv420p" in cmd_str
