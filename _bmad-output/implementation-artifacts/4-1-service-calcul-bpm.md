# Story 4.1: Service de Calcul BPM (Backend)

Status: review

## Story

As a système,
I want calculer toutes les métriques BPM à partir des annotations d'une vidéo,
so that je peux fournir une analyse rythmique exploitable au frontend et aux futurs exports.

## Acceptance Criteria

1. `compute_bpm_metrics(annotations, fps)` retourne `bpm_global`, `bpm_mean`, `bpm_median`, `bpm_variation`, `interval_std_seconds`, `annotation_density_per_minute`, `interval_distribution`, `rhythmic_segments`, `activity_peaks`
2. Avec moins de 2 annotations, le service retourne `{"error": "Minimum 2 annotations requises"}`
3. Les métriques numériques correspondent aux calculs `NumPy`/`SciPy` attendus sur des jeux d'annotations fixes
4. `compute_playback_speed(current_bpm, target_bpm)` retourne `target_bpm / current_bpm`
5. Le service fonctionne avec les annotations stockées aujourd'hui sous forme de dictionnaires JSON imbriqués, pas avec des modèles ORM

## Tasks / Subtasks

- [x] Écrire les tests en premier dans `backend/tests/test_statistics.py` (AC: 1–4)
  - [x] `test_bpm_global_on_regular_intervals`
  - [x] `test_bpm_median_on_regular_intervals`
  - [x] `test_bpm_variation_and_std_on_irregular_intervals`
  - [x] `test_insufficient_annotations_returns_error`
  - [x] `test_playback_speed_ratio`
- [x] Créer `backend/app/services/stats_service.py` (AC: 1–4)
  - [x] `compute_bpm_metrics(annotations: list[dict], fps: float) -> dict`
  - [x] `compute_playback_speed(current_bpm: float, target_bpm: float) -> float`
  - [x] Ajouter helpers privés pour extraction des frames triées, segments et pics
- [x] Définir une sortie stable pour le frontend (AC: 1)
  - [x] `interval_distribution` doit être une liste de secondes exploitable telle quelle par le canvas
  - [x] `rhythmic_segments` doit retourner une liste sérialisable avec bornes temporelles et BPM
  - [x] `activity_peaks` doit retourner une liste sérialisable exploitable ultérieurement
- [x] Vérifier les bornes et les cas invalides (AC: 2, 4)
  - [x] `fps <= 0` ne doit pas produire de division invalide
  - [x] `current_bpm <= 0` ou `target_bpm <= 0` doivent être traités explicitement côté service ou côté endpoint appelant

## Dev Notes

### Contexte codebase réel

- Le backend actuel utilise un stockage JSON imbriqué dans `backend/app/storage/json_store.py`, pas SQLAlchemy. Le service doit donc accepter des annotations de forme dictionnaire ou des objets compatibles attributs `frame_number`. [Source: planning-artifacts/architecture.md — 4.2 Modèle de Données] [Source: backend/app/storage/json_store.py]
- `numpy` et `scipy` sont déjà présents dans `backend/requirements.txt`. Il n'y a pas besoin d'ajouter de dépendance pour cette story. [Source: backend/requirements.txt]

### Contrat de calcul recommandé

```python
def compute_bpm_metrics(annotations: list[dict], fps: float) -> dict:
    if fps <= 0:
        return {"error": "FPS invalide"}
    if len(annotations) < 2:
        return {"error": "Minimum 2 annotations requises"}
```

```python
frames = sorted(
    a["frame_number"] if isinstance(a, dict) else a.frame_number
    for a in annotations
)
intervals_frames = np.diff(frames)
intervals_seconds = intervals_frames / fps
intervals_bpm = 60.0 / intervals_seconds
```

- `bpm_global` doit suivre la formule architecture: `60 / moyenne_des_intervalles_en_secondes`. [Source: planning-artifacts/architecture.md — 4.4 Service de Calcul BPM]
- `annotation_density_per_minute` doit être cohérent avec la durée couverte par les annotations, pas la durée totale de la vidéo. La formule du document d'architecture est basée sur `frames[-1] / fps / 60`. [Source: planning-artifacts/architecture.md — 4.4 Service de Calcul BPM]

