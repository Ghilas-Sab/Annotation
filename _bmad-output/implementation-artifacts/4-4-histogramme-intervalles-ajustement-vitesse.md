# Story 4.4: Histogramme Intervalles + Ajustement Vitesse (Frontend)

Status: ready-for-dev

## Story

As a utilisateur,
I want voir l'histogramme des intervalles et saisir un BPM cible pour ajuster la vitesse de lecture,
so that je peux mesurer la régularité rythmique et tester une lecture recalée sur un BPM cible.

## Acceptance Criteria

1. L'histogramme des intervalles est rendu sur `<canvas>` à partir de `interval_distribution`
2. Le composant affiche au minimum une médiane ou un pic visible exploitable depuis les données statistiques
3. Saisie d'un BPM cible `> 0` puis appel API `POST /statistics/playback-speed`
4. Le facteur de vitesse calculé est affiché sous forme `x1.09` ou `1.09×`
5. Le facteur est appliqué à la lecture vidéo via le store/lecteur existant
6. L'écran Statistiques assemble `BpmMetrics`, `IntervalHistogram` et `BpmAdjuster`
7. La validation UI bloque les valeurs nulles, négatives ou non numériques

## Tasks / Subtasks

- [ ] Écrire les tests en premier (AC: 1–7)
  - [ ] `frontend/src/components/statistics/IntervalHistogram.test.tsx`
  - [ ] `frontend/src/components/statistics/BpmAdjuster.test.tsx`
  - [ ] compléter `frontend/src/pages/StatisticsPage.test.tsx`
- [ ] Créer `frontend/src/components/statistics/IntervalHistogram.tsx` (AC: 1–2)
  - [ ] Dessiner les barres du histogramme sur canvas
  - [ ] Dessiner un repère médian ou pic
  - [ ] Supporter état vide si distribution absente
- [ ] Créer `frontend/src/components/statistics/BpmAdjuster.tsx` (AC: 3–5, 7)
  - [ ] Champ `BPM cible`
  - [ ] Validation > 0
  - [ ] Appel API vitesse
  - [ ] Affichage de la formule `target / current = speed`
  - [ ] Action pour appliquer la vitesse au lecteur/store
- [ ] Compléter `frontend/src/api/statistics.ts` (AC: 3)
  - [ ] `usePlaybackSpeed(videoId)`
- [ ] Étendre `frontend/src/stores/videoStore.ts` ou le contrat `VideoPlayer` pour propager la vitesse (AC: 5)
  - [ ] état persistant de `playbackRate`
  - [ ] setter dédié
- [ ] Modifier `frontend/src/components/video/PlaybackControls.tsx` ou `VideoPlayer.tsx` pour respecter la vitesse issue du store (AC: 5)
- [ ] Modifier `frontend/src/pages/StatisticsPage.tsx` pour assembler la page finale (AC: 6)

## Dev Notes

### Dépendances

- Dépend de `4.3` pour la page et le hook stats.
- Dépend de `4.2` pour le POST `playback-speed`.

### Contexte codebase réel

- `PlaybackControls.tsx` gère aujourd'hui sa vitesse en `useState` local (`0.5`, `1`, `2`) et écrit directement dans `video.playbackRate`. Cela n'est pas réutilisable depuis la page Statistiques. Il faut remonter cette donnée dans `videoStore` ou via l'API exposée par `VideoPlayer`. [Source: frontend/src/components/video/PlaybackControls.tsx]
- `videoStore` ne contient actuellement aucun `playbackRate`. L'ajout d'un setter central est nécessaire pour partager la vitesse entre Annotation et Statistiques. [Source: frontend/src/stores/videoStore.ts]
- Le document UX demande un histogramme canvas, un calcul en temps réel du facteur de vitesse et une action d'application au lecteur. [Source: planning-artifacts/ux-design.md — Détail : Ajustement Vitesse de Lecture] [Source: planning-artifacts/ux-design.md — Détail : Histogramme des Intervalles]

### Contrat API recommandé

```typescript
export interface PlaybackSpeedRequest {
  target_bpm: number
}

export interface PlaybackSpeedResponse {
  playback_speed: number
  current_bpm: number
  target_bpm: number
}
```

### Pattern d'état recommandé

```typescript
interface VideoState {
  playbackRate: number
  setPlaybackRate: (rate: number) => void
}
```

- Valeur initiale recommandée: `1`
- `VideoPlayer` doit appliquer `video.playbackRate` quand le store change
- `PlaybackControls` doit refléter la vitesse courante du store au lieu d'un état local isolé

### Tests à écrire EN PREMIER

```typescript
test('calls playback speed API on submit', async () => {
  const onSpeedChange = vi.fn()
  render(<BpmAdjuster videoId="1" currentBpm={60} onSpeedChange={onSpeedChange} />)
  fireEvent.change(screen.getByLabelText(/BPM cible/i), { target: { value: '120' } })
  fireEvent.click(screen.getByRole('button', { name: /calculer/i }))
  await waitFor(() => expect(onSpeedChange).toHaveBeenCalledWith(2.0))
})
```

### Structure des fichiers

```
frontend/src/
├── components/statistics/
│   ├── IntervalHistogram.tsx          ← créer
│   ├── IntervalHistogram.test.tsx     ← créer
│   ├── BpmAdjuster.tsx                ← créer
│   └── BpmAdjuster.test.tsx           ← créer
├── api/
│   └── statistics.ts                  ← compléter
├── pages/
│   ├── StatisticsPage.tsx             ← modifier
│   └── StatisticsPage.test.tsx        ← compléter
├── stores/
│   └── videoStore.ts                  ← modifier
└── components/video/
    ├── PlaybackControls.tsx           ← modifier
    └── VideoPlayer.tsx                ← vérifier / modifier si besoin
```

### Anti-patterns à éviter

- Ne PAS garder un `speed` local dans `PlaybackControls` sans synchronisation store
- Ne PAS dessiner l'histogramme avec des données BPM si l'API fournit des secondes d'intervalle
- Ne PAS déclencher l'appel API tant que la valeur saisie est invalide
- Ne PAS coupler la page Statistiques à un `videoRef` provenant d'AnnotationPage

### References

- [Source: /home/etud/Bureau/Annotation/_bmad-output/stories.md — S4.4]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/ux-design.md — Détail : Ajustement Vitesse de Lecture]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/ux-design.md — Détail : Histogramme des Intervalles]
- [Source: /home/etud/Bureau/Annotation/frontend/src/components/video/PlaybackControls.tsx]
- [Source: /home/etud/Bureau/Annotation/frontend/src/stores/videoStore.ts]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/implementation-artifacts/4-3-dashboard-metriques-bpm.md]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

- Préparation story uniquement. Pas d'implémentation.

### Completion Notes List

- Synchronisation vitesse/store explicitée
- Canvas histogramme cadré sur `interval_distribution`
- Assemblage final StatisticsPage préparé pour relais dev

### File List

- _bmad-output/implementation-artifacts/4-4-histogramme-intervalles-ajustement-vitesse.md

## Change Log

- 2026-04-13 : Story créée par SM (Bob) — prête pour implémentation TDD
