# Story 3.4: Bindings Clavier (Frontend)

Status: review

## Story

As a utilisateur,
I want naviguer et annoter entièrement au clavier,
so that j'annote sans interrompre mon flux de travail.

## Acceptance Criteria

1. `→` : frame suivante (`currentFrame + 1`)
2. `←` : frame précédente (`currentFrame - 1`)
3. `Shift+→` : +5 frames
4. `Shift+←` : -5 frames
5. `Ctrl+→` : saut dynamique inter-annotation vers l'avant (fallback 10 frames)
6. `Ctrl+←` : saut dynamique inter-annotation vers l'arrière (fallback 10 frames)
7. `Espace` : crée une annotation sur la frame courante (appel API + update store)
8. Aucune navigation sous la frame 0 ni au-delà de `total_frames`
9. Les raccourcis sont désactivés quand le focus est dans un champ texte

## Tasks / Subtasks

- [x] Écrire les tests en premier (AC: 1–9)
  - [x] `frontend/src/hooks/useVideoKeyboard.test.ts` — tester tous les keybindings
  - [x] `frontend/src/utils/bpmUtils.test.ts` — tester `getInterAnnotationStep`
- [x] Créer `frontend/src/utils/bpmUtils.ts` (AC: 5–6)
  - [x] Fonction `getInterAnnotationStep(currentFrame, annotations)` → nombre de frames
- [x] Créer `frontend/src/hooks/useVideoKeyboard.ts` (AC: 1–9)
  - [x] Écouter `keydown` sur `window`
  - [x] Ignorer si le focus est sur `INPUT`, `TEXTAREA`, `SELECT`
  - [x] Dispatcher les actions selon la touche

## Dev Notes

### Logique getInterAnnotationStep

```typescript
// frontend/src/utils/bpmUtils.ts
export interface Annotation {
  frame_number: number
}

const FALLBACK = 10

export const getInterAnnotationStep = (
  currentFrame: number,
  annotations: Annotation[]
): number => {
  const sorted = [...annotations].sort((a, b) => a.frame_number - b.frame_number)
  const left = sorted.filter(a => a.frame_number < currentFrame)
  if (left.length < 2) return FALLBACK
  const prev = left[left.length - 1]
  const prevPrev = left[left.length - 2]
  return prev.frame_number - prevPrev.frame_number
}
```

### Hook useVideoKeyboard

```typescript
// frontend/src/hooks/useVideoKeyboard.ts
import { useEffect } from 'react'
import { getInterAnnotationStep, Annotation } from '../utils/bpmUtils'

interface UseVideoKeyboardOptions {
  currentFrame: number
  totalFrames: number
  fps: number
  seek: (frame: number) => void
  annotations: Annotation[]
  createAnnotation?: (frame: number) => void
}

export const useVideoKeyboard = (opts: UseVideoKeyboardOptions) => {
  const { currentFrame, totalFrames, fps, seek, annotations, createAnnotation } = opts

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      const clamp = (f: number) => Math.max(0, Math.min(totalFrames, f))

      if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault(); seek(clamp(currentFrame + 1))
      } else if (e.key === 'ArrowLeft' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault(); seek(clamp(currentFrame - 1))
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault(); seek(clamp(currentFrame + 5))
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault(); seek(clamp(currentFrame - 5))
      } else if (e.key === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault()
        const step = getInterAnnotationStep(currentFrame, annotations)
        seek(clamp(currentFrame + step))
      } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault()
        const step = getInterAnnotationStep(currentFrame, annotations)
        seek(clamp(currentFrame - step))
      } else if (e.key === ' ') {
        e.preventDefault(); createAnnotation?.(currentFrame)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentFrame, totalFrames, fps, seek, annotations, createAnnotation])
}
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// frontend/src/hooks/useVideoKeyboard.test.ts
import { describe, test, expect, vi } from 'vitest'
import { renderHook, fireEvent } from '@testing-library/react'
import { useVideoKeyboard } from './useVideoKeyboard'

const defaultOpts = {
  currentFrame: 10,
  totalFrames: 1000,
  fps: 25,
  annotations: [],
}

describe('useVideoKeyboard', () => {
  test('ArrowRight seeks to next frame', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(seek).toHaveBeenCalledWith(11)
  })

  test('ArrowLeft seeks to previous frame', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(seek).toHaveBeenCalledWith(9)
  })

  test('Shift+ArrowRight seeks +5 frames', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    expect(seek).toHaveBeenCalledWith(15)
  })

  test('Shift+ArrowLeft seeks -5 frames', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowLeft', shiftKey: true })
    expect(seek).toHaveBeenCalledWith(5)
  })

  test('Space creates annotation at current frame', () => {
    const createAnnotation = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek: vi.fn(), createAnnotation }))
    fireEvent.keyDown(window, { key: ' ' })
    expect(createAnnotation).toHaveBeenCalledWith(10)
  })

  test('does not go below frame 0', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 0, seek }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(seek).toHaveBeenCalledWith(0)
  })

  test('ignores keys when focus is in an input', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'ArrowRight', target: input })
    expect(seek).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })
})
```

