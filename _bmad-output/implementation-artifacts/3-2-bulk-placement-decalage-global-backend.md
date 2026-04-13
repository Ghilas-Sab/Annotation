# Story 3.2: Bulk Placement + Décalage Global (Backend)

Status: review

## Story

As a utilisateur,
I want placer automatiquement N annotations équidistantes et décaler toutes les annotations,
so that je gagne du temps sur l'annotation rythmique régulière.

## Acceptance Criteria

1. `POST /api/v1/videos/{id}/annotations/bulk` crée N annotations équidistantes entre `start_frame` et `end_frame` avec le préfixe donné
2. L'intervalle est calculé : `(end_frame - start_frame) / (count - 1)`
3. Les labels sont `{prefix} 1`, ..., `{prefix} N` (ou `1..N` si préfixe vide)
4. Les annotations bulk sont identiques aux manuelles (modifiables, supprimables)
5. `PATCH /api/v1/videos/{id}/annotations/shift` décale toutes les annotations de `offset_ms` (positif ou négatif)
6. Après shift, les `timestamp_ms` et `frame_number` sont recalculés
7. Shift qui ferait passer une annotation sous la frame 0 retourne 422

## Tasks / Subtasks

- [x] Écrire les tests en premier — ajouter dans `backend/tests/test_annotations.py` (AC: 1–7)
  - [x] `test_bulk_placement` : POST bulk → 201, 5 annotations, labels corrects, frames correctes
  - [x] `test_bulk_placement_no_prefix` : préfixe vide → labels "1", "2", …, "N"
  - [x] `test_global_shift_positive` : shift +1000ms (+25 frames à 25fps) → frames recalculées
  - [x] `test_global_shift_negative` : shift négatif valide → frames réduites correctement
  - [x] `test_shift_below_zero_fails` : shift qui ferait frame < 0 → 422
- [x] Modifier `backend/app/routers/annotations.py` — ajouter les 2 endpoints (AC: 1–7)
  - [x] `POST /videos/{video_id}/annotations/bulk` — valider paramètres, créer N annotations
  - [x] `PATCH /videos/{video_id}/annotations/shift` — valider shift, mettre à jour toutes les annotations
- [x] Ajouter schémas Pydantic `BulkCreate` et `ShiftRequest`
  - [x] `BulkCreate` : start_frame, end_frame, count (≥2), prefix ("")
  - [x] `ShiftRequest` : offset_ms (float, positif ou négatif)
- [x] Ajouter fonctions dans `json_store` pour bulk et shift

## Dev Notes

### Endpoint Bulk — Calcul des frames

```python
# Intervalle entre chaque annotation
interval = (end_frame - start_frame) / (count - 1)

# Frames générées
frames = [round(start_frame + i * interval) for i in range(count)]

# Labels
if prefix:
    labels = [f"{prefix} {i+1}" for i in range(count)]
else:
    labels = [str(i+1) for i in range(count)]
```

**Validation à effectuer :**
- `start_frame >= 0` et `end_frame <= total_frames`
- `start_frame < end_frame`
- `count >= 2`

### Endpoint Shift — Recalcul des frames

```python
# offset_ms → frames à décaler
offset_frames = round(offset_ms / 1000 * fps)

# Vérification : aucune annotation ne doit passer sous 0
for ann in annotations:
    if ann["frame_number"] + offset_frames < 0:
        raise HTTPException(status_code=422, detail="Shift invalide : annotation passerait sous la frame 0")

# Mise à jour
for ann in annotations:
    new_frame = ann["frame_number"] + offset_frames
    json_store.update_annotation(ann["id"], frame_number=new_frame, timestamp_ms=new_frame / fps * 1000)
```

### Schémas Pydantic

```python
# backend/app/schemas/annotation.py — compléter avec :

class BulkCreate(BaseModel):
    start_frame: int
    end_frame: int
    count: int
    prefix: str = ""

class ShiftRequest(BaseModel):
    offset_ms: float
```

### Tests à écrire EN PREMIER (TDD strict)

