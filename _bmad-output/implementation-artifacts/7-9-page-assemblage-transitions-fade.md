# Story 7.9: Page Assemblage — Transitions Fade In/Out Entre Clips

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux pouvoir activer un fondu enchaîné entre les clips assemblés,
Afin d'obtenir une transition douce plutôt qu'une coupure franche entre les vidéos.

## Acceptance Criteria

### AC1 — Option de transition activable globalement
- Un toggle "Transitions en fondu" est visible dans la barre d'outils de la page assemblage
- Par défaut : désactivé
- Quand activé, un fondu enchaîné sera appliqué entre chaque paire de clips consécutifs à l'export

### AC2 — Durée de transition configurable
- Quand les transitions sont activées, un champ numérique permet de saisir la durée du fondu (default : 0.5 s, min : 0.1 s, max : 2 s)

### AC3 — Indicateur visuel sur la timeline
- Quand les transitions sont activées, un indicateur visuel (zone de dégradé ou badge "fade") est affiché à la jonction entre chaque paire de clips sur la timeline

### AC4 — Prise en compte à l'export (S7.10)
- Les paramètres `use_transitions: bool` et `transition_duration_s: float` sont transmis à l'endpoint d'export
- Le backend applique le filtre `xfade` de FFmpeg entre les clips si `use_transitions=True`

### AC5 — Compatibilité audio/vidéo
- Le fondu enchaîné s'applique à la vidéo ET à l'audio (si les clips ont une piste audio)
- Si un clip n'a pas d'audio, le fondu vidéo s'applique uniquement

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT.

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/pages/AssemblagePage.test.tsx (ajouts)

test('fade transition toggle is present and unchecked by default', () => {
  render(<AssemblagePage />)
  expect(screen.getByRole('checkbox', { name: /transitions en fondu/i })).not.toBeChecked()
})

test('enabling fade shows transition duration field', async () => {
  render(<AssemblagePage />)
  await userEvent.click(screen.getByRole('checkbox', { name: /transitions en fondu/i }))
  expect(screen.getByRole('spinbutton', { name: /durée.*transition/i })).toBeInTheDocument()
})

test('fade indicator shown between clips when enabled', async () => {
  const clips = [buildClip({ id: 'c1' }), buildClip({ id: 'c2' })]
  render(<AssemblagePage initialClips={clips} />)
  await userEvent.click(screen.getByRole('checkbox', { name: /transitions en fondu/i }))
  expect(screen.getByTestId('fade-indicator-c1-c2')).toBeInTheDocument()
})

test('fade indicator not shown when transitions disabled', () => {
  const clips = [buildClip({ id: 'c1' }), buildClip({ id: 'c2' })]
  render(<AssemblagePage initialClips={clips} />)
  expect(screen.queryByTestId(/fade-indicator/)).not.toBeInTheDocument()
})
```

### Tests backend à écrire EN PREMIER

```python
# backend/tests/test_assemblage.py (ajouts)

def test_build_concat_filter_with_xfade():
    """Avec use_transitions=True, le filter_complex utilise xfade."""
    from app.services.assemblage_service import build_concat_filter
    clips = [
        {'path': 'a.mp4', 'duration': 5.0},
        {'path': 'b.mp4', 'duration': 4.0},
    ]
    fc, maps = build_concat_filter(clips, use_transitions=True, transition_duration_s=0.5)
    assert 'xfade' in fc

def test_build_concat_filter_without_transitions():
    """Sans transitions, le filter_complex utilise concat simple."""
    from app.services.assemblage_service import build_concat_filter
    clips = [
        {'path': 'a.mp4', 'duration': 5.0},
        {'path': 'b.mp4', 'duration': 4.0},
    ]
    fc, maps = build_concat_filter(clips, use_transitions=False)
    assert 'xfade' not in fc
    assert 'concat' in fc

def test_build_concat_filter_single_clip_no_transition():
    """Un seul clip → pas de transition même si use_transitions=True."""
    from app.services.assemblage_service import build_concat_filter
    clips = [{'path': 'a.mp4', 'duration': 5.0}]
    fc, maps = build_concat_filter(clips, use_transitions=True, transition_duration_s=0.5)
    assert 'xfade' not in fc
```

## Tasks / Subtasks

### Frontend

- [ ] Écrire les 4 tests → RED
- [ ] Modifier `assemblageStore.ts` :
  - [ ] Ajouter `useTransitions: boolean` (défaut `false`)
  - [ ] Ajouter `transitionDurationS: number` (défaut `0.5`)
  - [ ] Ajouter `setUseTransitions`, `setTransitionDuration`
- [ ] Modifier `AssemblagePage.tsx` :
  - [ ] Ajouter toggle + champ durée dans la barre d'outils
  - [ ] Afficher `<FadeIndicator data-testid="fade-indicator-{id1}-{id2}">` entre clips consécutifs quand `useTransitions=true`
- [ ] Passer tous les tests → GREEN

### Backend

- [ ] Écrire les 3 tests backend → RED
- [ ] Créer `backend/app/services/assemblage_service.py` :
  - [ ] Implémenter `build_concat_filter(clips, use_transitions, transition_duration_s) → (filter_complex, maps)` :
    - [ ] **Sans transitions** : concat simple `[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]`
    - [ ] **Avec transitions** (xfade chaîné) :
      ```
      # Pour 3 clips avec xfade :
      [0:v][1:v]xfade=transition=fade:duration=D:offset=DUR0-D[v01];
      [v01][2:v]xfade=transition=fade:duration=D:offset=DUR0+DUR1-2D[v012]
      # Idem pour audio avec acrossfade
      ```
    - [ ] Calcul de `offset = somme des durées précédentes - (n_transitions * fade_duration)`
- [ ] Passer les tests backend → GREEN

## Dev Notes

### Construction du filter_complex xfade

Le filtre `xfade` de FFmpeg enchaîne deux clips avec une transition :

```
ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 \
  -filter_complex "
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v01];
    [v01][2:v]xfade=transition=fade:duration=0.5:offset=8.0[vout];
    [0:a][1:a]acrossfade=d=0.5[a01];
    [a01][2:a]acrossfade=d=0.5[aout]
  " -map "[vout]" -map "[aout]" output.mp4
```

Calcul de l'offset pour le Nème xfade :
```
offset_n = (sum of durations of clips 0..n) - (n * fade_duration)
```

### Fichiers à créer / modifier

```
frontend/src/stores/assemblageStore.ts          ← useTransitions + transitionDurationS
frontend/src/pages/AssemblagePage.tsx           ← toggle + FadeIndicator
frontend/src/pages/AssemblagePage.test.tsx      ← 4 tests
backend/app/services/assemblage_service.py      ← nouveau (build_concat_filter)
backend/tests/test_assemblage.py                ← 3 tests
```

### Anti-patterns à éviter

- Ne PAS appliquer xfade si un seul clip dans la liste
- Ne PAS utiliser `fade` (fondu vers noir) pour les transitions inter-clips — utiliser `xfade` (fondu enchaîné entre clips)
- `xfade` vidéo et `acrossfade` audio sont des filtres distincts — les chaîner séparément

## Dev Agent Record

### Agent Model Used
_à remplir_

### Debug Log References
_à remplir_

### Completion Notes List
_à remplir_

### File List
_à remplir_

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, transitions xfade entre clips assemblés
