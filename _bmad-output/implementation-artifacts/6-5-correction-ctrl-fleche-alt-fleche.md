# Story 6.5: Correction Ctrl+Flèche et Nouveaux Raccourcis Alt+Flèche

Status: backlog

## Story

En tant qu'utilisateur,
I want que Ctrl+flèche fonctionne de manière fiable et qu'Alt+← / Alt+→ me téléportent au début et à la fin de la vidéo,
so that je navigue efficacement dans mes annotations sans comportement imprévisible.

## Acceptance Criteria

1. `Ctrl+→` saute vers la prochaine annotation (logique `getInterAnnotationStep` existante, corrigée)
2. `Ctrl+←` saute vers l'annotation précédente
3. Le bug de fiabilité de Ctrl+flèche est corrigé (closure stale sur le store Zustand)
4. `Alt+←` positionne la vidéo à la frame 0 (début absolu)
5. `Alt+→` positionne la vidéo à la dernière frame (`totalFrames - 1`)
6. `event.preventDefault()` appelé sur Alt+flèche (éviter le conflit navigateur "retour arrière")
7. Les 4 raccourcis (Ctrl+← Ctrl+→ Alt+← Alt+→) ont des tests dédiés

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **100%** des 4 raccourcis modifiés/ajoutés.
> Le bug de closure stale doit être reproduit et corrigé par les tests.

### Tests obligatoires à écrire en PREMIER

```ts
// frontend/src/hooks/useVideoKeyboard.test.ts (ajouts)

test('Alt+ArrowLeft seeks to frame 0', () => {
  const { seekFn } = setupKeyboardHook({ currentFrame: 150, totalFrames: 500 });
  fireKeyDown({ key: 'ArrowLeft', altKey: true });
  expect(seekFn).toHaveBeenCalledWith(0);
});

test('Alt+ArrowRight seeks to last frame (totalFrames - 1)', () => {
  const { seekFn } = setupKeyboardHook({ currentFrame: 150, totalFrames: 500 });
  fireKeyDown({ key: 'ArrowRight', altKey: true });
  expect(seekFn).toHaveBeenCalledWith(499);
});

test('Alt+ArrowLeft calls preventDefault to avoid browser navigation', () => {
  setupKeyboardHook({ currentFrame: 150, totalFrames: 500 });
  const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true });
  const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
  document.dispatchEvent(event);
  expect(preventDefaultSpy).toHaveBeenCalled();
});

test('Ctrl+ArrowRight uses live store annotations, not stale closure', () => {
  const { seekFn, addAnnotation } = setupKeyboardHook({ currentFrame: 50, totalFrames: 500 });
  // Ajouter des annotations APRÈS le montage du hook
  addAnnotation(20);
  addAnnotation(35); // step calculé = 15
  fireKeyDown({ key: 'ArrowRight', ctrlKey: true });
  // Avec la closure stale, le hook aurait utilisé les anciennes annotations (step = FALLBACK=10)
  expect(seekFn).toHaveBeenCalledWith(65); // 50 + 15
});

test('Ctrl+ArrowLeft uses live store annotations', () => {
  const { seekFn, addAnnotation } = setupKeyboardHook({ currentFrame: 50, totalFrames: 500 });
  addAnnotation(20);
  addAnnotation(35);
  fireKeyDown({ key: 'ArrowLeft', ctrlKey: true });
  expect(seekFn).toHaveBeenCalledWith(35); // précédente annotation
});

test('Ctrl+ArrowRight with no annotations uses fallback step', () => {
  const { seekFn } = setupKeyboardHook({ currentFrame: 50, totalFrames: 500 });
  fireKeyDown({ key: 'ArrowRight', ctrlKey: true });
  expect(seekFn).toHaveBeenCalledWith(60); // 50 + fallback(10)
});
```

### Note technique — Fix closure stale

Le bug : `useVideoKeyboard.ts` capture `annotations` dans la closure de l'effet au montage.
Si des annotations sont ajoutées après, la closure utilise la liste initiale (vide → fallback=10).

**Fix** : utiliser un sélecteur Zustand avec callback au lieu d'une variable capturée :
```ts
// AVANT (bugué — closure stale)
const annotations = useAnnotationStore(state => state.annotations);
// ... dans le handler : calcule avec `annotations` stale

// APRÈS (corrigé — lecture live du store)
const getAnnotations = useAnnotationStore(state => state.getAnnotations); // getter ref stable
// ... dans le handler : calcule avec `getAnnotations()` live
```

## Tasks / Subtasks

- [ ] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–7)
  - [ ] Ajouter 6 tests dans `frontend/src/hooks/useVideoKeyboard.test.ts`
  - [ ] Le test "closure stale" doit être RED avec l'implémentation actuelle (confirme le bug)
- [ ] Modifier `frontend/src/hooks/useVideoKeyboard.ts` (AC: 1, 2, 3)
  - [ ] Remplacer la capture de `annotations` par un getter stable depuis le store Zustand
  - [ ] Utiliser `useAnnotationStore.getState().annotations` ou équivalent dans les handlers
  - [ ] Vérifier `getInterAnnotationStep` — s'assurer qu'elle lit bien le store en live
- [ ] Ajouter `Alt+←` et `Alt+→` dans `useVideoKeyboard.ts` (AC: 4, 5, 6)
  - [ ] `Alt+ArrowLeft` → `seekToFrame(0)` + `event.preventDefault()`
  - [ ] `Alt+ArrowRight` → `seekToFrame(totalFrames - 1)` + `event.preventDefault()`
- [ ] Passer tous les tests → GREEN

## Dev Notes

### Dépendances

- Aucune (priorité Phase A — implémenter en premier)

### Contexte codebase

- `useVideoKeyboard.ts` : hook gérant tous les raccourcis clavier de la page annotation
- `getInterAnnotationStep` : calcule le pas de navigation inter-annotation basé sur les intervalles
- Store Zustand `useAnnotationStore` : contient `annotations: Annotation[]`
- Pattern fix closure stale : `useAnnotationStore.getState()` retourne l'état courant sans subscription

### Zustand getState() pattern

```ts
// Dans le handler d'événement clavier (pas dans le render)
const handleKeyDown = useCallback((event: KeyboardEvent) => {
  const { annotations } = useAnnotationStore.getState(); // live, pas de closure stale
  const step = getInterAnnotationStep(currentFrame, annotations);
  // ...
}, [currentFrame]); // currentFrame peut rester en dependency
```

### Structure des fichiers

```
frontend/src/
└── hooks/
    ├── useVideoKeyboard.ts          ← modifier (fix closure + Alt+flèche)
    └── useVideoKeyboard.test.ts     ← enrichir (6 nouveaux tests)
```

### Anti-patterns à éviter

- Ne PAS utiliser `window.history.back()` par accident — `event.preventDefault()` est obligatoire sur Alt+←
- Ne PAS recréer le listener à chaque render — utiliser `useCallback` avec dépendances stables
- Ne PAS tester uniquement le comportement "happy path" — tester spécifiquement le cas closure stale

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

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase A (priorité). Bloque S6.4. Exigence couverture tests maximale.
