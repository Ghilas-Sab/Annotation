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
