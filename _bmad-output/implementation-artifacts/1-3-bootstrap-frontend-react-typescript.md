# Story 1.3: Bootstrap Frontend React/TypeScript

Status: ready-for-dev

## Story

As a développeur,
I want un projet Vite + React + TypeScript configuré avec Zustand et TanStack Query,
so that j'ai une base de développement frontend opérationnelle, typée et testable.

## Acceptance Criteria

1. `npm run dev` démarre le serveur Vite sur le port 3000 sans erreur
2. `npm run test` exécute Vitest et passe (au moins 1 test smoke)
3. `npm run build` produit un build production sans erreur TypeScript ni erreur de lint
4. Zustand et TanStack Query sont initialisés avec leurs providers en place dans `main.tsx`
5. Les types TypeScript partagés sont définis : `annotation.ts`, `project.ts`, `statistics.ts`
6. Les 3 stores Zustand sont créés : `videoStore`, `annotationStore`, `audioStore`
7. Le composant `App.tsx` affiche le nom de l'application et passe un test de rendu

## Tasks / Subtasks

- [ ] Initialiser le projet Vite (AC: 1, 3)
  - [ ] `npm create vite@latest frontend -- --template react-ts`
  - [ ] Configurer `vite.config.ts` : port 3000, proxy `/api` → backend, alias `@/` → `src/`
- [ ] Installer les dépendances (AC: 4)
  - [ ] `npm install zustand@4 @tanstack/react-query@5`
  - [ ] `npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw`
- [ ] Configurer Vitest (AC: 2)
  - [ ] Ajouter config Vitest dans `vite.config.ts` : environment jsdom, setupFiles
  - [ ] Créer `src/test/setup.ts` avec `@testing-library/jest-dom`
- [ ] Créer les types TypeScript (AC: 5)
  - [ ] `src/types/project.ts` : interfaces Project, Video
  - [ ] `src/types/annotation.ts` : interface Annotation
  - [ ] `src/types/statistics.ts` : interfaces BpmMetrics, PlaybackSpeedResult
- [ ] Créer les stores Zustand (AC: 6)
  - [ ] `src/stores/videoStore.ts` : currentFrame, fps, totalFrames, duration, playbackRate
  - [ ] `src/stores/annotationStore.ts` : annotations[], add, remove, update, hasAnnotationAt
  - [ ] `src/stores/audioStore.ts` : enabled, toggle
- [ ] Configurer `main.tsx` avec les providers (AC: 4)
  - [ ] Wrapper `<QueryClientProvider>` de TanStack Query
- [ ] Créer `App.tsx` avec navigation basique (AC: 7)
  - [ ] Afficher "AnnotaRythm" dans le titre
  - [ ] Placeholder pour les 3 pages (ProjectsPage, AnnotationPage, StatisticsPage)
- [ ] Écrire et faire passer le test smoke (AC: 2, 7)
  - [ ] `src/App.test.tsx` : rendu sans crash + texte "AnnotaRythm" présent

## Dev Notes

### Stack frontend obligatoire (ne pas dévier)

| Lib | Version | Usage |
|-----|---------|-------|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Typage statique |
| Vite | 5.x | Bundler + dev server |
| Zustand | 4.x | UI state (frame courante, annotations, audio) |
| TanStack Query | 5.x | Server state (cache API REST) |
| Vitest | 1.x | Tests unitaires |
| React Testing Library | 14.x | Tests composants |

### vite.config.ts obligatoire

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

### Types TypeScript exacts

```typescript
// src/types/project.ts
export interface Project {
  id: string
  name: string
  description: string
  created_at: string
  videos?: Video[]
}

export interface Video {
  id: string
  project_id: string
  filename: string
  original_name: string
  filepath: string
  duration_seconds: number
  fps: number
  total_frames: number
  width: number
  height: number
  codec: string
  uploaded_at: string
}

// src/types/annotation.ts
export interface Annotation {
  id: string
  video_id: string
  frame_number: number
  timestamp_ms: number
  label: string
  created_at: string
  updated_at: string
}

// src/types/statistics.ts
export interface BpmMetrics {
  bpm_global: number
  bpm_mean: number
  bpm_median: number
  bpm_variation: number
  interval_std_seconds: number
  annotation_density_per_minute: number
  interval_distribution: number[]
  rhythmic_segments: unknown[]
  activity_peaks: unknown[]
  error?: string
}

export interface PlaybackSpeedResult {
  playback_speed: number
  current_bpm: number
}
```

