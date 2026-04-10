# Story 2.4: Page Projets (Frontend)

Status: ready-for-dev

## Story

As a utilisateur,
I want voir la liste de mes projets, en créer un nouveau et en supprimer,
so that je puisse gérer mes projets directement depuis l'interface.

## Acceptance Criteria

1. La page affiche les projets en grille (2 colonnes desktop, 1 mobile)
2. Chaque carte affiche : nom, nombre de vidéos, nombre d'annotations total, date de modification
3. Bouton "+ Nouveau projet" ouvre un formulaire inline (pas de modale)
4. La création valide que le nom n'est pas vide — bouton désactivé si vide
5. Le bouton supprimer demande confirmation avant suppression
6. État de chargement affiché pendant les appels API (TanStack Query)
7. Thème sombre appliqué (palette UX définie)

## Tasks / Subtasks

- [ ] Configurer MSW (Mock Service Worker) pour les tests (si pas encore fait)
- [ ] Écrire les tests en premier — `frontend/src/pages/ProjectsPage.test.tsx` (AC: 1–6)
  - [ ] `test_displays_project_list` : mock GET /projects → rendu du nom de projet
  - [ ] `test_shows_inline_form_on_new_project_click` : clic "+ Nouveau projet" → champ visible
  - [ ] `test_disables_submit_if_name_empty` : bouton "Créer" désactivé si champ vide
  - [ ] `test_delete_asks_confirmation` : clic supprimer → message de confirmation
- [ ] Créer `frontend/src/api/projects.ts` — hooks TanStack Query (AC: 6)
  - [ ] `useProjects()` : GET /api/v1/projects
  - [ ] `useCreateProject()` : mutation POST /api/v1/projects
  - [ ] `useDeleteProject()` : mutation DELETE /api/v1/projects/{id}
- [ ] Créer `frontend/src/components/projects/ProjectCard.tsx` (AC: 2, 5)
- [ ] Créer `frontend/src/components/projects/ProjectList.tsx` (AC: 1)
- [ ] Créer `frontend/src/pages/ProjectsPage.tsx` (AC: 1–7)
- [ ] Appliquer le thème sombre (variables CSS ou Tailwind) (AC: 7)

## Dev Notes

### Stack frontend existante (depuis S1.3)

- **React 18** + TypeScript 5
- **Zustand 4** (UI state)
- **TanStack Query 5** (server state — QueryClient en place dans App.tsx)
- **Vitest + React Testing Library** (tests)
- Types partagés dans `frontend/src/types/project.ts`

**Ne pas réinstaller** ces dépendances — elles sont dans `package.json` depuis S1.3.

### Type `Project` à utiliser

```typescript
// frontend/src/types/project.ts — DÉJÀ DÉFINI en S1.3
export interface Video {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  duration_seconds: number;
  fps: number;
  total_frames: int;
  uploaded_at: string;
  annotations: Annotation[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  videos: Video[];
}
```

Si le type n'inclut pas `videos`, le compléter. Ne pas créer un nouveau fichier de types.

### Hooks TanStack Query

```typescript
// frontend/src/api/projects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/projects`)
      if (!res.ok) throw new Error('Erreur chargement projets')
      return res.json() as Promise<Project[]>
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erreur création projet')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression projet')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
```

### Palette UX — Thème sombre (obligatoire)

```css
/* Couleurs UX DESIGN validé — utiliser exactement ces valeurs */
--color-bg:        #1a1a2e;  /* fond principal */
--color-panel:     #16213e;  /* fond panneau */
--color-surface:   #0f3460;  /* cartes, panneaux */
--color-accent:    #e94560;  /* rouge — actions primaires */
--color-accent2:   #f5a623;  /* orange — métriques */
--color-text:      #eaeaea;  /* texte principal */
--color-text-muted:#8892b0;  /* texte secondaire */
--color-success:   #64ffda;  /* confirmations */
--color-danger:    #ff6b6b;  /* suppression */

/* Police */
font-family: 'Inter', sans-serif;
/* Monospace pour les valeurs numériques */
font-family: 'JetBrains Mono', monospace;
```

Appliquer via CSS modules, variables globales dans `index.css`, ou Tailwind custom config.

### Composant ProjectCard

```tsx
// frontend/src/components/projects/ProjectCard.tsx
interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}

