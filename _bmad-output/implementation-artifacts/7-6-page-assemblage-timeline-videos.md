# Story 7.6: Page Assemblage — Structure + Import + Timeline Vidéos

Status: review

## Story

En tant qu'utilisateur,
Je veux accéder à une nouvelle page "Assemblage" où je peux importer plusieurs vidéos de mes projets et les disposer sur une timeline,
Afin de préparer l'assemblage de plusieurs vidéos adaptées bout à bout.

## Acceptance Criteria

### AC1 — Route et navigation
- La route `/assemblage/{projectId}` est accessible depuis la page d'un projet
- Un bouton "Assemblage" est visible dans la page projet, à côté de l'action d'export
- La page s'intitule "Assemblage" dans le titre `<h1>`

### AC2 — Import vidéos depuis projets
- Un bouton "+ Ajouter des vidéos" ouvre un modal de sélection
- Le modal liste les vidéos du projet courant
- Les vidéos adaptées sauvegardées sont aussi proposées comme sources distinctes
- Chaque source vidéo est sélectionnable (checkbox)
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
  const mockProject = buildProject({ videos: [buildVideo({ original_name: 'clip1.mp4' })] })
  render(<AssemblagePage project={mockProject} />)
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

test('assemblage button appears in project detail actions', async () => {
  render(<ProjectDetailPage />)
  expect(await screen.findByRole('button', { name: /assemblage/i })).toBeInTheDocument()
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

- [x] Écrire les 2 tests backend → GREEN (les endpoints existent déjà, les tests vérifient leur disponibilité)
- [x] Aucun nouvel endpoint nécessaire pour cette story — utiliser `GET /api/v1/projects` et `GET /api/v1/projects/{id}/videos`

### Frontend

- [x] Écrire les 7 tests → RED
- [x] Créer store Zustand `frontend/src/stores/assemblageStore.ts` :
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
- [x] Créer `frontend/src/pages/AssemblagePage.tsx` :
  - [x] Section header : titre + bouton "+ Ajouter des vidéos" + durée totale
  - [x] Section timeline : `<AssemblageTimeline>` (créer composant séparé)
  - [x] État vide si `clips.length === 0`
- [x] Créer `frontend/src/components/assemblage/VideoImportModal.tsx` :
  - [x] Réutiliser les vidéos du projet courant
  - [x] Exposer les sources adaptées sauvegardées comme variantes distinctes
  - [x] Checkboxes de sélection multiple
  - [x] Bouton "Ajouter la sélection" → `addClips(selectedVideos)`
- [x] Créer `frontend/src/components/assemblage/AssemblageTimeline.tsx` :
  - [x] Axe temporel
  - [x] Blocs clips proportionnels à leur durée
  - [x] Drag & drop via API HTML5 native
  - [x] Bouton ✕ par clip
- [x] Ajouter la route `/assemblage/:projectId` dans `App.tsx`
- [x] Ajouter le bouton "Assemblage" dans `ProjectDetailPage`
- [x] Passer tous les tests → GREEN

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
GPT-5 Codex

### Debug Log References
`npm run test -- src/pages/AssemblagePage.test.tsx`
`npm run test -- src/App.test.tsx`
`pytest backend/tests/test_assemblage.py -q`
`npm run test`
`npm run build`

### Completion Notes List
- Route `/assemblage/:projectId` ajoutée et accessible depuis la page projet.
- Page Assemblage créée avec état vide, durée totale, bouton d'import et timeline horizontale, dans le contexte d'un seul projet.
- Modal d'import recentré sur le projet courant avec cartes plus lisibles pour les vidéos source et les versions adaptées sauvegardées.
- Timeline avec largeur proportionnelle à la durée, axe temporel, suppression par clip et réordonnancement drag & drop natif.
- Store Zustand dédié ajouté pour garder la liste des clips côté client sans persistance backend.
- Endpoints backend existants vérifiés par tests dédiés, sans création de nouvelle API.
- Validation complète OK: `44` fichiers de tests frontend verts (`429` tests), build frontend OK, `2` tests backend 7.6 verts.

### File List
- `frontend/src/stores/assemblageStore.ts`
- `frontend/src/components/assemblage/VideoImportModal.tsx`
- `frontend/src/components/assemblage/AssemblageTimeline.tsx`
- `frontend/src/pages/AssemblagePage.tsx`
- `frontend/src/pages/AssemblagePage.test.tsx`
- `frontend/src/api/projects.ts`
- `frontend/src/App.tsx`
- `frontend/src/pages/ProjectDetailPage.tsx`
- `frontend/src/pages/ProjectDetailPage.test.tsx`
- `backend/tests/test_assemblage.py`

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, première story de la page Assemblage
- 2026-04-29 : Implémentation dev terminée, route Assemblage et timeline vidéos validées
- 2026-04-29 : Recentrage UX validé sur un assemblage par projet avec sources adaptées visibles dans le modal
