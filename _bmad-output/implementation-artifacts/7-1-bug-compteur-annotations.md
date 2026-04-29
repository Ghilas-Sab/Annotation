# Story 7.1: Bug Compteur Annotations — Synchronisation Temps Réel

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux que le nombre d'annotations affiché dans l'onglet liste de la page annotation se mette à jour immédiatement après chaque ajout ou suppression,
Afin de ne plus voir un compteur obsolète (ex : 6 affiché sur une vidéo vide).

## Acceptance Criteria

### AC1 — Affichage immédiat après création
- Quand l'utilisateur pose une annotation (Espace ou bouton "Annoter"), le libellé de l'onglet `Liste (N)` reflète le nouveau total en moins d'une seconde

### AC2 — Affichage immédiat après suppression
- Quand l'utilisateur supprime une annotation (bouton 🗑️ ou undo), le compteur décrémente immédiatement

### AC3 — Compteur correct à l'ouverture de la page
- Naviguer directement vers la page annotation d'une vidéo sans annotation affiche `Liste (0)`, même si l'on vient d'une vidéo qui en avait

### AC4 — Pas de doublon affiché
- La déduplication par `id` dans `AnnotationPage` n'introduit pas de décalage entre le compteur affiché et le nombre réel de lignes dans la liste

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. Écrire les tests AVANT de toucher au code de production.

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/pages/AnnotationPage.test.tsx (ajouts)

test('annotation count updates immediately after create', async () => {
  // Monter la page avec 0 annotations (mock useAnnotations → [])
  // Simuler une création (createMutation.mutate)
  // Vérifier que l'onglet affiche "Liste (1)" sans rechargement de page
  const { rerender } = render(<AnnotationPage videoId="v1" />)
  // Après mutation, le cache TanStack Query est invalidé → useAnnotations refetch
  // Simuler la réponse du refetch avec 1 annotation
  await waitFor(() => expect(screen.getByRole('tab', { name: /liste \(1\)/i })).toBeInTheDocument())
})

test('annotation count updates immediately after delete', async () => {
  // Monter avec 3 annotations
  // Supprimer une
  // Vérifier compteur = 2
  render(<AnnotationPage videoId="v1" />)
  await waitFor(() => expect(screen.getByRole('tab', { name: /liste \(3\)/i })).toBeInTheDocument())
  await userEvent.click(screen.getAllByLabelText(/supprimer/i)[0])
  await waitFor(() => expect(screen.getByRole('tab', { name: /liste \(2\)/i })).toBeInTheDocument())
})

test('navigating to empty video shows count 0', async () => {
  // Vidéo sans annotations → onglet doit afficher "Liste (0)"
  render(<AnnotationPage videoId="empty-video" />)
  await waitFor(() => expect(screen.getByRole('tab', { name: /liste \(0\)/i })).toBeInTheDocument())
})

