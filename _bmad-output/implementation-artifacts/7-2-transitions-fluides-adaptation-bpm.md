# Story 7.2: Transitions Fluides — Adaptation BPM Début/Fin

Status: review

## Story

En tant qu'utilisateur,
Je veux que la vidéo adaptée BPM démarre et se termine de façon fluide,
Afin d'éviter l'effet brusque à la jonction entre la zone de vitesse normale et la zone adaptée.

## Acceptance Criteria

### AC1 — Fondu audio/vidéo en entrée
- La vidéo adaptée commence par un fondu progressif (fade-in) sur les 0.5 premières secondes du segment pré-annotation (avant la première annotation)
- Si le segment pré-annotation dure moins de 0.5 s, le fade s'adapte à la durée disponible (min 0.1 s)

### AC2 — Fondu audio/vidéo en sortie
- La vidéo adaptée se termine par un fondu progressif (fade-out) sur les 0.5 dernières secondes du segment post-annotation (après la dernière annotation)
- Même règle que AC1 si le segment est très court

### AC3 — Transition uniquement si segment pré/post existe
- Si la première annotation est à t=0 (pas de segment pré), aucun fade-in n'est appliqué
- Si la dernière annotation est à la fin exacte de la vidéo, aucun fade-out n'est appliqué

### AC4 — Qualité inchangée
- Le reste de la vidéo (segments adaptés entre annotations) n'est pas modifié
- Les tests existants `test_compute_segment_speeds_*` continuent de passer

### AC5 — Paramètre configurable
- La durée du fade est configurable via un paramètre `fade_duration_s: float = 0.5` dans `adapt_video_to_bpm`
- Valeur par défaut : 0.5 secondes

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. Écrire les tests AVANT de modifier `video_service.py`.

### Tests backend à écrire EN PREMIER

```python
# backend/tests/test_video_service.py (nouveau ou ajouts dans test_exports.py)

import pytest
from unittest.mock import patch, MagicMock
from app.services.video_service import adapt_video_to_bpm, _build_adapt_filter

def test_build_adapt_filter_no_fade_when_no_pre_segment():
    """Pas de fade si la première annotation est à t=0."""
    segs = [(0.0, 1.0, 1.2), (1.0, 2.0, 0.8)]
    fc, maps, codec = _build_adapt_filter(segs, has_audio=False, fade_duration_s=0.5,
                                           has_pre_segment=False, has_post_segment=False)
    assert "fade" not in fc

def test_build_adapt_filter_fade_in_applied_when_pre_segment():
    """Fade-in présent dans filter_complex si segment pré-annotation existe."""
    segs = [(0.0, 1.0, 1.0), (1.0, 3.0, 1.3), (3.0, 5.0, 1.0)]
    fc, maps, codec = _build_adapt_filter(segs, has_audio=False, fade_duration_s=0.5,
                                           has_pre_segment=True, has_post_segment=True)
    assert "fade=t=in" in fc
    assert "fade=t=out" in fc

def test_build_adapt_filter_fade_audio_when_has_audio():
    """afade présent si la vidéo a une piste audio et segments pré/post."""
    segs = [(0.0, 1.0, 1.0), (1.0, 3.0, 1.2), (3.0, 4.0, 1.0)]
    fc, maps, codec = _build_adapt_filter(segs, has_audio=True, fade_duration_s=0.5,
                                           has_pre_segment=True, has_post_segment=True)
    assert "afade=t=in" in fc
    assert "afade=t=out" in fc

def test_fade_duration_clamped_to_segment_duration():
    """Si le segment pré dure 0.2 s, le fade est limité à 0.2 s (pas 0.5 s)."""
    segs = [(0.0, 0.2, 1.0), (0.2, 2.0, 1.5), (2.0, 2.5, 1.0)]
    fc, _, _ = _build_adapt_filter(segs, has_audio=False, fade_duration_s=0.5,
                                    has_pre_segment=True, has_post_segment=True)
    assert "d=0.2" in fc or "d=0.1" in fc  # clamped à la durée du segment

def test_adapt_video_to_bpm_accepts_fade_duration_param(tmp_video_path, annotations_2):
    """adapt_video_to_bpm accepte un paramètre fade_duration_s sans erreur."""
    result = adapt_video_to_bpm(
        tmp_video_path, annotations_2, target_bpm=120.0, fade_duration_s=0.5
    )
    assert result.endswith(".mp4")
    import os; os.unlink(result)
```

## Tasks / Subtasks

### Backend

- [x] Écrire les 5 tests ci-dessus → RED
- [x] Modifier la signature de `_build_adapt_filter` dans `video_service.py` :
  - [x] Ajouter `fade_duration_s: float = 0.5`, `has_pre_segment: bool`, `has_post_segment: bool`
