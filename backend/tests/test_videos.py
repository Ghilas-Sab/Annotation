import pytest
import io


@pytest.mark.asyncio
async def test_upload_video(client, project_id, tmp_video_file, videos_dir):
    with open(tmp_video_file, "rb") as f:
        res = await client.post(
            f"/api/v1/projects/{project_id}/videos",
            files={"file": ("test.mp4", f, "video/mp4")}
        )
    assert res.status_code == 201
    data = res.json()
    assert data["fps"] > 0
    assert data["total_frames"] > 0
    assert data["duration_seconds"] > 0


@pytest.mark.asyncio
async def test_video_metadata_stored(client, uploaded_video_id):
    res = await client.get(f"/api/v1/videos/{uploaded_video_id}")
    assert res.status_code == 200
    data = res.json()
    assert "fps" in data
    assert "duration_seconds" in data
    assert "total_frames" in data
    assert "width" in data


@pytest.mark.asyncio
async def test_list_project_videos(client, project_id, uploaded_video_id):
    res = await client.get(f"/api/v1/projects/{project_id}/videos")
    assert res.status_code == 200
    assert len(res.json()) == 1


@pytest.mark.asyncio
async def test_delete_video(client, uploaded_video_id):
    del_res = await client.delete(f"/api/v1/videos/{uploaded_video_id}")
    assert del_res.status_code == 204
    get_res = await client.get(f"/api/v1/videos/{uploaded_video_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_upload_project_not_found(client, tmp_video_file, videos_dir):
    with open(tmp_video_file, "rb") as f:
        res = await client.post(
            "/api/v1/projects/00000000-0000-0000-0000-000000000000/videos",
            files={"file": ("test.mp4", f, "video/mp4")}
        )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_video_stream_full(client, uploaded_video_id):
    res = await client.get(f"/api/v1/videos/{uploaded_video_id}/stream")
    assert res.status_code == 200
    assert "video" in res.headers.get("content-type", "")
    assert res.headers.get("accept-ranges") == "bytes"


@pytest.mark.asyncio
async def test_video_stream_range(client, uploaded_video_id):
    res = await client.get(
        f"/api/v1/videos/{uploaded_video_id}/stream",
        headers={"Range": "bytes=0-1023"}
    )
    assert res.status_code == 206
    assert res.headers.get("accept-ranges") == "bytes"
    assert "content-range" in res.headers


@pytest.mark.asyncio
async def test_video_stream_not_found(client):
    res = await client.get("/api/v1/videos/00000000-0000-0000-0000-000000000000/stream")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_upload_video_with_display_name(client, project_id, tmp_video_file, videos_dir):
    with open(tmp_video_file, "rb") as f:
        res = await client.post(
            f"/api/v1/projects/{project_id}/videos",
            data={"display_name": "Ma vidéo de test"},
            files={"file": ("video.mp4", f, "video/mp4")},
        )
    assert res.status_code == 201
    assert res.json()["original_name"] == "Ma vidéo de test"


@pytest.mark.asyncio
async def test_upload_video_without_display_name_uses_filename(client, project_id, tmp_video_file, videos_dir):
    with open(tmp_video_file, "rb") as f:
        res = await client.post(
            f"/api/v1/projects/{project_id}/videos",
            files={"file": ("my_file.mp4", f, "video/mp4")},
        )
    assert res.status_code == 201
    assert res.json()["original_name"] == "my_file.mp4"


@pytest.mark.asyncio
async def test_rename_video(client, uploaded_video_id):
    res = await client.patch(
        f"/api/v1/videos/{uploaded_video_id}",
        json={"original_name": "Nouveau nom"},
    )
    assert res.status_code == 200
    assert res.json()["original_name"] == "Nouveau nom"


@pytest.mark.asyncio
async def test_rename_video_not_found(client):
    res = await client.patch(
        "/api/v1/videos/00000000-0000-0000-0000-000000000000",
        json={"original_name": "Nouveau nom"},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_rename_video_empty_name(client, uploaded_video_id):
    res = await client.patch(
        f"/api/v1/videos/{uploaded_video_id}",
        json={"original_name": ""},
    )
    assert res.status_code == 422


# --- Validation format fichier ---

@pytest.mark.asyncio
async def test_upload_pdf_renamed_as_mp4_is_rejected(client, project_id, videos_dir):
    """Un PDF renommé en .mp4 doit être rejeté avant même FFmpeg."""
    pdf_bytes = b"%PDF-1.4 fake pdf content that is definitely not a video"
    res = await client.post(
        f"/api/v1/projects/{project_id}/videos",
        files={"file": ("document.mp4", io.BytesIO(pdf_bytes), "video/mp4")},
    )
    assert res.status_code == 400
    assert "vidéo" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_png_renamed_as_mp4_is_rejected(client, project_id, videos_dir):
    """Une image PNG renommée en .mp4 doit être rejetée."""
    png_magic = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
    res = await client.post(
        f"/api/v1/projects/{project_id}/videos",
        files={"file": ("image.mp4", io.BytesIO(png_magic), "video/mp4")},
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_upload_jpeg_renamed_as_mp4_is_rejected(client, project_id, videos_dir):
    """Un JPEG renommé en .mp4 doit être rejeté."""
    jpeg_magic = b"\xff\xd8\xff\xe0" + b"\x00" * 50
    res = await client.post(
        f"/api/v1/projects/{project_id}/videos",
        files={"file": ("photo.mp4", io.BytesIO(jpeg_magic), "video/mp4")},
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_upload_zip_renamed_as_mp4_is_rejected(client, project_id, videos_dir):
    """Un ZIP renommé en .mp4 doit être rejeté."""
    zip_magic = b"PK\x03\x04" + b"\x00" * 50
    res = await client.post(
        f"/api/v1/projects/{project_id}/videos",
        files={"file": ("archive.mp4", io.BytesIO(zip_magic), "video/mp4")},
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_upload_text_file_is_rejected(client, project_id, videos_dir):
    """Un fichier texte brut doit être rejeté."""
    text_bytes = b"Hello world, this is not a video file at all."
    res = await client.post(
        f"/api/v1/projects/{project_id}/videos",
        files={"file": ("note.txt", io.BytesIO(text_bytes), "text/plain")},
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_upload_invalid_extension_is_rejected(client, project_id, videos_dir):
    """Une extension non-vidéo doit être rejetée même avec du bon contenu."""
    res = await client.post(
        f"/api/v1/projects/{project_id}/videos",
        files={"file": ("document.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
    )
    assert res.status_code == 400
