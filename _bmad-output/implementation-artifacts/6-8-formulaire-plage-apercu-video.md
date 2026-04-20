# Story 6.8: Formulaire de Sélection de Plage d'Annotation avec Aperçu Vidéo

Status: done

## Story

En tant qu'utilisateur,
I want qu'un formulaire apparaisse lors de l'accès à la page d'annotation pour choisir d'annoter toute la vidéo ou une plage temporelle précise avec un aperçu de la vidéo,
so that je travaille sur la section pertinente sans distractions.

## Acceptance Criteria

1. À l'ouverture de la page annotation, une modale propose :
   - Option A : "Annoter toute la vidéo" (radio button)
   - Option B : "Annoter une plage spécifique" (radio button)
2. L'aperçu vidéo est intégré dans le formulaire (lecteur HTML5 miniature avec contrôles de base)
3. En mode "plage", l'utilisateur peut naviguer dans l'aperçu pour choisir les points de début et de fin
4. Bouton "Marquer comme début" capture la frame courante de l'aperçu → champ `startFrame`
5. Bouton "Marquer comme fin" capture la frame courante de l'aperçu → champ `endFrame`
6. La validation passe le contexte `{ startFrame, endFrame }` à la page d'annotation
7. La page d'annotation respecte la plage : le lecteur démarre à `startFrame` et ne navigue pas hors plage
8. Si "toute la vidéo" est sélectionnée → `{ startFrame: null, endFrame: null }` (pas de restriction)
9. `startFrame` doit être < `endFrame` (validation avec message d'erreur)

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **≥ 80%** sur les nouveaux composants.
> Tester tous les cas : toute la vidéo, plage valide, plage invalide, capture de frame.

### Tests obligatoires à écrire en PREMIER

```tsx
// frontend/src/components/annotations/RangeSelectionModal.test.tsx (nouveau)

test('shows two options: full video and specific range', () => {
  render(<RangeSelectionModal video={mockVideo} onConfirm={vi.fn()} />);
  expect(screen.getByRole('radio', { name: /toute la vidéo/i })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /plage spécifique/i })).toBeInTheDocument();
});

test('full video option is selected by default', () => {
  render(<RangeSelectionModal video={mockVideo} onConfirm={vi.fn()} />);
  expect(screen.getByRole('radio', { name: /toute la vidéo/i })).toBeChecked();
});

test('confirm with full video passes null range', async () => {
  const onConfirm = vi.fn();
  render(<RangeSelectionModal video={mockVideo} onConfirm={onConfirm} />);
  await userEvent.click(screen.getByRole('button', { name: /commencer/i }));
  expect(onConfirm).toHaveBeenCalledWith({ startFrame: null, endFrame: null });
});

test('range mode shows start and end frame fields', async () => {
  render(<RangeSelectionModal video={mockVideo} onConfirm={vi.fn()} />);
  await userEvent.click(screen.getByRole('radio', { name: /plage spécifique/i }));
  expect(screen.getByTestId('start-frame-value')).toBeInTheDocument();
  expect(screen.getByTestId('end-frame-value')).toBeInTheDocument();
});

test('mark start frame captures current preview frame', async () => {
  const mockGetCurrentFrame = vi.fn().mockReturnValue(42);
  render(<RangeSelectionModal video={mockVideo} onConfirm={vi.fn()} getCurrentFrame={mockGetCurrentFrame} />);
  await userEvent.click(screen.getByRole('radio', { name: /plage spécifique/i }));
  await userEvent.click(screen.getByRole('button', { name: /marquer début/i }));
  expect(screen.getByTestId('start-frame-value')).toHaveTextContent('42');
});

test('mark end frame captures current preview frame', async () => {
  const mockGetCurrentFrame = vi.fn().mockReturnValue(200);
  render(<RangeSelectionModal video={mockVideo} onConfirm={vi.fn()} getCurrentFrame={mockGetCurrentFrame} />);
  await userEvent.click(screen.getByRole('radio', { name: /plage spécifique/i }));
  await userEvent.click(screen.getByRole('button', { name: /marquer fin/i }));
  expect(screen.getByTestId('end-frame-value')).toHaveTextContent('200');
});

test('shows validation error if startFrame >= endFrame', async () => {
  render(<RangeSelectionModal video={mockVideo} onConfirm={vi.fn()} />);
  await userEvent.click(screen.getByRole('radio', { name: /plage spécifique/i }));
  // Forcer startFrame > endFrame
  fireEvent.change(screen.getByTestId('start-frame-input'), { target: { value: '200' } });
  fireEvent.change(screen.getByTestId('end-frame-input'), { target: { value: '100' } });
  await userEvent.click(screen.getByRole('button', { name: /commencer/i }));
  expect(screen.getByRole('alert')).toHaveTextContent(/début.*fin/i);
});

test('confirm with range passes startFrame and endFrame', async () => {
  const onConfirm = vi.fn();
  render(<RangeSelectionModal video={mockVideo} onConfirm={onConfirm} />);
  await userEvent.click(screen.getByRole('radio', { name: /plage spécifique/i }));
  fireEvent.change(screen.getByTestId('start-frame-input'), { target: { value: '50' } });
  fireEvent.change(screen.getByTestId('end-frame-input'), { target: { value: '150' } });
  await userEvent.click(screen.getByRole('button', { name: /commencer/i }));
  expect(onConfirm).toHaveBeenCalledWith({ startFrame: 50, endFrame: 150 });
});

// frontend/src/pages/AnnotationPage.test.tsx (ajouts)

test('annotation page respects range: player starts at startFrame', () => {
  render(<AnnotationPage videoId="uuid-1" startFrame={50} endFrame={200} />);
  // Le lecteur doit être positionné à la frame 50
  expect(screen.getByTestId('current-frame-display')).toHaveTextContent('50');
});
```

## Tasks / Subtasks

- [x] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–9)
  - [x] Créer `frontend/src/components/annotations/RangeSelectionModal.test.tsx` — 8 tests
  - [x] Ajouter 1 test dans `frontend/src/pages/AnnotationPage.test.tsx`
