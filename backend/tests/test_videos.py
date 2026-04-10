import pytest


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
