import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


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
