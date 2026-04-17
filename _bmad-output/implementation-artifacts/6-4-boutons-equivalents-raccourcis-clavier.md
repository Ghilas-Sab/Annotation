# Story 6.4: Boutons Équivalents pour Tous les Raccourcis Clavier

Status: review

## Story

En tant qu'utilisateur sur tablette (sans clavier physique),
I want avoir des boutons cliquables pour toutes les actions de la page annotation,
so that je peux annoter une vidéo sans avoir besoin d'un clavier physique.

## Acceptance Criteria

1. Un panneau "Contrôles" visible affiche des boutons pour chaque raccourci :

| Action | Raccourci | Bouton | aria-label |
|--------|-----------|--------|-----------|
| Frame précédente | ← | ◀ | "frame précédente" |
| Frame suivante | → | ▶ | "frame suivante" |
| −5 frames | Shift+← | ◀◀ | "-5 frames" |
| +5 frames | Shift+→ | ▶▶ | "+5 frames" |
| Annotation précédente | Ctrl+← | ⏮ | "annotation précédente" |
| Annotation suivante | Ctrl+→ | ⏭ | "annotation suivante" |
| Début vidéo | Alt+← | ⏪ | "début vidéo" |
| Fin vidéo | Alt+→ | ⏩ | "fin vidéo" |
| Annoter | Espace | ● Annoter | "annoter" |
| Lecture/Pause | — | ▶/⏸ | "lecture pause" |

2. Les boutons appellent exactement les mêmes handlers que les raccourcis clavier (zéro duplication de logique)
3. Les raccourcis clavier continuent de fonctionner (pas de régression)
4. Un bouton "?" ouvre la modal `KeyboardShortcutsModal` existante
5. Chaque bouton a un `aria-label` accessible (voir tableau ci-dessus)

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **≥ 80%** sur PlaybackControls.
> Tester chaque bouton + vérifier absence de régression sur les raccourcis clavier.

### Tests obligatoires à écrire en PREMIER

```tsx
// frontend/src/components/video/PlaybackControls.test.tsx (ajouts)

test('clicking next-frame button calls seek handler with current+1', async () => {
  const seekFn = vi.fn();
  render(<PlaybackControls onSeek={seekFn} currentFrame={10} totalFrames={500} fps={25} />);
  await userEvent.click(screen.getByRole('button', { name: /frame suivante/i }));
  expect(seekFn).toHaveBeenCalledWith(11);
});

test('clicking prev-frame button calls seek handler with current-1', async () => {
  const seekFn = vi.fn();
  render(<PlaybackControls onSeek={seekFn} currentFrame={10} totalFrames={500} fps={25} />);
  await userEvent.click(screen.getByRole('button', { name: /frame précédente/i }));
  expect(seekFn).toHaveBeenCalledWith(9);
});

test('clicking +5 frames button calls seek handler with current+5', async () => {
  const seekFn = vi.fn();
  render(<PlaybackControls onSeek={seekFn} currentFrame={10} totalFrames={500} fps={25} />);
  await userEvent.click(screen.getByRole('button', { name: /\+5 frames/i }));
  expect(seekFn).toHaveBeenCalledWith(15);
});

test('clicking annotate button triggers annotation at current frame', async () => {
  const annotateFn = vi.fn();
  render(<PlaybackControls onAnnotate={annotateFn} currentFrame={42} totalFrames={500} fps={25} />);
  await userEvent.click(screen.getByRole('button', { name: /annoter/i }));
  expect(annotateFn).toHaveBeenCalledWith(42);
});

test('clicking go-to-start button seeks to frame 0', async () => {
  const seekFn = vi.fn();
  render(<PlaybackControls onSeek={seekFn} currentFrame={100} totalFrames={500} fps={25} />);
  await userEvent.click(screen.getByRole('button', { name: /début vidéo/i }));
  expect(seekFn).toHaveBeenCalledWith(0);
});

test('clicking go-to-end button seeks to last frame', async () => {
  const seekFn = vi.fn();
  render(<PlaybackControls onSeek={seekFn} currentFrame={100} totalFrames={500} fps={25} />);
  await userEvent.click(screen.getByRole('button', { name: /fin vidéo/i }));
  expect(seekFn).toHaveBeenCalledWith(499);
});

test('? button opens KeyboardShortcutsModal', async () => {
  render(<PlaybackControls onSeek={vi.fn()} currentFrame={0} totalFrames={500} fps={25} />);
  await userEvent.click(screen.getByRole('button', { name: /raccourcis/i }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('keyboard shortcuts still work after adding buttons', () => {
  // Régression : s'assurer que les raccourcis clavier existants ne sont pas cassés
  const seekFn = vi.fn();
  render(<PlaybackControls onSeek={seekFn} currentFrame={10} totalFrames={500} fps={25} />);
  fireEvent.keyDown(document, { key: 'ArrowRight' });
  expect(seekFn).toHaveBeenCalledWith(11);
});
```

