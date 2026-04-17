# Story 6.3: Correction Compteur Annotations + Affichage BPM Conditionnel

Status: completed

## Story

En tant qu'utilisateur,
I want que chaque carte vidéo affiche le bon nombre d'annotations (avec singulier/pluriel correct) et le BPM calculé uniquement si la vidéo a été annotée,
so that j'ai une information fiable et propre sur l'état de mes vidéos.

## Acceptance Criteria

1. Le compteur affiche "0 annotation", "1 annotation", "2 annotations" (gestion singulier/pluriel)
2. Le compteur se met à jour après chaque annotation ajoutée ou supprimée sans rechargement de page
3. Si `annotations.length === 0` → pas d'affichage BPM sur la carte
4. Si `annotations.length >= 2` → affichage du BPM global calculé (ex : "72 BPM")
5. Si `annotations.length === 1` → pas d'affichage BPM (impossible de calculer un intervalle)
6. Le BPM affiché provient de l'endpoint existant `GET /api/v1/videos/{id}/statistics`

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **100%** des branches singulier/pluriel et BPM conditionnel.
> Ces règles métier simples doivent être testées exhaustivement.

### Tests obligatoires à écrire en PREMIER

```tsx
// frontend/src/components/projects/VideoCard.test.tsx (nouveau ou enrichi)
// ... (voir implementation réelle dans le fichier)
```

## Tasks / Subtasks

- [x] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–6)
  - [x] Créer/enrichir `frontend/src/components/projects/VideoCard.test.tsx`
  - [x] 10 tests : singulier/pluriel (5 cas), BPM absent (2 cas), BPM présent (2 cas), réactivité (1 cas)
- [x] Identifier le composant carte vidéo existant (peut être `VideoCard.tsx`, `ProjectCard.tsx` ou intégré dans la liste)
- [x] Modifier le composant carte vidéo (AC: 1, 3, 4, 5)
  - [x] Logique pluriel : `count <= 1 ? 'annotation' : 'annotations'` (0 est singulier en français/AC)
  - [x] Affichage BPM conditionnel : `annotationCount >= 2 && stats?.bpm_global`
- [x] Vérifier/corriger la source du `annotationCount` (AC: 2)
  - [x] Le compteur vient de `video.annotations.length` du store/parent
  - [x] S'assurer que le refetch est déclenché après ajout/suppression d'annotation (TanStack Query invalidation dans `annotations.ts`)
- [x] Si le BPM n'est pas encore dans les données de la carte → appeler `GET /api/v1/videos/{id}/statistics` (AC: 6)
  - [x] Utiliser TanStack Query avec `enabled: annotationCount >= 2`
- [x] Passer tous les tests → GREEN

## Dev Notes

### Dépendances

- Aucune (bug fix isolé — priorité Phase A)

### Contexte codebase

- `VideoCard.tsx` créé pour isoler la logique de carte vidéo.
- `ProjectDetailPage.tsx` refactorisé pour utiliser `VideoCard`.
- `useVideoStatistics` mis à jour pour accepter des options (permettant `enabled`).
- Mutations d'annotations (create, update, delete, shift) mises à jour pour invalider la query `project`.

### Structure des fichiers

```
frontend/src/
├── components/projects/
│   ├── VideoCard.tsx                   ← créé
│   └── VideoCard.test.tsx              ← créé (10 tests)
├── api/
│   ├── statistics.ts                   ← mis à jour (support options)
│   └── annotations.ts                  ← mis à jour (invalidation project)
└── pages/
    └── ProjectDetailPage.tsx           ← refactorisé (utilise VideoCard)
```

### Anti-patterns évités

- Pas d'appel API BPM si `annotationCount < 2`.
- Gestion correcte du singulier pour 0 et 1 (conforme AC).
- Invalidation ciblée mais complète des queries.

## Dev Agent Record

### Agent Model Used

Amelia (BMad Dev Agent) - Senior Software Engineer

### Debug Log References

- Tests RED confirmés avant implémentation.
- Fix pluralisation 0 (annotations -> annotation) pour passer les tests.
- Validation 100% GREEN (35 tests au total exécutés dans le lot final).

### Completion Notes List

- Composant `VideoCard` extrait pour une meilleure testabilité et maintenance.
- Invalidation systématique du projet dans `annotations.ts` pour garantir la réactivité sur toutes les vues (ex: `ProjectDetailPage`).

### File List

- `frontend/src/components/projects/VideoCard.tsx`
- `frontend/src/components/projects/VideoCard.test.tsx`
- `frontend/src/pages/ProjectDetailPage.tsx`
- `frontend/src/api/statistics.ts`
- `frontend/src/api/annotations.ts`

## Change Log

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase A (correction rapide). Exigence couverture tests maximale.
- 2026-04-17 : Implémentée par Amelia. 100% tests OK.
