# Story 7.5: Refonte Icônes Boutons Navigation Page Annotation

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux que les icônes des boutons de navigation dans la page annotation reflètent clairement leur fonction,
Afin de distinguer intuitivement "aller au début/fin de la vidéo" de "sauter à l'annotation précédente/suivante".

## Acceptance Criteria

### AC1 — Boutons début/fin de vidéo avec icône "barre sur le côté"
- Le bouton "début vidéo" (Alt+←) utilise l'icône `⏮` (barre gauche + flèche gauche)
- Le bouton "fin vidéo" (Alt+→) utilise l'icône `⏭` (flèche droite + barre droite)
- Les `aria-label` et `title` restent identiques : "début vidéo" / "fin vidéo"
- Les fonctions `seekStart` / `seekEnd` sont inchangées

### AC2 — Boutons saut inter-annotation avec couleur accentuée (jaune)
- Le bouton "annotation précédente" (Ctrl+←) utilise l'icône `◀` avec un style jaune/accent (`color: '#FFD700'` ou variable CSS)
- Le bouton "annotation suivante" (Ctrl+→) utilise l'icône `▶` avec le même style jaune
- Les `aria-label` et `title` restent identiques : "annotation précédente" / "annotation suivante"
- Les fonctions `seekPrevAnnotation` / `seekNextAnnotation` sont inchangées

### AC3 — Ordre des boutons inchangé
- L'ordre de gauche à droite reste : début | ann. préc. | -5 | frame préc. | [annoter] | frame suiv. | +5 | ann. suiv. | fin

### AC4 — Raccourcis clavier inchangés
- Alt+← = début, Ctrl+← = annotation préc., Alt+→ = fin, Ctrl+→ = annotation suiv.
- Aucune modification dans `useVideoKeyboard.ts`

### AC5 — KeyboardShortcutsModal mis à jour
- Si les icônes sont mentionnées dans `KeyboardShortcutsModal`, mettre à jour les références

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. Écrire les tests AVANT de modifier `PlaybackControls`.

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/components/video/PlaybackControls.test.tsx (ajouts)

test('début vidéo button shows ⏮ icon', () => {
  render(<PlaybackControls {...defaultProps} />)
  const btn = screen.getByRole('button', { name: /début vidéo/i })
  expect(btn).toHaveTextContent('⏮')
})

test('fin vidéo button shows ⏭ icon', () => {
  render(<PlaybackControls {...defaultProps} />)
  const btn = screen.getByRole('button', { name: /fin vidéo/i })
  expect(btn).toHaveTextContent('⏭')
})

test('annotation précédente button has accent color style', () => {
  render(<PlaybackControls {...defaultProps} />)
  const btn = screen.getByRole('button', { name: /annotation précédente/i })
  expect(btn).toHaveStyle({ color: expect.stringMatching(/#FFD700|yellow|gold/i) })
})

test('annotation suivante button has accent color style', () => {
  render(<PlaybackControls {...defaultProps} />)
  const btn = screen.getByRole('button', { name: /annotation suivante/i })
  expect(btn).toHaveStyle({ color: expect.stringMatching(/#FFD700|yellow|gold/i) })
})

test('button order is preserved', () => {
  render(<PlaybackControls {...defaultProps} />)
  const buttons = screen.getAllByRole('button')
  const labels = buttons.map(b => b.getAttribute('aria-label'))
  const debutIdx = labels.indexOf('début vidéo')
  const annPrecIdx = labels.indexOf('annotation précédente')
  const annSuivIdx = labels.indexOf('annotation suivante')
  const finIdx = labels.indexOf('fin vidéo')
  expect(debutIdx).toBeLessThan(annPrecIdx)
  expect(annPrecIdx).toBeLessThan(annSuivIdx)
  expect(annSuivIdx).toBeLessThan(finIdx)
})
```

## Tasks / Subtasks

### Frontend

- [ ] Écrire les 5 tests ci-dessus → RED
- [ ] Modifier `frontend/src/components/video/PlaybackControls.tsx` :
  - [ ] Ligne 133 — changer `⏪` → `⏮` pour le bouton "début vidéo"
  - [ ] Ligne 134 — changer `⏮` → `◀` pour le bouton "annotation précédente", ajouter style `color: '#FFD700'`
  - [ ] Ligne 151 — changer `⏭` → `▶` pour le bouton "annotation suivante", ajouter style `color: '#FFD700'`
  - [ ] Ligne 152 — changer `⏩` → `⏭` pour le bouton "fin vidéo"
- [ ] Si `KeyboardShortcutsModal` affiche les icônes de ces boutons → mettre à jour
- [ ] Passer tous les tests → GREEN

### Backend (aucune modification)

## Dev Notes

### Tableau des changements d'icônes

| Bouton | Avant | Après | Couleur |
|--------|-------|-------|---------|
| début vidéo (Alt+←) | ⏪ | ⏮ | inchangé (`btnStyle`) |
| annotation précédente (Ctrl+←) | ⏮ | ◀ | `#FFD700` (jaune) |
| annotation suivante (Ctrl+→) | ⏭ | ▶ | `#FFD700` (jaune) |
| fin vidéo (Alt+→) | ⏩ | ⏭ | inchangé (`btnStyle`) |

### Style jaune pour boutons annotation

```tsx
const annotationBtnStyle = {
  ...btnStyle,
  color: '#FFD700',
  borderColor: 'rgba(255,215,0,0.35)',
}
```

### Fichiers à modifier

```
frontend/src/components/video/PlaybackControls.tsx      ← icônes + style boutons annotation
frontend/src/components/video/PlaybackControls.test.tsx ← 5 nouveaux tests
frontend/src/components/KeyboardShortcutsModal.tsx      ← si icônes référencées (vérifier)
```

### Anti-patterns à éviter

- Ne PAS modifier les `aria-label` — les tests existants et l'accessibilité en dépendent
- Ne PAS modifier les fonctions `seekPrevAnnotation`, `seekNextAnnotation`, `seekStart`, `seekEnd`
- Ne PAS changer l'ordre des boutons

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

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, refonte icônes navigation annotation
