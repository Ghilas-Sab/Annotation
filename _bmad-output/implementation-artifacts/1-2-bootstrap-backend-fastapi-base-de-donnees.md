# Story 1.2: Bootstrap Backend FastAPI + Stockage JSON

Status: done

## Story

As a développeur,
I want un backend FastAPI avec un stockage JSON et les modèles Pydantic initiaux,
so that je dispose d'une fondation API testable sans base de données ni ORM.

## Acceptance Criteria

1. `DATA_DIR` contient un fichier `projects.json` créé automatiquement au premier accès
2. Les modèles Pydantic correspondent exactement au schéma de données défini en architecture
3. Les schémas Pydantic sont définis pour Project, Video, Annotation (Create + Read)
4. `pytest` passe avec la fixture `data_dir` (dossier temporaire via `tmp_path`) opérationnelle
5. `json_store.py` lit et écrit les données de façon atomique (pas de corruption)
6. `backend/app/config.py` lit toutes les variables depuis les variables d'environnement

## Tasks / Subtasks

- [x] Créer `backend/app/config.py` (AC: 6)
  - [x] Lire `DATA_DIR`, `VIDEOS_DIR`, `ALLOWED_ORIGINS`, `MAX_VIDEO_SIZE_MB`, `TEMP_DIR` depuis `os.getenv`
- [x] Créer `backend/app/storage/json_store.py` (AC: 1, 4, 5)
  - [x] `_projects_file()` : retourne le chemin `DATA_DIR/projects.json`, crée le dossier si absent
  - [x] `_load()` : lit `projects.json`, retourne `{"projects": []}` si le fichier n'existe pas
  - [x] `_save(data)` : écriture atomique via fichier `.tmp` + `os.replace`
  - [x] `get_projects()` → liste de tous les projets
  - [x] `get_project(project_id)` → projet ou `None`
  - [x] `create_project(name, description)` → projet créé (UUID auto)
  - [x] `update_project(project_id, **kwargs)` → projet modifié ou `None`
  - [x] `delete_project(project_id)` → `True` si supprimé, `False` si absent
- [x] Créer les schémas Pydantic (AC: 2, 3)
  - [x] `backend/app/schemas/project.py` : ProjectCreate, ProjectRead
  - [x] `backend/app/schemas/video.py` : VideoCreate, VideoRead
  - [x] `backend/app/schemas/annotation.py` : AnnotationCreate, AnnotationRead
- [x] Écrire et faire passer les tests (AC: 4, 5)
  - [x] `tests/conftest.py` : fixture `data_dir` via `tmp_path` + `monkeypatch.setenv("DATA_DIR", ...)`
  - [x] `tests/test_storage.py` : CRUD complet via `json_store` + test atomicité

## Dev Notes

### Schéma de données EXACT (ne pas dévier)

Même modèle qu'en architecture, stocké en JSON :

```
Project
├── id: str (UUID)
├── name: str
├── description: str (défaut "")
├── created_at: str (ISO 8601)
└── videos: list[Video]  ← imbriqué dans le fichier projet

Video
├── id: str (UUID)
├── project_id: str
├── filename: str
├── original_name: str
├── filepath: str
├── duration_seconds: float
├── fps: float
├── total_frames: int
├── width: int
├── height: int
├── codec: str
├── uploaded_at: str (ISO 8601)
└── annotations: list[Annotation]  ← imbriqué dans la vidéo

Annotation
├── id: str (UUID)
├── video_id: str
├── frame_number: int (>= 0)
├── timestamp_ms: float
├── label: str (défaut "")
├── created_at: str (ISO 8601)
└── updated_at: str (ISO 8601)
```

### Pattern json_store.py obligatoire

```python
# backend/app/storage/json_store.py
import json
import os
import uuid
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def _data_dir() -> Path:
    return Path(os.getenv("DATA_DIR", "/data"))


def _projects_file() -> Path:
    d = _data_dir()
    d.mkdir(parents=True, exist_ok=True)
    return d / "projects.json"


def _load() -> dict:
    f = _projects_file()
    if not f.exists():
        return {"projects": []}
    return json.loads(f.read_text(encoding="utf-8"))


def _save(data: dict) -> None:
    f = _projects_file()
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, f)  # atomique sur tous les OS


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_projects() -> list[dict]:
    return _load()["projects"]


def get_project(project_id: str) -> dict | None:
    return next((p for p in get_projects() if p["id"] == project_id), None)


def create_project(name: str, description: str = "") -> dict:
    data = _load()
    project = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "created_at": _now(),
        "videos": [],
    }
    data["projects"].append(project)
    _save(data)
    return project


def update_project(project_id: str, **kwargs) -> dict | None:
    data = _load()
    for p in data["projects"]:
        if p["id"] == project_id:
            p.update({k: v for k, v in kwargs.items() if k in ("name", "description")})
            _save(data)
            return p
    return None


def delete_project(project_id: str) -> bool:
    data = _load()
    before = len(data["projects"])
    data["projects"] = [p for p in data["projects"] if p["id"] != project_id]
    if len(data["projects"]) < before:
        _save(data)
        return True
    return False
```

### Pattern config.py obligatoire

