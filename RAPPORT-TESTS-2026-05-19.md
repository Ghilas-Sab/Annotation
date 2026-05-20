# Rapport de tests — 2026-05-19
## Branche : `feature/redesign-v2`

---

## Résumé global

| Suite | Fichiers | Tests | Passés | Échoués |
|---|---|---|---|---|
| Backend (pytest) | 11 fichiers | 272 | **272** | 0 |
| Frontend unitaires (Vitest) | 54 fichiers | 636 | **636** | 0 |
| E2E Playwright (Chromium) | 11 fichiers | 114 | **114** | 0 |
| **TOTAL** | **76** | **1022** | **1022** | **0** |

**Tous les tests passent. Aucune régression détectée.**

---

## 1. Tests backend (pytest)

**Commande :** `cd backend && python3 -m pytest tests/ -v`  
**Durée :** ~40 s  
**Résultat :** `272 passed`

### Fichiers de test
| Fichier | Domaine |
|---|---|
| `test_annotations.py` | CRUD annotations, bulk placement, décalage |
| `test_assemblage.py` | Assemblage, export job, source_type adapted/original, no-concat n=1, yuv420p |
| `test_categories.py` | CRUD catégories |
| `test_exports.py` | Export JSON/CSV, export vidéo |
| `test_projects.py` | CRUD projets |
| `test_statistics.py` | Calculs BPM, intervalles |
| `test_video_service.py` | FFmpeg pipeline, atempo chain, adapt_video |
| `test_videos.py` | Upload, stream, suppression, validation MIME |

### Nouveaux tests ajoutés (non commités)
- `test_assemblage_clip_request_accepts_source_type` — schéma `source_type` défaut/adapté
- `test_export_assemblage_adapted_without_preview_returns_404`
- `test_export_assemblage_adapted_with_preview_returns_202`
- `test_assemble_single_clip_no_concat_in_filter` — bug n=1 concat
- `test_assemble_single_clip_with_audio_no_concat`
- `test_assemble_filter_complex_contains_yuv420p_single`
- `test_assemble_filter_complex_contains_yuv420p_multi`

---

## 2. Tests frontend unitaires (Vitest)

**Commande :** `cd frontend && npx vitest run`  
**Durée :** ~14 s  
**Résultat :** `636 passed` (54 fichiers)

### Couverture globale
| Métrique | Valeur |
|---|---|
| Statements | **89.52 %** |
| Branches | **81.26 %** |
| Functions | **69.43 %** |
| Lines | **89.52 %** |

### Modules et couverture notable
| Module | Stmts % |
|---|---|
| `src/api/exports.ts` | 100 % |
| `src/api/statistics.ts` | 100 % |
| `src/components/annotations/ShiftForm.tsx` | 100 % |
| `src/components/annotations/CategorySelector.tsx` | 100 % |
| `src/components/KeyboardShortcutsModal.tsx` | 100 % |
| `src/api/assemblage.ts` | **8 %** ← à améliorer |
| `src/components/assemblage/ExportPanel.tsx` | 76 % |
| `src/pages/AssemblagePage.tsx` | ~80 % (estimé) |

### Nouveaux tests unitaires ajoutés (non commités)
- `ExportPanel.test.tsx` — 2 nouveaux cas :
  - `passes source_type=adapted when clip has sourceType adapted`
  - `passes source_type=original when clip has sourceType original`

---

## 3. Tests E2E Playwright

**Commande :** `cd e2e && BASE_URL=http://localhost:3000 API_BASE_URL=http://localhost:8000/api/v1 npx playwright test`  
**Durée :** ~1 min 6 s  
**Navigateur :** Chromium (desktop)  
**Résultat :** `114 passed`

### Fichiers de scénarios
| Fichier | Scénarios couverts | Tests |
|---|---|---|
| `01-projects.spec.ts` | Création, recherche, navigation, suppression, compteurs | ~16 |
| `02-project-detail.spec.ts` | Upload vidéo, renommage, navigation, suppression | ~13 |
| `03-annotations.spec.ts` | Créer, supprimer, undo, Ctrl+Z, exports JSON/CSV | ~17 |
| `04-categories.spec.ts` | CRUD catégories, filtre par catégorie | ~8 |
| `05-statistics.spec.ts` | Métriques BPM, cartes stats, timeline BPM | ~8 |
| `06-export.spec.ts` | Sélection vidéos/formats, export JSON/CSV, jobs | ~13 |
| `07-assemblage.spec.ts` | Timeline, ajout clip, modal, panneau export | ~11 |
| `08-keyboard.spec.ts` | Raccourcis ←→, Espace, Ctrl+Z, Suppr, B, modal | ~12 |
| `09-theme.spec.ts` | Bascule thème, persistance localStorage | ~4 |
| `10-playback-controls.spec.ts` | Play/Pause, compteur frame, bulk BPM, décalage | ~8 |
| `11-annotation-edit.spec.ts` | Modifier label, bulk placement, Suppr, Échap | ~5 |

