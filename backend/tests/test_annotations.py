import pytest


# ── S3.2 : Bulk Placement + Décalage Global ──────────────────────────────────

@pytest.mark.asyncio
async def test_bulk_placement(client, video_id):
    """AC1–AC4 : POST bulk crée N annotations équidistantes avec labels préfixés."""
    # Vidéo test : 25fps, 50 frames (2s). On reste dans les bornes.
    res = await client.post(f"/api/v1/videos/{video_id}/annotations/bulk",
                            json={"start_frame": 0, "end_frame": 40,
                                  "count": 5, "prefix": "beat"})
    assert res.status_code == 201
    annotations = res.json()
    assert len(annotations) == 5
    assert annotations[0]["label"] == "beat 1"
    assert annotations[4]["label"] == "beat 5"
    assert annotations[0]["frame_number"] == 0
    assert annotations[4]["frame_number"] == 40


@pytest.mark.asyncio
async def test_bulk_placement_no_prefix(client, video_id):
    """AC3 : préfixe vide → labels '1', '2', …, 'N'."""
    res = await client.post(f"/api/v1/videos/{video_id}/annotations/bulk",
                            json={"start_frame": 0, "end_frame": 40,
                                  "count": 3, "prefix": ""})
    assert res.status_code == 201
    labels = [a["label"] for a in res.json()]
    assert labels == ["1", "2", "3"]


@pytest.mark.asyncio
async def test_global_shift_positive(client, video_id):
    """AC5–AC6 : shift positif +1000ms = +25 frames à 25fps."""
    await client.post(f"/api/v1/videos/{video_id}/annotations",
                      json={"frame_number": 10, "label": "x"})
    res = await client.patch(f"/api/v1/videos/{video_id}/annotations/shift",
                             json={"offset_ms": 1000.0})
    assert res.status_code == 200
    ann = res.json()[0]
    assert ann["frame_number"] == 35  # 10 + round(1000/1000*25)


@pytest.mark.asyncio
async def test_global_shift_negative(client, video_id):
    """AC5–AC6 : shift négatif -400ms = -10 frames à 25fps."""
    await client.post(f"/api/v1/videos/{video_id}/annotations",
                      json={"frame_number": 20, "label": "x"})
    res = await client.patch(f"/api/v1/videos/{video_id}/annotations/shift",
                             json={"offset_ms": -400.0})
    assert res.status_code == 200
    assert res.json()[0]["frame_number"] == 10


@pytest.mark.asyncio
async def test_shift_below_zero_fails(client, video_id):
    """AC7 : shift qui ferait passer une annotation sous frame 0 → 422."""
    await client.post(f"/api/v1/videos/{video_id}/annotations",
                      json={"frame_number": 5, "label": "x"})
    res = await client.patch(f"/api/v1/videos/{video_id}/annotations/shift",
                             json={"offset_ms": -10000.0})
    assert res.status_code == 422


# ── S3.1 : CRUD Annotations ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_annotation(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 42, "label": "beat"})
    assert res.status_code == 201
    data = res.json()
    assert data["frame_number"] == 42
    # La vidéo test de conftest fait 25fps
    assert data["timestamp_ms"] == pytest.approx(42 / 25.0 * 1000, rel=1e-3)


@pytest.mark.asyncio
async def test_list_annotations_sorted(client, video_id):
    for frame in [100, 10, 50]:
        await client.post(f"/api/v1/videos/{video_id}/annotations",
                          json={"frame_number": frame, "label": "x"})
    res = await client.get(f"/api/v1/videos/{video_id}/annotations")
    assert res.status_code == 200
    frames = [a["frame_number"] for a in res.json()]
    assert frames == sorted(frames)


@pytest.mark.asyncio
async def test_annotation_invalid_frame(client, video_id):
    # Test frame négative
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": -1, "label": "x"})
    assert res.status_code == 422
    
    # Test frame trop grande (la vidéo test dure 2s à 25fps = 50 frames max)
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 1000, "label": "x"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_update_annotation(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 10, "label": "init"})
    ann_id = res.json()["id"]
    
    res = await client.put(f"/api/v1/annotations/{ann_id}",
                           json={"frame_number": 20, "label": "updated"})
    assert res.status_code == 200
    data = res.json()
    assert data["frame_number"] == 20
    assert data["label"] == "updated"
    assert data["timestamp_ms"] == pytest.approx(20 / 25.0 * 1000, rel=1e-3)


@pytest.mark.asyncio
async def test_delete_annotation(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 10, "label": "x"})
    ann_id = res.json()["id"]
    
    del_res = await client.delete(f"/api/v1/annotations/{ann_id}")
    assert del_res.status_code == 204
    
    list_res = await client.get(f"/api/v1/videos/{video_id}/annotations")
    assert len(list_res.json()) == 0


@pytest.mark.asyncio
async def test_delete_all_annotations(client, video_id):
    await client.post(f"/api/v1/videos/{video_id}/annotations", json={"frame_number": 10, "label": "1"})
    await client.post(f"/api/v1/videos/{video_id}/annotations", json={"frame_number": 20, "label": "2"})
    
    res = await client.delete(f"/api/v1/videos/{video_id}/annotations")
    assert res.status_code == 204
    
    list_res = await client.get(f"/api/v1/videos/{video_id}/annotations")
    assert len(list_res.json()) == 0
