# Story 7.3: Déplacer Bouton "Adapter la Vidéo" → Carte Vidéo Projets

Status: review

## Story

En tant qu'utilisateur,
Je veux voir le bouton "Adapter la vidéo" directement sur la carte vidéo dans la page projets,
Afin de lancer l'adaptation BPM sans passer par la page statistiques.

## Acceptance Criteria

### AC1 — Bouton dans VideoCard
- Un bouton "Adapter" est visible dans la carte vidéo (`VideoCard`) uniquement si `annotationCount >= 2`
- Si `annotationCount < 2`, le bouton est absent (pas désactivé, absent)

### AC2 — Même comportement que dans StatisticsPage
- Cliquer "Adapter" ouvre le panneau `PreviewPanel` (champ BPM cible + bouton "Prévisualiser")
- Le BPM cible est pré-rempli avec `stats.bpm_global` (récupéré via `useVideoStatistics`)
- Le comportement de génération, progression, sauvegarde est identique à la version actuelle dans `StatisticsPage`

### AC3 — Suppression dans StatisticsPage
- `PreviewPanel` est retiré de `StatisticsPage`
- `StatisticsPage` n'importe plus `PreviewPanel`
- Les données BPM et histogramme restent visibles dans `StatisticsPage`

### AC4 — Panneau fermable
- Un bouton "Fermer" masque le panneau `PreviewPanel` dans `VideoCard`
- Si un job est en cours, fermer affiche une confirmation "Annuler le job en cours ?"

### AC5 — Visibilité du panneau
- Le panneau `PreviewPanel` est affiché en dessous de la ligne principale de la carte vidéo
- Il s'insère entre la ligne principale et la sous-section "aperçu adapté" si celle-ci est présente

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. Écrire les tests AVANT de modifier les composants.

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/components/projects/VideoCard.test.tsx (ajouts)

test('adapter button is visible when annotation count >= 2', () => {
  const video = buildVideo({ annotations: [{}, {}] })
  render(<VideoCard video={video} onAnnotate={vi.fn()} onDelete={vi.fn()} onStats={vi.fn()} />)
  expect(screen.getByRole('button', { name: /adapter/i })).toBeInTheDocument()
})

test('adapter button is absent when annotation count < 2', () => {
  const video = buildVideo({ annotations: [{}] })
  render(<VideoCard video={video} onAnnotate={vi.fn()} onDelete={vi.fn()} onStats={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /adapter/i })).not.toBeInTheDocument()
})

test('clicking adapter button shows PreviewPanel', async () => {
  const video = buildVideo({ annotations: [{}, {}] })
  render(<VideoCard video={video} onAnnotate={vi.fn()} onDelete={vi.fn()} onStats={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: /adapter/i }))
  expect(screen.getByTestId('bpm-preview-panel')).toBeInTheDocument()
})

test('PreviewPanel can be closed from VideoCard', async () => {
  const video = buildVideo({ annotations: [{}, {}] })
  render(<VideoCard video={video} onAnnotate={vi.fn()} onDelete={vi.fn()} onStats={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: /adapter/i }))
  await userEvent.click(screen.getByRole('button', { name: /fermer/i }))
  expect(screen.queryByTestId('bpm-preview-panel')).not.toBeInTheDocument()
})