```typescript
// frontend/src/utils/bpmUtils.test.ts
import { describe, test, expect } from 'vitest'
import { getInterAnnotationStep } from './bpmUtils'

describe('getInterAnnotationStep', () => {
  test('returns interval between last two left annotations', () => {
    const annotations = [
      { frame_number: 10 }, { frame_number: 25 },
      { frame_number: 40 }, { frame_number: 70 }
    ]
    expect(getInterAnnotationStep(50, annotations)).toBe(15)
  })

  test('returns fallback 10 when less than 2 left annotations', () => {
    expect(getInterAnnotationStep(5, [{ frame_number: 3 }])).toBe(10)
  })

  test('returns fallback 10 when no left annotations', () => {
    expect(getInterAnnotationStep(5, [])).toBe(10)
  })
})
```

### Structure des fichiers

```
frontend/src/
├── hooks/
│   ├── useVideoKeyboard.ts       ← créer
│   └── useVideoKeyboard.test.ts  ← créer
└── utils/
    ├── bpmUtils.ts               ← créer
    └── bpmUtils.test.ts          ← créer
```

### Anti-patterns à éviter

- Ne PAS utiliser `e.preventDefault()` globalement — seulement sur les touches interceptées
- Toujours `clamp` entre 0 et `totalFrames` pour éviter les frames invalides
- Le hook doit se nettoyer proprement dans le return du useEffect

### References

- Architecture clavier : [Source: planning-artifacts/architecture.md — Bindings Clavier]
- getInterAnnotationStep : [Source: planning-artifacts/architecture.md — Logique Ctrl+flèche]
- Stories dépendantes : [Source: implementation-artifacts/3-3-lecteur-video-frame-precis-frontend.md], [Source: implementation-artifacts/3-1-crud-annotations-backend.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage — implémentation directe depuis les specs Dev Notes.

### Completion Notes List

- TDD strict respecté : tests écrits et vérifiés RED avant implémentation
- `bpmUtils.ts` : `getInterAnnotationStep` avec fallback=10, tri et filtrage gauche
- `useVideoKeyboard.ts` : hook React avec listener `keydown` sur `window`, clamp 0↔totalFrames, ignore INPUT/TEXTAREA/SELECT
- 13 tests `useVideoKeyboard` + 3 tests `bpmUtils` = 16 nouveaux tests
- Suite complète : 32/32 tests passent, aucune régression

### File List

- frontend/src/utils/bpmUtils.ts (créé)
- frontend/src/utils/bpmUtils.test.ts (créé)
- frontend/src/hooks/useVideoKeyboard.ts (créé)
- frontend/src/hooks/useVideoKeyboard.test.ts (créé)
- _bmad-output/implementation-artifacts/sprint-status.yaml (mis à jour)

## Change Log

- 2026-04-10 : Story créée par SM (Bob) — prête pour implémentation TDD
- 2026-04-13 : Implémentation TDD complète par Amelia (claude-sonnet-4-6) — 4 fichiers créés, 32/32 tests passent
