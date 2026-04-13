# Story 4.2: Endpoints Statistiques (Backend)

Status: ready-for-dev

## Story

As a utilisateur,
I want appeler l'API pour obtenir les métriques BPM et calculer une vitesse de lecture,
so that le frontend puisse afficher les statistiques et ajuster la lecture.

## Acceptance Criteria

1. `GET /api/v1/videos/{id}/statistics` retourne les métriques BPM complètes du service
2. Si la vidéo n'existe pas, les endpoints statistiques retournent `404`
3. Si la vidéo a moins de 2 annotations, `GET /statistics` retourne l'objet d'erreur du service sans crash
4. `POST /api/v1/videos/{id}/statistics/playback-speed` avec `{"target_bpm": 120}` retourne `{"playback_speed": 2.0, "current_bpm": 60.0, "target_bpm": 120.0}`
5. `target_bpm <= 0` retourne `422`
6. Le router est branché dans `backend/app/main.py`

## Tasks / Subtasks

- [ ] Écrire les tests API en premier dans `backend/tests/test_statistics.py` (AC: 1–5)
  - [ ] `test_get_statistics`
  - [ ] `test_get_statistics_video_not_found`
  - [ ] `test_get_statistics_with_insufficient_annotations`
  - [ ] `test_post_playback_speed`
  - [ ] `test_post_playback_speed_invalid_target_bpm`
- [ ] Créer `backend/app/routers/statistics.py` (AC: 1–6)
  - [ ] Charger la vidéo via `json_store.get_video(video_id)`
  - [ ] Lire `video["annotations"]` et `video["fps"]`
  - [ ] Appeler `compute_bpm_metrics`
  - [ ] Appeler `compute_playback_speed` pour le POST
- [ ] Créer ou compléter `backend/app/schemas/statistics.py` (AC: 1, 4, 5)
  - [ ] Schéma requête `PlaybackSpeedRequest`
  - [ ] Schéma réponse `PlaybackSpeedResponse`
  - [ ] Schémas réponse statistiques sérialisables
- [ ] Modifier `backend/app/main.py` pour inclure le router (AC: 6)

## Dev Notes

### Dépendance directe

- Cette story dépend de `4.1`. Les endpoints doivent être une couche mince par-dessus `stats_service`, sans réimplémenter les calculs.

### Contexte codebase réel

- Les routers existants sont tous inclus dans `backend/app/main.py` avec le préfixe `/api/v1`. Suivre exactement ce pattern. [Source: backend/app/main.py]
- Les vidéos sont récupérées aujourd'hui via `json_store.get_video(video_id)` et contiennent déjà `fps`, `total_frames` et `annotations`. [Source: backend/app/storage/json_store.py] [Source: backend/app/routers/videos.py]
- Les tests backend existants utilisent `httpx.AsyncClient` + `ASGITransport` et des fixtures de projet/vidéo dans `backend/tests/conftest.py`. Réutiliser ce pattern. [Source: backend/tests/conftest.py]

### Contrat d'API recommandé

```python
@router.get("/videos/{video_id}/statistics")
async def get_statistics(video_id: str):
    ...


@router.post("/videos/{video_id}/statistics/playback-speed")
async def get_playback_speed(video_id: str, body: PlaybackSpeedRequest):
    ...
```

- Le POST doit recalculer `current_bpm` depuis les annotations de la vidéo. Ne pas faire confiance à une valeur envoyée par le client.
- Si `compute_bpm_metrics` retourne une erreur, le POST `playback-speed` doit échouer proprement. Recommandation: `422` avec détail explicite si impossible de calculer un BPM courant.

### Tests à écrire EN PREMIER

```python
@pytest.mark.asyncio
async def test_get_statistics(client, video_id):
    for frame in [0, 25, 50, 75]:
        await client.post(f"/api/v1/videos/{video_id}/annotations", json={"frame_number": frame, "label": ""})
    res = await client.get(f"/api/v1/videos/{video_id}/statistics")
    assert res.status_code == 200
    assert "bpm_global" in res.json()


@pytest.mark.asyncio
async def test_post_playback_speed(client, video_id):
    for frame in [0, 25, 50, 75]:
        await client.post(f"/api/v1/videos/{video_id}/annotations", json={"frame_number": frame, "label": ""})
    res = await client.post(
        f"/api/v1/videos/{video_id}/statistics/playback-speed",
        json={"target_bpm": 120.0},
    )
    assert res.status_code == 200
    assert res.json()["playback_speed"] == pytest.approx(2.0, rel=1e-3)
```

### Structure des fichiers

```
backend/app/
├── routers/
│   └── statistics.py         ← créer
├── schemas/
│   └── statistics.py         ← créer
└── main.py                   ← modifier

backend/tests/
└── test_statistics.py        ← compléter
```

### Anti-patterns à éviter

- Ne PAS dupliquer le calcul BPM dans le router
- Ne PAS retourner des champs de réponse différents entre `GET /statistics` et le service `compute_bpm_metrics`
- Ne PAS accepter `target_bpm` nul ou négatif
- Ne PAS oublier d'inclure le router dans `app.include_router(...)`

### References

- [Source: /home/etud/Bureau/Annotation/_bmad-output/stories.md — S4.2]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/architecture.md — 4.3 API REST]
- [Source: /home/etud/Bureau/Annotation/backend/app/main.py]
- [Source: /home/etud/Bureau/Annotation/backend/app/storage/json_store.py]
- [Source: /home/etud/Bureau/Annotation/backend/tests/conftest.py]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/implementation-artifacts/4-1-service-calcul-bpm.md]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

- Préparation story uniquement. Pas d'implémentation.

### Completion Notes List

- Router cadré sur le backend FastAPI existant
- Validation `target_bpm` explicitée
- Contrat GET/POST stabilisé pour le frontend

### File List

- _bmad-output/implementation-artifacts/4-2-endpoints-statistiques.md

## Change Log

- 2026-04-13 : Story créée par SM (Bob) — prête pour implémentation TDD
