# Story 2.5: Page Détail Projet + Upload Vidéo (Frontend)

Status: ready-for-dev

## Story

As a utilisateur,
I want voir les vidéos d'un projet, en uploader de nouvelles et en supprimer,
so that je puisse gérer le contenu d'un projet.

## Acceptance Criteria

1. La page affiche le nom du projet + breadcrumb (`Projets > Nom`)
2. Zone drag-and-drop pour uploader une vidéo (tous formats vidéo)
3. Barre de progression pendant l'upload
4. Chaque vidéo affiche : nom original, durée (formatée), FPS, nombre d'annotations
5. Bouton "Annoter →" navigue vers la page d'annotation (`/annotation/{video_id}`)
6. Bouton "Stats" navigue vers la page statistiques (`/statistics/{video_id}`)
7. Suppression d'une vidéo avec confirmation

## Tasks / Subtasks

- [ ] Écrire les tests en premier — `frontend/src/pages/ProjectDetailPage.test.tsx` (AC: 1–4, 7)
  - [ ] `test_renders_project_videos` : mock GET /projects/{id} avec 2 vidéos → 2 éléments
  - [ ] `test_shows_upload_zone` : "Glissez-déposez" visible
  - [ ] `test_shows_breadcrumb` : breadcrumb "Projets > Nom" visible
- [ ] Ajouter les hooks vidéo dans `frontend/src/api/projects.ts` (AC: 2, 3, 7)
  - [ ] `useProject(id)` : GET /api/v1/projects/{id}
  - [ ] `useUploadVideo(projectId)` : mutation POST /api/v1/projects/{id}/videos (multipart + progression)
  - [ ] `useDeleteVideo()` : mutation DELETE /api/v1/videos/{id}
- [ ] Créer `frontend/src/components/projects/VideoUpload.tsx` (AC: 2, 3)
  - [ ] Zone drag-and-drop native (HTML5 drag events)
  - [ ] Barre de progression via `XMLHttpRequest` (pour le suivi upload)
- [ ] Créer `frontend/src/pages/ProjectDetailPage.tsx` (AC: 1–7)
- [ ] Configurer le routing (React Router ou équivalent) — `/projects/:id`

## Dev Notes

### Contexte S2.4 (déjà en place)

- `frontend/src/api/projects.ts` existe — **ajouter** les nouveaux hooks, ne pas réécrire le fichier
- `QueryClient` configuré dans `App.tsx`
- Palette UX et thème sombre en place
- Types `Project`, `Video` dans `frontend/src/types/project.ts`

### Type `Video` à utiliser

```typescript
// frontend/src/types/project.ts — déjà défini
export interface Video {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  duration_seconds: number;
  fps: number;
  total_frames: number;
  width: number;
  height: number;
  codec: string;
  uploaded_at: string;
  annotations: Annotation[];
}
```

### Hooks à ajouter dans `api/projects.ts`

```typescript
// Ajouter à frontend/src/api/projects.ts

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects/${id}`)
      if (!res.ok) throw new Error('Projet introuvable')
      return res.json() as Promise<Project>
    },
    enabled: !!id,
  })
}

export function useDeleteVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (videoId: string) => {
      const res = await fetch(`${API_BASE}/videos/${videoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression vidéo')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project'] }),
  })
}
```

### Upload avec progression — XMLHttpRequest obligatoire

`fetch` ne supporte pas nativement la progression de l'upload. Utiliser `XMLHttpRequest` :

```typescript
// frontend/src/components/projects/VideoUpload.tsx

export function useUploadVideo(projectId: string) {
  const qc = useQueryClient()
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const upload = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          setProgress(0)
          setUploading(false)
          qc.invalidateQueries({ queryKey: ['project', projectId] })
          resolve()
        } else {
          reject(new Error(`Upload échoué: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Erreur réseau')))

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      xhr.open('POST', `${apiBase}/projects/${projectId}/videos`)
      setUploading(true)
      xhr.send(formData)
    })
  }

  return { upload, progress, uploading }
}
```

### Zone Drag-and-Drop (HTML5 natif)

```tsx
// frontend/src/components/projects/VideoUpload.tsx
const [dragOver, setDragOver] = useState(false)

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setDragOver(false)
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('video/')) {
    upload(file)
  }
}

return (
  <div
    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
    onDragLeave={() => setDragOver(false)}
    onDrop={handleDrop}
    style={{
      border: `2px dashed ${dragOver ? '#e94560' : '#8892b0'}`,
      borderRadius: '8px',
      padding: '2rem',
      textAlign: 'center',
      cursor: 'pointer',
      backgroundColor: dragOver ? 'rgba(233,69,96,0.1)' : 'transparent',
    }}
    onClick={() => fileInputRef.current?.click()}
  >
    <p>Glissez-déposez une vidéo ici ou cliquez pour sélectionner</p>
    <input
      ref={fileInputRef}
      type="file"
      accept="video/*"
      style={{ display: 'none' }}
      onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
    />
    {uploading && (
      <div>
        <progress value={progress} max={100} />
        <span>{progress}%</span>
      </div>
    )}
  </div>
)
```

### Formatage de la durée

```typescript
// Utilitaire : secondes → "mm:ss" ou "hh:mm:ss"
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
```

Ajouter dans `frontend/src/utils/frameUtils.ts` (fichier prévu en architecture).

### Breadcrumb

```tsx
// Breadcrumb dans ProjectDetailPage.tsx
<nav>
  <a href="/projects">Projets</a>
  {' > '}
  <span>{project.name}</span>