### Segments et pics

- L'architecture exige des champs `rhythmic_segments` et `activity_peaks`, mais ne fixe pas leur algorithme exact. Implémentation pragmatique attendue:
  - `rhythmic_segments`: grouper des intervalles contigus par proximité de BPM, puis exposer `start_frame`, `end_frame`, `start_seconds`, `end_seconds`, `bpm`, `annotation_count`
  - `activity_peaks`: retourner les zones les plus denses en annotations sur fenêtres glissantes en secondes
- Rester déterministe et testable. Pas d'algorithme opaque ou probabiliste.

### Tests à écrire EN PREMIER

```python
import pytest

from app.services.stats_service import compute_bpm_metrics, compute_playback_speed


class MockAnnotation:
    def __init__(self, frame_number: int):
        self.frame_number = frame_number


def test_bpm_global_on_regular_intervals():
    annotations = [MockAnnotation(i * 25) for i in range(5)]
    result = compute_bpm_metrics(annotations, fps=25.0)
    assert result["bpm_global"] == pytest.approx(60.0, rel=1e-3)


def test_playback_speed_ratio():
    assert compute_playback_speed(120.0, 60.0) == pytest.approx(0.5)
    assert compute_playback_speed(60.0, 120.0) == pytest.approx(2.0)
```

### Structure des fichiers

```
backend/app/
├── services/
│   └── stats_service.py          ← créer
└── tests/
    └── test_statistics.py        ← créer
```

### Anti-patterns à éviter

- Ne PAS recalculer des timestamps depuis `timestamp_ms`; la source canonique ici est `frame_number` + `fps`
- Ne PAS faire dépendre le service du router FastAPI
- Ne PAS renvoyer des objets NumPy non sérialisables (`np.float64`, `ndarray`) dans la réponse finale
- Ne PAS supposer que les annotations arrivent triées

### References

- [Source: /home/etud/Bureau/Annotation/_bmad-output/stories.md — S4.1]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/architecture.md — 4.2 Modèle de Données]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/architecture.md — 4.4 Service de Calcul BPM]
- [Source: /home/etud/Bureau/Annotation/backend/app/storage/json_store.py]
- [Source: /home/etud/Bureau/Annotation/backend/tests/test_annotations.py]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

- RED initial attendu : `ModuleNotFoundError` sur `app.services.stats_service`
- Validation backend story : `pytest backend/tests/test_statistics.py -q` → `6 passed`
- Validation backend complète : `pytest backend/tests -q` → `43 passed`
- Vérification frontend : `npm run test` → `55 passed`
- Vérification frontend : `npm run build` → OK
- Correctifs de stabilité test harness backend : upload vidéo non-bloquant et stream vidéo sans `StreamingResponse` bloquante sous ASGITransport
- Correctif route santé : `/api/v1/health` passé en `async def` pour éviter le blocage du transport local

### Completion Notes List

- `backend/tests/test_statistics.py` créé en TDD strict avant implémentation
- `compute_bpm_metrics` implémenté pour annotations dict et objets avec `frame_number`
- Sortie 100% sérialisable : floats Python natifs, listes et dicts
- `interval_distribution` exposé en secondes
- `rhythmic_segments` implémenté par regroupement contigu sur proximité BPM
- `activity_peaks` implémenté via histogramme temporel + `scipy.signal.find_peaks`
- `FPS invalide` géré explicitement côté service
- `compute_playback_speed` implémenté selon le ratio demandé
- Régressions backend locales éliminées sur upload, stream et health; suite backend complète désormais verte

### File List

- _bmad-output/implementation-artifacts/4-1-service-calcul-bpm.md
- backend/app/services/stats_service.py
- backend/tests/test_statistics.py
- backend/app/routers/videos.py
- backend/app/main.py

## Change Log

- 2026-04-13 : Story créée par SM (Bob) — prête pour implémentation TDD
- 2026-04-13 : Implémentation 4.1 par Amelia — tests story OK, build frontend OK
