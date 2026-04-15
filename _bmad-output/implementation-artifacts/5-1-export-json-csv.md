# Story 5.1: Export JSON et CSV (Backend)

Status: review

## Story

As a utilisateur,
I want exporter mes annotations au format JSON et CSV,
so that je peux réutiliser mes données dans d'autres outils.

## Acceptance Criteria

1. `GET /api/v1/videos/{id}/export/json` retourne un fichier JSON téléchargeable avec status 200
2. Structure JSON : `{"video": {...metadata}, "annotations": [{frame_number, timestamp_ms, label, created_at}]}`
3. `GET /api/v1/videos/{id}/export/csv` retourne un fichier CSV téléchargeable avec status 200
4. Headers CSV : `frame_number,timestamp_ms,timestamp_formatted,label`
5. Header HTTP `Content-Disposition: attachment; filename="annotations_{video_name}.{ext}"` présent dans les deux réponses
6. Si aucune annotation : JSON retourne `{"video": {...}, "annotations": []}`, CSV retourne headers seuls (pas de lignes de données)
7. Si video_id inconnu : retourner 404

## Tasks / Subtasks

- [x] Écrire les tests EN PREMIER (AC: 1–7)
  - [x] `backend/tests/test_exports.py` — créer le fichier avec tous les tests
  - [x] Ajouter fixture `video_id_with_annotations` dans `backend/tests/conftest.py`
- [x] Créer `backend/app/schemas/export.py` (AC: 2)
  - [x] Schéma `ExportAnnotation` (frame_number, timestamp_ms, label, created_at)
  - [x] Schéma `ExportVideo` (subset des métadonnées vidéo)
  - [x] Schéma `JsonExportResponse` (video + annotations)
- [x] Créer `backend/app/services/export_service.py` (AC: 2, 4, 5)
  - [x] `build_json_export(video: dict) -> dict`
  - [x] `build_csv_export(video: dict) -> str`
  - [x] `format_timestamp(timestamp_ms: float) -> str` — format `MM:SS.mmm`
- [x] Créer `backend/app/routers/exports.py` (AC: 1, 3, 5, 6, 7)
  - [x] `GET /api/v1/videos/{video_id}/export/json`
  - [x] `GET /api/v1/videos/{video_id}/export/csv`
  - [x] Utiliser `FileResponse` ou `Response` selon le type
- [x] Modifier `backend/app/main.py` (AC: 1, 3)
  - [x] Inclure `exports_router` avec préfixe `/api/v1`

## Dev Notes

### Dépendances

- Dépend de `S3.1` (CRUD annotations backend — done) pour avoir des annotations disponibles.
- La story `S5.2` (export vidéo FFmpeg) viendra APRÈS et modifiera `exports.py` + `video_service.py`.

### Contexte codebase réel

- Le stockage est entièrement en JSON via `backend/app/storage/json_store.py`. Pas d'ORM, pas de SQLite. La fonction `get_video(video_id)` retourne le dict complet incluant les `annotations`. [Source: backend/app/storage/json_store.py]
- `AnnotationRead` (dans `backend/app/schemas/annotation.py`) définit les champs : `id, video_id, frame_number, timestamp_ms, label, created_at, updated_at`. L'export JSON n'inclut PAS `id` et `video_id` (données redondantes dans le contexte export). [Source: backend/app/schemas/annotation.py]
- `main.py` inclut déjà 4 routers (`projects`, `videos`, `annotations`, `statistics`). Le router exports doit être ajouté de la même façon. [Source: backend/app/main.py]
- La fixture `conftest.py` dispose de `video_id` (vidéo uploadée sans annotations). Il n'existe PAS de fixture `video_id_with_annotations` — elle est à créer dans `conftest.py`. [Source: backend/tests/conftest.py]

### Pattern fixture à créer