- [x] Modifier `_build_adapt_filter` pour appliquer le fade :
  - [x] **Fade-in vidéo** : ajouter `,fade=t=in:st=0:d={clamped_fade}` au filtre du segment pré-annotation (si `has_pre_segment`)
  - [x] **Fade-out vidéo** : ajouter `,fade=t=out:st={seg_duration - clamped_fade}:d={clamped_fade}` au dernier segment (si `has_post_segment`)
  - [x] **Fade-in audio** : ajouter `,afade=t=in:st=0:d={clamped_fade}` sur le flux audio du premier segment (si `has_audio` et `has_pre_segment`)
  - [x] **Fade-out audio** : ajouter `,afade=t=out:st={seg_duration - clamped_fade}:d={clamped_fade}` sur le flux audio du dernier segment (si `has_audio` et `has_post_segment`)
  - [x] Calcul de `clamped_fade = min(fade_duration_s, segment_duration * 0.8)` avec minimum 0.1 s
- [x] Modifier `adapt_video_to_bpm` :
  - [x] Ajouter paramètre `fade_duration_s: float = 0.5`
  - [x] Détecter `has_pre_segment = timestamps[0] > 0.001` et `has_post_segment = timestamps[-1] < video_duration - 0.001`
  - [x] Passer ces infos à `_build_adapt_filter`
- [x] Passer tous les tests → GREEN
- [x] Vérifier que les tests existants (`test_compute_segment_speeds_*`) passent toujours

### Frontend (aucune modification nécessaire)

- `adapt_video_to_bpm` est appelé côté backend uniquement — pas d'impact frontend

## Dev Notes

### Implémentation fade dans filter_complex

Le filtre `fade` de FFmpeg s'applique après `setpts` sur le même flux. Pattern :

```
# Fade-in sur le premier segment (pré-annotation, index 0) :
[vin0]trim=start=0:end=T0,setpts=PTS-STARTPTS,fade=t=in:st=0:d=FADE_D[v0]

# Fade-out sur le dernier segment (post-annotation, index N-1) :
[vinN]trim=start=TN:end=END,setpts=PTS-STARTPTS,fade=t=out:st=SEG_DUR-FADE_D:d=FADE_D[vN]

# Idem pour audio avec afade :
[ainN]atrim=...,atempo=...,asetpts=PTS-STARTPTS,afade=t=out:st=SEG_DUR-FADE_D:d=FADE_D[aN]
```

Important : `st` dans `fade` est relatif au début du segment trimé (après `setpts=PTS-STARTPTS`).

### Durée du fade clamped

```python
pre_seg_duration = timestamps[0]  # durée du segment pré-annotation
clamped_fade_in = max(0.1, min(fade_duration_s, pre_seg_duration * 0.8))

post_seg_duration = video_duration - timestamps[-1]
clamped_fade_out = max(0.1, min(fade_duration_s, post_seg_duration * 0.8))
```

### Fichiers à modifier

```
backend/app/services/video_service.py  ← _build_adapt_filter + adapt_video_to_bpm
backend/tests/test_video_service.py    ← créer avec 5 nouveaux tests
```

### Anti-patterns à éviter

- Ne PAS appliquer le fade sur les segments adaptés (entre annotations) — seulement sur pré/post
- Ne PAS utiliser `xfade` (cross-fade entre deux clips) — utiliser `fade` (fondu vers/depuis noir) qui est plus simple et ne nécessite pas de modifier la structure concat
- Ne PAS modifier `compute_segment_speeds` — elle n'est pas concernée

## Dev Agent Record

### Agent Model Used
GPT-5 Codex

### Debug Log References
- `backend/app/services/video_service.py`: ajout des paramètres de fade dans `_build_adapt_filter` et `adapt_video_to_bpm`
- `backend/tests/test_video_service.py`: ajout de la couverture RED/GREEN sur fade vidéo, fade audio, clamp et transmission de paramètres
- `backend/tests/test_exports.py`: validation conservée des `test_compute_segment_speeds_*`

### Completion Notes List
- Ajout d'un nouveau fichier de tests `backend/tests/test_video_service.py` couvrant le parsing fps existant et la story 7.2
- Implémentation des fades uniquement sur les segments pré/post annotation, jamais sur les segments adaptés intermédiaires
- Clamp appliqué avec la règle `max(0.1, min(fade_duration_s, segment_duration * 0.8))`
- Vérifications exécutées : `pytest backend/tests/test_video_service.py -q` puis `pytest backend/tests/test_exports.py -q -k compute_segment_speeds`
- Tentative de `pytest backend/tests -q` lancée mais non concluante dans cette session non interactive

### File List
- `backend/app/services/video_service.py`
- `backend/tests/test_video_service.py`

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, retour Ghilas sur effet brusque début/fin
