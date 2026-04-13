# Story 4.3: Dashboard Métriques BPM (Frontend)

Status: ready-for-dev

## Story

As a utilisateur,
I want voir un dashboard avec les métriques BPM de ma vidéo annotée,
so that je peux analyser rapidement la régularité rythmique.

## Acceptance Criteria

1. La page Statistiques affiche `bpm_global`, `bpm_mean`, `bpm_median`, `bpm_variation`, `interval_std_seconds`
2. La page affiche aussi `annotation_density_per_minute` et le nombre total d'annotations
3. Si l'API retourne une erreur de type "Minimum 2 annotations requises", un message clair est affiché
4. Les données sont chargées via TanStack Query
5. Les statistiques sont automatiquement réactualisées après mutation d'annotations grâce à l'invalidation de query
6. Une route frontend permet d'accéder à la page Statistiques pour une vidéo donnée

## Tasks / Subtasks

- [ ] Écrire les tests en premier (AC: 1–5)
  - [ ] `frontend/src/components/statistics/BpmMetrics.test.tsx`
  - [ ] `frontend/src/pages/StatisticsPage.test.tsx`
- [ ] Créer `frontend/src/api/statistics.ts` (AC: 4–5)
  - [ ] `useVideoStatistics(videoId)`
  - [ ] Query key dédiée `['statistics', videoId]`
- [ ] Mettre à jour `frontend/src/types/statistics.ts` (AC: 1–3)
  - [ ] Ajouter les types BPM/API Epic 4 sans casser les types globaux existants
- [ ] Créer `frontend/src/components/statistics/BpmMetrics.tsx` (AC: 1–3)
  - [ ] Afficher les cartes métriques
  - [ ] Gérer état loading / error métier
- [ ] Créer `frontend/src/pages/StatisticsPage.tsx` (AC: 1–6)
  - [ ] Charger la vidéo et les statistiques
  - [ ] Afficher breadcrumb et titre vidéo
  - [ ] Préparer l'assemblage avec histogramme et ajusteur pour 4.4
- [ ] Modifier `frontend/src/App.tsx` pour ajouter la route Statistiques (AC: 6)

## Dev Notes

### Dépendances

- Dépend de `4.2` pour l'API backend.
- La story prépare le terrain pour `4.4`; prévoir dès maintenant une page `StatisticsPage.tsx` qui assemblera plusieurs panneaux.

### Contexte codebase réel

- Le frontend n'a actuellement aucune route `StatisticsPage`; seules `ProjectsPage`, `ProjectDetailPage` et `AnnotationPage` sont branchées. [Source: frontend/src/App.tsx]
- Le type `frontend/src/types/statistics.ts` existe déjà mais il décrit des statistiques globales/projets, pas les métriques BPM d'Epic 4. Il faut l'étendre, pas le remplacer brutalement. [Source: frontend/src/types/statistics.ts]
- Les hooks API existants utilisent `TanStack Query` avec `API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'`. Garder ce pattern. [Source: frontend/src/api/projects.ts] [Source: frontend/src/api/annotations.ts]

### UX attendue

- Les cartes métriques sont définies dans le document UX:
  - grande valeur monospace
  - libellé secondaire
  - pas de mini-graphique dans les cartes
- Layout cible:
  - bloc métriques pleine largeur en haut
  - deux panneaux en dessous pour l'ajusteur et l'histogramme. [Source: planning-artifacts/ux-design.md — PAGE 3]

### Contrat type recommandé

```typescript
export interface BpmStatisticsResponse {
  bpm_global: number
  bpm_mean: number
  bpm_median: number
  bpm_variation: number
  interval_std_seconds: number
  annotation_density_per_minute: number
  interval_distribution: number[]
  rhythmic_segments: Array<{
    start_frame: number
    end_frame: number
    start_seconds: number
    end_seconds: number
    bpm: number
    annotation_count: number
  }>
  activity_peaks: Array<Record<string, number>>
  error?: string
}
```

### Tests à écrire EN PREMIER

```typescript
test('displays bpm global metric', async () => {
  render(<BpmMetrics videoId="video-1" />)
  expect(await screen.findByText(/128.4/i)).toBeInTheDocument()
})

test('shows minimum annotations message', async () => {
  render(<BpmMetrics videoId="video-1" />)
  expect(await screen.findByText(/minimum 2 annotations requises/i)).toBeInTheDocument()
})
```

### Structure des fichiers

```
frontend/src/
├── api/
│   └── statistics.ts                 ← créer
├── components/statistics/
│   ├── BpmMetrics.tsx                ← créer
│   └── BpmMetrics.test.tsx           ← créer
├── pages/
│   ├── StatisticsPage.tsx            ← créer
│   └── StatisticsPage.test.tsx       ← créer
├── types/
│   └── statistics.ts                 ← modifier
└── App.tsx                           ← modifier
```

### Anti-patterns à éviter

- Ne PAS réutiliser le type `GlobalStatistics` pour des métriques vidéo BPM
- Ne PAS faire des `fetch` directs dans les composants de présentation
- Ne PAS coder les query keys en conflit avec celles de `projects` ou `annotations`
- Ne PAS oublier le cas "moins de 2 annotations" alors que la requête HTTP retourne 200 avec un objet d'erreur métier

### References

- [Source: /home/etud/Bureau/Annotation/_bmad-output/stories.md — S4.3]
- [Source: /home/etud/Bureau/Annotation/_bmad-output/planning-artifacts/ux-design.md — PAGE 3 — Statistiques et Ajustement BPM]
- [Source: /home/etud/Bureau/Annotation/frontend/src/App.tsx]
- [Source: /home/etud/Bureau/Annotation/frontend/src/api/projects.ts]
- [Source: /home/etud/Bureau/Annotation/frontend/src/api/annotations.ts]
- [Source: /home/etud/Bureau/Annotation/frontend/src/types/statistics.ts]

## Dev Agent Record

### Agent Model Used

gpt-5

### Debug Log References

- Préparation story uniquement. Pas d'implémentation.

### Completion Notes List

- Route frontend manquante intégrée au périmètre
- Typage Epic 4 séparé des anciens agrégats statistiques
- Invalidation TanStack Query explicitée

### File List

- _bmad-output/implementation-artifacts/4-3-dashboard-metriques-bpm.md

## Change Log

- 2026-04-13 : Story créée par SM (Bob) — prête pour implémentation TDD
