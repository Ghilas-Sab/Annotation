# Story 2.1: CRUD Projets (Backend)

Status: review

## Story

As a utilisateur,
I want créer, lister, modifier et supprimer des projets via l'API,
so that je puisse organiser mes vidéos par projet.

## Acceptance Criteria

1. `POST /api/v1/projects` crée un projet et retourne 201 + objet créé
2. `GET /api/v1/projects` retourne la liste triée par `created_at` DESC
3. `GET /api/v1/projects/{id}` retourne le détail avec la liste des vidéos imbriquées
4. `PUT /api/v1/projects/{id}` met à jour `name` et/ou `description`
5. `DELETE /api/v1/projects/{id}` supprime le projet + ses vidéos + leurs annotations (cascade JSON) et retourne 204
6. `POST` avec `name` vide ou absent retourne 422 (validation Pydantic)
7. `GET /api/v1/projects/{id}` avec UUID inconnu retourne 404

## Tasks / Subtasks

- [x] Écrire les tests en premier — `backend/tests/test_projects.py` (AC: 1–7)
  - [x] `test_create_project` : POST → 201, vérifier `name`, `id`, `created_at`
  - [x] `test_create_project_empty_name_fails` : POST `{"name": ""}` → 422
  - [x] `test_list_projects` : créer 2, GET → liste de 2
  - [x] `test_list_projects_sorted_desc` : vérifier ordre `created_at` DESC
  - [x] `test_get_project_detail` : GET `/{id}` → objet avec clé `videos`
  - [x] `test_update_project` : PUT → nom modifié
  - [x] `test_delete_project` : DELETE → 204, GET → 404
  - [x] `test_get_project_not_found` : GET UUID inconnu → 404
- [x] Créer `backend/app/routers/projects.py` (AC: 1–7)
  - [x] `POST /api/v1/projects` — valider `ProjectCreate`, appeler `json_store.create_project`
  - [x] `GET /api/v1/projects` — appeler `json_store.get_projects()`, trier par `created_at` DESC
  - [x] `GET /api/v1/projects/{project_id}` — `json_store.get_project()`, 404 si None
  - [x] `PUT /api/v1/projects/{project_id}` — `json_store.update_project()`, 404 si None
  - [x] `DELETE /api/v1/projects/{project_id}` — supprimer fichiers vidéo + `json_store.delete_project()`, 204
- [x] Modifier `backend/app/main.py` (AC: 1)
  - [x] `app.include_router(projects_router, prefix="/api/v1")`
- [x] Vérifier que `ProjectRead` inclut la liste `videos` (schéma S1.2)

## Dev Notes

### Contexte issu de S1.2 (ne pas réinventer)

`json_store.py` est **déjà complet** pour les projets. Les fonctions suivantes existent :
- `get_projects()` → `list[dict]`
- `get_project(project_id)` → `dict | None`
- `create_project(name, description)` → `dict` (id UUID, created_at ISO8601, videos=[])
- `update_project(project_id, **kwargs)` → `dict | None`
- `delete_project(project_id)` → `bool`

**Ne pas réécrire ces fonctions.** Les importer directement depuis `app.storage.json_store`.

### Suppression en cascade (DELETE)

La cascade est **logique, pas SQL** (stockage JSON). Lors du DELETE projet :
1. Récupérer le projet via `get_project(project_id)` pour lister ses vidéos
2. Pour chaque vidéo : supprimer le fichier physique dans `VIDEOS_DIR` (si existe)
3. Appeler `json_store.delete_project(project_id)` — supprime tout le graphe JSON
4. Retourner 204 No Content

```python
# Pattern DELETE avec nettoyage fichiers
import os
from app.config import settings

@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str):
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    # Supprimer les fichiers vidéo physiques
    for video in project.get("videos", []):
        filepath = os.path.join(settings.VIDEOS_DIR, video.get("filename", ""))
        if os.path.exists(filepath):
            os.remove(filepath)
    json_store.delete_project(project_id)
    # 204 = pas de body
```

### Router FastAPI obligatoire

```python
# backend/app/routers/projects.py
from fastapi import APIRouter, HTTPException
from app.storage import json_store
from app.schemas.project import ProjectCreate, ProjectRead

router = APIRouter(tags=["projects"])

@router.post("/projects", response_model=ProjectRead, status_code=201)
async def create_project(body: ProjectCreate):
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="name ne peut pas être vide")
    return json_store.create_project(body.name.strip(), body.description)

@router.get("/projects", response_model=list[ProjectRead])
async def list_projects():
    projects = json_store.get_projects()
    return sorted(projects, key=lambda p: p["created_at"], reverse=True)

@router.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(project_id: str):
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project

@router.put("/projects/{project_id}", response_model=ProjectRead)
async def update_project(project_id: str, body: ProjectCreate):
    updated = json_store.update_project(project_id, name=body.name, description=body.description)
    if not updated:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return updated
```

