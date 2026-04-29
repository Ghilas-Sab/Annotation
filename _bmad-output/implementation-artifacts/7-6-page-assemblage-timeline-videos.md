# Story 7.6: Page Assemblage — Structure + Import + Timeline Vidéos

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux accéder à une nouvelle page "Assemblage" où je peux importer plusieurs vidéos de mes projets et les disposer sur une timeline,
Afin de préparer l'assemblage de plusieurs vidéos adaptées bout à bout.

## Acceptance Criteria

### AC1 — Route et navigation
- La route `/assemblage` est accessible depuis l'application
- Un lien "Assemblage" est visible dans la navigation principale (header ou sidebar)
- La page s'intitule "Assemblage" dans le titre `<h1>`

### AC2 — Import vidéos depuis projets
- Un bouton "+ Ajouter des vidéos" ouvre un modal de sélection
- Le modal liste tous les projets disponibles avec leurs vidéos
- Chaque vidéo est sélectionnable (checkbox)
- Cliquer "Ajouter la sélection" ferme le modal et ajoute les vidéos à la timeline

### AC3 — Timeline vidéos
- Les vidéos ajoutées apparaissent sur une timeline horizontale, dans l'ordre d'ajout
- Chaque clip est représenté par un bloc avec : nom de la vidéo, durée, miniature (si dispo) ou bloc coloré
- La largeur de chaque bloc est proportionnelle à la durée de la vidéo
- Un axe temporel en secondes est affiché en dessous de la timeline

### AC4 — Réorganisation et suppression
- Les blocs peuvent être réordonnés par glisser-déposer (drag & drop) sur la timeline
- Un bouton ✕ sur chaque bloc le supprime de la timeline
- La timeline se met à jour immédiatement après réordonnement ou suppression

### AC5 — État de la page
- Si aucune vidéo n'est ajoutée, un message "Ajoutez des vidéos pour commencer l'assemblage" est affiché
- Le total de la durée assemblée est affiché en haut de la timeline

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. Écrire les tests AVANT de créer les composants.

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/pages/AssemblagePage.test.tsx (nouveau)

test('renders assemblage page with title', () => {
  render(<AssemblagePage />)
  expect(screen.getByRole('heading', { name: /assemblage/i })).toBeInTheDocument()
})

test('shows empty state message when no videos added', () => {
  render(<AssemblagePage />)
  expect(screen.getByText(/ajoutez des vidéos pour commencer/i)).toBeInTheDocument()
})

test('add videos button opens import modal', async () => {
  render(<AssemblagePage />)
  await userEvent.click(screen.getByRole('button', { name: /ajouter des vidéos/i }))
  expect(screen.getByRole('dialog', { name: /sélectionner des vidéos/i })).toBeInTheDocument()
})