```python
# backend/tests/test_annotations.py — ajouter ces tests

@pytest.mark.asyncio
async def test_bulk_placement(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations/bulk",
                            json={"start_frame": 0, "end_frame": 100,
                                  "count": 5, "prefix": "beat"})
    assert res.status_code == 201
    annotations = res.json()
    assert len(annotations) == 5
    assert annotations[0]["label"] == "beat 1"
    assert annotations[0]["frame_number"] == 0
    assert annotations[4]["frame_number"] == 100

@pytest.mark.asyncio
async def test_bulk_placement_no_prefix(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations/bulk",
                            json={"start_frame": 0, "end_frame": 50,
                                  "count": 3, "prefix": ""})
    assert res.status_code == 201
    labels = [a["label"] for a in res.json()]
    assert labels == ["1", "2", "3"]

@pytest.mark.asyncio
async def test_global_shift_positive(client, video_id):
    await client.post(f"/api/v1/videos/{video_id}/annotations",
                      json={"frame_number": 50, "label": "x"})
    offset_ms = 1000.0  # +1 seconde = +25 frames à 25fps
    res = await client.patch(f"/api/v1/videos/{video_id}/annotations/shift",
                             json={"offset_ms": offset_ms})
    assert res.status_code == 200
    ann = res.json()[0]
    assert ann["frame_number"] == 75

@pytest.mark.asyncio
async def test_global_shift_negative(client, video_id):
    await client.post(f"/api/v1/videos/{video_id}/annotations",
                      json={"frame_number": 50, "label": "x"})
    res = await client.patch(f"/api/v1/videos/{video_id}/annotations/shift",
                             json={"offset_ms": -400.0})  # -10 frames
    assert res.status_code == 200
    assert res.json()[0]["frame_number"] == 40

@pytest.mark.asyncio
async def test_shift_below_zero_fails(client, video_id):
    await client.post(f"/api/v1/videos/{video_id}/annotations",
                      json={"frame_number": 5, "label": "x"})
    res = await client.patch(f"/api/v1/videos/{video_id}/annotations/shift",
                             json={"offset_ms": -10000.0})
    assert res.status_code == 422
```

### Structure des fichiers

```
backend/
├── app/
│   ├── routers/
│   │   └── annotations.py    ← modifier : ajouter bulk + shift
│   └── schemas/
│       └── annotation.py     ← modifier : ajouter BulkCreate, ShiftRequest
└── tests/
    └── test_annotations.py   ← modifier : ajouter tests bulk/shift
```

### Anti-patterns à éviter

- Ne PAS utiliser des floats directement comme frame_number — toujours `round()` pour obtenir un int
- Vérifier toutes les annotations avant de commencer le shift (validation atomique)
- Le PATCH shift retourne la liste mise à jour (200 + body), pas 204

### References

- Story dépendante : [Source: implementation-artifacts/3-1-crud-annotations-backend.md]
- Endpoints API : [Source: planning-artifacts/architecture.md — Annotations]
- Calcul intervalle : [Source: stories.md — S3.2]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Valeurs de test adaptées : end_frame=40 (au lieu de 100) car total_frames=50 pour la vidéo fixture 2s/25fps.

### Completion Notes List

- `POST /videos/{id}/annotations/bulk` : crée N annotations équidistantes (calcul round), labels préfixés ou numériques.
- `PATCH /videos/{id}/annotations/shift` : validation atomique avant update, recalcul frame_number + timestamp_ms.
- `BulkCreate` et `ShiftRequest` ajoutés dans `schemas/annotation.py`.
- `bulk_add_annotations` et `shift_video_annotations` ajoutés dans `json_store.py` (écriture atomique unique).
- 5 tests TDD ajoutés, 37/37 passent, aucune régression.

### File List

- backend/tests/test_annotations.py
- backend/app/routers/annotations.py
- backend/app/schemas/annotation.py
- backend/app/storage/json_store.py

## Change Log

- 2026-04-10 : Story créée par SM (Bob) — prête pour implémentation TDD
- 2026-04-13 : Implémentation TDD complète par Amelia (claude-sonnet-4-6) — 37/37 tests passent
