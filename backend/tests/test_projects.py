import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.storage.json_store import update_video


@pytest.mark.asyncio
async def test_create_project(client):
    res = await client.post("/api/v1/projects", json={"name": "Mon Projet", "description": ""})
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Mon Projet"
    assert "id" in data
    assert "created_at" in data
    assert "videos" in data


@pytest.mark.asyncio
async def test_create_project_empty_name_fails(client):
    res = await client.post("/api/v1/projects", json={"name": ""})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_list_projects(client):
    await client.post("/api/v1/projects", json={"name": "P1"})
    await client.post("/api/v1/projects", json={"name": "P2"})
    res = await client.get("/api/v1/projects")
    assert res.status_code == 200
    assert len(res.json()) == 2


@pytest.mark.asyncio
async def test_list_projects_sorted_desc(client):
    await client.post("/api/v1/projects", json={"name": "Premier"})
    await client.post("/api/v1/projects", json={"name": "Dernier"})
    res = await client.get("/api/v1/projects")
    names = [p["name"] for p in res.json()]
    assert names[0] == "Dernier"  # created_at DESC


@pytest.mark.asyncio
async def test_get_project_detail(client):
    res = await client.post("/api/v1/projects", json={"name": "Détail"})
    pid = res.json()["id"]
    detail = await client.get(f"/api/v1/projects/{pid}")
    assert detail.status_code == 200
    assert "videos" in detail.json()


@pytest.mark.asyncio
async def test_update_project(client):
    res = await client.post("/api/v1/projects", json={"name": "Ancien"})
    pid = res.json()["id"]
    upd = await client.put(f"/api/v1/projects/{pid}", json={"name": "Nouveau"})
    assert upd.status_code == 200
    assert upd.json()["name"] == "Nouveau"


@pytest.mark.asyncio
async def test_delete_project(client):
    res = await client.post("/api/v1/projects", json={"name": "À supprimer"})
    pid = res.json()["id"]
    del_res = await client.delete(f"/api/v1/projects/{pid}")
    assert del_res.status_code == 204
    get_res = await client.get(f"/api/v1/projects/{pid}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_get_project_not_found(client):
    res = await client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_get_project_detail_includes_adapted_preview(client, uploaded_video_id):
    update_video(
        uploaded_video_id,
        adapted_preview={
            "path": "/tmp/preview.mp4",
            "bpm": 120.0,
            "created_at": "2026-04-27T09:22:25.091376",
        },
    )

    video_res = await client.get(f"/api/v1/videos/{uploaded_video_id}")
    project_id = video_res.json()["project_id"]

    detail = await client.get(f"/api/v1/projects/{project_id}")
    assert detail.status_code == 200
    assert detail.json()["videos"][0]["adapted_preview"]["bpm"] == 120.0


@pytest.mark.asyncio
async def test_update_project_not_found(client):
    """PUT projet inexistant → 404."""
    res = await client.put(
        "/api/v1/projects/nonexistent-id",
        json={"name": "Nouveau"}
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_not_found(client):
    """DELETE projet inexistant → 404."""
    res = await client.delete("/api/v1/projects/nonexistent-id")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_project_removes_video_file(client, uploaded_video_id, videos_dir, monkeypatch):
    """DELETE projet supprime le fichier vidéo associé quand le fichier existe."""
    import os
    from app.config import settings
    video_res = await client.get(f"/api/v1/videos/{uploaded_video_id}")
    project_id = video_res.json()["project_id"]
    video_data = video_res.json()
    filename = video_data.get("filename", "")

    # Créer le fichier dans le répertoire utilisé par settings.VIDEOS_DIR
    fake_videos_dir = str(videos_dir)
    monkeypatch.setattr(settings, "VIDEOS_DIR", fake_videos_dir)
    fake_filepath = os.path.join(fake_videos_dir, filename)
    # Écrire un fichier factice à l'emplacement attendu par le router
    with open(fake_filepath, "wb") as f:
        f.write(b"fakevideo")

    res = await client.delete(f"/api/v1/projects/{project_id}")
    assert res.status_code == 204
    # Le fichier doit être supprimé
    assert not os.path.exists(fake_filepath)
