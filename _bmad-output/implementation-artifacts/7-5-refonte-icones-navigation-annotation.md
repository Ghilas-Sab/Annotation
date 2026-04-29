# Story 7.5: Refonte Icônes Boutons Navigation Page Annotation

Status: review

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

- [x] Écrire les 5 tests ci-dessus → RED
- [x] Modifier `frontend/src/components/video/PlaybackControls.tsx` :
  - [x] Changer `⏪` → `⏮` pour le bouton "début vidéo"
  - [x] Changer `⏮` → `◀` pour le bouton "annotation précédente", avec style `color: '#FFD700'`
  - [x] Changer `⏭` → `▶` pour le bouton "annotation suivante", avec style `color: '#FFD700'`
  - [x] Changer `⏩` → `⏭` pour le bouton "fin vidéo"
- [x] Mettre à jour `KeyboardShortcutsModal`
- [x] Étendre les raccourcis demandés par l'utilisateur (`Entrée` pour annoter, `Espace` pour play/pause)
- [x] Ajouter le zoom timeline via boutons `+` / `-`, bornes visibles et auto-pan en bout de vue
- [x] Synchroniser la sélection timeline ↔ liste d'annotations
- [x] Retirer les textes secondaires inutiles sous la timeline
- [x] Passer tous les tests → GREEN

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
GPT-5 Codex

### Debug Log References
`npm run test -- src/hooks/useVideoKeyboard.test.ts`
`npm run test -- src/components/video/PlaybackControls.test.tsx`
`npm run test -- src/components/video/VideoTimeline.test.tsx`
`npm run test -- src/components/annotations/AnnotationItem.test.tsx`
`npm run test -- src/components/KeyboardShortcutsModal.test.tsx`
`npm run test -- src/pages/AnnotationPage.test.tsx`
`npm run test`

### Completion Notes List
- Icônes de navigation annotation mises à jour selon la story (`⏮`, `◀`, `▶`, `⏭`) sans changer les `aria-label`.
- Raccourcis clavier alignés avec la demande utilisateur: `Entrée` annote, `Espace` bascule lecture/pause.
- Liste des raccourcis visuelle synchronisée avec le comportement réel final.
- La suppression reste uniquement via le bouton poubelle; le raccourci clavier de suppression a été retiré.
- Timeline enrichie avec boutons zoom, auto-pan quand la lecture atteint le bord d'une vue zoomée et sélection synchronisée avec la liste.
- Textes secondaires sous la timeline retirés pour simplifier l'UI.
- Suite frontend complète verte: `422` tests.

### File List
- `frontend/src/hooks/useVideoKeyboard.ts`
- `frontend/src/hooks/useVideoKeyboard.test.ts`
- `frontend/src/components/video/PlaybackControls.tsx`
- `frontend/src/components/video/PlaybackControls.test.tsx`
- `frontend/src/components/KeyboardShortcutsModal.tsx`
- `frontend/src/components/KeyboardShortcutsModal.test.tsx`
- `frontend/src/components/annotations/AnnotationList.tsx`
- `frontend/src/components/annotations/AnnotationList.test.tsx`
- `frontend/src/components/annotations/AnnotationItem.tsx`
- `frontend/src/components/annotations/AnnotationItem.test.tsx`
- `frontend/src/components/video/VideoTimeline.tsx`
- `frontend/src/components/video/VideoTimeline.test.tsx`
- `frontend/src/pages/AnnotationPage.tsx`

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, refonte icônes navigation annotation
- 2026-04-29 : Implémentation dev terminée avec extension UX validée par l'utilisateur sur raccourcis et zoom timeline
- 2026-04-29 : Ajustement final UX avec sélection croisée timeline/liste et retrait des aides visuelles inutiles
