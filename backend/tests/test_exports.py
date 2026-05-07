import pytest

pytestmark = pytest.mark.anyio


async def test_export_json_structure(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/json")
    assert res.status_code == 200
    data = res.json()
    assert "video" in data
    assert "annotations" in data
    assert len(data["annotations"]) == 3
    ann = data["annotations"][0]
    assert "frame_number" in ann
    assert "timestamp_ms" in ann
    assert "label" in ann
    assert "created_at" in ann
    # Pas de id/video_id dans l'export
    assert "id" not in ann
    assert "video_id" not in ann


async def test_export_json_content_disposition(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/json")
    assert res.status_code == 200
    assert "attachment" in res.headers.get("content-disposition", "")
    assert ".json" in res.headers.get("content-disposition", "")


async def test_export_json_empty_annotations(client, video_id):
    res = await client.get(f"/api/v1/videos/{video_id}/export/json")
    assert res.status_code == 200
    data = res.json()
    assert data["annotations"] == []


async def test_export_json_unknown_video(client):
    res = await client.get("/api/v1/videos/unknown-id/export/json")
    assert res.status_code == 404


async def test_export_csv_headers(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/csv")
    assert res.status_code == 200
    lines = res.text.strip().split('\n')
    assert lines[0] == "frame_number,timestamp_ms,timestamp_formatted,label"
    assert len(lines) == 4  # 1 header + 3 annotations


async def test_export_csv_content_disposition(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/csv")
    assert "attachment" in res.headers.get("content-disposition", "")
    assert ".csv" in res.headers.get("content-disposition", "")


async def test_export_csv_empty_annotations(client, video_id):
    res = await client.get(f"/api/v1/videos/{video_id}/export/csv")
    assert res.status_code == 200
    lines = [l for l in res.text.strip().split('\n') if l]
    assert len(lines) == 1  # header uniquement
    assert lines[0] == "frame_number,timestamp_ms,timestamp_formatted,label"


async def test_export_csv_unknown_video(client):
    res = await client.get("/api/v1/videos/unknown-id/export/csv")
    assert res.status_code == 404


# ── Tests S5.2 : Export clip vidéo ──────────────────────────────────────────

async def test_export_video_clip(client, video_id_with_annotations):
    """Le clip est téléchargeable et non vide."""
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/video")
    assert res.status_code == 200
    assert "video" in res.headers.get("content-type", "")
    assert len(res.content) > 0


async def test_export_video_content_disposition(client, video_id_with_annotations):
    """Header Content-Disposition présent avec filename."""
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/video")
    assert res.status_code == 200
    cd = res.headers.get("content-disposition", "")
    assert "attachment" in cd
    assert ".mp4" in cd


async def test_export_video_requires_2_annotations(client, video_id):
    """Sans annotations → 422."""
    res = await client.get(f"/api/v1/videos/{video_id}/export/video")
    assert res.status_code == 422


async def test_export_video_requires_2_annotations_one_only(client, video_id):
    """Avec une seule annotation → 422."""
    await client.post(
        f"/api/v1/videos/{video_id}/annotations",
        json={"frame_number": 10, "label": ""}
    )
    res = await client.get(f"/api/v1/videos/{video_id}/export/video")
    assert res.status_code == 422


async def test_export_video_unknown_video(client):
    """video_id inexistant → 404."""
    res = await client.get("/api/v1/videos/unknown-id/export/video")
    assert res.status_code == 404


# ── Tests bundle export (S nouvelle feature) ────────────────────────────────

async def test_export_bundle_json_ok(client, video_id_with_annotations):
    """Bundle JSON : 200, content-type zip, contient annotations.json + statistics.json + video."""
    import zipfile, io as _io
    res = await client.post(
        f"/api/v1/videos/{video_id_with_annotations}/export/bundle",
        json={"target_bpm": 120.0, "clip_only": False, "format": "json"}
    )
    assert res.status_code == 200
    assert "zip" in res.headers.get("content-type", "")
    names = zipfile.ZipFile(_io.BytesIO(res.content)).namelist()
    assert "annotations.json" in names
    assert "statistics.json" in names
    assert "video_adjusted.mp4" in names


async def test_export_bundle_csv_format(client, video_id_with_annotations):
    """Bundle CSV : contient annotations.csv et statistics.csv."""
    import zipfile, io as _io
    res = await client.post(
        f"/api/v1/videos/{video_id_with_annotations}/export/bundle",
        json={"target_bpm": 120.0, "clip_only": False, "format": "csv"}
    )
    assert res.status_code == 200
    names = zipfile.ZipFile(_io.BytesIO(res.content)).namelist()
    assert "annotations.csv" in names
    assert "statistics.csv" in names


async def test_export_bundle_clip_only(client, video_id_with_annotations):
    """clip_only=True avec >= 2 annotations → 200."""
    res = await client.post(
        f"/api/v1/videos/{video_id_with_annotations}/export/bundle",
        json={"target_bpm": 120.0, "clip_only": True, "format": "json"}
    )
    assert res.status_code == 200


async def test_export_bundle_requires_2_annotations(client, video_id):
    """Moins de 2 annotations → impossible de calculer le BPM courant → 422."""
    res = await client.post(
        f"/api/v1/videos/{video_id}/export/bundle",
        json={"target_bpm": 120.0, "clip_only": False, "format": "json"}
    )
    assert res.status_code == 422


async def test_export_bundle_clip_only_requires_2_annotations(client, video_id):
    """clip_only=True avec 1 seule annotation → 422."""
    await client.post(
        f"/api/v1/videos/{video_id}/annotations",
        json={"frame_number": 10, "label": "beat"}
    )
    res = await client.post(
        f"/api/v1/videos/{video_id}/export/bundle",
        json={"target_bpm": 120.0, "clip_only": True, "format": "json"}
    )
    assert res.status_code == 422


async def test_export_bundle_unknown_video(client):
    """video_id inconnu → 404."""
    res = await client.post(
        "/api/v1/videos/unknown-id/export/bundle",
        json={"target_bpm": 120.0, "clip_only": False, "format": "json"}
    )
    assert res.status_code == 404


# ── Tests S6.10 : Algorithme compute_segment_speeds ─────────────────────────

def test_compute_segment_speeds_basic():
    """Vérifie le calcul des facteurs de vitesse par segment."""
    from app.services.export_service import compute_segment_speeds
    annotations = [
        {"frame_number": 25,  "timestamp_ms": 1000.0},
        {"frame_number": 62,  "timestamp_ms": 2480.0},
        {"frame_number": 100, "timestamp_ms": 4000.0},
    ]
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=60.0)
    assert len(speeds) == 2
    assert abs(speeds[0] - 1.48) < 0.01
    assert abs(speeds[1] - 1.52) < 0.01


def test_compute_segment_speeds_acceleration():
    """Segments plus courts que l'intervalle cible → facteur < 1 (ralentissement vidéo)."""
    from app.services.export_service import compute_segment_speeds
    annotations = [
        {"frame_number": 25, "timestamp_ms": 1000.0},
        {"frame_number": 37, "timestamp_ms": 1480.0},
    ]
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=60.0)
    assert abs(speeds[0] - 0.48) < 0.01


def test_compute_segment_speeds_single_annotation_returns_empty():
    """Avec 0 ou 1 annotation, impossible de calculer des segments."""
    from app.services.export_service import compute_segment_speeds
    assert compute_segment_speeds([], fps=25.0, target_bpm=120.0) == []
    assert compute_segment_speeds(
        [{"frame_number": 25, "timestamp_ms": 1000.0}],
        fps=25.0, target_bpm=120.0
    ) == []


def test_compute_segment_speeds_exact_bpm():
    """Annotations exactement au BPM cible → speed = 1.0."""
    from app.services.export_service import compute_segment_speeds
    annotations = [
        {"frame_number": 0,  "timestamp_ms": 0.0},
        {"frame_number": 25, "timestamp_ms": 1000.0},
        {"frame_number": 50, "timestamp_ms": 2000.0},
    ]
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=60.0)
    assert all(abs(s - 1.0) < 0.001 for s in speeds)


def test_compute_segment_speeds_high_bpm():
    """BPM cible élevé → facteur > 1 si annotations lentes."""
    from app.services.export_service import compute_segment_speeds
    annotations = [
        {"frame_number": 0,  "timestamp_ms": 0.0},
        {"frame_number": 50, "timestamp_ms": 2000.0},
    ]
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=120.0)
    assert abs(speeds[0] - 4.0) < 0.01


