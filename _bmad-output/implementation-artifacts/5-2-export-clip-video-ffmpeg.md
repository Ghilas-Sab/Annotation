# Story 5.2: Export Clip Vidéo FFmpeg (Backend)

Status: ready-for-dev

## Story

As a utilisateur,
I want exporter le clip vidéo entre la première et la dernière annotation,
so that j'isole la portion annotée de la vidéo.

## Acceptance Criteria

1. `GET /api/v1/videos/{id}/export/video` retourne un fichier vidéo téléchargeable avec status 200
2. La découpe correspond à `[timestamp_ms(première annotation), timestamp_ms(dernière annotation)]`
3. FFmpeg stream copy (`-c copy`) — pas de ré-encodage
4. Le fichier produit a une durée correcte (± quelques frames pour le keyframe alignment — acceptable)
5. Retourne 422 si moins de 2 annotations (intervalle indéfinissable)
6. Le fichier temporaire est supprimé du disque après envoi
7. `Content-Disposition: attachment; filename="clip_{video_name}.mp4"` présent dans les headers
8. Si video_id inconnu : retourner 404

## Tasks / Subtasks

- [ ] Écrire les tests EN PREMIER (AC: 1–8)
  - [ ] Ajouter dans `backend/tests/test_exports.py` les tests vidéo
- [ ] Modifier `backend/app/services/video_service.py` (AC: 2–4, 6)
  - [ ] Ajouter `extract_clip(input_path, output_path, start_ms, end_ms) -> str`
- [ ] Modifier `backend/app/routers/exports.py` (AC: 1, 5, 7, 8)
  - [ ] Ajouter `GET /api/v1/videos/{video_id}/export/video`
  - [ ] Utiliser `FileResponse` + `BackgroundTask` pour cleanup du fichier temporaire
  - [ ] Valider que len(annotations) >= 2 → 422 sinon

## Dev Notes

### Dépendances

- Dépend de S5.1 : `exports.py` et `export_service.py` existent déjà.
- Dépend de S2.2 : `video_service.py` existe avec `get_video_metadata()`. On y ajoute `extract_clip()`.
- `TEMP_DIR` est déjà défini dans `backend/app/config.py` (`settings.TEMP_DIR = "/tmp/annotations_exports"`). Utiliser ce répertoire pour les fichiers temporaires.

### Contexte codebase réel

- `backend/app/services/video_service.py` ne contient que `get_video_metadata()`. La fonction `extract_clip()` doit être AJOUTÉE dans ce fichier. [Source: backend/app/services/video_service.py]
- `backend/app/config.py` expose `settings.TEMP_DIR` (env var `TEMP_DIR`, défaut `/tmp/annotations_exports`). Créer le répertoire si absent avec `Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)`. [Source: backend/app/config.py]
- `backend/app/routers/exports.py` sera créé par S5.1. Ce fichier existe déjà au moment d'implémenter S5.2 — NE PAS le recréer, juste ajouter l'endpoint `/export/video`.
- Les vidéos sont stockées sous `VIDEOS_DIR/{video["filename"]}`. Le champ `filepath` dans le dict vidéo contient le chemin absolu. [Source: backend/app/storage/json_store.py]
- La fixture `video_id_with_annotations` sera créée dans S5.1 — disponible dans `conftest.py` pour ces tests.

### Tests à écrire EN PREMIER

```python
# À ajouter dans backend/tests/test_exports.py (après les tests S5.1)

async def test_export_video_clip(client, video_id_with_annotations):
    """Le clip est téléchargeable et non vide."""
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/video")
    assert res.status_code == 200
    assert "video" in res.headers.get("content-type", "")
    assert len(res.content) > 0


async def test_export_video_content_disposition(client, video_id_with_annotations):
    """Header Content-Disposition présent avec filename."""
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/video")
    assert res.status_code == 200
    cd = res.headers.get("content-disposition", "")
    assert "attachment" in cd
    assert ".mp4" in cd


async def test_export_video_requires_2_annotations(client, video_id):
    """Sans annotations → 422."""
    res = await client.get(f"/api/v1/videos/{video_id}/export/video")
    assert res.status_code == 422


async def test_export_video_requires_2_annotations_one_only(client, video_id):
    """Avec une seule annotation → 422."""
    await client.post(
        f"/api/v1/videos/{video_id}/annotations",
        json={"frame_number": 10, "label": ""}
    )
    res = await client.get(f"/api/v1/videos/{video_id}/export/video")
    assert res.status_code == 422


async def test_export_video_unknown_video(client):
    """video_id inexistant → 404."""
    res = await client.get("/api/v1/videos/unknown-id/export/video")
    assert res.status_code == 404
```

### Implémentation `extract_clip`

