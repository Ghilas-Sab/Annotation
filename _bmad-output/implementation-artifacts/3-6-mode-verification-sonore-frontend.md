# Story 3.6: Mode Vérification Sonore (Frontend)

Status: review

## Story

As a utilisateur,
I want activer un bip sonore à chaque frame annotée lors de la lecture,
so that je valide la précision rythmique de mes annotations à l'oreille.

## Acceptance Criteria

1. Un bouton toggle "Bip ON/OFF" contrôle le mode sonore (état dans `audioStore`)
2. En mode ON : un bip est émis à chaque frame annotée pendant la lecture
3. Le bip est généré via Web Audio API (oscillateur 880Hz, 50ms)
4. Aucun fichier audio externe nécessaire
5. En mode OFF : aucun son

## Tasks / Subtasks

- [x] Écrire les tests en premier (AC: 2–3)
  - [x] `frontend/src/hooks/useAudioBeep.test.ts` — tester `playBeep` avec mock AudioContext
- [x] Créer `frontend/src/hooks/useAudioBeep.ts` (AC: 2–4)
  - [x] Fonction `playBeep(context: AudioContext)` — oscillateur 880Hz, 50ms, gain fade-out
  - [x] Hook `useAudioBeep()` — crée et gère l'AudioContext
- [x] Compléter `frontend/src/stores/audioStore.ts` (AC: 1, 5)
  - [x] State : `enabled: boolean`
  - [x] Action : `toggle()`
- [x] Intégrer dans `useRequestVideoFrame` — appeler `playBeep` si mode ON et frame annotée

## Dev Notes

### Fonction playBeep (Web Audio API)

```typescript
// frontend/src/hooks/useAudioBeep.ts
export const playBeep = (context: AudioContext): void => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.connect(gain)
  gain.connect(context.destination)

  oscillator.frequency.value = 880  // Hz
  oscillator.type = 'sine'

  const now = context.currentTime
  gain.gain.setValueAtTime(0.3, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)  // 50ms fade-out

  oscillator.start(now)
  oscillator.stop(now + 0.05)
}

export const useAudioBeep = () => {
  const contextRef = useRef<AudioContext | null>(null)

  const beep = useCallback(() => {
    if (!contextRef.current) {
      contextRef.current = new AudioContext()
    }
    if (contextRef.current.state === 'suspended') {
      contextRef.current.resume()
    }
    playBeep(contextRef.current)
  }, [])

  return { beep }
}
```

### audioStore Zustand

```typescript
// frontend/src/stores/audioStore.ts
import { create } from 'zustand'

interface AudioState {
  enabled: boolean
  toggle: () => void
}

export const useAudioStore = create<AudioState>((set) => ({
  enabled: false,
  toggle: () => set(state => ({ enabled: !state.enabled })),
}))
```

### Intégration dans useRequestVideoFrame

```typescript
// Ajouter dans le callback requestVideoFrameCallback :
const audioEnabled = useAudioStore.getState().enabled
const hasAnnotation = annotations.some(a => a.frame_number === currentFrame)
if (audioEnabled && hasAnnotation) {
  beep()
}
```

### Tests à écrire EN PREMIER (TDD strict)

```typescript
// frontend/src/hooks/useAudioBeep.test.ts
import { describe, test, expect, vi } from 'vitest'
import { playBeep } from './useAudioBeep'

describe('playBeep', () => {
  test('creates and starts an oscillator', () => {
    const mockOscillator = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 0 },
      type: 'sine',
    }
    const mockGain = {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    }
    const mockContext = {
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      destination: {},
      currentTime: 0,
    }

    playBeep(mockContext as unknown as AudioContext)

    expect(mockContext.createOscillator).toHaveBeenCalled()
    expect(mockContext.createGain).toHaveBeenCalled()
    expect(mockOscillator.frequency.value).toBe(880)
    expect(mockOscillator.start).toHaveBeenCalled()
    expect(mockOscillator.stop).toHaveBeenCalled()
  })
})
```

### Structure des fichiers

```
frontend/src/
├── hooks/
│   ├── useAudioBeep.ts       ← créer
│   └── useAudioBeep.test.ts  ← créer
└── stores/
    └── audioStore.ts         ← compléter
```

### Anti-patterns à éviter

- Ne PAS créer un `AudioContext` à chaque bip — le réutiliser via `useRef`
- Ne PAS oublier de `resume()` le contexte (navigateurs suspendent l'audio sans interaction utilisateur)
- Aucun fichier audio externe : tout doit être généré programmatiquement via Web Audio API

### References

- Architecture audio : [Source: planning-artifacts/architecture.md — Mode Vérification Sonore]
- audioStore : [Source: planning-artifacts/architecture.md — Stores Zustand]
- Story dépendante : [Source: implementation-artifacts/3-3-lecteur-video-frame-precis-frontend.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

`audioStore.ts` existait déjà avec d'autres champs — `enabled` et `toggle` ajoutés sans casser l'existant.

### Completion Notes List

- TDD strict : tests RED vérifiés avant implémentation
- `useAudioBeep.ts` : `playBeep` (oscillateur 880Hz/50ms/fade-out) + hook avec `AudioContext` réutilisé via `useRef`
- `audioStore.ts` : ajout `enabled: false` + `toggle()` aux champs existants
- `useRequestVideoFrame.ts` : intégration bip conditionnel (audioEnabled + frame annotée)
- 5 tests `useAudioBeep` + 3 tests `audioStore` = 8 nouveaux tests
- Suite complète : 48/48 tests passent, build TS OK

### File List

- frontend/src/hooks/useAudioBeep.ts (créé)
- frontend/src/hooks/useAudioBeep.test.ts (créé)
- frontend/src/stores/audioStore.ts (modifié — ajout enabled + toggle)
- frontend/src/stores/audioStore.test.ts (créé)
- frontend/src/hooks/useRequestVideoFrame.ts (modifié — intégration bip)
- _bmad-output/implementation-artifacts/sprint-status.yaml (mis à jour)

## Change Log

- 2026-04-10 : Story créée par SM (Bob) — prête pour implémentation TDD
- 2026-04-13 : Implémentation TDD complète par Amelia (claude-sonnet-4-6) — 48/48 tests, build OK