test('no duplicate annotations displayed', async () => {
  // Mock retournant 2 annotations avec le même id
  // Vérifier que la liste n'affiche qu'1 ligne et que le compteur est 1
  render(<AnnotationPage videoId="v1" />)
  await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
  expect(screen.getByRole('tab', { name: /liste \(1\)/i })).toBeInTheDocument()
})
```

## Tasks / Subtasks

### Investigation préalable (OBLIGATOIRE avant tout code)

- [x] Reproduire le bug localement : naviguer vers une vidéo avec 0 annotations, vérifier si le cache TanStack Query `['annotations', videoId]` contient des données obsolètes
- [x] Vérifier `useAnnotations` dans `annotations.ts` : la `queryKey` inclut bien `videoId` → devrait être correct
- [x] Vérifier si `useAnnotationStore` (Zustand) est utilisé quelque part pour alimenter le compteur affiché — si oui, c'est la source du bug
- [x] Vérifier `video.annotations?.length` dans `VideoCard.tsx` (ligne 16) : cette valeur vient du cache `['project']` et est différente de `useAnnotations` — potentielle source de désynchronisation si les deux sont affichés simultanément

### Fix (selon résultat de l'investigation)

**Cas A — Cache TanStack Query stale :**
- [ ] Ajouter `staleTime: 0` à `useAnnotations` pour forcer un refetch à chaque montage du composant
- [x] OU ajouter `refetchOnMount: 'always'` sur `useAnnotations`

**Cas B — Zustand store utilisé en parallèle de TanStack Query :**
- [ ] Dans les `onSuccess` de `useCreateAnnotation`, `useDeleteAnnotation`, `useUpdateAnnotation` : appeler également `useAnnotationStore.getState().setAnnotations(newList)` après invalidation
- [ ] OU supprimer le Zustand store si redondant avec TanStack Query

**Cas C — `video.annotations` du projet stale :**
- [ ] S'assurer que `qc.invalidateQueries({ queryKey: ['project'] })` provoque bien un refetch du détail projet avec les annotations embarquées
- [ ] Si le backend ne retourne pas `annotations` dans l'objet vidéo, le compteur dans `VideoCard` restera toujours 0 — corriger l'endpoint ou ne pas dépendre de `video.annotations?.length`

### Validation finale

- [x] Écrire les 4 tests listés ci-dessus → RED
- [x] Appliquer le fix → GREEN
- [x] Vérifier que les tests existants passent toujours (`npm run test`)

## Dev Notes

### Fichiers concernés

```
frontend/src/api/annotations.ts          ← potentiel staleTime / refetchOnMount
frontend/src/stores/annotationStore.ts   ← potentiel sync manquant
frontend/src/pages/AnnotationPage.tsx    ← ligne 219 : onglet "Liste (N)"
frontend/src/components/projects/VideoCard.tsx ← ligne 16 : video.annotations?.length
frontend/src/pages/AnnotationPage.test.tsx ← 4 nouveaux tests
```

### Invariant à respecter

Le compteur visible à l'onglet = `annotations.length` (TanStack Query) TOUJOURS. Ne jamais lire depuis le store Zustand pour l'affichage du compteur si le store n'est pas synchronisé avec les mutations.

### Anti-patterns à éviter

- Ne PAS réinitialiser manuellement le store entre navigations — corriger la source de vérité
- Ne PAS dupliquer l'état entre Zustand et TanStack Query — choisir une seule source pour chaque usage

## Dev Agent Record

### Agent Model Used
GPT-5 Codex

### Debug Log References
- `frontend/src/pages/AnnotationPage.tsx`: compteur déjà dérivé de `annotations.length` après déduplication par `id`
- `frontend/src/api/annotations.ts`: `queryKey` inclut correctement `videoId`; risque identifié sur le remontage avec cache encore frais à cause du `staleTime` global de `App.tsx`
- `frontend/src/stores/annotationStore.ts`: store Zustand non utilisé pour alimenter le compteur de `AnnotationPage`
- `frontend/src/components/projects/VideoCard.tsx`: `video.annotations?.length` reste une source distincte de comptage côté cartes projet, mais non bloquante pour AC1-AC4 de cette story

### Completion Notes List
- Ajout d'une couverture MSW complète sur `AnnotationPage` pour les 4 cas demandés: création, suppression, navigation vers vidéo vide, déduplication
- Ajout d'un test de hook garantissant le refetch au remontage même avec cache React Query encore frais
- Correctif retenu: `refetchOnMount: 'always'` dans `useAnnotations(videoId)` pour neutraliser le stale cache au montage
- Vérification complète effectuée via `npm run test` dans `frontend` : 399 tests passants

### File List
- `frontend/src/api/annotations.ts`
- `frontend/src/api/annotations.test.ts`
- `frontend/src/pages/AnnotationPage.test.tsx`

## Change Log

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, bug confirmé par Ghilas (vidéo affichait 6 au lieu de 0)
