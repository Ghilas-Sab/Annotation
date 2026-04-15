# Story 5.3: UI Exports (Frontend)

Status: review

## Story

As a utilisateur,
I want des boutons d'export dans l'interface pour télécharger JSON, CSV et le clip vidéo,
so that j'exporte mes données sans passer par l'API directement.

## Acceptance Criteria

1. 3 boutons d'export visibles sur la page annotation : JSON, CSV, Vidéo
2. Clic sur un bouton déclenche le téléchargement du fichier (via les endpoints S5.1/S5.2)
3. État de chargement sur le bouton pendant la génération
4. Bouton export vidéo désactivé si moins de 2 annotations
5. Toast de confirmation après téléchargement réussi

## Tasks / Subtasks

- [x] Écrire les tests EN PREMIER (AC: 1–5)
  - [x] Créer `frontend/src/components/exports/ExportButtons.test.tsx`
- [x] Créer `frontend/src/api/exports.ts` (AC: 2)
  - [x] `downloadExportJson(videoId)` — fetch + blob + trigger download
  - [x] `downloadExportCsv(videoId)` — fetch + blob + trigger download
  - [x] `downloadExportVideo(videoId)` — fetch + blob + trigger download
- [x] Créer `frontend/src/components/exports/ExportButtons.tsx` (AC: 1, 3, 4, 5)
  - [x] Props : `videoId: string`, `annotationCount: number`
  - [x] 3 boutons JSON / CSV / Vidéo
  - [x] État de chargement par bouton
  - [x] Bouton Vidéo désactivé si `annotationCount < 2`
  - [x] Toast inline après succès
- [x] Modifier `frontend/src/pages/AnnotationPage.tsx` (AC: 1)
  - [x] Remplacer le bouton "⬇ Exporter JSON" existant par `<ExportButtons>`
  - [x] Supprimer `handleExport` (logique export client-side obsolète)

## Dev Notes

### Dépendances

- S5.1 (endpoints `/export/json`, `/export/csv`) et S5.2 (`/export/video`) — déjà implémentés.
- S3.8 (`AnnotationPage`) — déjà implémentée, contient un bouton "Exporter JSON" à remplacer.

### Contexte codebase réel

- `AnnotationPage.tsx` a déjà un bouton "⬇ Exporter JSON" (ligne ~229) avec `handleExport` (ligne ~157) qui fait un export client-side (sans passer par l'API). Ce bouton sera remplacé par `<ExportButtons>`.
- Pattern API existant : `frontend/src/api/statistics.ts` utilise `const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'`. Même pattern pour `exports.ts`.
- Tests frontend : Vitest + @testing-library/react + MSW. Pour les tests `ExportButtons`, on utilise `vi.spyOn(window, 'fetch')` (pas MSW) car la logique est dans une fonction utilitaire, pas dans un hook.
- `URL.createObjectURL` n'est pas disponible en jsdom → doit être mocké dans les tests.

### Structure des fichiers

```
frontend/src/
├── api/
│   └── exports.ts                           ← créer
├── components/
│   └── exports/
│       ├── ExportButtons.tsx                ← créer
│       └── ExportButtons.test.tsx           ← créer
└── pages/
    └── AnnotationPage.tsx                   ← modifier
```

### Anti-patterns à éviter

- Ne PAS réencoder l'export vidéo côté frontend — l'API s'en charge
- Ne PAS utiliser `window.location.href` pour le download (perd l'état de chargement)
- Ne PAS oublier `URL.revokeObjectURL` après le téléchargement

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Aucun bug bloquant. RED → GREEN en un seul cycle.
- `URL.createObjectURL` absent en jsdom → mocké globalement dans le test file.
- Boutons "⏳ JSON/CSV/Vidéo" pendant chargement : le texte contient toujours "JSON"/"CSV"/"Vidéo" pour que les `getByRole` tests continuent de fonctionner.

### Completion Notes List

- Implémentation TDD complète : 7 tests écrits avant le code, RED confirmé (module absent), GREEN atteint.
- `api/exports.ts` : `triggerDownload` (fetch → blob → createObjectURL → anchor click), 3 fonctions export.
- `ExportButtons.tsx` : 3 boutons + loading par type + toast inline (3s). Bouton Vidéo désactivé si annotationCount < 2.
- `AnnotationPage.tsx` : `handleExport` supprimé, bouton legacy remplacé par `<ExportButtons>`.
- 79/79 tests frontend passent — zéro régression.

### File List

- _bmad-output/implementation-artifacts/5-3-ui-exports.md
- frontend/src/api/exports.ts
- frontend/src/components/exports/ExportButtons.tsx
- frontend/src/components/exports/ExportButtons.test.tsx
- frontend/src/pages/AnnotationPage.tsx

## Change Log

- 2026-04-14 : Story créée par SM (Bob) — prête pour implémentation TDD
- 2026-04-15 : Implémentation complète par Amelia (Dev Agent) — 7 tests, 2 fichiers créés, 2 fichiers modifiés. Status → review.
