# Story 6.5: Correction Ctrl+Flèche et Nouveaux Raccourcis Alt+Flèche

Status: completed

## Story

En tant qu'utilisateur,
I want que Ctrl+flèche fonctionne de manière fiable et qu'Alt+← / Alt+→ me téléportent au début et à la fin de la vidéo,
so that je navigue efficacement dans mes annotations sans comportement imprévisible.

## Acceptance Criteria

1. `Ctrl+→` saute vers la prochaine annotation (logique `getInterAnnotationStep` existante, corrigée)
2. `Ctrl+←` saute vers l'annotation précédente
3. Le bug de fiabilité de Ctrl+flèche est corrigé (closure stale sur le store Zustand)
4. `Alt+←` positionne la vidéo à la frame 0 (début absolu)
5. `Alt+→` positionne la vidéo à la dernière frame (`totalFrames`)
6. `event.preventDefault()` appelé sur Alt+flèche (éviter le conflit navigateur "retour arrière")
7. Les 4 raccourcis (Ctrl+← Ctrl+→ Alt+← Alt+→) ont des tests dédiés

## Tasks / Subtasks

- [x] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–7)
  - [x] Ajouter 6 tests dans `frontend/src/hooks/useVideoKeyboard.test.ts`
- [x] Modifier `frontend/src/hooks/useVideoKeyboard.ts` (AC: 1, 2, 3)
  - [x] Remplacer la capture de `annotations` par un getter stable depuis le store Zustand (`useAnnotationStore.getState()`)
  - [x] Utiliser `useAnnotationStore.getState().annotations` dans les handlers pour garantir des données "live"
- [x] Ajouter `Alt+←` et `Alt+→` dans `useVideoKeyboard.ts` (AC: 4, 5, 6)
  - [x] `Alt+ArrowLeft` → `seekToFrame(0)` + `event.preventDefault()`
  - [x] `Alt+ArrowRight` → `seekToFrame(totalFrames)` + `event.preventDefault()`
- [x] Passer tous les tests → GREEN

## Dev Notes

### Dépendances

- Aucune

### Contexte codebase

- Utilisation de `useAnnotationStore.getState()` pour éviter les problèmes de closure stale dans `useEffect`.
- Ajout de la gestion de `altKey` dans le handler de clavier.

### Structure des fichiers

```
frontend/src/
└── hooks/
    ├── useVideoKeyboard.ts          ← modifié (fix closure + Alt+flèche)
    └── useVideoKeyboard.test.ts     ← enrichi (6 nouveaux tests)
```

## Dev Agent Record

### Agent Model Used

Amelia (Senior Software Engineer)

### Debug Log References

- Bug de closure stale reproduit avec un test dédié utilisant le store réel.
- Fix validé par 17 tests unitaires (100% GREEN).

### Completion Notes List

- Les raccourcis `Alt+←` et `Alt+→` permettent maintenant un saut instantané aux bornes de la vidéo.
- `Ctrl+←` et `Ctrl+→` sont maintenant parfaitement fiables même si la liste d'annotations change dynamiquement.

### File List

- `frontend/src/hooks/useVideoKeyboard.ts`
- `frontend/src/hooks/useVideoKeyboard.test.ts`

## Change Log

- 2026-04-17 : Story créée par SM (Bob)
- 2026-04-17 : Implémentée par Amelia. 100% tests OK.