### Stores Zustand — interfaces minimales

```typescript
// src/stores/videoStore.ts
import { create } from 'zustand'

interface VideoState {
  currentFrame: number
  fps: number
  totalFrames: number
  duration: number
  playbackRate: number
  setCurrentFrame: (frame: number) => void
  setVideoMetadata: (fps: number, totalFrames: number, duration: number) => void
  setPlaybackRate: (rate: number) => void
}

export const useVideoStore = create<VideoState>((set) => ({
  currentFrame: 0,
  fps: 25,
  totalFrames: 0,
  duration: 0,
  playbackRate: 1,
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setVideoMetadata: (fps, totalFrames, duration) => set({ fps, totalFrames, duration }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
}))
```

```typescript
// src/stores/annotationStore.ts
import { create } from 'zustand'
import type { Annotation } from '@/types/annotation'

interface AnnotationState {
  annotations: Annotation[]
  setAnnotations: (annotations: Annotation[]) => void
  addAnnotation: (annotation: Annotation) => void
  removeAnnotation: (id: string) => void
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void
  hasAnnotationAt: (frame: number) => boolean
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) =>
    set((state) => ({ annotations: [...state.annotations, annotation] })),
  removeAnnotation: (id) =>
    set((state) => ({ annotations: state.annotations.filter((a) => a.id !== id) })),
  updateAnnotation: (id, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
  hasAnnotationAt: (frame) => get().annotations.some((a) => a.frame_number === frame),
}))
```

```typescript
// src/stores/audioStore.ts
import { create } from 'zustand'

interface AudioState {
  enabled: boolean
  toggle: () => void
}

export const useAudioStore = create<AudioState>((set) => ({
  enabled: false,
  toggle: () => set((state) => ({ enabled: !state.enabled })),
}))
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// src/App.test.tsx
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('App', () => {
  test('renders without crash', () => {
    render(<App />, { wrapper })
    expect(screen.getByText(/AnnotaRythm/i)).toBeInTheDocument()
  })
})
```

### src/test/setup.ts

```typescript
import '@testing-library/jest-dom'
```

### main.tsx obligatoire

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
```

### Project Structure Notes

```
frontend/
├── src/
│   ├── main.tsx              ← créer
│   ├── App.tsx               ← créer
│   ├── App.test.tsx          ← créer
│   ├── test/
│   │   └── setup.ts          ← créer
│   ├── types/
│   │   ├── annotation.ts     ← créer
│   │   ├── project.ts        ← créer
│   │   └── statistics.ts     ← créer
│   ├── stores/
│   │   ├── videoStore.ts     ← créer
│   │   ├── annotationStore.ts ← créer
│   │   └── audioStore.ts     ← créer
│   ├── pages/                ← créer dossier vide (rempli dans E2/E3)
│   ├── components/           ← créer dossier vide
│   ├── hooks/                ← créer dossier vide
│   ├── api/                  ← créer dossier vide
│   └── utils/                ← créer dossier vide
├── public/
├── index.html
├── vite.config.ts            ← modifier après création
├── tsconfig.json
└── package.json
```

### Anti-patterns à éviter

- Ne PAS utiliser `Redux` ou `Context API` pour l'état global — Zustand uniquement
- Ne PAS utiliser `react-router-dom` encore (S2.4 l'ajoutera si nécessaire)
- Ne PAS ajouter CSS framework (Tailwind, MUI) maintenant — thème dark en S2.4
- `TanStack Query v5` a une API différente de v4 : `useQuery({ queryKey: [...], queryFn: ... })` sans objet options séparé
- Vitest `globals: true` permet d'utiliser `describe/test/expect` sans imports dans les fichiers de test

### References

- Stack frontend : [Source: planning-artifacts/architecture.md#21-frontend]
- Structure dossiers frontend : [Source: planning-artifacts/architecture.md#31-structure-des-dossiers]
- Stores Zustand : [Source: planning-artifacts/architecture.md#31-structure-des-dossiers]

## Dev Agent Record

### Agent Model Used

_à remplir par le dev agent_

### Debug Log References

### Completion Notes List

### File List
