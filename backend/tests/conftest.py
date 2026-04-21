import subprocess
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture
def videos_dir(tmp_path, monkeypatch):
    """Dossier temporaire pour les vidéos uploadées."""
    vdir = tmp_path / "videos"
    vdir.mkdir()
    monkeypatch.setenv("VIDEOS_DIR", str(vdir))
    return vdir


@pytest.fixture
async def client(data_dir, videos_dir):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
def tmp_video_file(tmp_path):
    """Crée une vidéo synthétique de 2s via FFmpeg (testsrc, 25fps)."""
    video_path = tmp_path / "test_video.mp4"
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=25",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        str(video_path)
    ], check=True, capture_output=True)
    return video_path


@pytest.fixture
async def project_id(client):
    """Crée un projet et retourne son id."""
    res = await client.post("/api/v1/projects", json={"name": "Projet Test"})
    assert res.status_code == 201
    return res.json()["id"]


@pytest.fixture
async def uploaded_video_id(client, project_id, tmp_video_file, videos_dir):
    """Upload une vidéo test et retourne son id."""
    with open(tmp_video_file, "rb") as f:
        res = await client.post(
            f"/api/v1/projects/{project_id}/videos",
            files={"file": ("test.mp4", f, "video/mp4")}
        )
    assert res.status_code == 201
    return res.json()["id"]


@pytest.fixture
async def video_id(uploaded_video_id):
    """Alias pour uploaded_video_id utilisé dans les tests d'annotations."""
    return uploaded_video_id


@pytest.fixture
async def video_id_with_annotations(client, video_id):
    """Vidéo avec 3 annotations pour les tests d'export."""
    for frame in [10, 25, 40]:
        await client.post(
            f"/api/v1/videos/{video_id}/annotations",
            json={"frame_number": frame, "label": f"beat_{frame}"}
        )
    return video_id


@pytest.fixture
async def project_with_two_videos(client, tmp_video_file, videos_dir):
    """Projet avec deux vidéos, retourne (project_id, [vid1_id, vid2_id])."""
    res = await client.post("/api/v1/projects", json={"name": "Projet Export Test"})
    assert res.status_code == 201
    proj_id = res.json()["id"]
    ids = []
    for i in range(2):
        with open(tmp_video_file, "rb") as f:
            res = await client.post(
                f"/api/v1/projects/{proj_id}/videos",
                files={"file": (f"video_{i}.mp4", f, "video/mp4")}
            )
        assert res.status_code == 201
        ids.append(res.json()["id"])
    return proj_id, ids


@pytest.fixture
async def project_with_two_annotated_videos(client, project_with_two_videos):
    """Projet avec deux vidéos annotées (3 annotations chacune), retourne le project_id."""
    proj_id, ids = project_with_two_videos
    for vid_id in ids:
        for frame in [10, 25, 40]:
            await client.post(
                f"/api/v1/videos/{vid_id}/annotations",
                json={"frame_number": frame, "label": f"beat_{frame}"}
            )
    return proj_id


@pytest.fixture
async def video_ids(project_with_two_videos):
    """Liste des IDs des deux vidéos du projet projet_with_two_videos."""
    _, ids = project_with_two_videos
    return ids