// frontend/src/pages/StatisticsPage.test.tsx (ajout)
test('StatisticsPage does not contain PreviewPanel', () => {
  render(<StatisticsPage />)
  expect(screen.queryByTestId('bpm-preview-panel')).not.toBeInTheDocument()
})
```

## Tasks / Subtasks

### Frontend

- [x] Écrire les 5 tests ci-dessus → RED
- [x] Modifier `frontend/src/components/projects/VideoCard.tsx` :
  - [x] Ajouter prop optionnelle `onAdapt?: (videoId: string) => void` (ou gérer localement)
  - [x] Ajouter state `showPreviewPanel: boolean` (local, défaut `false`)
  - [x] Ajouter bouton "Adapter" dans la section boutons (à droite de "Stats") — visible seulement si `annotationCount >= 2`
  - [x] Afficher `<PreviewPanel>` conditionnel (entre ligne principale et sous-section aperçu)
  - [x] Passer `videoId={video.id}`, `currentBpm={stats?.bpm_global ?? 0}`, `annotationCount={annotationCount}` à `PreviewPanel`
  - [x] Gérer la fermeture via callback `onClose` de `PreviewPanel` (déjà présent dans le composant)
- [x] Modifier `frontend/src/pages/StatisticsPage.tsx` :
  - [x] Supprimer l'import de `PreviewPanel`
  - [x] Retirer le panneau `<PreviewPanel>` (panneau 2 actuel)
  - [x] Renuméroter les panneaux commentaires si nécessaire
- [x] Passer tous les tests → GREEN

### Backend (aucune modification)

Les endpoints preview existants sont déjà en place (S6.10).

## Dev Notes

### Fichiers à modifier

```
frontend/src/components/projects/VideoCard.tsx   ← ajouter bouton + PreviewPanel local
frontend/src/components/projects/VideoCard.test.tsx ← 4 nouveaux tests
frontend/src/pages/StatisticsPage.tsx            ← retirer PreviewPanel
frontend/src/pages/StatisticsPage.test.tsx       ← 1 nouveau test
```

### Props PreviewPanel existantes (réutiliser telles quelles)

```tsx
<PreviewPanel
  videoId={video.id}
  currentBpm={stats?.bpm_global ?? 0}
  annotationCount={annotationCount}
/>
```

`PreviewPanel` gère déjà son propre état (job polling, progression, save, fermeture interne via bouton "Fermer"). Ne pas dupliquer cette logique.

### Positionnement dans VideoCard

```tsx
{/* Ligne principale */}
<div>...</div>

{/* Panneau Adapter (conditionnel) */}
{showPreviewPanel && (
  <div style={{ borderTop: '...', padding: '...' }}>
    <PreviewPanel videoId={video.id} currentBpm={stats?.bpm_global ?? 0}
      annotationCount={annotationCount} />
  </div>
)}

{/* Aperçu adapté sauvegardé (déjà existant) */}
{video.adapted_preview && <div>...</div>}
```

### Anti-patterns à éviter

- Ne PAS créer un nouveau composant PreviewModal — réutiliser `PreviewPanel` existant
- Ne PAS modifier l'API ou les endpoints backend
- Ne PAS modifier le comportement interne de `PreviewPanel`

## Dev Agent Record

### Agent Model Used
GPT-5 Codex

### Debug Log References
- `frontend/src/components/projects/VideoCard.tsx`: ajout du bouton `Adapter`, de l'état local `showPreviewPanel` et de l'insertion du `PreviewPanel` au bon endroit
- `frontend/src/components/exports/PreviewPanel.tsx`: ajout d'une fermeture optionnelle avec confirmation si un job est actif
- `frontend/src/pages/StatisticsPage.tsx`: retrait complet de `PreviewPanel`
- `frontend/src/components/projects/VideoCard.test.tsx` et `frontend/src/pages/StatisticsPage.test.tsx`: couverture des AC1 à AC5

### Completion Notes List
- Le bouton `Adapter` est présent uniquement si `annotationCount >= 2`
- Le panneau `PreviewPanel` s'ouvre depuis `VideoCard`, se ferme via `Fermer`, et demande confirmation si un job preview tourne
- `StatisticsPage` conserve ses métriques et graphiques, sans panneau d'adaptation BPM
- Validation complète exécutée via `npm run test` dans `frontend` : 402 tests passants

### File List
- `frontend/src/components/projects/VideoCard.tsx`
- `frontend/src/components/projects/VideoCard.test.tsx`
- `frontend/src/components/exports/PreviewPanel.tsx`
- `frontend/src/pages/StatisticsPage.tsx`
- `frontend/src/pages/StatisticsPage.test.tsx`

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, déplacement PreviewPanel stats → carte vidéo