```python
# backend/tests/conftest.py — à ajouter
@pytest.fixture
async def video_id_with_annotations(client, video_id):
    """Vidéo avec 3 annotations pour les tests d'export."""
    for frame in [25, 50, 75]:
        await client.post(
            f"/api/v1/videos/{video_id}/annotations",
            json={"frame_number": frame, "label": f"beat_{frame}"}
        )
    return video_id
```

### Tests à écrire EN PREMIER

```python
# backend/tests/test_exports.py
import pytest

pytestmark = pytest.mark.anyio


async def test_export_json_structure(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/json")
    assert res.status_code == 200
    data = res.json()
    assert "video" in data
    assert "annotations" in data
    assert len(data["annotations"]) == 3
    ann = data["annotations"][0]
    assert "frame_number" in ann
    assert "timestamp_ms" in ann
    assert "label" in ann
    assert "created_at" in ann
    # Pas de id/video_id dans l'export
    assert "id" not in ann
    assert "video_id" not in ann


async def test_export_json_content_disposition(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/json")
    assert res.status_code == 200
    assert "attachment" in res.headers.get("content-disposition", "")
    assert ".json" in res.headers.get("content-disposition", "")


async def test_export_json_empty_annotations(client, video_id):
    res = await client.get(f"/api/v1/videos/{video_id}/export/json")
    assert res.status_code == 200
    data = res.json()
    assert data["annotations"] == []


async def test_export_json_unknown_video(client):
    res = await client.get("/api/v1/videos/unknown-id/export/json")
    assert res.status_code == 404


async def test_export_csv_headers(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/csv")
    assert res.status_code == 200
    lines = res.text.strip().split('\n')
    assert lines[0] == "frame_number,timestamp_ms,timestamp_formatted,label"
    assert len(lines) == 4  # 1 header + 3 annotations


async def test_export_csv_content_disposition(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/csv")
    assert "attachment" in res.headers.get("content-disposition", "")
    assert ".csv" in res.headers.get("content-disposition", "")


async def test_export_csv_empty_annotations(client, video_id):
    res = await client.get(f"/api/v1/videos/{video_id}/export/csv")
    assert res.status_code == 200
    lines = [l for l in res.text.strip().split('\n') if l]
    assert len(lines) == 1  # header uniquement
    assert lines[0] == "frame_number,timestamp_ms,timestamp_formatted,label"


async def test_export_csv_unknown_video(client):
    res = await client.get("/api/v1/videos/unknown-id/export/csv")
    assert res.status_code == 404
```

### Structure des fichiers

```
backend/
├── app/
│   ├── main.py                          ← modifier : inclure exports_router
│   ├── routers/
│   │   └── exports.py                   ← créer
│   ├── services/
│   │   └── export_service.py            ← créer
│   └── schemas/
│       └── export.py                    ← créer
└── tests/
    ├── conftest.py                      ← modifier : ajouter video_id_with_annotations
    └── test_exports.py                  ← créer
```

### Implémentation recommandée

```python
# backend/app/services/export_service.py

def format_timestamp(timestamp_ms: float) -> str:
    """Convertit timestamp_ms en format MM:SS.mmm"""
    total_ms = int(timestamp_ms)
    ms = total_ms % 1000
    total_s = total_ms // 1000
    seconds = total_s % 60
    minutes = total_s // 60
    return f"{minutes:02d}:{seconds:02d}.{ms:03d}"


def build_json_export(video: dict) -> dict:
    annotations = [
        {
            "frame_number": a["frame_number"],
            "timestamp_ms": a["timestamp_ms"],
            "label": a["label"],
            "created_at": a["created_at"],
        }
        for a in sorted(video.get("annotations", []), key=lambda x: x["frame_number"])
    ]
    return {
        "video": {
            "id": video["id"],
            "filename": video.get("original_name", video["filename"]),
            "fps": video["fps"],
            "duration_seconds": video["duration_seconds"],
            "total_frames": video["total_frames"],
        },
        "annotations": annotations,
    }


def build_csv_export(video: dict) -> str:
    lines = ["frame_number,timestamp_ms,timestamp_formatted,label"]
    for a in sorted(video.get("annotations", []), key=lambda x: x["frame_number"]):
        ts_fmt = format_timestamp(a["timestamp_ms"])
        label = a["label"].replace(",", ";")  # échapper les virgules dans le label
        lines.append(f"{a['frame_number']},{a['timestamp_ms']},{ts_fmt},{label}")
    return "\n".join(lines)
```

