# Story 6.7: Fix Vidéo Plein Espace dans le Lecteur

Status: backlog

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

test('video element has width: 100% and height: 100% styles', () => {
  render(<VideoPlayer src="/test.mp4" />);
  const video = screen.getByTestId('video-element');
  expect(video).toHaveStyle({ width: '100%', height: '100%' });
});

test('video element uses object-fit: contain', () => {
  render(<VideoPlayer src="/test.mp4" />);
  const video = screen.getByTestId('video-element');
  expect(video).toHaveStyle({ objectFit: 'contain' });
});

test('video container takes full available space', () => {
  render(<VideoPlayer src="/test.mp4" />);
  const container = screen.getByTestId('video-container');
  expect(container).toHaveStyle({ width: '100%', height: '100%' });
});

test('existing VideoPlayer tests still pass', () => {
  // Ce test représente la vérification de non-régression
  // Lancer la suite complète de VideoPlayer.test.tsx
});
```

## Tasks / Subtasks

- [ ] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–5)
  - [ ] Ajouter 3 tests dans `frontend/src/components/video/VideoPlayer.test.tsx`
  - [ ] Vérifier que les tests existants passent toujours
- [ ] Modifier `frontend/src/components/video/VideoPlayer.tsx` (AC: 1, 2, 5)
  - [ ] Ajouter `data-testid="video-element"` sur `<video>` si absent
  - [ ] Ajouter `data-testid="video-container"` sur le conteneur si absent
  - [ ] Appliquer `style={{ width: '100%', height: '100%', objectFit: 'contain' }}` sur `<video>`
  - [ ] S'assurer que le conteneur a `width: '100%'` et `height: '100%'`
- [ ] Vérifier visuellement avec le devserver (vidéo 16:9 et 4:3)
- [ ] Passer tous les tests → GREEN

## Dev Notes

### Dépendances

- Aucune (fix CSS isolé — priorité Phase A)
- S6.8 réutilise ce composant — implémenter S6.7 avant S6.8

### Contexte codebase

- `VideoPlayer.tsx` contient le lecteur HTML5 — modification CSS uniquement
- Vérifier si Tailwind CSS est utilisé → classes `w-full h-full object-contain`
- Si CSS-in-JS ou style inline → utiliser `objectFit: 'contain'` (camelCase)
- `VideoPlayer.test.tsx` a des tests existants — ne pas les modifier

### CSS attendu

```tsx
// Option Tailwind
<div className="w-full h-full" data-testid="video-container">
  <video
    className="w-full h-full object-contain"
    data-testid="video-element"
    src={src}
    ...
  />
</div>

// Option style inline
<div style={{ width: '100%', height: '100%' }} data-testid="video-container">
  <video
    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    data-testid="video-element"
    src={src}
    ...
  />
</div>
```

### Structure des fichiers

```
frontend/src/
└── components/video/
    ├── VideoPlayer.tsx          ← modifier (CSS + data-testid)
    └── VideoPlayer.test.tsx     ← enrichir (3 tests CSS)
```

### Anti-patterns à éviter

- Ne PAS utiliser `object-fit: cover` (coupe les bords) — utiliser `contain` (letterbox)
- Ne PAS modifier la logique de lecture/seek — uniquement le CSS
- Ne PAS ajouter de hauteur fixe en pixels — utiliser des % ou `100%`

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

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase A (fix rapide ~30min). Bloque S6.8. Exigence couverture tests maximale.
