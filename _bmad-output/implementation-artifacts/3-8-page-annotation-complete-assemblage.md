# Story 3.8: Page Annotation Complète (Assemblage)

Status: review

## Story

As a utilisateur,
I want une page d'annotation qui assemble le lecteur, la timeline, la liste d'annotations et les formulaires,
so that j'ai un espace de travail d'annotation complet.

## Acceptance Criteria

1. Layout : lecteur vidéo (gauche, 70%) + panneau droit (liste annotations + bulk form)
2. Timeline sous le lecteur, pleine largeur
3. La liste d'annotations est scrollable, triée par frame ASC
4. Chaque annotation dans la liste est cliquable → seek vers la frame
5. Modification inline du label d'une annotation (double-clic)
6. Suppression d'une annotation avec icône corbeille
7. La page charge les annotations depuis l'API au montage

## Tasks / Subtasks

- [x] Écrire les tests en premier (AC: 1–7)
  - [x] `frontend/src/pages/AnnotationPage.test.tsx`
    - [x] `loads and displays annotations` : mock API → annotations affichées
    - [x] `clicking annotation seeks to frame` : clic → seek appelé
    - [x] `delete button calls API` : clic corbeille → mutation DELETE appelée
- [x] Créer `frontend/src/components/annotations/AnnotationItem.tsx` (AC: 4–6)
  - [x] Affiche `frame_number` + `label` + `timestamp_ms`
  - [x] Cliquable → appel `onSeek(frame_number)`
  - [x] Double-clic label → input inline éditable
  - [x] Icône corbeille → appel `onDelete(id)`
- [x] Créer `frontend/src/components/annotations/AnnotationList.tsx` (AC: 3–6)
  - [x] Liste scrollable triée par `frame_number` ASC
  - [x] Utilise `AnnotationItem` pour chaque entrée
- [x] Compléter `frontend/src/api/annotations.ts` — ajouter mutations manquantes (AC: 4–6)
  - [x] `useUpdateAnnotation(videoId)` → PUT
  - [x] `useDeleteAnnotation(videoId)` → DELETE
- [x] Créer `frontend/src/pages/AnnotationPage.tsx` (AC: 1–7)
  - [x] Récupère `videoId` depuis les params de route
  - [x] Charge les métadonnées vidéo → initialise `videoStore`
  - [x] Charge les annotations via `useAnnotations`
  - [x] Assemble : `VideoPlayer` + `VideoTimeline` + `AnnotationList` + `BulkPlacementForm`
  - [x] Passe `seekToFrame` comme callback aux composants enfants
  - [x] Active `useVideoKeyboard` avec `createAnnotation` lié à la mutation POST

## Dev Notes

### Layout CSS

```
┌─────────────────────────────────────────────────────┐
│  VideoPlayer (70%)          │  Panneau droit (30%)   │
│                             │  AnnotationList        │
│                             │  (scrollable)          │
│                             │  ─────────────         │
│                             │  BulkPlacementForm     │
├─────────────────────────────┴────────────────────────┤
│  VideoTimeline (100%)                                │
└──────────────────────────────────────────────────────┘
```

```css
.annotation-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.annotation-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.video-section { flex: 7; }
.panel-section { flex: 3; overflow-y: auto; }
```

### AnnotationItem — édition inline

```typescript
// Gestion double-clic → édition inline
const [editing, setEditing] = useState(false)
const [label, setLabel] = useState(annotation.label)

const handleDoubleClick = () => setEditing(true)
const handleBlur = () => {
  setEditing(false)
  if (label !== annotation.label) onUpdate(annotation.id, label)
}
```

### AnnotationPage — assemblage