### Observations
- Tous les scénarios passent sans retry ni flakiness détectée.
- Les services Docker de dev (`annotation-backend-1`, `annotation-frontend-1`) tournaient déjà sur `localhost:8000` / `localhost:3000`.
- Le `global-setup.ts` génère `e2e/fixtures/tiny.mp4` via ffmpeg (vidéo noir 320×240, 2 s, 25 fps).

---

## 4. Changements non commités (branche `feature/redesign-v2`)

Les fichiers suivants ont été modifiés mais pas encore commités :

### Backend
| Fichier | Nature du changement |
|---|---|
| `backend/app/schemas/assemblage.py` | Ajout champ `source_type: str = "original"` dans `AssemblageClipRequest` |
| `backend/app/routers/assemblage.py` | Branchement `source_type == "adapted"` → lookup `adapted_preview` + 404 si absent |
| `backend/app/services/assemblage_service.py` | Fix n=1 no-concat + `format=yuv420p` systématique pour compat libx264 |
| `backend/tests/test_assemblage.py` | +7 tests couvrant les bugs ci-dessus |

### Frontend
| Fichier | Nature du changement |
|---|---|
| `frontend/src/api/assemblage.ts` | Ajout du champ `source_type` dans le payload d'export |
| `frontend/src/components/assemblage/ExportPanel.tsx` | Transmission `source_type: c.sourceType ?? 'original'` |
| `frontend/src/components/assemblage/ExportPanel.test.tsx` | +2 tests source_type |
| `frontend/src/pages/AssemblagePage.tsx` | Affichage erreur de chargement (vs projet introuvable) |
| `frontend/src/components/annotations/AnnotationItem.tsx` | Changements redesign v2 |
| `frontend/src/components/annotations/AnnotationList.tsx` | Changements redesign v2 |
| `frontend/src/components/video/PlaybackControls.tsx` | Changements redesign v2 |
| `frontend/src/hooks/useVideoKeyboard.ts` | Changements redesign v2 |
| `frontend/src/pages/ExportPage.tsx` | Changements redesign v2 |
| `frontend/src/pages/ProjectsPage.tsx` | Changements redesign v2 |

### Nouveaux fichiers
| Chemin | Description |
|---|---|
| `docker-compose.e2e.yml` | Compose dédié aux tests E2E isolés via Docker |
| `e2e/` | Suite Playwright complète (11 fichiers de scénarios) |

---

## 5. Points d'attention (pas de correction à faire maintenant)

1. **`src/api/assemblage.ts` : couverture 8 %** — la quasi-totalité des fonctions API assemblage ne sont pas testées en unitaire (couvert par E2E à la place).
2. **`src/components/assemblage/ExportPanel.tsx` : couverture branches 68 %** — les chemins d'erreur réseau et les cas audio ne sont pas tous couverts.
3. **Functions coverage global : 69 %** — plusieurs composants assemblage ont des fonctions non appelées en test (ex. `AudioTrackRow`, `AssemblageTimeline`).
4. **MSW warnings** (`GET /api/v1/videos/1/categories` sans handler) dans `BulkPlacementForm.test.tsx` — les tests passent mais des requêtes non interceptées génèrent des warnings.
5. **React Router Future Flag warnings** dans `App.test.tsx` — avertissements de migration v7, pas de bug fonctionnel.
6. **Données persistantes E2E** — les tests E2E lancés hors Docker utilisent la DB de dev (non isolée). Des projets préfixés `E2E-*` peuvent rester après un crash.

---

## 6. Environnement d'exécution

| Composant | Version |
|---|---|
| Node.js | v18+ |
| Vitest | 2.1.9 |
| Playwright | 1.49.0 |
| pytest | 8.2.0 |
| Python | 3.11.2 |
| Navigateur E2E | Chromium (Desktop Chrome) |
| OS | Debian Linux 6.1.0-47-amd64 |

---

*Rapport généré le 2026-05-19 — branche `feature/redesign-v2` — commit HEAD : `b4454ac`*
