# Story 3.1: CRUD Annotations (Backend)

Status: approved

## Story

As a utilisateur,
I want créer, lister, modifier et supprimer des annotations via l'API,
so that je puisse persister mes annotations frame-précises.

## Acceptance Criteria

1. `POST /api/v1/videos/{id}/annotations` crée une annotation (frame_number + label) et calcule `timestamp_ms = frame_number / fps * 1000`
2. `GET /api/v1/videos/{id}/annotations` retourne la liste triée par `frame_number` ASC
3. `PUT /api/v1/annotations/{id}` modifie `frame_number` et/ou `label` (recalcule `timestamp_ms`)
4. `DELETE /api/v1/annotations/{id}` supprime l'annotation
5. `DELETE /api/v1/videos/{id}/annotations` supprime TOUTES les annotations d'une vidéo
6. Créer une annotation sur une frame négative retourne 422
7. Créer une annotation sur une frame > `total_frames` retourne 422

## Tasks / Subtasks

- [ ] Écrire les tests en premier — `backend/tests/test_annotations.py` (AC: 1–7)
  - [ ] `test_create_annotation` : POST → 201, vérifier `frame_number`, `timestamp_ms`, `id`
  - [ ] `test_list_annotations_sorted` : créer frames [100, 10, 50], GET → triées ASC
  - [ ] `test_update_annotation` : PUT → frame modifiée, `timestamp_ms` recalculé
  - [ ] `test_delete_annotation` : DELETE → 204
  - [ ] `test_delete_all_annotations` : DELETE /videos/{id}/annotations → 204, liste vide
  - [ ] `test_annotation_invalid_frame_negative` : frame -1 → 422
  - [ ] `test_annotation_invalid_frame_over_total` : frame > total_frames → 422
  - [ ] Ajouter la fixture `video_id` dans `conftest.py`
- [ ] Créer `backend/app/routers/annotations.py` (AC: 1–7)
  - [ ] `POST /videos/{video_id}/annotations` — valider frame_number, calculer timestamp_ms, appeler `json_store`
  - [ ] `GET /videos/{video_id}/annotations` — lister triées par frame_number ASC
  - [ ] `PUT /annotations/{annotation_id}` — modifier + recalculer timestamp_ms
  - [ ] `DELETE /annotations/{annotation_id}` — supprimer une annotation
  - [ ] `DELETE /videos/{video_id}/annotations` — supprimer toutes les annotations
- [ ] Créer les schémas Pydantic `AnnotationCreate` / `AnnotationRead`
  - [ ] `backend/app/schemas/annotation.py` — AnnotationCreate (frame_number, label), AnnotationRead (+ timestamp_ms, id, video_id, created_at)
- [ ] Modifier `backend/app/main.py` — inclure le router annotations
- [ ] Modifier `backend/tests/conftest.py` — ajouter fixture `video_id`

## Dev Notes

### Modèle de données Annotation (JSON imbriqué dans Video)

```
Annotation
├── id: str (UUID)
├── video_id: str
├── frame_number: int (>= 0, <= total_frames)
├── timestamp_ms: float  # frame_number / fps * 1000
├── label: str (défaut "")
└── created_at: str (ISO 8601)
```

Les annotations sont stockées **imbriquées dans le JSON de la vidéo** (`video["annotations"]`), comme les vidéos le sont dans les projets.

### Fonctions json_store attendues

Le `json_store` suit le même pattern que pour les projets. Les fonctions à ajouter / utiliser :

```python
# backend/app/storage/json_store.py
def get_annotations(video_id: str) -> list[dict]:
    """Retourne toutes les annotations d'une vidéo."""

def get_annotation(annotation_id: str) -> dict | None:
    """Retourne une annotation par son id."""

def create_annotation(video_id: str, frame_number: int, label: str, fps: float) -> dict:
    """Crée et persiste une annotation. Calcule timestamp_ms."""

def update_annotation(annotation_id: str, **kwargs) -> dict | None:
    """Modifie une annotation. Recalcule timestamp_ms si frame_number change."""

def delete_annotation(annotation_id: str) -> bool:
    """Supprime une annotation."""

def delete_all_annotations(video_id: str) -> int:
    """Supprime toutes les annotations d'une vidéo. Retourne le nb supprimé."""
```

### Calcul timestamp_ms

```python
timestamp_ms = frame_number / fps * 1000
```

Le FPS provient des métadonnées de la vidéo (champ `fps` dans le JSON vidéo). Toujours récupérer la vidéo depuis json_store pour valider `frame_number` et obtenir `fps` et `total_frames`.

### Validation frame_number

```python
from fastapi import APIRouter, HTTPException
from app.storage import json_store

@router.post("/videos/{video_id}/annotations", response_model=AnnotationRead, status_code=201)
async def create_annotation(video_id: str, body: AnnotationCreate):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    if body.frame_number < 0:
        raise HTTPException(status_code=422, detail="frame_number doit être >= 0")
    if body.frame_number > video["total_frames"]:
        raise HTTPException(status_code=422, detail="frame_number dépasse total_frames")
    return json_store.create_annotation(video_id, body.frame_number, body.label, video["fps"])
```

