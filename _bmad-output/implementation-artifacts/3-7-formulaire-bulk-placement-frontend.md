# Story 3.7: Formulaire Placement Automatique Équidistant (Frontend)

Status: approved

## Story

As a utilisateur,
I want saisir un début, une fin, un nombre et un préfixe pour créer N annotations automatiquement,
so that j'annote rapidement des séquences rythmiques régulières.

## Acceptance Criteria

1. Le formulaire permet de saisir : début (frame), fin (frame), nombre, préfixe
2. Preview du nombre d'annotations et de l'intervalle calculé avant validation
3. Validation : début < fin, nombre ≥ 2, frames dans les limites de la vidéo
4. À la validation : appel `POST /api/v1/videos/{id}/annotations/bulk` + refresh liste
5. Les annotations créées apparaissent immédiatement dans la timeline et la liste

## Tasks / Subtasks

- [ ] Écrire les tests en premier (AC: 1–5)
  - [ ] `frontend/src/components/annotations/BulkPlacementForm.test.tsx`
    - [ ] `shows interval preview` : saisir début/fin/nombre → affiche intervalle calculé
    - [ ] `disables submit when start >= end` : bouton désactivé si invalide
    - [ ] `calls API on submit` : mock API → vérifier appel POST bulk
- [ ] Créer `frontend/src/api/annotations.ts` (AC: 4)
  - [ ] Hook TanStack Query `useAnnotations(videoId)` → GET liste
  - [ ] Mutation `useCreateAnnotation(videoId)` → POST
  - [ ] Mutation `useBulkAnnotations(videoId)` → POST bulk
  - [ ] Mutation `useDeleteAnnotation()` → DELETE
  - [ ] Mutation `useUpdateAnnotation()` → PUT
- [ ] Créer `frontend/src/components/annotations/BulkPlacementForm.tsx` (AC: 1–5)
  - [ ] Champs : début, fin, nombre (≥2), préfixe
  - [ ] Calcul et affichage de l'intervalle en preview
  - [ ] Bouton "Placer" désactivé si validation échoue
  - [ ] onSubmit : appeler mutation bulk + invalider cache TanStack Query

## Dev Notes

### Calcul intervalle preview

```typescript
const interval = count >= 2 && end > start
  ? Math.round((end - start) / (count - 1))
  : null
```

Afficher : `Intervalle : {interval} frames` ou un message d'erreur si invalide.

### Client API TanStack Query

```typescript
// frontend/src/api/annotations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface Annotation {
  id: string
  video_id: string
  frame_number: number
  timestamp_ms: number
  label: string
  created_at: string
}

export const useAnnotations = (videoId: string) =>
  useQuery<Annotation[]>({
    queryKey: ['annotations', videoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/videos/${videoId}/annotations`)
      if (!res.ok) throw new Error('Erreur chargement annotations')
      return res.json()
    },
  })

export const useBulkAnnotations = (videoId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      start_frame: number; end_frame: number; count: number; prefix: string
    }) => {
      const res = await fetch(`${API_BASE}/api/v1/videos/${videoId}/annotations/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erreur bulk placement')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annotations', videoId] }),
  })
}
```

### Composant BulkPlacementForm

```typescript
// frontend/src/components/annotations/BulkPlacementForm.tsx
import React, { useState } from 'react'
import { useBulkAnnotations } from '../../api/annotations'

interface Props {
  totalFrames: number
  fps: number
  videoId: string
}

export const BulkPlacementForm: React.FC<Props> = ({ totalFrames, fps, videoId }) => {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [count, setCount] = useState(2)
  const [prefix, setPrefix] = useState('')

  const bulk = useBulkAnnotations(videoId)

  const interval = count >= 2 && end > start
    ? Math.round((end - start) / (count - 1))
    : null

  const isValid = start >= 0 && end <= totalFrames && start < end && count >= 2

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    bulk.mutate({ start_frame: start, end_frame: end, count, prefix })
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>Début<input type="number" value={start} onChange={e => setStart(+e.target.value)} /></label>
      <label>Fin<input type="number" value={end} onChange={e => setEnd(+e.target.value)} /></label>
      <label>Nombre<input type="number" value={count} onChange={e => setCount(+e.target.value)} /></label>
      <label>Préfixe<input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} /></label>
      {interval !== null && <p>Intervalle : {interval} frames</p>}
      <button type="submit" disabled={!isValid}>Placer</button>
    </form>
  )
}
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// frontend/src/components/annotations/BulkPlacementForm.test.tsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BulkPlacementForm } from './BulkPlacementForm'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
)

const defaultProps = { totalFrames: 1000, fps: 25, videoId: '1' }

describe('BulkPlacementForm', () => {
  test('shows interval preview when inputs are valid', async () => {
    render(<BulkPlacementForm {...defaultProps} />, { wrapper })
    fireEvent.change(screen.getByLabelText('Début'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '5' } })
    expect(screen.getByText(/intervalle.*25/i)).toBeInTheDocument()
  })

  test('disables submit when start >= end', () => {
    render(<BulkPlacementForm {...defaultProps} />, { wrapper })
    fireEvent.change(screen.getByLabelText('Début'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '50' } })
    expect(screen.getByRole('button', { name: /placer/i })).toBeDisabled()
  })

  test('disables submit initially (end=0, start=0)', () => {
    render(<BulkPlacementForm {...defaultProps} />, { wrapper })
    expect(screen.getByRole('button', { name: /placer/i })).toBeDisabled()
  })
})
```

### Structure des fichiers

```
frontend/src/
├── api/
│   └── annotations.ts                          ← créer
└── components/annotations/
    ├── BulkPlacementForm.tsx                   ← créer
    └── BulkPlacementForm.test.tsx              ← créer
```

### Anti-patterns à éviter

- Ne PAS appeler l'API dans le composant directement — toujours via TanStack Query mutations
- Ne PAS oublier `invalidateQueries` après succès du bulk pour rafraîchir la liste
- Le bouton "Placer" doit être `disabled` tant que la validation échoue

### References

- Endpoint bulk : [Source: implementation-artifacts/3-2-bulk-placement-decalage-global-backend.md]
- TanStack Query pattern : [Source: planning-artifacts/architecture.md — API Client]
- Stories dépendantes : [Source: implementation-artifacts/3-2-bulk-placement-decalage-global-backend.md], [Source: implementation-artifacts/3-3-lecteur-video-frame-precis-frontend.md]

## Dev Agent Record

### Agent Model Used

_À compléter lors de l'implémentation_

### Debug Log References

_À compléter_

### Completion Notes List

_À compléter_

### File List

_À compléter_

## Change Log

- 2026-04-10 : Story créée par SM (Bob) — prête pour implémentation TDD
