# Story 7.8: Page Assemblage — Calage Annotations sur Timeline

Status: review

## Story

En tant qu'utilisateur,
Je veux voir les annotations de chaque vidéo affichées comme marqueurs sur la timeline d'assemblage,
Afin de caler précisément mes clips sur les moments forts de la musique.

## Acceptance Criteria

### AC1 — Marqueurs d'annotation sur la timeline vidéo
- Pour chaque clip dans la timeline, ses annotations sont affichées comme traits verticaux sur le bloc
- La position des traits est proportionnelle au timestamp de l'annotation dans la vidéo
- Les marqueurs ont `data-testid="annotation-marker-{annotationId}"`

### AC2 — Informations au survol
- Survoler un marqueur affiche une infobulle avec : label de l'annotation et timestamp (format `mm:ss.ff`)
- L'infobulle disparaît quand la souris quitte le marqueur

### AC3 — Couleur par catégorie
- Si l'annotation a une catégorie avec une couleur définie, le marqueur utilise cette couleur
- Si pas de catégorie, couleur par défaut : blanc semi-transparent

### AC4 — Chargement des annotations
- Les annotations de chaque clip sont chargées depuis l'API via `GET /api/v1/videos/{id}/annotations`
- Les annotations sont chargées à l'ajout du clip à la timeline
- Si le chargement échoue, les marqueurs sont absents (pas d'erreur bloquante)

### AC5 — Alignement visuel musique/vidéo
- Les timelines vidéo et musique partagent la même échelle temporelle
- Un marqueur à t=5s dans une vidéo commençant au début de la timeline est aligné avec t=5s sur la waveform

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT.

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/components/assemblage/AssemblageTimeline.test.tsx (ajouts)

test('annotation markers are rendered on clip block', () => {
  const clip = buildClip({
    videoId: 'v1', duration: 10,
    annotations: [
      buildAnnotation({ id: 'a1', timestamp_ms: 2000, label: 'Beat 1' }),
      buildAnnotation({ id: 'a2', timestamp_ms: 7000, label: 'Beat 2' }),
    ]
  })
  render(<AssemblageTimeline clips={[clip]} />)
  expect(screen.getByTestId('annotation-marker-a1')).toBeInTheDocument()
  expect(screen.getByTestId('annotation-marker-a2')).toBeInTheDocument()
})

test('marker position is proportional to timestamp', () => {
  const clip = buildClip({ duration: 10, annotations: [
    buildAnnotation({ timestamp_ms: 5000 })  // 50% de la durée
  ]})
  render(<AssemblageTimeline clips={[clip]} />)
  const marker = screen.getByTestId(/annotation-marker-/)
  // Le marker doit être à ~50% du bloc clip
  const leftPercent = parseFloat(marker.style.left)
  expect(leftPercent).toBeCloseTo(50, 1)
})

test('hovering marker shows tooltip with label and timestamp', async () => {
  const clip = buildClip({
    duration: 10,
    annotations: [buildAnnotation({ id: 'a1', label: 'Beat 1', timestamp_ms: 3000 })]
  })
  render(<AssemblageTimeline clips={[clip]} />)
  await userEvent.hover(screen.getByTestId('annotation-marker-a1'))
  expect(screen.getByText('Beat 1')).toBeInTheDocument()
  expect(screen.getByText(/00:03/)).toBeInTheDocument()
})

test('marker uses category color when annotation has category', () => {
  const clip = buildClip({
    duration: 5,
    annotations: [buildAnnotation({
      id: 'a1',
      category: { id: 'c1', name: 'Kick', color: '#FF0000' }
    })]
  })
  render(<AssemblageTimeline clips={[clip]} />)
  const marker = screen.getByTestId('annotation-marker-a1')
  expect(marker).toHaveStyle({ backgroundColor: '#FF0000' })
})

test('annotations are fetched for each clip added', async () => {
  const fetchAnnotations = vi.fn().mockResolvedValue([])
  render(<AssemblagePage onFetchAnnotations={fetchAnnotations} />)
  // Simuler l'ajout d'un clip
  act(() => useAssemblageStore.getState().addClips([buildClip({ videoId: 'v1' })]))
  await waitFor(() => expect(fetchAnnotations).toHaveBeenCalledWith('v1'))
})
```

## Tasks / Subtasks

### Frontend

- [x] Écrire les 5 tests ci-dessus → RED
- [x] Modifier `assemblageStore.ts` :
  - [x] Ajouter `annotations: Record<videoId, Annotation[]>` dans le state
  - [x] Ajouter `setAnnotations: (videoId: string, annotations: Annotation[]) => void`
- [x] Modifier `AssemblagePage.tsx` :
  - [x] Dans le callback `addClips`, pour chaque clip ajouté : appeler `fetchAnnotations(clip.videoId)` et stocker dans le store
  - [x] Utiliser `useAnnotations(videoId)` ou un fetch direct
- [x] Modifier `AssemblageTimeline.tsx` / créer `AssemblageClip.tsx` :
  - [x] Lire `annotations` du store pour chaque clip
  - [x] Calculer la position de chaque marqueur : `left = (annotation.timestamp_ms / (clip.duration * 1000)) * 100 + '%'`
  - [x] Rendre `<div data-testid="annotation-marker-{id}" style={{ left, backgroundColor: category?.color ?? 'rgba(255,255,255,0.6)' }}>` en position absolue sur le bloc
  - [x] Tooltip au hover (state local `hoveredAnnotationId`)
- [x] Passer tous les tests → GREEN

### Backend (aucune modification)

Les annotations sont récupérées via `GET /api/v1/videos/{id}/annotations` (endpoint existant).

## Dev Notes

### Structure d'un bloc clip avec marqueurs

```tsx
<div style={{ position: 'relative', width: clipWidth + 'px', height: 60 }}>
  {/* Fond du clip */}
  <div style={{ position: 'absolute', inset: 0, background: 'rgba(100,255,218,0.1)' }} />

  {/* Marqueurs d'annotation */}
  {annotations.map(ann => (
    <div
      key={ann.id}
      data-testid={`annotation-marker-${ann.id}`}
      style={{
        position: 'absolute',
        left: `${(ann.timestamp_ms / (clip.duration * 1000)) * 100}%`,
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: ann.category?.color ?? 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHoveredId(ann.id)}
      onMouseLeave={() => setHoveredId(null)}
    />
  ))}

  {/* Tooltip */}
  {hoveredId && (
    <div style={{ position: 'absolute', top: '-30px', ... }}>
      {hoveredAnnotation.label} — {formatTimestamp(hoveredAnnotation.timestamp_ms)}
    </div>
  )}
</div>
```

### Format timestamp

```ts
function formatTimestamp(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  const frames = Math.floor((ms % 1000) / (1000 / 25))  // 25fps default
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(frames).padStart(2,'0')}`
}
```

### Fichiers à créer / modifier

```
frontend/src/stores/assemblageStore.ts                 ← ajouter annotations state
frontend/src/components/assemblage/AssemblageTimeline.tsx ← ajouter marqueurs annotations
frontend/src/components/assemblage/AssemblageTimeline.test.tsx ← 5 tests
frontend/src/pages/AssemblagePage.tsx                  ← fetch annotations à l'ajout clip
```

### Anti-patterns à éviter

- Ne PAS bloquer l'ajout de clip si le fetch annotations échoue
- Ne PAS réutiliser `annotationStore` (Zustand global de la page annotation) — maintenir un state séparé dans `assemblageStore`

## Dev Agent Record

### Agent Model Used
GPT-5 Codex

### Debug Log References
- `npm test -- --run src/components/assemblage/AssemblageTimeline.test.tsx --reporter dot` — 6 tests passés
- `npm test -- --run src/pages/AssemblagePage.test.tsx --reporter dot` — 24 tests passés
- `npm test -- --run --reporter dot` — 46 fichiers, 454 tests passés
- `npm run build` — build frontend passé

### Completion Notes List
- Ajout d'un state `annotations` dédié à l'assemblage, séparé du store annotation global.
- Chargement non bloquant des annotations par `videoId` lors de l'apparition d'un clip dans la timeline, avec injection `onFetchAnnotations` pour test.
- Rendu des marqueurs par timestamp avec couleur de catégorie, couleur par défaut semi-transparente et tooltip label + timestamp.
- Correction d'une boucle de render dans `AssemblageTimeline` quand `audioTracks` n'est pas fourni, via constantes vides stables.

### File List
- `_bmad-output/implementation-artifacts/7-8-page-assemblage-calage-annotations.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `frontend/src/stores/assemblageStore.ts`
- `frontend/src/components/assemblage/AssemblageTimeline.tsx`
- `frontend/src/components/assemblage/AssemblageTimeline.test.tsx`
- `frontend/src/pages/AssemblagePage.tsx`
- `frontend/src/pages/AssemblagePage.test.tsx`

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, calage annotations sur timeline assemblage
- 2026-05-04 : Implémentation terminée par Amelia — marqueurs annotations, chargement API, tests et validation complète
