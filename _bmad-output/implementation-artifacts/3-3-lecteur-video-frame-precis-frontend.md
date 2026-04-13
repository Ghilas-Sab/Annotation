# Story 3.3: Lecteur Vidéo Frame-Précis (Frontend)

Status: approved

## Story

As a utilisateur,
I want un lecteur vidéo avec seek frame-précis via `requestVideoFrameCallback`,
so that je peux naviguer à la frame exacte sans latence.

## Acceptance Criteria

1. La vidéo se charge depuis le stream backend (`/api/v1/videos/{id}/stream`)
2. Le composant affiche la frame courante et le timestamp (`HH:MM:SS.mmm`)
3. `seekToFrame(n)` positionne `video.currentTime = (n + 0.001) / fps`
4. `requestVideoFrameCallback` met à jour `videoStore.currentFrame` à chaque frame rendue
5. Le FPS affiché correspond aux métadonnées de la vidéo
6. `FrameCounter` affiche : `Frame 42 / 3750 — 00:01:40.800`

## Tasks / Subtasks

- [ ] Écrire les tests en premier (AC: 2–3)
  - [ ] `frontend/src/utils/frameUtils.test.ts` — tester `frameToTimestamp`
  - [ ] `frontend/src/hooks/useFrameSeek.test.ts` — tester `seekToFrame`
- [ ] Créer `frontend/src/utils/frameUtils.ts` (AC: 2, 6)
  - [ ] Fonction `frameToTimestamp(frame, fps): string` → format `HH:MM:SS.mmm`
- [ ] Créer `frontend/src/hooks/useFrameSeek.ts` (AC: 3)
  - [ ] Fonction `seekToFrame(videoEl, frame, fps)` → `currentTime = (frame + 0.001) / fps`
- [ ] Créer `frontend/src/hooks/useRequestVideoFrame.ts` (AC: 4)
  - [ ] Hook qui boucle sur `requestVideoFrameCallback` et met à jour `videoStore.currentFrame`
- [ ] Compléter `frontend/src/stores/videoStore.ts` (AC: 4–5)
  - [ ] State : `currentFrame`, `fps`, `totalFrames`, `duration`, `videoId`
  - [ ] Actions : `setCurrentFrame`, `setVideoMetadata`
- [ ] Créer `frontend/src/components/video/VideoPlayer.tsx` (AC: 1–5)
  - [ ] Charge la vidéo depuis `/api/v1/videos/{id}/stream`
  - [ ] Initialise `requestVideoFrameCallback` au mount
  - [ ] Expose `seekToFrame` via ref ou callback
- [ ] Créer `frontend/src/components/video/FrameCounter.tsx` (AC: 2, 6)
  - [ ] Affiche `Frame {current} / {total} — {timestamp}`
- [ ] Créer `frontend/src/components/video/PlaybackControls.tsx` (AC: 1–5)
  - [ ] Boutons play/pause, vitesse (0.5x, 1x, 2x)

## Dev Notes

### Calcul seekToFrame

```typescript
// frontend/src/hooks/useFrameSeek.ts
export const seekToFrame = (
  videoEl: HTMLVideoElement,
  frame: number,
  fps: number
): void => {
  videoEl.currentTime = (frame + 0.001) / fps
}
```

Le +0.001 compense le décalage de présentation vidéo pour garantir que la frame N est bien affichée (pas la N-1).

### Calcul frameToTimestamp

```typescript
// frontend/src/utils/frameUtils.ts
export const frameToTimestamp = (frame: number, fps: number): string => {
  const totalMs = Math.round((frame / fps) * 1000)
  const ms = totalMs % 1000
  const totalSeconds = Math.floor(totalMs / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}
```

### requestVideoFrameCallback pattern