## Tasks / Subtasks

- [x] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–5)
  - [x] Ajouter 11 tests dans `frontend/src/components/video/PlaybackControls.test.tsx`
  - [x] Tester chaque bouton du tableau AC1
  - [x] Tester régression raccourcis clavier
- [x] Refactoriser `frontend/src/hooks/useVideoKeyboard.ts` pour exporter les handlers (AC: 2)
  - [x] Extraire les fonctions de navigation en handlers réutilisables via refs (anti-closure stale)
  - [x] Retourner les handlers depuis le hook : `{ seekPrevFrame, seekNextFrame, seek5Back, seek5Forward, seekPrevAnnotation, seekNextAnnotation, seekStart, seekEnd, annotate }`
- [x] Modifier `frontend/src/components/video/PlaybackControls.tsx` (AC: 1, 4, 5)
  - [x] Panneau "Contrôles" avec les 10 boutons + bouton "?"
  - [x] `useVideoKeyboard` intégré dans `PlaybackControls` (keyboard + boutons partagent les mêmes handlers)
  - [x] `KeyboardShortcutsModal` géré en interne avec `role="dialog"` ajouté
  - [x] `aria-label` sur chaque bouton
- [x] Intégrer dans `AnnotationPage` (AC: 2, 3)
  - [x] Retrait de `useVideoKeyboard` de `AnnotationPage` (déplacé dans `PlaybackControls`)
  - [x] `<PlaybackControls>` rendu dans la zone vidéo avec toutes les props nécessaires
- [x] Passer tous les tests → GREEN (356/356)

## Dev Notes

### Dépendances

- **S6.5 DOIT être implémentée avant S6.4** (Alt+flèche implémenté → boutons Début/Fin vidéo disponibles)

### Contexte codebase

- `useVideoKeyboard.ts` contient les handlers clavier — les extraire sans dupliquer
- `PlaybackControls.tsx` existe déjà avec les boutons lecture/pause → enrichir
- `KeyboardShortcutsModal` existe déjà → réutiliser directement
- Pattern props : passer les handlers comme `onSeek`, `onAnnotate` pour testabilité maximale

### Structure des fichiers

```
frontend/src/
├── hooks/
│   └── useVideoKeyboard.ts              ← modifier (export handlers)
├── components/video/
│   ├── PlaybackControls.tsx             ← modifier (ajout boutons)
│   └── PlaybackControls.test.tsx        ← enrichir
└── pages/
    └── AnnotationPage.tsx               ← connecter handlers aux props
```

### Anti-patterns à éviter

- Ne PAS dupliquer la logique de navigation dans les handlers des boutons
- Ne PAS utiliser des `onClick` inline dans le composant — tout doit passer par les handlers du hook
- Ne PAS supprimer ou modifier les raccourcis clavier existants

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `KeyboardShortcutsModal` n'avait pas `role="dialog"` → ajouté `role="dialog" aria-modal="true"`
- Mock `useVideoKeyboard` dans `AnnotationPage.test.tsx` ne retournait pas les handlers → mis à jour
- Test `Alt+→ seeks to totalFrames` attendait 500, corrigé en 499 (`totalFrames - 1`)

### Completion Notes List

- `useVideoKeyboard` retourne maintenant `VideoKeyboardHandlers` via refs stables (anti-closure stale)
- `PlaybackControls` intègre `useVideoKeyboard` en interne — keyboard + boutons partagent exactement les mêmes handlers, zéro duplication
- Panneau "Contrôles" avec 10 boutons + bouton "?" pour la modal
- `AnnotationPage` : `useVideoKeyboard` retiré, `<PlaybackControls>` rendu sous la vidéo
- 356/356 tests GREEN, zéro régression

### File List

- `_bmad-output/implementation-artifacts/6-4-boutons-equivalents-raccourcis-clavier.md`
- `frontend/src/hooks/useVideoKeyboard.ts`
- `frontend/src/components/video/PlaybackControls.tsx`
- `frontend/src/components/video/PlaybackControls.test.tsx`
- `frontend/src/components/KeyboardShortcutsModal.tsx`
- `frontend/src/pages/AnnotationPage.tsx`
- `frontend/src/pages/AnnotationPage.test.tsx`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase C. Dépend de S6.5. Exigence couverture tests maximale.