```python
# backend/app/services/video_service.py — à ajouter

import ffmpeg
import os
import uuid
from pathlib import Path
from app.config import settings


def extract_clip(input_path: str, start_ms: float, end_ms: float) -> str:
    """
    Découpe la vidéo [start_ms, end_ms] sans ré-encodage (stream copy).
    Retourne le chemin du fichier temporaire produit.
    Le caller est responsable de supprimer le fichier après envoi.
    """
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
    output_path = os.path.join(settings.TEMP_DIR, f"clip_{uuid.uuid4().hex}.mp4")
    (
        ffmpeg
        .input(input_path, ss=start_ms / 1000, to=end_ms / 1000)
        .output(output_path, c='copy')
        .overwrite_output()
        .run(quiet=True)
    )
    return output_path
```

### Implémentation endpoint `/export/video`

```python
# backend/app/routers/exports.py — à ajouter (après les endpoints S5.1)

import os
from fastapi import BackgroundTasks
from fastapi.responses import FileResponse
from app.services.video_service import extract_clip


@router.get("/videos/{video_id}/export/video")
async def export_video(video_id: str, background_tasks: BackgroundTasks):
    video = get_video(video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    annotations = sorted(video.get("annotations", []), key=lambda a: a["frame_number"])
    if len(annotations) < 2:
        raise HTTPException(
            status_code=422,
            detail="Au moins 2 annotations requises pour définir l'intervalle de découpe"
        )

    start_ms = annotations[0]["timestamp_ms"]
    end_ms = annotations[-1]["timestamp_ms"]
    input_path = video["filepath"]
    original_name = video.get("original_name", video["filename"])
    stem = os.path.splitext(original_name)[0]
    filename = f"clip_{stem}.mp4"

    clip_path = extract_clip(input_path, start_ms, end_ms)
    background_tasks.add_task(os.remove, clip_path)

    return FileResponse(
        path=clip_path,
        media_type="video/mp4",
        filename=filename,
    )
```

### Points d'attention

- **`BackgroundTask` pour le cleanup** : `FileResponse` envoie le fichier en streaming ; le cleanup via `background_tasks.add_task(os.remove, clip_path)` s'exécute après la fin du stream. Ne PAS supprimer le fichier avant `FileResponse`.
- **`ss` avant `-i`** : la position `-ss` AVANT l'input (`ffmpeg.input(path, ss=...)`) est rapide (seek natif). Si placée après, FFmpeg lit tout depuis le début — lent sur grandes vidéos.
- **Keyframe alignment** : stream copy peut ajouter quelques frames en début/fin selon le GOP. Comportement documenté et attendu (ADR-004).
- **filepath dans le store** : vérifier que `video["filepath"]` est bien le chemin absolu. Si le champ stocké est relatif, construire `Path(settings.VIDEOS_DIR) / video["filename"]`.

### Structure des fichiers

```
backend/
├── app/
│   ├── routers/
│   │   └── exports.py                   ← modifier : ajouter /export/video
│   └── services/
│       └── video_service.py             ← modifier : ajouter extract_clip()
└── tests/
    └── test_exports.py                  ← modifier : ajouter tests vidéo
```

### Anti-patterns à éviter

- Ne PAS supprimer `clip_path` AVANT `FileResponse` — le fichier doit exister pendant l'envoi
- Ne PAS réencoder (`-c:v libx264`) — stream copy (`c='copy'`) uniquement (ADR-004)
- Ne PAS hardcoder `/tmp` — utiliser `settings.TEMP_DIR`
- Ne PAS retourner 400 pour < 2 annotations — le code correct est **422** (Unprocessable Entity)

### Vigilance non-régression

- `video_service.py` est utilisé par le router `videos.py`. L'ajout de `extract_clip` est additif — ne pas modifier `get_video_metadata`.
- Après implémentation : `pytest backend/tests/` doit passer entièrement (tests S5.1 inclus).

### References

- [Source: /home/etud/Bureau/Annotation/_bmad-output/stories.md — S5.2]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/architecture.md — Section 4.5 Service Export Vidéo]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/architecture.md — ADR-003, ADR-004]
- [Source: /home/etud/Bureau/Annotation/backend/app/services/video_service.py]
- [Source: /home/etud/Bureau/Annotation/backend/app/config.py]

## Dev Agent Record

### Agent Model Used

_à remplir par le dev agent_

### Debug Log References

_à remplir par le dev agent_

### Completion Notes List

_à remplir par le dev agent_

### File List

- _bmad-output/implementation-artifacts/5-2-export-clip-video-ffmpeg.md
- backend/app/services/video_service.py
- backend/app/routers/exports.py
- backend/tests/test_exports.py

## Change Log

- 2026-04-14 : Story créée par SM (Bob) — prête pour implémentation TDD
