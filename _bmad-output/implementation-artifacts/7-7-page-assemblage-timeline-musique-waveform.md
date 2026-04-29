# Story 7.7: Page Assemblage — Import Musique + Timeline + Waveform

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux importer une ou plusieurs musiques dans la page assemblage et les voir sur une timeline avec leur forme d'onde,
Afin de caler visuellement mes vidéos sur les moments forts de la musique.

## Acceptance Criteria

### AC1 — Import d'une piste musicale
- Un bouton "+ Ajouter une musique" est présent sous la timeline vidéos
- Cliquer ouvre un `<input type="file" accept="audio/*">` (mp3, wav, ogg, m4a)
- La piste importée s'affiche dans une timeline musique en dessous de la timeline vidéos
- Plusieurs musiques peuvent être ajoutées (chacune sur sa propre timeline)

### AC2 — Affichage de la forme d'onde (Waveform)
- Chaque timeline musique affiche la forme d'onde de la piste audio via WaveSurfer.js
- La waveform est rendue dans un `<div data-testid="waveform-{trackId}">`
- La longueur de la waveform est proportionnelle à la durée de la piste (même échelle que la timeline vidéos)
- Les "moments forts" (amplitudes élevées) sont visuellement distincts (couleur plus intense)

### AC3 — Lecture synchronisée
- Un bouton Play/Pause global lance la lecture synchronisée : vidéos + musique à partir du curseur de la timeline
- La position du curseur est partagée entre la timeline vidéos et toutes les timelines musique

### AC4 — Suppression d'une piste musicale
- Un bouton ✕ sur chaque timeline musique supprime la piste
- La suppression retire la waveform et libère les ressources WaveSurfer

### AC5 — Pas de backend requis pour le waveform
- La waveform est générée côté client (WaveSurfer.js lit le fichier audio local via FileReader/URL.createObjectURL)
- Le fichier audio est conservé en mémoire pour l'export (S7.10)

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. Écrire les tests AVANT de créer les composants. WaveSurfer doit être mocké dans les tests.

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/components/assemblage/MusicTrack.test.tsx (nouveau)

// Mock WaveSurfer
vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => ({
      load: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      seekTo: vi.fn(),
    }))
  }
}))

test('music track renders waveform container', () => {
  render(<MusicTrack trackId="t1" file={mockAudioFile} />)
  expect(screen.getByTestId('waveform-t1')).toBeInTheDocument()
})

test('music track shows file name', () => {
  render(<MusicTrack trackId="t1" file={mockAudioFile} name="beat.mp3" />)
  expect(screen.getByText('beat.mp3')).toBeInTheDocument()
})

test('remove button calls onRemove with trackId', async () => {
  const onRemove = vi.fn()
  render(<MusicTrack trackId="t1" file={mockAudioFile} onRemove={onRemove} />)
  await userEvent.click(screen.getByRole('button', { name: /supprimer/i }))
  expect(onRemove).toHaveBeenCalledWith('t1')
})

test('WaveSurfer.create is called on mount with waveform container', () => {
  const createMock = vi.mocked(WaveSurfer.create)
  render(<MusicTrack trackId="t1" file={mockAudioFile} />)
  expect(createMock).toHaveBeenCalledWith(
    expect.objectContaining({ container: expect.anything() })
  )
})

test('WaveSurfer is destroyed on unmount', () => {
  const destroyMock = vi.fn()
  vi.mocked(WaveSurfer.create).mockReturnValueOnce({ destroy: destroyMock, load: vi.fn(), on: vi.fn() })
  const { unmount } = render(<MusicTrack trackId="t1" file={mockAudioFile} />)
  unmount()
  expect(destroyMock).toHaveBeenCalled()
})

// frontend/src/pages/AssemblagePage.test.tsx (ajouts)

test('add music button triggers file input', async () => {
  render(<AssemblagePage />)
  const fileInput = screen.getByTestId('music-file-input')
  expect(fileInput).toHaveAttribute('accept', expect.stringContaining('audio'))
})

test('imported music track appears on its own timeline', async () => {
  render(<AssemblagePage />)
  const file = new File(['audio'], 'beat.mp3', { type: 'audio/mp3' })
  const input = screen.getByTestId('music-file-input')
  await userEvent.upload(input, file)
  expect(screen.getByText('beat.mp3')).toBeInTheDocument()
  expect(screen.getByTestId(/waveform-/)).toBeInTheDocument()
})

