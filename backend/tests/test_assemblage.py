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
