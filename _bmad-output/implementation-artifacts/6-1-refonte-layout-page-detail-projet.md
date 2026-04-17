# Story 6.1: Refonte Layout Page Détail Projet

Status: backlog

## Story

En tant qu'utilisateur,
I want que la page détail d'un projet réorganise la dropzone à gauche et la liste des vidéos à droite,
so that j'exploite tout l'espace disponible et améliore la lisibilité.

## Acceptance Criteria

1. La page détail projet affiche un layout deux colonnes : dropzone (~35% gauche) / liste vidéos (~65% droite)
2. Le layout est responsive : sur mobile (<768px) les colonnes s'empilent verticalement (dropzone en haut)
3. La dropzone conserve son comportement existant (drag & drop + clic pour sélectionner)
4. La liste des vidéos s'affiche en colonne scrollable si le nombre de vidéos dépasse la hauteur visible
5. Les tests existants de `VideoUpload.tsx` et `ProjectCard.tsx` passent sans modification
6. Les colonnes portent les `data-testid` : `dropzone-column` et `video-list-column`

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **≥ 80%** sur les fichiers modifiés.
> Les tests RED doivent être confirmés avant de passer au code de production.

### Tests obligatoires à écrire en PREMIER

```tsx
// frontend/src/pages/ProjectDetailPage.test.tsx (nouveau ou enrichi)

test('layout has two columns: dropzone left, video list right', () => {
  render(<ProjectDetailPage projectId="uuid-1" />);
  const dropzone = screen.getByTestId('dropzone-column');
  const videoList = screen.getByTestId('video-list-column');
  expect(dropzone).toBeInTheDocument();
  expect(videoList).toBeInTheDocument();
  // Dropzone précède la video-list dans le DOM
  expect(dropzone.compareDocumentPosition(videoList))
    .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

test('layout is responsive: columns stack on mobile', () => {
  // Simuler viewport <768px
  Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
  render(<ProjectDetailPage projectId="uuid-1" />);
  const container = screen.getByTestId('detail-layout');
  // Vérifier classe CSS ou style flex-direction: column
  expect(container).toHaveClass(/flex-col|stack/);
});

test('video list is scrollable when overflowing', () => {
  render(<ProjectDetailPage projectId="uuid-1" />);
  const videoList = screen.getByTestId('video-list-column');
  expect(videoList).toHaveStyle({ overflowY: 'auto' });
});

test('existing VideoUpload tests pass without modification', () => {
  // Ce test est implicite — vérifier que la suite complète passe
});
```

## Tasks / Subtasks

- [ ] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–6)
  - [ ] Créer/enrichir `frontend/src/pages/ProjectDetailPage.test.tsx`
  - [ ] Tester : présence des deux colonnes + ordre DOM
  - [ ] Tester : layout responsive mobile (<768px)
  - [ ] Tester : overflow-y sur la liste vidéos
  - [ ] Vérifier que les tests existants VideoUpload et ProjectCard ne sont pas cassés
- [ ] Modifier `frontend/src/pages/ProjectDetailPage.tsx` (ou équivalent) (AC: 1, 2, 6)
  - [ ] Wrapper layout flex/grid deux colonnes avec `data-testid="detail-layout"`
  - [ ] Colonne gauche ~35% avec `data-testid="dropzone-column"`
  - [ ] Colonne droite ~65% avec `data-testid="video-list-column"` + `overflow-y: auto`
  - [ ] Media query ou classe Tailwind responsive pour mobile
- [ ] Ajouter `data-testid` dans `VideoUpload.tsx` si absent (AC: 6)
- [ ] Vérifier visuellement avec le devserver que le layout est correct
- [ ] Passer les tests → GREEN

## Dev Notes

### Dépendances

- Aucune dépendance (pure refonte CSS/layout)
- S6.2 travaille sur la même zone — éviter les conflits de merge, implémenter S6.1 avant S6.2

### Contexte codebase

- Identifier d'abord le composant page détail projet (peut être `ProjectDetailPage.tsx` ou `ProjectsPage.tsx`)
- Pattern CSS existant : utiliser Tailwind CSS si déjà en place, sinon CSS modules
- `VideoUpload.tsx` doit recevoir un `data-testid="dropzone"` si absent — le vérifier avant modification
- Tests frontend : Vitest + @testing-library/react

### Structure des fichiers

```
frontend/src/
├── pages/
│   ├── ProjectDetailPage.tsx          ← modifier (layout)
│   └── ProjectDetailPage.test.tsx     ← créer / enrichir
└── components/projects/
    └── VideoUpload.tsx                ← vérifier data-testid
```

### Anti-patterns à éviter

- Ne PAS modifier la logique métier de VideoUpload — uniquement le CSS/layout
- Ne PAS utiliser des largeurs fixes en pixels — utiliser des % ou flexbox
- Ne PAS casser les tests existants des composants enfants

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

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase B. Exigence couverture tests maximale.
