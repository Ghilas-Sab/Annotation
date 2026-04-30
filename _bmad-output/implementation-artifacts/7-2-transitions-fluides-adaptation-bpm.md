# Story 7.2: Transitions Fluides — Adaptation BPM Début/Fin

Status: review

## Story

En tant qu'utilisateur,
Je veux que la vidéo adaptée BPM démarre et se termine sans saut de vitesse brusque,
Afin que la transition entre la zone non-annotée et la zone adaptée soit imperceptible.

## Acceptance Criteria

### AC1 — Continuité de vitesse au début
- Le segment pré-annotation (avant la première annotation) est joué à la même vitesse que le premier segment adapté
- Aucun changement de vitesse à la jonction entre le segment pré et le premier segment adapté

### AC2 — Continuité de vitesse à la fin
- Le segment post-annotation (après la dernière annotation) est joué à la même vitesse que le dernier segment adapté
- Aucun changement de vitesse à la jonction entre le dernier segment adapté et le segment post

### AC3 — Pas de fondu visuel
- Aucun filtre `fade` ou `afade` n'est inséré dans le filter_complex
- La transition est assurée par la continuité des vitesses, pas par un fondu vers le noir

### AC4 — Pas de segment pré/post si annotations aux bornes
- Si la première annotation est à t=0 (tolérance < 0.001 s), aucun segment pré n'est créé
- Si la dernière annotation est à la fin exacte de la vidéo, aucun segment post n'est créé

### AC5 — Qualité inchangée
- Les tests existants `test_compute_segment_speeds_*` continuent de passer
- Le reste du comportement d'`adapt_video_to_bpm` est inchangé

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. Les tests ci-dessous définissent le comportement attendu.

### Tests backend

```python
# backend/tests/test_video_service.py

def test_build_adapt_filter_no_fade_filters():
    """_build_adapt_filter ne doit jamais insérer de filtre fade/afade."""
    segs = [(0.0, 1.0, 1.2), (1.0, 2.0, 0.8)]
    fc, maps, codec = _build_adapt_filter(segs, has_audio=False)
    assert "fade=" not in fc
    assert maps == ["-map", "[vout]"]
    assert "-c:v" in codec

def test_build_adapt_filter_with_audio_no_fade_filters():
    segs = [(0.0, 1.0, 1.2), (1.0, 3.0, 0.9), (3.0, 4.0, 1.1)]
    fc, maps, codec = _build_adapt_filter(segs, has_audio=True)
    assert "fade=" not in fc
    assert "afade=" not in fc
    assert maps == ["-map", "[vout]", "-map", "[aout]"]
    assert "-c:a" in codec

def test_adapt_video_pre_segment_uses_first_speed_factor(tmp_path):
    """Le segment pré-annotation doit utiliser speed_factors[0], pas 1.0."""
    # Premier segment (0→1s) doit avoir la même vitesse que le segment adapté [1s→3s]
    pre_speed = captured_segs[0][2]
    first_adapted_speed = captured_segs[1][2]
    assert pre_speed == pytest.approx(first_adapted_speed)

def test_adapt_video_no_pre_post_if_annotations_at_bounds(tmp_path):
    """Si les annotations sont aux bornes, pas de segment pré/post."""
    # annotations à t=0 et t=5s sur une vidéo de 5s → 1 seul segment
    assert len(captured_segs) == 1
```

## Tasks / Subtasks

### Backend

- [x] Supprimer tous les filtres `fade`/`afade` de `_build_adapt_filter`
- [x] Simplifier la signature de `_build_adapt_filter` : supprimer `fade_duration_s`, `has_pre_segment`, `has_post_segment`
- [x] Modifier `adapt_video_to_bpm` — segments pré/post :
  - [x] Segment pré : `(0.0, timestamps[0], speed_factors[0])` (était `1.0`)
  - [x] Segment post : `(timestamps[-1], video_duration, speed_factors[-1])` (était `1.0`)
- [x] Supprimer le paramètre `fade_duration_s` de `adapt_video_to_bpm`
- [x] Écrire les 4 tests ci-dessus → GREEN
- [x] Vérifier que les tests existants passent toujours

### Frontend (aucune modification nécessaire)

## Dev Notes

### Approche retenue : continuité de vitesse

L'effet brusque venait du fait que les segments pré/post (avant/après les annotations)
étaient joués à vitesse 1.0x alors que le premier/dernier segment adapté pouvait être
à 0.7x ou 1.5x — créant un saut de vitesse visible à la jonction.

Solution : utiliser `speed_factors[0]` pour le segment pré et `speed_factors[-1]`
pour le segment post. La vidéo entière change de vitesse de façon uniforme sans
discontinuité perceptible.

### Implémentation dans adapt_video_to_bpm

```python
segs: list[tuple[float, float, float]] = []
if timestamps[0] > 0.001:
    segs.append((0.0, timestamps[0], speed_factors[0]))   # même vitesse que le premier segment adapté
for i, sf in enumerate(speed_factors):
    segs.append((timestamps[i], timestamps[i + 1], sf))
if timestamps[-1] < video_duration - 0.001:
    segs.append((timestamps[-1], video_duration, speed_factors[-1]))  # même vitesse que le dernier segment adapté
```

### Signature _build_adapt_filter (simplifiée)

```python
def _build_adapt_filter(
    segs: list[tuple[float, float, float]],
    has_audio: bool,
) -> tuple[str, list[str], list[str]]:
```

### Fichiers modifiés

```
backend/app/services/video_service.py  ← _build_adapt_filter + adapt_video_to_bpm
backend/tests/test_video_service.py    ← 4 nouveaux tests (remplacent les tests fade)
```

### Anti-patterns à éviter

- Ne PAS utiliser `fade` / `afade` — l'utilisateur ne veut pas de fondu vers le noir
- Ne PAS jouer les segments pré/post à vitesse 1.0 — cela crée un saut de vitesse
- Ne PAS modifier `compute_segment_speeds` — elle n'est pas concernée

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- `pytest backend/tests/test_video_service.py -q` → 27 passed
- `pytest backend/tests/ -q` → 143 passed

### Completion Notes List
- Approche fade complètement abandonnée suite à la correction de Ghilas : "je veux pas que la video s'estompe à la fin, je veux juste que le dernier segment suit le rythme de la dernière video"
- `_build_adapt_filter` simplifiée : plus de paramètres fade, plus aucun filtre `fade`/`afade`
- Segments pré/post utilisent désormais `speed_factors[0]`/`speed_factors[-1]` pour une continuité parfaite
- 4 nouveaux tests vérifient l'absence de fade et la continuité de vitesse aux jonctions
- Suite complète 143/143 verte

### File List
- `backend/app/services/video_service.py`
- `backend/tests/test_video_service.py`

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, retour Ghilas sur effet brusque début/fin
- 2026-04-29 : Rewrite complet — approche fade → continuité de vitesse, suite 143 tests verte
