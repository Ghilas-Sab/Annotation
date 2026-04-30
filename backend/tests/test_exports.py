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