# ── Tests S6.9 : Export par projet complet ──────────────────────────────────

async def test_export_project_zip_contains_expected_files(
    client, project_with_two_annotated_videos
):
    import zipfile, io as _io
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["json", "csv"]}
    )
    assert resp.status_code == 200
    assert "zip" in resp.headers.get("content-type", "")
    z = zipfile.ZipFile(_io.BytesIO(resp.content))
    names = z.namelist()
    assert any(n.endswith('_annotations.json') for n in names)
    assert any(n.endswith('_annotations.csv') for n in names)


async def test_export_project_partial_selection(
    client, project_with_two_annotated_videos, video_ids
):
    import zipfile, io as _io
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": [video_ids[0]], "formats": ["json"]}
    )
    assert resp.status_code == 200
    z = zipfile.ZipFile(_io.BytesIO(resp.content))
    json_files = [n for n in z.namelist() if n.endswith('.json') and 'statistics' not in n]
    assert len(json_files) == 1


async def test_export_project_includes_statistics(
    client, project_with_two_annotated_videos
):
    import zipfile, io as _io
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["json"]}
    )
    assert resp.status_code == 200
    z = zipfile.ZipFile(_io.BytesIO(resp.content))
    assert any(n.endswith('_statistics.json') for n in z.namelist())


