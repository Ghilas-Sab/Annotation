import pytest


@pytest.mark.asyncio
async def test_create_category(client, uploaded_video_id):
    resp = await client.post(
        f"/api/v1/videos/{uploaded_video_id}/categories",
        json={"name": "Temps fort", "color": "#FF5733"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Temps fort"
    assert data["color"] == "#FF5733"
    assert "id" in data
    assert data["video_id"] == uploaded_video_id


@pytest.mark.asyncio
async def test_get_categories_includes_default(client, uploaded_video_id):
    resp = await client.get(f"/api/v1/videos/{uploaded_video_id}/categories")
    assert resp.status_code == 200
    categories = resp.json()
    default_cat = next((c for c in categories if c["name"] == "Par défaut"), None)
    assert default_cat is not None
    assert default_cat["color"] == "#9CA3AF"


@pytest.mark.asyncio
async def test_cannot_delete_default_category(client, uploaded_video_id):
    categories = (await client.get(f"/api/v1/videos/{uploaded_video_id}/categories")).json()
    default_id = next(c["id"] for c in categories if c["name"] == "Par défaut")
    resp = await client.delete(f"/api/v1/categories/{default_id}")
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_category(client, uploaded_video_id):
    cat = (await client.post(
        f"/api/v1/videos/{uploaded_video_id}/categories",
        json={"name": "Beat", "color": "#3498DB"},
    )).json()
    resp = await client.put(
        f"/api/v1/categories/{cat['id']}",
        json={"name": "Beat fort", "color": "#E74C3C"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Beat fort"
    assert resp.json()["color"] == "#E74C3C"


@pytest.mark.asyncio
async def test_delete_category(client, uploaded_video_id):
    cat = (await client.post(
        f"/api/v1/videos/{uploaded_video_id}/categories",
        json={"name": "Temp", "color": "#000000"},
    )).json()
    resp = await client.delete(f"/api/v1/categories/{cat['id']}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_annotation_with_category(client, uploaded_video_id):
    cat = (await client.post(
        f"/api/v1/videos/{uploaded_video_id}/categories",
        json={"name": "Beat", "color": "#3498DB"},
    )).json()
    ann = (await client.post(
        f"/api/v1/videos/{uploaded_video_id}/annotations",
        json={"frame_number": 5, "category_id": cat["id"]},
    )).json()
    assert ann["category_id"] == cat["id"]


@pytest.mark.asyncio
async def test_annotation_without_category_gets_default(client, uploaded_video_id):
    ann = (await client.post(
        f"/api/v1/videos/{uploaded_video_id}/annotations",
        json={"frame_number": 5},
    )).json()
    assert ann["category_id"] is not None


@pytest.mark.asyncio
async def test_existing_annotations_get_default_category(client, uploaded_video_id):
    # Créer une annotation sans category_id (rétrocompatibilité)
    await client.post(
        f"/api/v1/videos/{uploaded_video_id}/annotations",
        json={"frame_number": 10},
    )
    anns = (await client.get(f"/api/v1/videos/{uploaded_video_id}/annotations")).json()
    for a in anns:
        assert a.get("category_id") is not None


@pytest.mark.asyncio
async def test_cannot_update_default_category_name(client, uploaded_video_id):
    categories = (await client.get(f"/api/v1/videos/{uploaded_video_id}/categories")).json()
    default_id = next(c["id"] for c in categories if c["name"] == "Par défaut")
    resp = await client.put(
        f"/api/v1/categories/{default_id}",
        json={"name": "Renommé", "color": "#FF0000"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_category_not_found(client):
    resp = await client.delete("/api/v1/categories/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cannot_create_duplicate_name(client, uploaded_video_id):
    await client.post(
        f"/api/v1/videos/{uploaded_video_id}/categories",
        json={"name": "Beat", "color": "#FF0000"},
    )
    resp = await client.post(
        f"/api/v1/videos/{uploaded_video_id}/categories",
        json={"name": "Beat", "color": "#00FF00"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_cannot_create_duplicate_color(client, uploaded_video_id):
    await client.post(
        f"/api/v1/videos/{uploaded_video_id}/categories",
        json={"name": "Beat", "color": "#FF0000"},
    )
    resp = await client.post(
        f"/api/v1/videos/{uploaded_video_id}/categories",
        json={"name": "Autre", "color": "#FF0000"},
    )
    assert resp.status_code == 409
