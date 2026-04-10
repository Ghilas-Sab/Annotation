# Story 2.3: Streaming Vidéo avec Range Requests (Backend)

Status: ready-for-dev

## Story

As a utilisateur,
I want que le lecteur vidéo streame la vidéo avec support des Range headers,
so that j'aie une lecture fluide et un seek rapide sans télécharger toute la vidéo.

## Acceptance Criteria

1. `GET /api/v1/videos/{id}/stream` retourne le fichier vidéo en streaming
2. Support des `Range` headers HTTP : réponse `206 Partial Content` avec les bons en-têtes
3. En-tête `Content-Type` correct selon le codec/extension de la vidéo (`video/mp4`, `video/webm`, etc.)
4. En-tête `Accept-Ranges: bytes` présent dans **toute** réponse (200 et 206)
5. Requête sans `Range` header retourne 200 + fichier complet avec `Accept-Ranges: bytes`
6. `GET` avec un `video_id` inexistant retourne 404

## Tasks / Subtasks

- [ ] Écrire les tests en premier — ajouter à `backend/tests/test_videos.py` (AC: 1–6)
  - [ ] `test_video_stream_full` : GET /stream sans Range → 200, content-type vidéo, accept-ranges: bytes
  - [ ] `test_video_stream_range` : GET /stream avec Range: bytes=0-1023 → 206, accept-ranges: bytes
  - [ ] `test_video_stream_not_found` : GET /stream sur id inconnu → 404
- [ ] Ajouter l'endpoint `/stream` dans `backend/app/routers/videos.py` (AC: 1–6)
  - [ ] Récupérer la vidéo via `json_store.get_video(video_id)`
  - [ ] Implémenter le streaming avec Range support via `FileResponse` ou `StreamingResponse`
  - [ ] Détecter le MIME type depuis l'extension du fichier
  - [ ] Gérer les Range headers manuellement si `FileResponse` ne suffit pas

## Dev Notes

### Approche recommandée : `FileResponse` de Starlette

FastAPI/Starlette `FileResponse` gère nativement les Range headers (206) depuis la version 0.93+. C'est l'approche la plus simple :

```python
# backend/app/routers/videos.py — AJOUTER cet endpoint

import mimetypes
from fastapi.responses import FileResponse
from fastapi import Request

@router.get("/videos/{video_id}/stream")
async def stream_video(video_id: str, request: Request):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    filepath = video.get("filepath", "")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Fichier vidéo introuvable")

    # Détecter le MIME type depuis l'extension
    mime_type, _ = mimetypes.guess_type(filepath)
    if not mime_type or not mime_type.startswith("video/"):
        mime_type = "video/mp4"  # fallback

    return FileResponse(
        path=filepath,
        media_type=mime_type,
        headers={"Accept-Ranges": "bytes"},
    )
```

**Vérification :** `FileResponse` de Starlette gère automatiquement les `Range` headers et retourne 206 si `Range` est présent dans la requête. Vérifier avec Starlette >= 0.27 (inclus avec FastAPI 0.110+).

### Fallback : StreamingResponse avec Range manuel

Si `FileResponse` ne gère pas correctement le 206 dans les tests, utiliser ce pattern manuel :

```python
from fastapi.responses import StreamingResponse

@router.get("/videos/{video_id}/stream")
async def stream_video(video_id: str, request: Request):
    video = json_store.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo introuvable")

    filepath = video.get("filepath", "")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Fichier vidéo introuvable")

    file_size = os.path.getsize(filepath)
    mime_type, _ = mimetypes.guess_type(filepath)
    if not mime_type:
        mime_type = "video/mp4"

    range_header = request.headers.get("Range")

    if range_header:
        # Parse "bytes=start-end"
        range_spec = range_header.replace("bytes=", "")
        start_str, end_str = range_spec.split("-")
        start = int(start_str)
        end = int(end_str) if end_str else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def iter_file():
            with open(filepath, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    data = f.read(min(65536, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
        }
        return StreamingResponse(iter_file(), status_code=206,
                                 media_type=mime_type, headers=headers)
    else:
        # Fichier complet
        def iter_full():
            with open(filepath, "rb") as f:
                while chunk := f.read(65536):
                    yield chunk

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        }
        return StreamingResponse(iter_full(), status_code=200,
                                 media_type=mime_type, headers=headers)
```

### Tests à ajouter dans `test_videos.py`

```python
# backend/tests/test_videos.py — AJOUTER

@pytest.mark.asyncio
async def test_video_stream_full(client, uploaded_video_id):
    res = await client.get(f"/api/v1/videos/{uploaded_video_id}/stream")
    assert res.status_code == 200
    assert "video" in res.headers.get("content-type", "")
    assert res.headers.get("accept-ranges") == "bytes"

@pytest.mark.asyncio
async def test_video_stream_range(client, uploaded_video_id):
    res = await client.get(
        f"/api/v1/videos/{uploaded_video_id}/stream",
        headers={"Range": "bytes=0-1023"}
    )
    assert res.status_code == 206
    assert res.headers.get("accept-ranges") == "bytes"
    assert "content-range" in res.headers

@pytest.mark.asyncio
async def test_video_stream_not_found(client):
    res = await client.get("/api/v1/videos/00000000-0000-0000-0000-000000000000/stream")
    assert res.status_code == 404
```

### Dépendances des fixtures

Les tests `/stream` réutilisent les fixtures de S2.2 :
- `uploaded_video_id` (nécessite `project_id`, `tmp_video_file`, `videos_dir`)
- Toutes déjà définies dans `conftest.py` après S2.2

**Ne pas redéfinir les fixtures** — elles sont dans `conftest.py` et disponibles automatiquement.

### MIME types courants

```python
MIME_MAP = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
}
# Utiliser mimetypes.guess_type(filepath) qui couvre ces cas
```

### Structure des fichiers

```
backend/
└── app/
    └── routers/
        └── videos.py    ← modifier : ajouter l'endpoint /stream
```

Pas de nouveaux fichiers — uniquement ajout d'un endpoint dans le router existant.

### Anti-patterns à éviter

- Ne PAS lire tout le fichier en mémoire pour le streaming — utiliser un générateur par chunks
- Ne PAS oublier `Accept-Ranges: bytes` dans la réponse 200 (pas seulement 206)
- Ne PAS hardcoder `video/mp4` — détecter depuis l'extension avec `mimetypes.guess_type`
- Ne PAS bloquer l'event loop dans l'itérateur — en v1, l'itérateur synchrone est acceptable car l'opération est I/O bound et FastAPI gère via un thread pool

### References

- Endpoint streaming : [Source: planning-artifacts/architecture.md#43-api-rest-endpoints]
- ADR-002 : rendu vidéo côté navigateur avec seek : [Source: planning-artifacts/architecture.md#8-decisions-architecturales]
- Architecture backend : [Source: planning-artifacts/architecture.md#41-structure-des-dossiers]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