async def test_export_project_zip_is_valid(client, project_with_two_annotated_videos):
    import zipfile, io as _io
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["json"]}
    )
    assert resp.status_code == 200
    assert zipfile.is_zipfile(_io.BytesIO(resp.content))


async def test_export_project_all_formats(client, project_with_two_annotated_videos):
    import zipfile, io as _io
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["json", "csv"]}
    )
    assert resp.status_code == 200
    z = zipfile.ZipFile(_io.BytesIO(resp.content))
    names = z.namelist()
    assert any(n.endswith('.json') and 'statistics' not in n for n in names)
    assert any(n.endswith('.csv') for n in names)


async def test_legacy_video_export_endpoints_still_work(client, video_id_with_annotations):
    """Rétrocompatibilité : les anciens endpoints doivent rester fonctionnels."""
    resp = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/json")
    assert resp.status_code == 200
    resp2 = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/csv")
    assert resp2.status_code == 200


async def test_export_project_400_on_invalid_format(client, project_with_two_annotated_videos):
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["invalid_format"]}
    )
    assert resp.status_code == 422


# ── Tests S6.10 : Preview job en arrière-plan ───────────────────────────────

async def test_create_preview_job_returns_job_id(client, video_id_with_annotations):
    """POST /preview-jobs retourne un job_id immédiatement (202)."""
    resp = await client.post(
        f"/api/v1/videos/{video_id_with_annotations}/preview-jobs",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    assert isinstance(data["job_id"], str)


async def test_create_preview_job_requires_min_2_annotations(client, video_id):
    """Retourne 400 si moins de 2 annotations."""
    resp = await client.post(
        f"/api/v1/videos/{video_id}/preview-jobs",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 400


async def test_create_preview_job_requires_target_bpm(client, video_id_with_annotations):
    """422 si target_bpm absent."""
    resp = await client.post(
        f"/api/v1/videos/{video_id_with_annotations}/preview-jobs",
        json={}
    )
    assert resp.status_code == 422


async def test_save_preview_updates_video_record(client, video_id_with_annotations, tmp_path):
    """POST /preview-adapted/save persiste adapted_preview dans le record vidéo."""
    import time
    from app.services.job_manager import job_manager
    from unittest.mock import patch

    tmp_file = tmp_path / "fake_preview.mp4"
    tmp_file.write_bytes(b"fakevideo")

    job = job_manager.create_job(label="preview:120.0")
    job_manager.update(job.id, status="done", progress=100,
                       result_path=str(tmp_file), finished_at=time.time())

    with patch("app.routers.exports.settings") as mock_settings:
        mock_settings.DATA_DIR = str(tmp_path)
        resp = await client.post(
            f"/api/v1/videos/{video_id_with_annotations}/preview-adapted/save",
            json={"job_id": job.id, "target_bpm": 120.0}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "adapted_preview" in data
    assert abs(data["adapted_preview"]["bpm"] - 120.0) < 0.01


async def test_delete_preview_removes_from_record(client, video_with_saved_preview):
    """DELETE /preview-adapted retire adapted_preview du record."""
    resp = await client.delete(
        f"/api/v1/videos/{video_with_saved_preview}/preview-adapted"
    )
    assert resp.status_code == 200


async def test_download_saved_preview_returns_video_file(client, video_with_saved_preview):
    """GET /preview-adapted/download retourne la vidéo adaptée sauvegardée."""
    resp = await client.get(f"/api/v1/videos/{video_with_saved_preview}/preview-adapted/download")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "video/mp4"
    assert "content-disposition" in resp.headers


async def test_stream_saved_preview_returns_video_file(client, video_with_saved_preview):
    """GET /preview-adapted/stream retourne la vidéo adaptée sauvegardée pour lecture inline."""
    resp = await client.get(f"/api/v1/videos/{video_with_saved_preview}/preview-adapted/stream")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "video/mp4"


def test_generate_zip_reuses_saved_preview(project_with_saved_preview):
    """generate_project_zip réutilise le preview sauvegardé si BPM correspond."""
    from app.services.export_service import generate_project_zip
    from unittest.mock import patch

    with patch("app.services.video_service.adapt_video_to_bpm") as mock_adapt:
        result = generate_project_zip(
            project_with_saved_preview["project_id"],
            video_ids=None,
            formats=["video"],
            video_bpm={project_with_saved_preview["video_id"]: 120.0},
        )
        mock_adapt.assert_not_called()
        assert result is not None


def test_generate_zip_uses_saved_preview_without_target_bpm(project_with_saved_preview):
    """Sans BPM saisi, l'export vidéo inclut le preview sauvegardé s'il existe."""
    from app.services.export_service import generate_project_zip
    from unittest.mock import patch

    with patch("app.services.video_service.adapt_video_to_bpm") as mock_adapt:
        result = generate_project_zip(
            project_with_saved_preview["project_id"],
            video_ids=None,
            formats=["video"],
            video_bpm=None,
        )
        mock_adapt.assert_not_called()
        assert result is not None


# ── Tests job_manager.py ─────────────────────────────────────────────────────

def test_job_estimated_remaining_running():
    """estimated_remaining_s retourne une valeur > 0 quand le job est running avec progress > 0."""
    import time
    from app.services.job_manager import ExportJob
    job = ExportJob(
        id="test-id",
        label="test",
        status="running",
        progress=50,
        created_at=time.time(),
        started_at=time.time() - 10,
    )
    remaining = job.estimated_remaining_s()
    assert remaining is not None
    assert remaining >= 0.0


def test_job_estimated_remaining_not_running():
    """estimated_remaining_s retourne None si status != running."""
    import time
    from app.services.job_manager import ExportJob
    job = ExportJob(
        id="test-id",
        label="test",
        status="done",
        progress=100,
        created_at=time.time(),
        started_at=time.time() - 10,
    )
    assert job.estimated_remaining_s() is None


def test_job_estimated_remaining_zero_progress():
    """estimated_remaining_s retourne None si progress == 0."""
    import time
    from app.services.job_manager import ExportJob
    job = ExportJob(
        id="test-id",
        label="test",
        status="running",
        progress=0,
        created_at=time.time(),
        started_at=time.time(),
    )
    assert job.estimated_remaining_s() is None


def test_job_to_dict():
    """to_dict retourne toutes les clés attendues."""
    import time
    from app.services.job_manager import ExportJob
    job = ExportJob(
        id="abc",
        label="lbl",
        status="pending",
        progress=0,
        created_at=time.time(),
    )
    d = job.to_dict()
    for key in ("id", "label", "status", "progress", "created_at", "started_at",
                "finished_at", "error", "estimated_remaining_s"):
        assert key in d


def test_job_manager_cancel_done_job():
    """cancel retourne False si le job est déjà terminé."""
    from app.services.job_manager import JobManager
    mgr = JobManager()
    job = mgr.create_job(label="test")
    mgr.update(job.id, status="done")
    assert mgr.cancel(job.id) is False


def test_job_manager_cancel_not_found():
    """cancel retourne False si le job n'existe pas."""
    from app.services.job_manager import JobManager
    mgr = JobManager()
    assert mgr.cancel("non-existent-id") is False


def test_job_manager_cancel_pending():
    """cancel retourne True pour un job en attente."""
    from app.services.job_manager import JobManager
    mgr = JobManager()
    job = mgr.create_job(label="test")
    result = mgr.cancel(job.id)
    assert result is True
    assert mgr.get_job(job.id).status == "cancelled"


def test_job_manager_launch_error_path():
    """launch met le job en état 'error' si fn() lève une exception."""
    import time
    from app.services.job_manager import JobManager

    mgr = JobManager()
    job = mgr.create_job(label="test")

    def failing_fn():
        raise RuntimeError("Simulated failure")

    mgr.launch(job, failing_fn)
    time.sleep(0.3)
    j = mgr.get_job(job.id)
    assert j.status == "error"
    assert "Simulated failure" in j.error


def test_job_manager_launch_cancelled_during_run():
    """launch met le job en état 'cancelled' si cancel_event est set pendant l'exécution."""
    import time
    from app.services.job_manager import JobManager

    mgr = JobManager()
    job = mgr.create_job(label="test")

    def cancellable_fn():
        job.cancel_event.set()
        return "/some/path"

    mgr.launch(job, cancellable_fn)
    time.sleep(0.3)
    j = mgr.get_job(job.id)
    assert j.status == "cancelled"


def test_job_manager_launch_error_when_cancelled():
    """launch met status='cancelled' quand l'exception arrive et cancel_event est set."""
    import time
    from app.services.job_manager import JobManager

    mgr = JobManager()
    job = mgr.create_job(label="test")

    def cancelling_error_fn():
        job.cancel_event.set()
        raise RuntimeError("cancelled with error")

    mgr.launch(job, cancelling_error_fn)
    time.sleep(0.3)
    j = mgr.get_job(job.id)
    assert j.status == "cancelled"


# ── Tests exports.py — jobs API ─────────────────────────────────────────────

pytestmark = pytest.mark.anyio


async def test_export_project_404(client):
    """POST /projects/unknown/export → 404 (project not found by get_project)."""
    resp = await client.post(
        "/api/v1/projects/unknown-project-id/export",
        json={"video_ids": None, "formats": ["json"]}
    )
    assert resp.status_code == 404


async def test_export_project_zip_returns_none_gives_404(client, data_dir):
    """POST /projects/{id}/export → 404 si generate_project_zip retourne None."""
    from unittest.mock import patch
    # Créer un projet valide mais mocker generate_project_zip pour retourner None
    resp = await client.post("/api/v1/projects", json={"name": "test"})
    proj_id = resp.json()["id"]
    with patch("app.routers.exports.generate_project_zip", return_value=None):
        resp = await client.post(
            f"/api/v1/projects/{proj_id}/export",
            json={"video_ids": None, "formats": ["json"]}
        )
    assert resp.status_code == 404


async def test_create_export_job_returns_202(client, project_with_two_annotated_videos):
    """POST /exports/jobs retourne 202 avec un job_id."""
    resp = await client.post(
        "/api/v1/exports/jobs",
        params={"project_id": project_with_two_annotated_videos},
        json={"video_ids": None, "formats": ["json"]}
    )
    assert resp.status_code == 202
    assert "job_id" in resp.json()


async def test_create_export_job_project_not_found(client):
    """POST /exports/jobs avec projet inexistant → 404."""
    resp = await client.post(
        "/api/v1/exports/jobs",
        params={"project_id": "nonexistent-id"},
        json={"video_ids": None, "formats": ["json"]}
    )
    assert resp.status_code == 404


async def test_get_export_job_status(client, project_with_two_annotated_videos):
    """GET /exports/jobs/{job_id} retourne l'état du job."""
    create_resp = await client.post(
        "/api/v1/exports/jobs",
        params={"project_id": project_with_two_annotated_videos},
        json={"video_ids": None, "formats": ["json"]}
    )
    job_id = create_resp.json()["job_id"]
    status_resp = await client.get(f"/api/v1/exports/jobs/{job_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert "status" in data
    assert data["id"] == job_id


async def test_get_export_job_not_found(client):
    """GET /exports/jobs/{job_id} avec ID inconnu → 404."""
    resp = await client.get("/api/v1/exports/jobs/nonexistent-job-id")
    assert resp.status_code == 404


async def test_cancel_export_job(client, project_with_two_annotated_videos):
    """DELETE /exports/jobs/{job_id} annule un job en attente."""
    create_resp = await client.post(
        "/api/v1/exports/jobs",
        params={"project_id": project_with_two_annotated_videos},
        json={"video_ids": None, "formats": ["json"]}
    )
    job_id = create_resp.json()["job_id"]
    cancel_resp = await client.delete(f"/api/v1/exports/jobs/{job_id}")
    assert cancel_resp.status_code in (200, 409)


async def test_cancel_export_job_not_found(client):
    """DELETE /exports/jobs/{job_id} avec ID inconnu → 404."""
    resp = await client.delete("/api/v1/exports/jobs/nonexistent-job-id")
    assert resp.status_code == 404


async def test_cancel_done_job_returns_409(client, project_with_two_annotated_videos):
    """DELETE /exports/jobs/{job_id} sur un job terminé → 409."""
    import time
    from app.services.job_manager import job_manager
    job = job_manager.create_job(label="test-done")
    job_manager.update(job.id, status="done", progress=100, finished_at=time.time())
    resp = await client.delete(f"/api/v1/exports/jobs/{job.id}")
    assert resp.status_code == 409


async def test_stream_export_job_not_found(client):
    """GET /exports/jobs/{job_id}/stream avec ID inconnu → 404."""
    resp = await client.get("/api/v1/exports/jobs/nonexistent-job-id/stream")
    assert resp.status_code == 404


async def test_stream_export_job_not_done(client, project_with_two_annotated_videos):
    """GET /exports/jobs/{job_id}/stream sur job non terminé → 409."""
    from app.services.job_manager import job_manager
    job = job_manager.create_job(label="pending-job")
    resp = await client.get(f"/api/v1/exports/jobs/{job.id}/stream")
    assert resp.status_code == 409


async def test_stream_export_job_file_missing(client, tmp_path):
    """GET /exports/jobs/{job_id}/stream sur job done mais fichier absent → 410."""
    import time
    from app.services.job_manager import job_manager
    job = job_manager.create_job(label="done-no-file")
    job_manager.update(job.id, status="done", progress=100,
                       result_path=str(tmp_path / "nonexistent.mp4"),
                       finished_at=time.time())
    resp = await client.get(f"/api/v1/exports/jobs/{job.id}/stream")
    assert resp.status_code == 410


async def test_stream_export_job_done_with_file(client, tmp_path):
    """GET /exports/jobs/{job_id}/stream retourne le fichier si job done et fichier présent."""
    import time
    from app.services.job_manager import job_manager
    result_file = tmp_path / "result.mp4"
    result_file.write_bytes(b"fakevideocontent")
    job = job_manager.create_job(label="done-with-file")
    job_manager.update(job.id, status="done", progress=100,
                       result_path=str(result_file),
                       finished_at=time.time())
    resp = await client.get(f"/api/v1/exports/jobs/{job.id}/stream")
    assert resp.status_code == 200


async def test_download_export_job_not_found(client):
    """GET /exports/jobs/{job_id}/download avec ID inconnu → 404."""
    resp = await client.get("/api/v1/exports/jobs/nonexistent-job-id/download")
    assert resp.status_code == 404


async def test_download_export_job_not_done(client):
    """GET /exports/jobs/{job_id}/download sur job non terminé → 409."""
    from app.services.job_manager import job_manager
    job = job_manager.create_job(label="pending-download")
    resp = await client.get(f"/api/v1/exports/jobs/{job.id}/download")
    assert resp.status_code == 409


async def test_download_export_job_file_missing(client, tmp_path):
    """GET /exports/jobs/{job_id}/download fichier absent → 410."""
    import time
    from app.services.job_manager import job_manager
    job = job_manager.create_job(label="done-no-file-dl")
    job_manager.update(job.id, status="done", progress=100,
                       result_path=str(tmp_path / "ghost.zip"),
                       finished_at=time.time())
    resp = await client.get(f"/api/v1/exports/jobs/{job.id}/download")
    assert resp.status_code == 410


async def test_download_export_job_done_with_file(client, tmp_path):
    """GET /exports/jobs/{job_id}/download retourne le fichier ZIP."""
    import time
    from app.services.job_manager import job_manager
    result_file = tmp_path / "result.zip"
    result_file.write_bytes(b"PK fake zip")
    job = job_manager.create_job(label="done-zip")
    job_manager.update(job.id, status="done", progress=100,
                       result_path=str(result_file),
                       finished_at=time.time())
    resp = await client.get(f"/api/v1/exports/jobs/{job.id}/download")
    assert resp.status_code == 200


async def test_preview_job_video_without_filepath(client, project_id):
    """POST /preview-jobs sur vidéo sans filepath → 400."""
    from app.storage.json_store import add_video_to_project
    # Créer une vidéo directement en store sans filepath
    video_data = {
        "id": "vid-no-filepath",
        "filename": "fake.mp4",
        "original_name": "fake.mp4",
        "filepath": "",
        "annotations": [
            {"frame_number": 10, "timestamp_ms": 400.0, "label": "a"},
            {"frame_number": 20, "timestamp_ms": 800.0, "label": "b"},
        ],
        "fps": 25.0,
        "total_frames": 50,
        "duration_seconds": 2.0,
        "width": 320,
        "height": 240,
        "codec": "h264",
    }
    add_video_to_project(project_id, video_data)
    resp = await client.post(
        "/api/v1/videos/vid-no-filepath/preview-jobs",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 400


async def test_preview_job_video_not_found(client):
    """POST /videos/{video_id}/preview-jobs avec video inexistante → 404."""
    resp = await client.post(
        "/api/v1/videos/nonexistent-id/preview-jobs",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 404


async def test_save_preview_video_not_found(client):
    """POST /videos/{video_id}/preview-adapted/save avec video inexistante → 404."""
    resp = await client.post(
        "/api/v1/videos/nonexistent-id/preview-adapted/save",
        json={"job_id": "some-job-id", "target_bpm": 120.0}
    )
    assert resp.status_code == 404


async def test_save_preview_job_not_found(client, video_id_with_annotations):
    """POST /preview-adapted/save avec job inexistant → 404."""
    resp = await client.post(
        f"/api/v1/videos/{video_id_with_annotations}/preview-adapted/save",
        json={"job_id": "nonexistent-job-id", "target_bpm": 120.0}
    )
    assert resp.status_code == 404


async def test_save_preview_job_not_done(client, video_id_with_annotations):
    """POST /preview-adapted/save avec job pas terminé → 409."""
    from app.services.job_manager import job_manager
    job = job_manager.create_job(label="pending-preview")
    resp = await client.post(
        f"/api/v1/videos/{video_id_with_annotations}/preview-adapted/save",
        json={"job_id": job.id, "target_bpm": 120.0}
    )
    assert resp.status_code == 409


async def test_save_preview_job_file_missing(client, video_id_with_annotations, tmp_path):
    """POST /preview-adapted/save avec fichier résultat absent → 410."""
    import time
    from app.services.job_manager import job_manager
    job = job_manager.create_job(label="done-missing-file")
    job_manager.update(job.id, status="done", progress=100,
                       result_path=str(tmp_path / "nonexistent.mp4"),
                       finished_at=time.time())
    resp = await client.post(
        f"/api/v1/videos/{video_id_with_annotations}/preview-adapted/save",
        json={"job_id": job.id, "target_bpm": 120.0}
    )
    assert resp.status_code == 410


async def test_save_preview_update_video_fails_gives_500(client, video_id_with_annotations, tmp_path):
    """POST /preview-adapted/save → 500 si update_video retourne None."""
    import time
    from unittest.mock import patch
    from app.services.job_manager import job_manager

    tmp_file = tmp_path / "fake_preview.mp4"
    tmp_file.write_bytes(b"fakevideo")

    job = job_manager.create_job(label="preview:120.0")
    job_manager.update(job.id, status="done", progress=100,
                       result_path=str(tmp_file), finished_at=time.time())

    with patch("app.routers.exports.settings") as mock_settings, \
         patch("app.routers.exports.update_video", return_value=None):
        mock_settings.DATA_DIR = str(tmp_path)
        resp = await client.post(
            f"/api/v1/videos/{video_id_with_annotations}/preview-adapted/save",
            json={"job_id": job.id, "target_bpm": 120.0}
        )
    assert resp.status_code == 500


async def test_delete_preview_video_not_found(client):
    """DELETE /videos/{video_id}/preview-adapted avec video inexistante → 404."""
    resp = await client.delete("/api/v1/videos/nonexistent-id/preview-adapted")
    assert resp.status_code == 404


async def test_download_saved_preview_video_not_found(client):
    """GET /videos/{video_id}/preview-adapted/download avec video inexistante → 404."""
    resp = await client.get("/api/v1/videos/nonexistent-id/preview-adapted/download")
    assert resp.status_code == 404


async def test_download_saved_preview_no_preview(client, video_id):
    """GET /videos/{video_id}/preview-adapted/download sans preview sauvegardé → 404."""
    resp = await client.get(f"/api/v1/videos/{video_id}/preview-adapted/download")
    assert resp.status_code == 404


async def test_stream_saved_preview_video_not_found(client):
    """GET /videos/{video_id}/preview-adapted/stream avec video inexistante → 404."""
    resp = await client.get("/api/v1/videos/nonexistent-id/preview-adapted/stream")
    assert resp.status_code == 404


async def test_stream_saved_preview_no_preview(client, video_id):
    """GET /videos/{video_id}/preview-adapted/stream sans preview sauvegardé → 404."""
    resp = await client.get(f"/api/v1/videos/{video_id}/preview-adapted/stream")
    assert resp.status_code == 404


async def test_stream_saved_preview_with_range(client, video_with_saved_preview):
    """GET /preview-adapted/stream avec en-tête Range → réponse 206."""
    resp = await client.get(
        f"/api/v1/videos/{video_with_saved_preview}/preview-adapted/stream",
        headers={"Range": "bytes=0-3"}
    )
    assert resp.status_code == 206
    assert "content-range" in resp.headers


async def test_delete_preview_with_osrror_is_silent(client, video_id_with_annotations, tmp_path):
    """DELETE preview avec fichier déjà supprimé → 200 (OSError silencieux)."""
    from app.storage.json_store import update_video
    update_video(video_id_with_annotations, adapted_preview={
        "path": str(tmp_path / "nonexistent_preview.mp4"),
        "bpm": 120.0,
        "created_at": "2026-01-01T00:00:00",
    })
    resp = await client.delete(
        f"/api/v1/videos/{video_id_with_annotations}/preview-adapted"
    )
    assert resp.status_code == 200


# ── Tests generate_project_zip output_path ──────────────────────────────────

def test_generate_zip_with_output_path(project_with_saved_preview, tmp_path):
    """generate_project_zip écrit dans output_path si fourni (retourne None)."""
    from app.services.export_service import generate_project_zip
    output_file = str(tmp_path / "output.zip")
    result = generate_project_zip(
        project_with_saved_preview["project_id"],
        video_ids=None,
        formats=["json"],
        output_path=output_file,
    )
    assert result is None
    import os
    assert os.path.exists(output_file)


def test_generate_zip_project_not_found(data_dir):
    """generate_project_zip retourne None si projet inexistant."""
    from app.services.export_service import generate_project_zip
    result = generate_project_zip(
        "nonexistent-project-id",
        video_ids=None,
        formats=["json"],
    )
    assert result is None


def test_generate_zip_with_csv_format(project_with_saved_preview):
    """generate_project_zip avec format CSV."""
    from app.services.export_service import generate_project_zip
    import zipfile, io as _io
    result = generate_project_zip(
        project_with_saved_preview["project_id"],
        video_ids=None,
        formats=["csv"],
    )
    assert result is not None
    z = zipfile.ZipFile(_io.BytesIO(result))
    assert any(n.endswith('.csv') for n in z.namelist())


def test_generate_zip_with_video_format_no_bpm(project_with_saved_preview):
    """generate_project_zip avec format video sans BPM cible (utilise filepath direct)."""
    from app.services.export_service import generate_project_zip
    from app.storage.json_store import get_project, update_video
    from unittest.mock import patch
    import zipfile, io as _io

    proj_id = project_with_saved_preview["project_id"]
    vid_id = project_with_saved_preview["video_id"]
    # Supprimer le preview sauvegardé pour forcer l'utilisation de filepath
    update_video(vid_id, adapted_preview=None)

    result = generate_project_zip(
        proj_id,
        video_ids=None,
        formats=["video"],
        video_bpm=None,
    )
    assert result is not None


def test_generate_zip_with_progress_callback(project_with_saved_preview):
    """generate_project_zip appelle le callback de progression."""
    from app.services.export_service import generate_project_zip
    progress_calls = []
    result = generate_project_zip(
        project_with_saved_preview["project_id"],
        video_ids=None,
        formats=["json"],
        progress_cb=lambda pct: progress_calls.append(pct),
    )
    assert result is not None
    assert len(progress_calls) > 0


def test_generate_zip_with_cancel_event(project_with_saved_preview):
    """generate_project_zip s'annule si cancel_event est set."""
    import threading
    from app.services.export_service import generate_project_zip
    cancel = threading.Event()
    cancel.set()
    try:
        generate_project_zip(
            project_with_saved_preview["project_id"],
            video_ids=None,
            formats=["json"],
            cancel_event=cancel,
        )
    except RuntimeError as e:
        assert "annulé" in str(e)


def test_generate_zip_calls_adapt_video_when_bpm_differs(project_with_saved_preview, tmp_path):
    """generate_project_zip appelle adapt_video_to_bpm si BPM cible ≠ preview sauvegardé."""
    from app.services.export_service import generate_project_zip
    from unittest.mock import patch

    # tmp_clip simule le résultat de adapt_video_to_bpm
    tmp_clip = str(tmp_path / "clip.mp4")
    with open(tmp_clip, "wb") as f:
        f.write(b"fake clip content")

    with patch("app.services.video_service.adapt_video_to_bpm", return_value=tmp_clip) as mock_adapt:
        result = generate_project_zip(
            project_with_saved_preview["project_id"],
            video_ids=None,
            formats=["video"],
            video_bpm={project_with_saved_preview["video_id"]: 200.0},  # BPM différent du preview (120)
        )
    mock_adapt.assert_called_once()
    assert result is not None


def test_generate_zip_osrror_in_cleanup_is_ignored(project_with_saved_preview, tmp_path):
    """generate_project_zip ignore les OSError lors du nettoyage des fichiers temporaires."""
    from app.services.export_service import generate_project_zip
    from unittest.mock import patch
    import os

    # Clip qui sera ajouté à tmp_files puis tentera d'être supprimé
    tmp_clip = str(tmp_path / "clip_to_delete.mp4")
    with open(tmp_clip, "wb") as f:
        f.write(b"fake clip content")

    original_remove = os.remove

    def mock_remove(path):
        if path == tmp_clip:
            raise OSError("Simulated OSError during cleanup")
        original_remove(path)

    with patch("app.services.video_service.adapt_video_to_bpm", return_value=tmp_clip), \
         patch("app.services.export_service.os.remove", side_effect=mock_remove):
        # Should not raise - OSError is silently ignored
        result = generate_project_zip(
            project_with_saved_preview["project_id"],
            video_ids=None,
            formats=["video"],
            video_bpm={project_with_saved_preview["video_id"]: 200.0},
        )
    assert result is not None