test('removing a music track removes it from the page', async () => {
  render(<AssemblagePage initialTracks={[{ id: 't1', name: 'beat.mp3', file: mockAudioFile }]} />)
  await userEvent.click(screen.getByRole('button', { name: /supprimer/i }))
  expect(screen.queryByText('beat.mp3')).not.toBeInTheDocument()
})
```

## Tasks / Subtasks

### Frontend — Installation dépendance

- [ ] Vérifier si `wavesurfer.js` est déjà dans `package.json` : `cat frontend/package.json | grep wavesurfer`
- [ ] Si absent : `npm install wavesurfer.js --prefix frontend`

### Frontend — Composants

- [ ] Écrire les 8 tests ci-dessus → RED (avec mocks WaveSurfer)
- [ ] Créer store musique dans `assemblageStore.ts` :
  ```ts
  interface MusicTrack {
    id: string
    name: string
    file: File
    duration?: number
    wavesurfer?: WaveSurfer  // référence pour la lecture sync
  }
  // Ajouter à AssemblageState :
  tracks: MusicTrack[]
  addTrack: (track: MusicTrack) => void
  removeTrack: (id: string) => void
  ```
- [ ] Créer `frontend/src/components/assemblage/MusicTrack.tsx` :
  - [ ] `useEffect` → `WaveSurfer.create({ container: ref.current, waveColor: '#64ffda', progressColor: '#0a192f' })`
  - [ ] `wavesurfer.load(URL.createObjectURL(file))` au montage
  - [ ] `wavesurfer.on('ready', () => setDuration(wavesurfer.getDuration()))`
  - [ ] Cleanup : `wavesurfer.destroy()` dans le retour de `useEffect`
  - [ ] `data-testid="waveform-{trackId}"` sur le container WaveSurfer
- [ ] Modifier `AssemblagePage.tsx` :
  - [ ] Ajouter `<input type="file" accept="audio/*" data-testid="music-file-input">` (masqué)
  - [ ] Bouton "+ Ajouter une musique" → déclenche click sur l'input
  - [ ] `onChange` de l'input → `addTrack({ id: uuid(), name: file.name, file })`
  - [ ] Afficher `<MusicTrack>` pour chaque track dans `tracks`
- [ ] Passer tous les tests → GREEN

### Backend (aucune modification pour cette story)

Le fichier audio est géré côté client. L'upload vers le backend est traité en S7.10.

## Dev Notes

### Intégration WaveSurfer.js

```tsx
import WaveSurfer from 'wavesurfer.js'

const containerRef = useRef<HTMLDivElement>(null)
const wsRef = useRef<WaveSurfer | null>(null)

useEffect(() => {
  if (!containerRef.current) return
  wsRef.current = WaveSurfer.create({
    container: containerRef.current,
    waveColor: 'rgba(100,255,218,0.4)',
    progressColor: '#64ffda',
    height: 60,
    barWidth: 2,
    barGap: 1,
  })
  wsRef.current.loadBlob(file)  // ou loadUrl(objectUrl)
  wsRef.current.on('ready', () => {
    setDuration(wsRef.current!.getDuration())
  })
  return () => { wsRef.current?.destroy() }
}, [file])
```

### Synchronisation lecture

Pour la lecture synchronisée (AC3), le composant parent `AssemblagePage` contrôle la position temporelle globale. Chaque `MusicTrack` expose une ref vers son instance WaveSurfer pour que le parent puisse appeler `ws.seekTo(ratio)`.

### Fichiers à créer / modifier

```
frontend/src/stores/assemblageStore.ts              ← ajouter MusicTrack + tracks state
frontend/src/components/assemblage/MusicTrack.tsx   ← nouveau
frontend/src/components/assemblage/MusicTrack.test.tsx ← 5 tests
frontend/src/pages/AssemblagePage.tsx               ← ajouter section musique
frontend/src/pages/AssemblagePage.test.tsx          ← 3 tests supplémentaires
```

### Anti-patterns à éviter

- Ne PAS charger WaveSurfer depuis un CDN — utiliser le package npm
- Ne PAS oublier `wavesurfer.destroy()` → fuite mémoire sur unmount
- Ne PAS uploader le fichier audio au backend dans cette story (prévu S7.10)
- Ne PAS utiliser `wavesurfer.play()` dans les tests — mocker WaveSurfer entièrement

## Dev Agent Record

### Agent Model Used
_à remplir_

### Debug Log References
_à remplir_

### Completion Notes List
_à remplir_

### File List
_à remplir_

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, timeline musique + waveform