### Schémas Pydantic

```python
# backend/app/schemas/annotation.py
from pydantic import BaseModel, field_validator

class AnnotationCreate(BaseModel):
    frame_number: int
    label: str = ""

class AnnotationRead(BaseModel):
    id: str
    video_id: str
    frame_number: int
    timestamp_ms: float
    label: str
    created_at: str
```

### Tests à écrire EN PREMIER (TDD strict)

```python
# backend/tests/test_annotations.py
import pytest

@pytest.mark.asyncio
async def test_create_annotation(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 42, "label": "beat"})
    assert res.status_code == 201
    data = res.json()
    assert data["frame_number"] == 42
    assert data["timestamp_ms"] == pytest.approx(42 / 25.0 * 1000, rel=1e-3)
    assert "id" in data

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
async def test_update_annotation(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 10, "label": "old"})
    ann_id = res.json()["id"]
    upd = await client.put(f"/api/v1/annotations/{ann_id}",
                           json={"frame_number": 25, "label": "new"})
    assert upd.status_code == 200
    assert upd.json()["frame_number"] == 25
    assert upd.json()["timestamp_ms"] == pytest.approx(25 / 25.0 * 1000, rel=1e-3)

@pytest.mark.asyncio
async def test_delete_annotation(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 5, "label": "x"})
    ann_id = res.json()["id"]
    del_res = await client.delete(f"/api/v1/annotations/{ann_id}")
    assert del_res.status_code == 204

@pytest.mark.asyncio
async def test_delete_all_annotations(client, video_id):
    for f in [10, 20, 30]:
        await client.post(f"/api/v1/videos/{video_id}/annotations",
                          json={"frame_number": f, "label": "x"})
    res = await client.delete(f"/api/v1/videos/{video_id}/annotations")
    assert res.status_code == 204
    list_res = await client.get(f"/api/v1/videos/{video_id}/annotations")
    assert list_res.json() == []

@pytest.mark.asyncio
async def test_annotation_invalid_frame_negative(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": -1, "label": "x"})
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_annotation_invalid_frame_over_total(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 999999, "label": "x"})
    assert res.status_code == 422
```

### Fixture video_id à ajouter dans conftest.py

```python
# backend/tests/conftest.py — ajouter cette fixture
@pytest.fixture
async def video_id(client):
    """Crée un projet et une vidéo de test, retourne l'id de la vidéo."""
    proj = await client.post("/api/v1/projects", json={"name": "Test Project"})
    pid = proj.json()["id"]
    # Simuler l'upload avec un fichier minimal — adapter selon l'implémentation S2.2
    # La vidéo doit avoir fps=25.0 et total_frames suffisant pour les tests
    import io
    fake_video = io.BytesIO(b"fake video content")
    res = await client.post(
        f"/api/v1/projects/{pid}/videos",
        files={"file": ("test.mp4", fake_video, "video/mp4")}
    )
    # Si l'upload échoue (pas de vrai FFmpeg en test), insérer directement via json_store
    from app.storage import json_store
    video = json_store.create_video(pid, "test.mp4", "test.mp4",
                                    fps=25.0, total_frames=1000,
                                    duration_seconds=40.0, width=1920, height=1080, codec="h264")
    return video["id"]
```

### Structure des fichiers

```
backend/
├── app/
│   ├── main.py                    ← modifier : include_router annotations
│   ├── routers/
│   │   └── annotations.py         ← créer
│   └── schemas/
│       └── annotation.py          ← créer
└── tests/
    ├── conftest.py                 ← modifier : ajouter fixture video_id
    └── test_annotations.py        ← créer
```

### Anti-patterns à éviter

- Ne PAS stocker les annotations dans une table séparée — elles sont imbriquées dans le JSON vidéo
- Ne PAS oublier de recalculer `timestamp_ms` lors du PUT
- Le DELETE retourne 204 **sans body**
- Toujours valider que la vidéo existe avant de créer une annotation

### References

- Modèle de données : [Source: planning-artifacts/architecture.md — Modèle de données]
- Endpoints API : [Source: planning-artifacts/architecture.md — Annotations]
- json_store pattern : [Source: implementation-artifacts/1-2-bootstrap-backend-fastapi-base-de-donnees.md]
- Story dépendante : [Source: implementation-artifacts/2-2-upload-video-metadonnees-ffmpeg.md]

## Dev Agent Record

### Agent Model Used

_À compléter lors de l'implémentation_

### Debug Log References

_À compléter_

### Completion Notes List

_À compléter_

### File List

_À compléter_

## Change Log

- 2026-04-10 : Story créée par SM (Bob) — prête pour implémentation TDD