```python
# backend/app/routers/exports.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response
from app.storage.json_store import get_video
from app.services.export_service import build_json_export, build_csv_export

router = APIRouter()


@router.get("/videos/{video_id}/export/json")
async def export_json(video_id: str):
    video = get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    data = build_json_export(video)
    filename = f"annotations_{video.get('original_name', video['filename'])}.json"
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/videos/{video_id}/export/csv")
async def export_csv(video_id: str):
    video = get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    csv_content = build_csv_export(video)
    filename = f"annotations_{video.get('original_name', video['filename'])}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
```

### Anti-patterns à éviter

- Ne PAS utiliser `FileResponse` pour JSON/CSV (réservé aux fichiers sur disque) — utiliser `JSONResponse` et `Response`
- Ne PAS inclure `id` et `video_id` dans les annotations exportées (données internes)
- Ne PAS trier les annotations côté test (elles sont déjà triées par `build_json_export`)
- Ne PAS oublier d'ajouter le router dans `main.py` — erreur classique
- Ne PAS casser les tests existants (`test_projects`, `test_annotations`, etc.) en modifiant `conftest.py`

### Vigilance non-régression

- `conftest.py` est partagé par TOUS les tests backend. L'ajout de `video_id_with_annotations` doit être additif (pas de modification des fixtures existantes).
- Vérifier que `pytest backend/tests/` passe entièrement avant de marquer la story comme done.

### References

- [Source: /home/etud/Bureau/Annotation/_bmad-output/stories.md — S5.1]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/architecture.md — Section 4.3 Exports]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/architecture.md — Section 4.1 Structure des Dossiers Backend]
- [Source: /home/etud/Bureau/Annotation/backend/app/storage/json_store.py]
- [Source: /home/etud/Bureau/Annotation/backend/app/schemas/annotation.py]
- [Source: /home/etud/Bureau/Annotation/backend/app/main.py]
- [Source: /home/etud/Bureau/Annotation/backend/tests/conftest.py]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixture `video_id_with_annotations` : frames [25, 50, 75] rejetés car vidéo de test = 2s à 25fps (total_frames=50). Corrigé en [10, 25, 40].

### Completion Notes List

- Implémentation TDD complète : 8 tests écrits avant le code, RED confirmé, GREEN atteint.
- `schemas/export.py` : ExportAnnotation, ExportVideo, JsonExportResponse (Pydantic).
- `services/export_service.py` : format_timestamp (MM:SS.mmm), build_json_export, build_csv_export.
- `routers/exports.py` : GET /json → JSONResponse + Content-Disposition, GET /csv → Response text/csv.
- `main.py` : exports_router inclus avec préfixe /api/v1.
- `conftest.py` : fixture video_id_with_annotations ajoutée (additif, non-destructif).
- 58/58 tests passent — zéro régression.

### File List

- _bmad-output/implementation-artifacts/5-1-export-json-csv.md
- backend/app/routers/exports.py
- backend/app/services/export_service.py
- backend/app/schemas/export.py
- backend/app/main.py
- backend/tests/conftest.py
- backend/tests/test_exports.py

## Change Log

- 2026-04-14 : Story créée par SM (Bob) — prête pour implémentation TDD
- 2026-04-15 : Implémentation complète par Amelia (Dev Agent) — 8 tests, 4 fichiers créés, 2 modifiés. Status → review.