// Données à afficher sur la carte :
// - project.name
// - project.videos.length + " vidéos"
// - total annotations = project.videos.reduce((acc, v) => acc + v.annotations.length, 0)
// - date : new Date(project.created_at).toLocaleDateString('fr-FR')

// Suppression avec confirmation native (window.confirm) ou inline
const handleDelete = () => {
  if (window.confirm(`Supprimer le projet "${project.name}" ?`)) {
    onDelete(project.id)
  }
}
```

### Layout grille responsive

```tsx
// CSS pour la grille 2 colonnes desktop / 1 colonne mobile
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '1rem',
}}>
  {projects.map(p => <ProjectCard key={p.id} project={p} ... />)}
</div>
```

### Formulaire inline (sans modale)

```tsx
// État local dans ProjectsPage.tsx
const [showForm, setShowForm] = useState(false)
const [newName, setNewName] = useState('')

// Le formulaire apparaît dans le DOM (pas de modale)
{showForm && (
  <div>
    <input
      aria-label="Nom du projet"
      value={newName}
      onChange={e => setNewName(e.target.value)}
    />
    <button
      disabled={!newName.trim()}
      onClick={handleCreate}
    >
      Créer le projet →
    </button>
    <button onClick={() => setShowForm(false)}>✕</button>
  </div>
)}
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// frontend/src/pages/ProjectsPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectsPage from './ProjectsPage'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderWithQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

test('displays project list', async () => {
  server.use(http.get('*/api/v1/projects', () =>
    HttpResponse.json([{ id: '1', name: 'Mon Projet', description: '', created_at: new Date().toISOString(), videos: [] }])
  ))
  renderWithQuery(<ProjectsPage />)
  expect(await screen.findByText('Mon Projet')).toBeInTheDocument()
})

test('shows inline form on new project click', async () => {
  server.use(http.get('*/api/v1/projects', () => HttpResponse.json([])))
  renderWithQuery(<ProjectsPage />)
  fireEvent.click(screen.getByText('+ Nouveau projet'))
  expect(screen.getByLabelText('Nom du projet')).toBeInTheDocument()
})

test('disables submit if name is empty', async () => {
  server.use(http.get('*/api/v1/projects', () => HttpResponse.json([])))
  renderWithQuery(<ProjectsPage />)
  fireEvent.click(screen.getByText('+ Nouveau projet'))
  expect(screen.getByText('Créer le projet →')).toBeDisabled()
})
```

### Installation MSW (si absente)

```bash
npm install --save-dev msw@latest
npx msw init public/ --save
```

Configurer dans `vitest.config.ts` ou `setupTests.ts` :
```typescript
// frontend/src/setupTests.ts
import '@testing-library/jest-dom'
```

### Structure des fichiers

```
frontend/src/
├── api/
│   └── projects.ts                  ← créer
├── components/
│   └── projects/
│       ├── ProjectCard.tsx           ← créer
│       └── ProjectList.tsx           ← créer
├── pages/
│   ├── ProjectsPage.tsx              ← créer
│   └── ProjectsPage.test.tsx         ← créer
└── types/
    └── project.ts                    ← modifier si nécessaire
```

### Anti-patterns à éviter

- Ne PAS utiliser `fetch` directement dans les composants — passer par les hooks TanStack Query de `api/projects.ts`
- Ne PAS utiliser de bibliothèque modale externe — le formulaire est inline (AC: 3)
- Ne PAS hardcoder l'URL de l'API — utiliser `import.meta.env.VITE_API_URL`
- Ne PAS réimporter Zustand pour le state serveur — Zustand est pour UI state uniquement, TanStack Query pour le server state (ADR-005)
- La grille doit être responsive via CSS grid `auto-fill / minmax` — pas de media query hardcodée

### References

- UX Page Projets : [Source: planning-artifacts/ux-design.md#page-1-gestion-de-projets]
- Palette UX : [Source: planning-artifacts/ux-design.md#palette-typographie]
- Stack Frontend : [Source: planning-artifacts/architecture.md#21-frontend]
- ADR-005 Zustand + TanStack Query : [Source: planning-artifacts/architecture.md#8-decisions-architecturales]
- Structure dossiers frontend : [Source: planning-artifacts/architecture.md#31-structure-des-dossiers]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