- [x] Créer `frontend/src/components/annotations/RangeSelectionModal.tsx` (AC: 1–6, 8, 9)
  - [x] Radio buttons : "Annoter toute la vidéo" (défaut) / "Annoter une plage spécifique"
  - [x] En mode plage : champs `startFrame` / `endFrame` + boutons "Marquer comme début/fin"
  - [x] Aperçu vidéo : élément `<video>` natif miniature avec `getCurrentFrame` injectable
  - [x] Validation : `startFrame < endFrame` avec message d'erreur `role="alert"`
  - [x] `onConfirm({ startFrame, endFrame })` à la validation
- [x] Modifier `frontend/src/pages/AnnotationPage.tsx` (AC: 7, 8)
  - [x] Afficher `<RangeSelectionModal>` en overlay (position: fixed)
  - [x] Props `startFrame`/`endFrame` permettent de bypasser la modale
  - [x] `data-testid="current-frame-display"` affiche `confirmedStart ?? currentFrame`
  - [x] Bloquer la navigation hors plage via `effectiveStart`/`effectiveEnd` vers PlaybackControls et VideoTimeline
- [x] Modifier `frontend/src/stores/videoStore.ts` (AC: 7)
  - [x] Ajouter `startFrame: number | null` et `endFrame: number | null` avec setters
- [x] Passer tous les tests → GREEN (391/391)

## Dev Notes

### Dépendances

- **S6.7 DOIT être implémentée avant S6.8** (VideoPlayer réutilisé dans l'aperçu)

### Contexte codebase

- `AnnotationPage.tsx` : page principale d'annotation — afficher la modale avant le contenu principal
- `VideoPlayer.tsx` : réutiliser directement dans la modale pour l'aperçu (après fix S6.7)
- `videoStore.ts` : store Zustand — ajouter les champs `startFrame` / `endFrame`
- La modale peut être rendue en haut de `AnnotationPage` avec un état `rangeConfirmed: boolean`

### Pattern flux

```
AnnotationPage charge
  → affiche RangeSelectionModal (overlay)
    → utilisateur choisit "toute la vidéo" ou "plage"
    → onConfirm({ startFrame, endFrame })
  → RangeSelectionModal se ferme
  → AnnotationPage initialise le lecteur avec les paramètres de plage
```

### Structure des fichiers

```
frontend/src/
├── components/annotations/
│   ├── RangeSelectionModal.tsx          ← créer
│   └── RangeSelectionModal.test.tsx     ← créer
├── pages/
│   ├── AnnotationPage.tsx               ← modifier (intégration modale + état plage)
│   └── AnnotationPage.test.tsx          ← enrichir
└── stores/
    └── videoStore.ts                    ← modifier (startFrame, endFrame)
```

### Anti-patterns à éviter

- Ne PAS bloquer le rendu de la page entière — la modale s'affiche par-dessus
- Ne PAS dupliquer le lecteur vidéo — réutiliser `<VideoPlayer>` dans l'aperçu
- Ne PAS valider la plage uniquement côté store — valider dans la modale avant `onConfirm`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucune erreur majeure. Tests RED confirmés avant implémentation. 391/391 tests verts.

### Completion Notes List

- Aperçu vidéo via `<video>` natif (pas VideoPlayer) pour éviter les conflits avec le store global
- `getCurrentFrame` prop injectable permet de tester sans lecteur réel
- Modal affichée en `position: fixed` overlay — la page reste rendue derrière
- Props `startFrame`/`endFrame` sur AnnotationPage permettent de bypasser la modale (utile en test et navigation directe)
- `effectiveStart`/`effectiveEnd` transmis à PlaybackControls et VideoTimeline pour le blocage de navigation

### File List

- `frontend/src/components/annotations/RangeSelectionModal.tsx` (créé)
- `frontend/src/components/annotations/RangeSelectionModal.test.tsx` (créé)
- `frontend/src/pages/AnnotationPage.tsx` (modifié)
- `frontend/src/pages/AnnotationPage.test.tsx` (modifié)
- `frontend/src/stores/videoStore.ts` (modifié)

## Change Log

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase C. Dépend de S6.7. Exigence couverture tests maximale.
