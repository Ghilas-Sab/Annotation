# Story 6.7: Fix Vidéo Plein Espace dans le Lecteur

Status: completed

## Story

En tant qu'utilisateur,
I want que la vidéo occupe tout l'espace du lecteur sans zones noires importantes,
so that j'ai une expérience de visionnage optimale lors de l'annotation.

## Acceptance Criteria

1. L'élément `<video>` utilise `object-fit: contain` avec `width: 100%` et `height: 100%`
2. Le conteneur vidéo occupe tout l'espace disponible dans sa colonne
3. Si le ratio de la vidéo diffère du conteneur, des barres noires apparaissent uniquement sur les côtés (letterbox) — comportement CSS natif `contain`
4. Les tests existants de `VideoPlayer.test.tsx` passent sans modification
5. L'élément `<video>` porte le `data-testid="video-element"`

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Story courte — les tests doivent couvrir les styles CSS appliqués.
> Couverture cible : **100%** sur les changements (fix CSS isolé).

### Tests obligatoires à écrire en PREMIER

```tsx
// frontend/src/components/video/VideoPlayer.test.tsx (ajouts)
// ... (implémentés dans le fichier)
```

## Tasks / Subtasks

- [x] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–5)
  - [x] Ajouter 3 tests dans `frontend/src/components/video/VideoPlayer.test.tsx`
  - [x] Vérifier que les tests existants passent toujours
- [x] Modifier `frontend/src/components/video/VideoPlayer.tsx` (AC: 1, 2, 5)
  - [x] Ajouter `data-testid="video-element"` sur `<video>`
  - [x] Ajouter `data-testid="video-container"` sur le conteneur
  - [x] Appliquer `style={{ width: '100%', height: '100%', objectFit: 'contain' }}` sur `<video>`
  - [x] S'assurer que le conteneur a `width: '100%'` et `height: '100%'`
  - [x] Retrait de `maxHeight: '50vh'` qui limitait l'espace vertical.
- [x] Vérifier visuellement avec le devserver (vidéo 16:9 et 4:3)
- [x] Passer tous les tests → GREEN

## Dev Notes

### Dépendances

- Aucune (fix CSS isolé — priorité Phase A)

### Contexte codebase

- Retrait de `maxHeight: '50vh'` sur l'élément vidéo pour permettre l'occupation totale de l'espace parent.
- Ajout de `flex: 1`, `width: '100%'`, `height: '100%'` sur le conteneur principal du lecteur.

### Structure des fichiers

```
frontend/src/
└── components/video/
    ├── VideoPlayer.tsx          ← modifié
    └── VideoPlayer.test.tsx     ← enrichi
```

### Anti-patterns évités

- Utilisation de `contain` pour respecter le ratio original.
- Pas de hauteurs fixes.

## Dev Agent Record

### Agent Model Used

Amelia (Senior Software Engineer)

### Debug Log References

- Tests RED confirmés (échec findByTestId).
- Tests GREEN après application des styles et IDs.

### Completion Notes List

- Le lecteur s'adapte maintenant dynamiquement à la taille de son parent.
- Les tests couvrent spécifiquement les nouveaux styles requis.

### File List

- `frontend/src/components/video/VideoPlayer.tsx`
- `frontend/src/components/video/VideoPlayer.test.tsx`

## Change Log

- 2026-04-17 : Story créée par SM (Bob)
- 2026-04-17 : Implémentée par Amelia. 100% tests OK.
