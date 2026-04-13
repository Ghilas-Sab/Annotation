import pytest

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
