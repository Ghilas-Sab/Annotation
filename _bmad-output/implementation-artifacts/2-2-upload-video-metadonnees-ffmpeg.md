# Story 2.2: Upload Vidéo + Métadonnées FFmpeg (Backend)

Status: ready-for-dev

## Story

As a utilisateur,
I want uploader une vidéo dans un projet et obtenir ses métadonnées automatiquement,
so that je connaisse la durée, le FPS et le nombre total de frames.

## Acceptance Criteria

1. `POST /api/v1/projects/{id}/videos` accepte un fichier multipart et retourne 201 + objet vidéo complet
2. Les métadonnées (`fps`, `duration_seconds`, `total_frames`, `width`, `height`, `codec`) sont extraites via FFmpeg et stockées dans le JSON
3. Le fichier vidéo est sauvegardé dans `VIDEOS_DIR` avec un nom unique (UUID + extension d'origine)
4. `GET /api/v1/projects/{id}/videos` liste les vidéos du projet
5. `GET /api/v1/videos/{id}` retourne les métadonnées complètes
6. `DELETE /api/v1/videos/{id}` supprime la vidéo (fichier physique + entrée JSON + annotations associées)
7. Upload sur un projet inexistant retourne 404

## Tasks / Subtasks

- [ ] Créer la fixture `tmp_video_file` dans `conftest.py` (vidéo synthétique 5s via FFmpeg)
- [ ] Créer la fixture `project_id` dans `conftest.py` (crée un projet via l'API)
- [ ] Créer la fixture `uploaded_video_id` dans `conftest.py` (upload via l'API)
- [ ] Écrire les tests en premier — `backend/tests/test_videos.py` (AC: 1–7)
  - [ ] `test_upload_video` : POST multipart → 201, fps > 0, total_frames > 0
  - [ ] `test_video_metadata_stored` : GET /videos/{id} → fps, duration_seconds présents
  - [ ] `test_list_project_videos` : GET /projects/{id}/videos → liste avec 1 élément
  - [ ] `test_delete_video` : DELETE → 204, GET → 404
  - [ ] `test_upload_project_not_found` : POST sur projet inexistant → 404
- [ ] Créer `backend/app/services/video_service.py` (AC: 2)
  - [ ] `get_video_metadata(filepath)` → dict avec fps, duration_seconds, total_frames, width, height, codec
  - [ ] Utiliser `ffmpeg.probe()` exactement selon le pattern architecture
- [ ] Ajouter les fonctions vidéo dans `json_store.py` (AC: 1, 4, 5, 6)
  - [ ] `add_video_to_project(project_id, video_dict)` → video dict
  - [ ] `get_video(video_id)` → dict | None (cherche dans tous les projets)
  - [ ] `delete_video(video_id)` → bool
- [ ] Créer `backend/app/routers/videos.py` (AC: 1, 4, 5, 6, 7)
  - [ ] `POST /api/v1/projects/{project_id}/videos` — upload + metadata + save
  - [ ] `GET /api/v1/projects/{project_id}/videos` — liste vidéos du projet
  - [ ] `GET /api/v1/videos/{video_id}` — métadonnées complètes
  - [ ] `DELETE /api/v1/videos/{video_id}` — fichier + JSON
- [ ] Modifier `backend/app/main.py` — inclure le router videos

## Dev Notes

### Service FFmpeg — Pattern EXACT de l'architecture

```python
# backend/app/services/video_service.py
import ffmpeg

def get_video_metadata(filepath: str) -> dict:
    probe = ffmpeg.probe(filepath)
    video_stream = next(
        s for s in probe['streams'] if s['codec_type'] == 'video'
    )
    fps_num, fps_den = video_stream['r_frame_rate'].split('/')
    fps = float(fps_num) / float(fps_den)
    duration = float(probe['format']['duration'])
    nb_frames = video_stream.get('nb_frames')
    total_frames = int(nb_frames) if nb_frames else int(fps * duration)
    return {
        "duration_seconds": duration,
        "fps": fps,
        "total_frames": total_frames,
        "width": video_stream['width'],
        "height": video_stream['height'],
        "codec": video_stream['codec_name'],
    }
```

**Ne pas utiliser `subprocess` directement** — utiliser le wrapper `ffmpeg-python` (déjà dans requirements.txt depuis S1.2).

### Stockage des fichiers vidéo

```python
# Pattern sauvegarde fichier
import uuid
import os
import aiofiles
from pathlib import Path

async def save_upload(file: UploadFile, videos_dir: str) -> tuple[str, str]:
    """Retourne (filename_uuid, original_name)"""
    ext = Path(file.filename).suffix.lower()  # .mp4, .avi, etc.
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(videos_dir, filename)
    os.makedirs(videos_dir, exist_ok=True)
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    return filename, file.filename
```

### Fonctions à ajouter dans `json_store.py`

```python
# Ajouter à la fin de backend/app/storage/json_store.py

def add_video_to_project(project_id: str, video_data: dict) -> dict | None:
    """Ajoute une vidéo dans le projet. Retourne la vidéo ou None si projet absent."""
    data = _load()
    for project in data["projects"]:
        if project["id"] == project_id:
            project.setdefault("videos", []).append(video_data)
            _save(data)
            return video_data
    return None


def get_video(video_id: str) -> dict | None:
    """Cherche une vidéo dans tous les projets."""
    for project in get_projects():
        for video in project.get("videos", []):
            if video["id"] == video_id:
                return video
    return None


def delete_video(video_id: str) -> bool:
    """Supprime une vidéo (+ ses annotations) d'un projet."""
    data = _load()
    for project in data["projects"]:
        videos = project.get("videos", [])
        for i, video in enumerate(videos):
            if video["id"] == video_id:
                del videos[i]
                _save(data)
                return True
    return False
```

### Router videos.py

```python
# backend/app/routers/videos.py
import os
import uuid
from datetime import datetime, timezone
import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File
from pathlib import Path
from app.storage import json_store
from app.services.video_service import get_video_metadata
from app.config import settings

router = APIRouter(tags=["videos"])

@router.post("/projects/{project_id}/videos", status_code=201)
async def upload_video(project_id: str, file: UploadFile = File(...)):
    # Vérifier que le projet existe
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    # Sauvegarder le fichier
    ext = Path(file.filename).suffix.lower()
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.VIDEOS_DIR, filename)
    os.makedirs(settings.VIDEOS_DIR, exist_ok=True)

    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)

    # Extraire les métadonnées
    try:
        meta = get_video_metadata(filepath)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=422, detail=f"Erreur FFmpeg: {e}")

    # Construire l'objet vidéo
    video = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "filename": filename,
        "original_name": file.filename,
        "filepath": filepath,
        "duration_seconds": meta["duration_seconds"],
        "fps": meta["fps"],
        "total_frames": meta["total_frames"],
        "width": meta["width"],
        "height": meta["height"],
        "codec": meta["codec"],
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "annotations": [],
    }
    json_store.add_video_to_project(project_id, video)
    return video

@router.get("/projects/{project_id}/videos")
async def list_videos(project_id: str):
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project.get("videos", [])

@router.get("/videos/{video_id}")
async def get_video(video_id: str):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    return video

@router.delete("/videos/{video_id}", status_code=204)
async def delete_video(video_id: str):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")
    # Supprimer le fichier physique
    if os.path.exists(video.get("filepath", "")):
        os.remove(video["filepath"])
    json_store.delete_video(video_id)
```

### Fixtures à ajouter dans conftest.py

```python
# backend/tests/conftest.py — AJOUTER ces fixtures

import subprocess
import pytest

@pytest.fixture
def videos_dir(tmp_path, monkeypatch):
    """Dossier temporaire pour les vidéos uploadées."""
    vdir = tmp_path / "videos"
    vdir.mkdir()
    monkeypatch.setenv("VIDEOS_DIR", str(vdir))
    return vdir

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
```

**Important :** La fixture `client` doit inclure `videos_dir` pour que `VIDEOS_DIR` soit patché :

```python
@pytest.fixture
async def client(data_dir, videos_dir):  # ajouter videos_dir
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

### Tests à écrire EN PREMIER (TDD strict)

```python
# backend/tests/test_videos.py
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
```

### Structure des fichiers

```
backend/
├── app/
│   ├── main.py                    ← modifier : include_router videos
│   ├── routers/
│   │   └── videos.py              ← créer
│   ├── services/
│   │   ├── __init__.py            ← créer si absent
│   │   └── video_service.py       ← créer
│   └── storage/
│       └── json_store.py          ← modifier : add_video_to_project, get_video, delete_video
└── tests/
    ├── conftest.py                 ← modifier : fixtures tmp_video_file, project_id, uploaded_video_id, videos_dir
    └── test_videos.py              ← créer
```

### Anti-patterns à éviter

- Ne PAS utiliser `subprocess` directement pour FFmpeg — utiliser `ffmpeg-python` (`import ffmpeg`)
- Ne PAS stocker le chemin absolu dans `filepath` en production — il changera entre les environnements. En v1, stocker le chemin complet est acceptable pour la simplicité.
- Ne PAS bloquer l'event loop lors de la lecture du fichier — utiliser `aiofiles` pour la sauvegarde
- Ne PAS oublier de supprimer le fichier physique si l'extraction FFmpeg échoue (rollback)
- La fixture `client` doit patcher **à la fois** `DATA_DIR` ET `VIDEOS_DIR`

### References

- Service FFmpeg : [Source: planning-artifacts/architecture.md#45-service-export-video-ffmpeg]
- Modèle Video : [Source: planning-artifacts/architecture.md#42-modele-de-donnees]
- Endpoints Vidéos : [Source: planning-artifacts/architecture.md#43-api-rest-endpoints]
- Stack technique : [Source: planning-artifacts/architecture.md#22-backend]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