</nav>
```

Le breadcrumb est défini dans le UX design :
`Projets > Mon Projet > ma-video.mp4`
Pour la page détail projet, afficher jusqu'au nom du projet.

### Routing — React Router

Si React Router est déjà installé (via S1.3), utiliser `useParams` :
```typescript
import { useParams, useNavigate } from 'react-router-dom'

const { id } = useParams<{ id: string }>()
const navigate = useNavigate()

// Navigation vers annotation
const goAnnotate = (videoId: string) => navigate(`/annotation/${videoId}`)
const goStats = (videoId: string) => navigate(`/statistics/${videoId}`)
```

Si React Router n'est pas encore configuré, l'installer :
```bash
npm install react-router-dom@6
```
Et configurer les routes dans `App.tsx` :
```typescript
<Routes>
  <Route path="/projects" element={<ProjectsPage />} />
  <Route path="/projects/:id" element={<ProjectDetailPage />} />
  <Route path="/annotation/:videoId" element={<AnnotationPage />} />
  <Route path="/statistics/:videoId" element={<StatisticsPage />} />
</Routes>
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// frontend/src/pages/ProjectDetailPage.test.tsx
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'  // MSW server configuré en S2.4
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectDetailPage from './ProjectDetailPage'

const renderWithProviders = (id: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/projects/${id}`]}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

test('renders project videos', async () => {
  server.use(http.get('*/api/v1/projects/test-id', () =>
    HttpResponse.json({
      id: 'test-id', name: 'Mon Projet', description: '', created_at: new Date().toISOString(),
      videos: [
        { id: 'v1', original_name: 'video1.mp4', duration_seconds: 60, fps: 25, total_frames: 1500, annotations: [] },
        { id: 'v2', original_name: 'video2.mp4', duration_seconds: 120, fps: 30, total_frames: 3600, annotations: [] },
      ]
    })
  ))
  renderWithProviders('test-id')
  const items = await screen.findAllByRole('listitem')
  expect(items.length).toBeGreaterThanOrEqual(2)
})

test('shows upload zone', async () => {
  server.use(http.get('*/api/v1/projects/test-id', () =>
    HttpResponse.json({ id: 'test-id', name: 'Projet', description: '', created_at: '', videos: [] })
  ))
  renderWithProviders('test-id')
  expect(await screen.findByText(/Glissez-déposez/i)).toBeInTheDocument()
})

test('shows breadcrumb', async () => {
  server.use(http.get('*/api/v1/projects/test-id', () =>
    HttpResponse.json({ id: 'test-id', name: 'Mon Projet', description: '', created_at: '', videos: [] })
  ))
  renderWithProviders('test-id')
  expect(await screen.findByText('Projets')).toBeInTheDocument()
  expect(await screen.findByText('Mon Projet')).toBeInTheDocument()
})
```

### Structure des fichiers

```
frontend/src/
├── api/
│   └── projects.ts                        ← modifier : ajouter useProject, useDeleteVideo
├── components/
│   └── projects/
│       └── VideoUpload.tsx                ← créer
├── pages/
│   ├── ProjectDetailPage.tsx              ← créer
│   └── ProjectDetailPage.test.tsx         ← créer
└── utils/
    └── frameUtils.ts                      ← modifier : ajouter formatDuration
```

### Anti-patterns à éviter

- Ne PAS utiliser `fetch` pour l'upload avec suivi de progression — utiliser `XMLHttpRequest` (seule API supportant `upload.progress`)
- Ne PAS ouvrir une modale pour l'upload — la zone drag-and-drop est inline dans la page
- Ne PAS hardcoder l'URL de l'API — utiliser `import.meta.env.VITE_API_URL`
- Ne PAS créer un nouveau QueryClient dans `ProjectDetailPage` — utiliser celui de `App.tsx`
- Ne PAS réimporter `useUploadVideo` depuis un nouveau fichier — le définir dans `VideoUpload.tsx` ou `api/projects.ts`
- Le streaming vidéo (`/stream`) est utilisé uniquement dans la page Annotation (S3.x), pas ici

### References

- UX Page Détail Projet : [Source: planning-artifacts/ux-design.md#page-1-gestion-de-projets]
- Architecture Frontend : [Source: planning-artifacts/architecture.md#31-structure-des-dossiers]
- Endpoint upload : [Source: planning-artifacts/architecture.md#43-api-rest-endpoints]
- ADR-003 FFmpeg backend only : [Source: planning-artifacts/architecture.md#8-decisions-architecturales]
- Types TypeScript : [Source: planning-artifacts/architecture.md#31-structure-des-dossiers]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