test('selecting video in modal and confirming adds it to timeline', async () => {
  const mockProjects = [buildProject({ videos: [buildVideo({ original_name: 'clip1.mp4' })] })]
  render(<AssemblagePage projects={mockProjects} />)
  await userEvent.click(screen.getByRole('button', { name: /ajouter des vidéos/i }))
  await userEvent.click(screen.getByRole('checkbox', { name: /clip1\.mp4/i }))
  await userEvent.click(screen.getByRole('button', { name: /ajouter la sélection/i }))
  expect(screen.getByText('clip1.mp4')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('removing a clip from timeline', async () => {
  render(<AssemblagePage initialClips={[buildClip({ name: 'clip1.mp4' })]} />)
  await userEvent.click(screen.getByRole('button', { name: /supprimer clip1\.mp4/i }))
  expect(screen.queryByText('clip1.mp4')).not.toBeInTheDocument()
})

test('shows total duration of assembled clips', () => {
  const clips = [buildClip({ duration: 10 }), buildClip({ duration: 5 })]
  render(<AssemblagePage initialClips={clips} />)
  expect(screen.getByText(/durée totale.*15/i)).toBeInTheDocument()
})

test('assemblage link appears in app navigation', () => {
  render(<App />)
  expect(screen.getByRole('link', { name: /assemblage/i })).toBeInTheDocument()
})
```

### Tests backend à écrire EN PREMIER

```python
# backend/tests/test_assemblage.py (nouveau)

async def test_list_projects_with_videos_for_assemblage(client, project_with_videos):
    """GET /api/v1/projects retourne les projets avec leurs vidéos (endpoint existant)."""
    resp = await client.get("/api/v1/projects")
    assert resp.status_code == 200
    # Les vidéos sont incluses dans chaque projet (vérifié via GET /projects/{id}/videos)

async def test_get_project_videos_returns_video_list(client, project_with_videos):
    """GET /api/v1/projects/{id}/videos retourne la liste des vidéos."""
    resp = await client.get(f"/api/v1/projects/{project_with_videos}/videos")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
```

## Tasks / Subtasks

### Backend

- [ ] Écrire les 2 tests backend → GREEN (les endpoints existent déjà, les tests vérifient leur disponibilité)
- [ ] Aucun nouvel endpoint nécessaire pour cette story — utiliser `GET /api/v1/projects` et `GET /api/v1/projects/{id}/videos`

### Frontend

- [ ] Écrire les 7 tests → RED
- [ ] Créer store Zustand `frontend/src/stores/assemblageStore.ts` :
  ```ts
  interface AssemblageClip {
    id: string          // uuid local
    videoId: string
    projectId: string
    name: string
    duration: number    // secondes
    filePath?: string   // pour l'export backend
  }
  interface AssemblageState {
    clips: AssemblageClip[]
    addClips: (clips: AssemblageClip[]) => void
    removeClip: (id: string) => void
    reorderClips: (newOrder: AssemblageClip[]) => void
  }
  ```
- [ ] Créer `frontend/src/pages/AssemblagePage.tsx` :
  - [ ] Section header : titre + bouton "+ Ajouter des vidéos" + durée totale
  - [ ] Section timeline : `<AssemblageTimeline>` (créer composant séparé)
  - [ ] État vide si `clips.length === 0`
- [ ] Créer `frontend/src/components/assemblage/VideoImportModal.tsx` :
  - [ ] Fetch tous les projets via `useProjects()`
  - [ ] Pour chaque projet, fetch ses vidéos (ou dériver depuis le store projet)
  - [ ] Checkboxes de sélection multiple
  - [ ] Bouton "Ajouter la sélection" → `addClips(selectedVideos)`
- [ ] Créer `frontend/src/components/assemblage/AssemblageTimeline.tsx` :
  - [ ] Axe temporel
  - [ ] Blocs clips proportionnels à leur durée
  - [ ] Drag & drop (utiliser `@dnd-kit/core` déjà installé ou HTML5 drag API)
  - [ ] Bouton ✕ par clip
- [ ] Ajouter la route `/assemblage` dans `App.tsx`
- [ ] Ajouter le lien "Assemblage" dans la navigation
- [ ] Passer tous les tests → GREEN

## Dev Notes

### Architecture de la page

```
AssemblagePage
├── VideoImportModal        (modal sélection vidéos)
├── AssemblageTimeline      (timeline principale vidéos)
│   └── AssemblageClip[]    (blocs draggables)
├── MusicTimeline           (à venir S7.7)
└── ExportPanel             (à venir S7.10)
```

### Store Zustand — assemblageStore.ts

Pattern à suivre depuis `annotationStore.ts`. Le store est la source de vérité pour la liste des clips dans la session courante (non persisté en base de données).

### Drag & Drop

Utiliser `@dnd-kit/sortable` si la dépendance est disponible (`npm list @dnd-kit`). Sinon utiliser l'API HTML5 native (`draggable`, `onDragOver`, `onDrop`). Ne pas installer de nouvelle dépendance sans vérification préalable.

```bash
# Vérifier les dépendances disponibles
cat frontend/package.json | grep -i dnd
```

### Calcul largeur des blocs

```tsx
const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0)
const TIMELINE_PX = 800  // largeur de la timeline en px
const clipWidth = (clip.duration / totalDuration) * TIMELINE_PX
```

### Fichiers à créer / modifier

```
frontend/src/stores/assemblageStore.ts              ← nouveau store Zustand
frontend/src/pages/AssemblagePage.tsx               ← nouvelle page
frontend/src/pages/AssemblagePage.test.tsx          ← 7 tests
frontend/src/components/assemblage/
├── VideoImportModal.tsx                            ← nouveau
├── VideoImportModal.test.tsx                       ← tests
├── AssemblageTimeline.tsx                          ← nouveau
└── AssemblageTimeline.test.tsx                     ← tests
frontend/src/App.tsx                                ← ajouter route /assemblage + lien nav
backend/tests/test_assemblage.py                    ← 2 tests (endpoints existants)
```

### Anti-patterns à éviter

- Ne PAS stocker les clips assemblés en base de données pour cette story — état client uniquement
- Ne PAS créer de nouveaux endpoints backend — réutiliser l'existant
- Ne PAS bloquer sur le drag & drop si complexe — afficher les clips en liste simple en attendant

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

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, première story de la page Assemblage