```python
# backend/app/config.py
import os

class Settings:
    DATA_DIR: str = os.getenv("DATA_DIR", "/data")
    VIDEOS_DIR: str = os.getenv("VIDEOS_DIR", "/videos")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    MAX_VIDEO_SIZE_MB: int = int(os.getenv("MAX_VIDEO_SIZE_MB", "2000"))
    TEMP_DIR: str = os.getenv("TEMP_DIR", "/tmp/annotations_exports")

settings = Settings()
```

### Schémas Pydantic obligatoires

```python
# backend/app/schemas/project.py
from pydantic import BaseModel

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectRead(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
```

```python
# backend/app/schemas/annotation.py
from pydantic import BaseModel

class AnnotationCreate(BaseModel):
    frame_number: int
    timestamp_ms: float
    label: str = ""

class AnnotationRead(BaseModel):
    id: str
    video_id: str
    frame_number: int
    timestamp_ms: float
    label: str
    created_at: str
    updated_at: str
```

### Fixture conftest.py obligatoire

```python
# backend/tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture
async def client(data_dir):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

### Tests à écrire EN PREMIER (TDD strict)

```python
# backend/tests/test_storage.py
import pytest
from app.storage import json_store


def test_load_empty_returns_default(data_dir):
    data = json_store._load()
    assert data == {"projects": []}


def test_create_project(data_dir):
    p = json_store.create_project("Mon projet", "description")
    assert p["name"] == "Mon projet"
    assert "id" in p
    assert "created_at" in p


def test_get_projects(data_dir):
    json_store.create_project("P1")
    json_store.create_project("P2")
    projects = json_store.get_projects()
    assert len(projects) == 2


def test_get_project(data_dir):
    p = json_store.create_project("Projet")
    found = json_store.get_project(p["id"])
    assert found is not None
    assert found["id"] == p["id"]


def test_get_project_not_found(data_dir):
    assert json_store.get_project("inexistant") is None


def test_update_project(data_dir):
    p = json_store.create_project("Ancien nom")
    updated = json_store.update_project(p["id"], name="Nouveau nom")
    assert updated["name"] == "Nouveau nom"


def test_delete_project(data_dir):
    p = json_store.create_project("A supprimer")
    result = json_store.delete_project(p["id"])
    assert result is True
    assert json_store.get_project(p["id"]) is None


def test_delete_project_not_found(data_dir):
    assert json_store.delete_project("inexistant") is False


def test_save_is_atomic(data_dir):
    """Le fichier .tmp ne doit pas subsister après une écriture."""
    json_store.create_project("Test atomicité")
    tmp = data_dir / "projects.tmp"
    assert not tmp.exists()
```

### requirements.txt pour cette story

```
fastapi==0.110.3
uvicorn==0.29.0
pydantic==2.6.4
python-multipart==0.0.9
aiofiles==23.2.1
ffmpeg-python==0.2.0
numpy==1.26.4
scipy==1.12.0
pytest==8.2.0
pytest-cov==4.1.0
pytest-asyncio==0.23.7
httpx==0.27.0
```

### Project Structure Notes

```
backend/
├── app/
│   ├── main.py              ← déjà créé en S1.1, pas de modification
│   ├── config.py            ← créer
│   ├── storage/
│   │   ├── __init__.py      ← créer (vide)
│   │   └── json_store.py    ← créer
│   └── schemas/
│       ├── __init__.py      ← créer (vide)
│       ├── project.py       ← créer
│       ├── video.py         ← créer
│       └── annotation.py    ← créer
└── tests/
    ├── conftest.py          ← créer
    └── test_storage.py      ← créer
```

### Anti-patterns à éviter

- Ne PAS importer SQLAlchemy, Alembic ou tout ORM
- Ne PAS utiliser `json.dump` directement sur le fichier final — passer par `.tmp` + `os.replace`
- Ne PAS hardcoder `DATA_DIR` — toujours via `os.getenv`
- Ne PAS mettre les vidéos et annotations dans un fichier séparé par entité — tout dans `projects.json` imbriqué

### References

- Modèle de données : [Source: planning-artifacts/architecture.md#42-modele-de-donnees]
- Variables d'env : [Source: planning-artifacts/architecture.md#7-variables-denvironnement]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun — implémentation directe sans blocage.

### Completion Notes List

- TDD strict respecté : tests écrits en premier (RED), puis implémentation (GREEN)
- 10/10 tests passent (test_health + 9 tests storage)
- Écriture atomique via `.tmp` + `os.replace` validée par `test_save_is_atomic`
- `DATA_DIR` lu depuis `os.getenv` dans `json_store._data_dir()` — monkeypatching fonctionnel via fixture `data_dir`
- `requirements.txt` complété avec pydantic, python-multipart, aiofiles, ffmpeg-python, numpy, scipy, pytest-cov

### File List

- `backend/requirements.txt` (modifié)
- `backend/app/config.py` (créé)
- `backend/app/storage/__init__.py` (créé)
- `backend/app/storage/json_store.py` (créé)
- `backend/app/schemas/__init__.py` (créé)
- `backend/app/schemas/project.py` (créé)
- `backend/app/schemas/video.py` (créé)
- `backend/app/schemas/annotation.py` (créé)
- `backend/tests/conftest.py` (créé)
- `backend/tests/test_storage.py` (créé)