```typescript
// frontend/src/pages/AnnotationPage.tsx
const videoRef = useRef<HTMLVideoElement>(null)
const { data: annotations = [] } = useAnnotations(videoId)
const createAnnotation = useCreateAnnotation(videoId)
const { fps, totalFrames, currentFrame } = useVideoStore()

const seek = (frame: number) => {
  if (videoRef.current) seekToFrame(videoRef.current, frame, fps)
}

useVideoKeyboard({
  currentFrame, totalFrames, fps, seek,
  annotations,
  createAnnotation: (frame) => createAnnotation.mutate({ frame_number: frame, label: '' }),
})
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// frontend/src/pages/AnnotationPage.test.tsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnnotationPage } from './AnnotationPage'

// Mock API
vi.mock('../api/annotations', () => ({
  useAnnotations: () => ({
    data: [
      { id: '1', frame_number: 10, label: 'beat 1', timestamp_ms: 400, video_id: 'v1', created_at: '' }
    ]
  }),
  useCreateAnnotation: () => ({ mutate: vi.fn() }),
  useDeleteAnnotation: () => ({ mutate: vi.fn() }),
  useUpdateAnnotation: () => ({ mutate: vi.fn() }),
  useBulkAnnotations: () => ({ mutate: vi.fn() }),
}))

vi.mock('../stores/videoStore', () => ({
  useVideoStore: vi.fn(() => ({
    currentFrame: 0, fps: 25, totalFrames: 1000,
    setVideoMetadata: vi.fn(), setCurrentFrame: vi.fn(),
  })),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

describe('AnnotationPage', () => {
  test('loads and displays annotations', async () => {
    render(<AnnotationPage videoId="v1" />, { wrapper })
    expect(await screen.findByText('beat 1')).toBeInTheDocument()
  })
})
```

### Structure des fichiers

```
frontend/src/
├── pages/
│   ├── AnnotationPage.tsx              ← créer
│   └── AnnotationPage.test.tsx         ← créer
├── components/annotations/
│   ├── AnnotationList.tsx              ← créer
│   └── AnnotationItem.tsx              ← créer
└── api/
    └── annotations.ts                  ← compléter (useUpdateAnnotation, useDeleteAnnotation)
```

### Anti-patterns à éviter

- Ne PAS gérer l'état des annotations dans le composant — toujours via TanStack Query (cache + invalidation)
- Ne PAS oublier de passer `videoRef` aux composants qui ont besoin de seek
- Le layout doit être fonctionnel même si les annotations sont vides (liste vide, pas de crash)
- L'édition inline doit sauvegarder sur `onBlur` ET sur `Enter`

### References

- Composants S3.3–S3.7 : tous les fichiers implementation-artifacts/3-3 à 3-7
- Architecture layout : [Source: planning-artifacts/architecture.md — Pages]
- TanStack Query : [Source: planning-artifacts/architecture.md — API Client]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `VideoTimeline` avait une interface locale `Annotation` avec `timestamp_ms` — remplacée par import du vrai type (`timestamp_seconds`)
- Import `seekToFrame` supprimé de `AnnotationPage` (non utilisé, VideoPlayer expose son propre handle)

### Completion Notes List

- TDD strict : tests RED vérifiés avant implémentation
- `useCreateAnnotation`, `useUpdateAnnotation`, `useDeleteAnnotation` ajoutés à `api/annotations.ts`
- `useVideo(videoId)` ajouté à `api/projects.ts`
- `AnnotationItem` : clic → seek, double-clic → édition inline, bouton supprimer
- `AnnotationList` : liste scrollable triée ASC par frame_number
- `AnnotationPage` : layout 70/30, VideoPlayer + VideoTimeline + AnnotationList + BulkPlacementForm
- 5 tests AnnotationPage — 55/55 total, build TS OK

### File List

- frontend/src/pages/AnnotationPage.tsx (créé)
- frontend/src/pages/AnnotationPage.test.tsx (créé)
- frontend/src/components/annotations/AnnotationItem.tsx (créé)
- frontend/src/components/annotations/AnnotationList.tsx (créé)
- frontend/src/api/annotations.ts (modifié — ajout useCreateAnnotation, useUpdateAnnotation, useDeleteAnnotation)
- frontend/src/api/projects.ts (modifié — ajout useVideo)
- frontend/src/components/video/VideoTimeline.tsx (modifié — import type Annotation réel)
- _bmad-output/implementation-artifacts/sprint-status.yaml (mis à jour)

## Change Log

- 2026-04-10 : Story créée par SM (Bob) — prête pour implémentation TDD
- 2026-04-13 : Implémentation TDD complète par Amelia (claude-sonnet-4-6) — 55/55 tests, build OK
