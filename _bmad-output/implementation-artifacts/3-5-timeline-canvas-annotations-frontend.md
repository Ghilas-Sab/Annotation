# Story 3.5: Timeline Canvas avec Annotations (Frontend)

Status: review

## Story

As a utilisateur,
I want une timeline visuelle qui affiche la position courante et les marqueurs d'annotations,
so that je visualise la distribution des annotations dans le temps.

## Acceptance Criteria

1. La timeline est rendue sur un `<canvas>` proportionnel à la durée totale
2. Un curseur (ligne verticale accent primaire) indique la frame courante
3. Chaque annotation est représentée par un marqueur vertical (couleur accent)
4. Clic sur la timeline repositionne la vidéo à la frame correspondante
5. La timeline se redessine à chaque changement de frame courante
6. Hover sur un marqueur affiche le label + timestamp en tooltip

## Tasks / Subtasks

- [x] Écrire les tests en premier (AC: 1–5)
  - [x] `frontend/src/components/video/VideoTimeline.test.tsx` — tester rendu canvas, clic, redraw
- [x] Créer `frontend/src/components/video/VideoTimeline.tsx` (AC: 1–6)
  - [x] Rendu canvas avec `useRef` et `useEffect`
  - [x] Dessin curseur frame courante
  - [x] Dessin marqueurs annotations
  - [x] Gestionnaire clic → calcul frame → appel `onSeek`
  - [x] Gestionnaire mousemove → tooltip label + timestamp

## Dev Notes

### Pattern Canvas React

```typescript
// frontend/src/components/video/VideoTimeline.tsx
import React, { useRef, useEffect, useCallback } from 'react'

interface Annotation {
  frame_number: number
  label: string
  timestamp_ms: number
}

interface VideoTimelineProps {
  currentFrame: number
  totalFrames: number
  fps: number
  annotations: Annotation[]
  onSeek: (frame: number) => void
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  currentFrame, totalFrames, fps, annotations, onSeek
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || totalFrames === 0) return
    const ctx = canvas.getContext('2d')!
    const { width, height } = canvas

    // Fond
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    const frameToX = (frame: number) => (frame / totalFrames) * width

    // Marqueurs annotations
    ctx.strokeStyle = '#e94560'
    ctx.lineWidth = 2
    for (const ann of annotations) {
      const x = frameToX(ann.frame_number)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Curseur frame courante
    ctx.strokeStyle = '#0f3460'
    ctx.lineWidth = 2
    const cursorX = frameToX(currentFrame)
    ctx.beginPath()
    ctx.moveTo(cursorX, 0)
    ctx.lineTo(cursorX, height)
    ctx.stroke()
  }, [currentFrame, totalFrames, annotations])

  useEffect(() => { draw() }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const frame = Math.round((x / canvas.width) * totalFrames)
    onSeek(Math.max(0, Math.min(totalFrames, frame)))
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={60}
      onClick={handleClick}
      style={{ width: '100%', cursor: 'pointer' }}
    />
  )
}
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// frontend/src/components/video/VideoTimeline.test.tsx
import { describe, test, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { VideoTimeline } from './VideoTimeline'

const defaultProps = {
  currentFrame: 0,
  totalFrames: 1000,
  fps: 25,
  annotations: [],
  onSeek: vi.fn(),
}

describe('VideoTimeline', () => {
  test('renders a canvas element', () => {
    render(<VideoTimeline {...defaultProps} />)
    expect(document.querySelector('canvas')).toBeInTheDocument()
  })

  test('calls onSeek when clicking the timeline', () => {
    const onSeek = vi.fn()
    const { container } = render(<VideoTimeline {...defaultProps} onSeek={onSeek} />)
    const canvas = container.querySelector('canvas')!
    fireEvent.click(canvas, { clientX: 100 })
    expect(onSeek).toHaveBeenCalled()
  })

  test('onSeek receives a valid frame number', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <VideoTimeline {...defaultProps} onSeek={onSeek} totalFrames={1000} />
    )
    const canvas = container.querySelector('canvas')!
    fireEvent.click(canvas, { clientX: 50 })
    const calledWith = onSeek.mock.calls[0][0]
    expect(calledWith).toBeGreaterThanOrEqual(0)
    expect(calledWith).toBeLessThanOrEqual(1000)
  })
})
```

### Structure des fichiers

```
frontend/src/
└── components/video/
    ├── VideoTimeline.tsx       ← créer
    └── VideoTimeline.test.tsx  ← créer
```

### Anti-patterns à éviter

- Ne PAS appeler `draw()` directement dans le render — toujours via `useEffect`
- Ne PAS hardcoder la largeur du canvas en pixels — utiliser `canvas.width` pour les calculs
- Le canvas doit avoir un `width` et `height` en attributs HTML (pas CSS) pour éviter le flou

### References

- Architecture canvas : [Source: planning-artifacts/architecture.md — Timeline Canvas]
- Story dépendante : [Source: implementation-artifacts/3-3-lecteur-video-frame-precis-frontend.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Fix jsdom : `getContext('2d')` retourne null en environnement test — guard `if (!ctx) return` ajouté.

### Completion Notes List

- TDD strict : tests écrits et vérifiés RED avant implémentation
- `VideoTimeline.tsx` : canvas 800×60, draw via useCallback+useEffect, clamp frame 0↔totalFrames
- Guard `ctx` null pour compatibilité jsdom
- 8 tests couvrant rendu, clic, frame bounds, cursor style, re-render
- Suite complète : 40/40 tests passent, aucune régression

### File List

- frontend/src/components/video/VideoTimeline.tsx (créé)
- frontend/src/components/video/VideoTimeline.test.tsx (créé)
- _bmad-output/implementation-artifacts/sprint-status.yaml (mis à jour)

## Change Log

- 2026-04-10 : Story créée par SM (Bob) — prête pour implémentation TDD
- 2026-04-13 : Implémentation TDD complète par Amelia (claude-sonnet-4-6) — 2 fichiers créés, 40/40 tests passent