### Schémas Pydantic à compléter

`ProjectRead` en S1.2 ne contient pas encore `videos`. Ajouter la liste :

```python
# backend/app/schemas/project.py
from pydantic import BaseModel
from app.schemas.video import VideoRead

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectRead(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
    videos: list[VideoRead] = []
```

`VideoRead` minimal pour S2.1 (les champs réels sont créés en S2.2) :

```python
# backend/app/schemas/video.py  — version S2.1 (sera enrichie en S2.2)
from pydantic import BaseModel

class VideoRead(BaseModel):
    id: str
    project_id: str
    filename: str
    original_name: str = ""
    filepath: str = ""
    duration_seconds: float = 0.0
    fps: float = 0.0
    total_frames: int = 0
    width: int = 0
    height: int = 0
    codec: str = ""
    uploaded_at: str = ""
```

### Validation `name` vide

Pydantic v2 ne rejette pas `""` par défaut. Deux options :
1. Lever HTTPException 422 manuellement dans le handler (pattern ci-dessus)
2. Ou ajouter un validator Pydantic :
```python
from pydantic import field_validator

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name ne peut pas être vide")
        return v.strip()
```

Choisir l'option 2 (validator) pour que Pydantic retourne automatiquement 422.

### Tests à écrire EN PREMIER (TDD strict)

```python
# backend/tests/test_projects.py
import pytest

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
```

### Fixture `client` existante (ne pas modifier)

```python
# backend/tests/conftest.py — DÉJÀ EN PLACE depuis S1.2
@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    return tmp_path

@pytest.fixture
async def client(data_dir):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

### Structure des fichiers

```
backend/
├── app/
│   ├── main.py               ← modifier : include_router projects
│   ├── routers/
│   │   ├── __init__.py       ← créer si absent
│   │   └── projects.py       ← créer
│   └── schemas/
│       ├── project.py        ← modifier : ajouter videos: list[VideoRead]
│       └── video.py          ← modifier : compléter VideoRead
└── tests/
    └── test_projects.py      ← créer
```

### Anti-patterns à éviter

- Ne PAS utiliser SQLAlchemy ou tout ORM — le stockage est JSON uniquement (`json_store.py`)
- Ne PAS créer de nouveau système de stockage — utiliser les fonctions existantes de `json_store`
- Ne PAS hardcoder `VIDEOS_DIR` — utiliser `settings.VIDEOS_DIR` depuis `app.config`
- Ne PAS oublier le préfixe `/api/v1` dans `main.py` (le router ne le contient pas)
- Le DELETE retourne 204 **sans body** — ne pas retourner `{"ok": true}`

### References

- Modèle de données : [Source: planning-artifacts/architecture.md#42-modele-de-donnees]
- Endpoints API : [Source: planning-artifacts/architecture.md#43-api-rest-endpoints]
- json_store pattern : [Source: implementation-artifacts/1-2-bootstrap-backend-fastapi-base-de-donnees.md]
- Variables d'env : [Source: planning-artifacts/architecture.md#7-variables-denvironnement]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_Aucun blocage._

### Completion Notes List

- TDD strict respecté : 8 tests écrits avant l'implémentation, tous en ROUGE avant le code, tous en VERT après.
- `ProjectCreate` : ajout du `field_validator` Pydantic v2 pour rejeter les noms vides → retour automatique 422.
- `ProjectRead` : ajout de `videos: list[VideoRead] = []`.
- `VideoRead` : tous les champs rendus optionnels avec défauts pour compatibilité S2.1 (seront enrichis en S2.2).
- Router `projects.py` créé avec les 5 endpoints ; DELETE nettoie les fichiers physiques via `settings.VIDEOS_DIR`.
- `main.py` : `include_router(projects_router, prefix="/api/v1")` ajouté.
- Suite complète : 18/18 tests passent, zéro régression.

### File List

- `backend/tests/test_projects.py` (créé)
- `backend/app/routers/__init__.py` (créé)
- `backend/app/routers/projects.py` (créé)
- `backend/app/schemas/project.py` (modifié)
- `backend/app/schemas/video.py` (modifié)
- `backend/app/main.py` (modifié)

## Change Log

- 2026-04-10 : Implémentation complète CRUD projets backend (S2.1) — 5 endpoints REST, 8 tests, schémas mis à jour, router intégré dans main.py. (18/18 tests passent)
