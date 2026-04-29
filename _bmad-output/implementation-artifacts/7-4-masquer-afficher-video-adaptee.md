# Story 7.4: Masquer/Afficher la Vidéo Adaptée dans la Carte Vidéo

Status: review

## Story

En tant qu'utilisateur,
Je veux pouvoir masquer ou afficher la vidéo adaptée sauvegardée dans la liste des vidéos d'un projet,
Afin de gagner de l'espace visuel dans la page projet par défaut.

## Acceptance Criteria

### AC1 — Masqué par défaut
- Quand `video.adapted_preview` existe, la section aperçu (player vidéo + métadonnées) est masquée par défaut
- Un bouton "▼ Voir l'aperçu adapté" est visible à la place

### AC2 — Toggle affichage
- Cliquer "▼ Voir l'aperçu adapté" révèle la section complète (player + boutons)
- Le libellé du bouton devient "▲ Masquer l'aperçu adapté"
- Re-cliquer masque à nouveau la section

### AC3 — État local par carte
- Chaque `VideoCard` gère son état show/hide indépendamment
- Ouvrir l'aperçu d'une vidéo n'affecte pas les autres cartes

### AC4 — Contenu inchangé
- Quand l'aperçu est affiché, le contenu est identique à l'actuel (player, badge BPM, date, boutons "Exporter", "Ouvrir les stats", "Supprimer")

### AC5 — Pas de sous-section si pas d'aperçu
- Si `video.adapted_preview` est null/undefined, aucun bouton toggle n'est affiché (comportement inchangé)

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. Écrire les tests AVANT de modifier `VideoCard`.

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/components/projects/VideoCard.test.tsx (ajouts)

test('adapted preview section is hidden by default', () => {
  const video = buildVideo({ adapted_preview: { bpm: 120, created_at: '2026-01-01' } })
  render(<VideoCard video={video} onAnnotate={vi.fn()} onDelete={vi.fn()} onStats={vi.fn()} />)
  expect(screen.queryByTestId(`adapted-preview-player-${video.id}`)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /voir l.aperçu adapté/i })).toBeInTheDocument()
})

test('clicking toggle reveals adapted preview section', async () => {
  const video = buildVideo({ adapted_preview: { bpm: 120, created_at: '2026-01-01' } })
  render(<VideoCard video={video} onAnnotate={vi.fn()} onDelete={vi.fn()} onStats={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: /voir l.aperçu adapté/i }))
  expect(screen.getByTestId(`adapted-preview-player-${video.id}`)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /masquer l.aperçu adapté/i })).toBeInTheDocument()
})

test('clicking toggle again hides adapted preview section', async () => {
  const video = buildVideo({ adapted_preview: { bpm: 120, created_at: '2026-01-01' } })
  render(<VideoCard video={video} onAnnotate={vi.fn()} onDelete={vi.fn()} onStats={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: /voir l.aperçu adapté/i }))
  await userEvent.click(screen.getByRole('button', { name: /masquer l.aperçu adapté/i }))
  expect(screen.queryByTestId(`adapted-preview-player-${video.id}`)).not.toBeInTheDocument()
})

test('toggle button absent when no adapted preview', () => {
  const video = buildVideo({ adapted_preview: undefined })
  render(<VideoCard video={video} onAnnotate={vi.fn()} onDelete={vi.fn()} onStats={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /aperçu adapté/i })).not.toBeInTheDocument()
})

test('each VideoCard toggles independently', async () => {
  const v1 = buildVideo({ id: 'v1', adapted_preview: { bpm: 120, created_at: '2026-01-01' } })
  const v2 = buildVideo({ id: 'v2', adapted_preview: { bpm: 90, created_at: '2026-01-01' } })
  render(<><VideoCard video={v1} .../><VideoCard video={v2} .../></>)
  await userEvent.click(screen.getAllByRole('button', { name: /voir l.aperçu adapté/i })[0])
  expect(screen.getByTestId('adapted-preview-player-v1')).toBeInTheDocument()
  expect(screen.queryByTestId('adapted-preview-player-v2')).not.toBeInTheDocument()
})
```

## Tasks / Subtasks

### Frontend

- [x] Écrire les 5 tests ci-dessus → RED
- [x] Modifier `frontend/src/components/projects/VideoCard.tsx` :
  - [x] Ajouter state `showAdaptedPreview: boolean` (local, défaut `false`)
  - [x] Remplacer le bloc `{video.adapted_preview && (...)}`  par :
    ```tsx
    {video.adapted_preview && (
      <>
        <button onClick={() => setShowAdaptedPreview(v => !v)}>
          {showAdaptedPreview ? '▲ Masquer l\'aperçu adapté' : '▼ Voir l\'aperçu adapté'}
        </button>
        {showAdaptedPreview && <div>...contenu existant...</div>}
      </>
    )}
    ```
  - [x] S'assurer que `data-testid="adapted-preview-player-{video.id}"` reste dans le player
- [x] Passer tous les tests → GREEN

### Backend (aucune modification)

## Dev Notes

### Fichiers à modifier

```
frontend/src/components/projects/VideoCard.tsx      ← state showAdaptedPreview + toggle button
frontend/src/components/projects/VideoCard.test.tsx ← 5 nouveaux tests
```

### Style du bouton toggle

Le bouton doit s'intégrer visuellement dans la séparation entre la ligne principale et la sous-section. Exemple :

```tsx
<div style={{
  borderTop: '1px solid rgba(100,255,218,0.15)',
  padding: '0.4rem 1.5rem',
}}>
  <button
    onClick={() => setShowAdaptedPreview(v => !v)}
    style={{
      background: 'none', border: 'none',
      color: 'rgba(100,255,218,0.6)',
      cursor: 'pointer', fontSize: '0.8rem',
    }}
  >
    {showAdaptedPreview ? '▲ Masquer l\'aperçu adapté' : '▼ Voir l\'aperçu adapté'}
  </button>
</div>
{showAdaptedPreview && <div>...section complète...</div>}
```

### Anti-patterns à éviter

- Ne PAS modifier l'état dans un store global — état local `useState` suffisant
- Ne PAS supprimer le `data-testid` du player — il est utilisé dans les tests existants

## Dev Agent Record

### Agent Model Used
GPT-5 Codex

### Debug Log References
- `frontend/src/components/projects/VideoCard.tsx`: ajout de l'état local `showAdaptedPreview` et du toggle voir/masquer
- `frontend/src/components/projects/VideoCard.test.tsx`: couverture RED/GREEN des 5 AC de la story
- `frontend/src/pages/ProjectDetailPage.test.tsx`: mise à jour d'un test d'intégration devenu obsolète avec le nouveau comportement masqué par défaut
- `npm run test` frontend validé après adaptation de la suite complète

### Completion Notes List
- L'aperçu adapté sauvegardé est maintenant masqué par défaut et révélable carte par carte
- Le contenu de la sous-section reste inchangé quand elle est affichée
- Aucun bouton toggle n'est rendu si `video.adapted_preview` est absent
- Validation complète exécutée via `npm run test` dans `frontend` : 407 tests passants

### File List
- `frontend/src/components/projects/VideoCard.tsx`
- `frontend/src/components/projects/VideoCard.test.tsx`
- `frontend/src/pages/ProjectDetailPage.test.tsx`

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, masquer/afficher vidéo adaptée par défaut