```typescript
// frontend/src/hooks/useRequestVideoFrame.ts
import { useEffect, useRef } from 'react'
import { useVideoStore } from '../stores/videoStore'

export const useRequestVideoFrame = (
  videoRef: React.RefObject<HTMLVideoElement>,
  fps: number
) => {
  const setCurrentFrame = useVideoStore(s => s.setCurrentFrame)
  const callbackIdRef = useRef<number>(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video || fps === 0) return

    const callback: VideoFrameRequestCallback = (_now, metadata) => {
      const frame = Math.round(metadata.mediaTime * fps)
      setCurrentFrame(frame)
      callbackIdRef.current = video.requestVideoFrameCallback(callback)
    }

    callbackIdRef.current = video.requestVideoFrameCallback(callback)
    return () => {
      video.cancelVideoFrameCallback(callbackIdRef.current)
    }
  }, [videoRef, fps, setCurrentFrame])
}
```

### videoStore Zustand

```typescript
// frontend/src/stores/videoStore.ts
import { create } from 'zustand'

interface VideoState {
  videoId: string | null
  currentFrame: number
  fps: number
  totalFrames: number
  duration: number
  setCurrentFrame: (frame: number) => void
  setVideoMetadata: (meta: { fps: number; totalFrames: number; duration: number; videoId: string }) => void
}

export const useVideoStore = create<VideoState>((set) => ({
  videoId: null,
  currentFrame: 0,
  fps: 0,
  totalFrames: 0,
  duration: 0,
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setVideoMetadata: (meta) => set({ ...meta }),
}))
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// frontend/src/utils/frameUtils.test.ts
import { describe, test, expect } from 'vitest'
import { frameToTimestamp } from './frameUtils'

describe('frameToTimestamp', () => {
  test('converts frame 42 at 25fps correctly', () => {
    expect(frameToTimestamp(42, 25)).toBe('00:00:01.680')
  })
  test('converts frame 0 correctly', () => {
    expect(frameToTimestamp(0, 25)).toBe('00:00:00.000')
  })
  test('converts frame 1500 (1 minute) correctly', () => {
    expect(frameToTimestamp(1500, 25)).toBe('00:01:00.000')
  })
})
```

```typescript
// frontend/src/hooks/useFrameSeek.test.ts
import { describe, test, expect } from 'vitest'
import { seekToFrame } from './useFrameSeek'

describe('seekToFrame', () => {
  test('sets correct currentTime for frame 42 at 25fps', () => {
    const mockVideo = { currentTime: 0 } as HTMLVideoElement
    seekToFrame(mockVideo, 42, 25)
    expect(mockVideo.currentTime).toBeCloseTo((42 + 0.001) / 25, 5)
  })
  test('sets correct currentTime for frame 0', () => {
    const mockVideo = { currentTime: 1 } as HTMLVideoElement
    seekToFrame(mockVideo, 0, 25)
    expect(mockVideo.currentTime).toBeCloseTo(0.001 / 25, 5)
  })
})
```

### Structure des fichiers

```
frontend/src/
├── components/video/
│   ├── VideoPlayer.tsx         ← créer
│   ├── FrameCounter.tsx        ← créer
│   └── PlaybackControls.tsx    ← créer
├── hooks/
│   ├── useFrameSeek.ts         ← créer
│   ├── useFrameSeek.test.ts    ← créer
│   └── useRequestVideoFrame.ts ← créer
├── stores/
│   └── videoStore.ts           ← compléter
└── utils/
    ├── frameUtils.ts           ← créer
    └── frameUtils.test.ts      ← créer
```

### Anti-patterns à éviter

- Ne PAS utiliser `video.currentTime = frame / fps` sans le +0.001 (frame drift)
- Ne PAS accéder à `video.currentTime` pour calculer la frame courante — utiliser `requestVideoFrameCallback`
- Ne PAS oublier d'annuler le callback dans le cleanup du useEffect

### References

- Architecture frontend : [Source: planning-artifacts/architecture.md — Composants Frontend]
- seekToFrame pattern : [Source: planning-artifacts/architecture.md — Seek Frame-Précis]
- Stories dépendantes : [Source: implementation-artifacts/1-3-bootstrap-frontend-react-typescript.md], [Source: implementation-artifacts/2-3-streaming-video-range-requests.md]

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
