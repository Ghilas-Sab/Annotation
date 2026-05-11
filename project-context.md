# project-context — AnnotaRythm

## Identité
Application web d'annotation vidéo frame-à-frame avec analyse rythmique (BPM).
**Méthode** : BMAD + TDD strict (tests avant code) + CI/CD GitHub Actions.
**Langue** : Code EN, docs/stories FR, commits FR.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Python 3.11, FastAPI 0.110, SQLAlchemy, Alembic, FFmpeg |
| Frontend | React 18, TypeScript, Vite, Zustand, TanStack Query v5 |
| Tests BE | pytest, pytest-asyncio, httpx (TestClient async) |
| Tests FE | Vitest, @testing-library/react, MSW v2 |
| Analyse | NumPy, SciPy |
| Audio | WaveSurfer.js 7, Web Audio API |
| Infra | Docker Compose, volumes `videos_data` + `db_data` |

---

## Structure des répertoires clés

```
backend/
  app/
    main.py              # FastAPI app + CORS + router includes
    config.py
    routers/             # projects, videos, annotations, statistics, exports, categories
    services/            # video_service, stats_service, export_service, assemblage_service, job_manager
    schemas/             # Pydantic models
    storage/
  tests/                 # test_health, test_projects, test_videos, test_annotations,
                         # test_statistics, test_exports, test_assemblage, test_categories,
                         # test_storage, test_video_service
  conftest.py            # fixtures: client, db_session, project_id, video_id, tmp_video_file
  requirements.txt

frontend/src/
  pages/                 # ProjectsPage, ProjectDetailPage, AnnotationPage,
                         # StatisticsPage, AssemblagePage, ExportPage, ExportPageRoute
  components/
    video/               # VideoPlayer, FrameCounter, PlaybackControls, VideoTimeline, VideoTrimModal
    annotations/         # AnnotationList, AnnotationItem, BulkPlacementForm
    assemblage/          # AssemblageTimeline, AssemblagePreviewPanel, AudioTrackRow, VideoImportModal
    exports/             # ExportButtons
    statistics/          # BpmMetrics, BpmAdjuster, IntervalHistogram
    projects/            # ProjectList, ProjectCard, VideoUpload
  stores/                # videoStore, annotationStore, audioStore, assemblageStore
  hooks/                 # useFrameSeek, useRequestVideoFrame, useVideoKeyboard, useAudioBeep
  api/                   # projects.ts, annotations.ts, statistics.ts, exports.ts
  utils/                 # frameUtils, bpmUtils
  types/                 # annotation.ts, project.ts, statistics.ts
```

---

## API REST (préfixe `/api/v1`)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | `{"status":"ok"}` |
| CRUD | `/projects` | Projets (cascade delete → vidéos → annotations) |
| POST | `/projects/{id}/videos` | Upload multipart → métadonnées FFmpeg auto |
| GET | `/videos/{id}/stream` | Range requests (206 Partial Content) |
| CRUD | `/videos/{id}/annotations` | Frame + label + timestamp_ms calculé |
| POST | `/videos/{id}/annotations/bulk` | N annotations équidistantes |
| PATCH | `/videos/{id}/annotations/shift` | Décalage global en ms |
| GET | `/videos/{id}/statistics` | BPM global/moyen/médian/variation + segments |
| POST | `/videos/{id}/statistics/playback-speed` | `{target_bpm}` → `{playback_speed}` |
| GET | `/videos/{id}/export/json` | Export JSON téléchargeable |
| GET | `/videos/{id}/export/csv` | Export CSV téléchargeable |
| GET | `/videos/{id}/export/video` | Clip FFmpeg `-c copy` (422 si <2 annotations) |
| POST | `/assemblage/export` | Job async → `job_id` (202) |
| GET | `/exports/jobs/{id}/download` | Récupération résultat job |
| CRUD | `/categories` | Catégories d'annotations |

---

## Modèles de données

```
Project: id(UUID), name, description, created_at
Video: id(UUID), project_id, filename, fps, duration_seconds, total_frames, width, height, codec
Annotation: id(UUID), video_id, frame_number, label, timestamp_ms (= frame/fps*1000), created_at
```

---

## Règles TDD absolues

1. **Tests écrits AVANT le code** — jamais l'inverse
2. **Suite complète verte** avant de marquer une tâche [x]
3. **Fixtures conftest.py** pour BE : `client`, `db_session`, `project_id`, `video_id`, `tmp_video_file` (vidéo synthétique FFmpeg)
4. **MSW** pour mocker l'API côté FE dans les tests
5. Variables d'env dans `.env`, jamais en dur

---

## Comportements métier critiques

- **seekToFrame** : `video.currentTime = (n + 0.001) / fps` (évite float boundary)
- **timestamp_ms** : recalculé à chaque mutation de `frame_number`
- **BPM global** : `60 / mean(intervals_secondes)`
- **Bip sonore** : oscillateur 880Hz, 50ms, Web Audio API (aucun fichier externe)
- **Shift validation** : 422 si frame résultante < 0
- **Bulk** : labels `{prefix} 1..N`, intervalle = `(end-start)/(count-1)`
- **Export vidéo** : FFmpeg stream copy, fichier tmp supprimé après envoi

---

## Epics & statut (2026-05-07)

| Epic | Stories | Statut |
|------|---------|--------|
| E1 — Socle | S1.1–S1.4 | ✅ Terminé |
| E2 — Projets | S2.1–S2.5 | ✅ Terminé |
| E3 — Annotation | S3.1–S3.8 | ✅ Terminé |
| E4 — Statistiques | S4.1–S4.4 | ✅ Terminé |
| E5 — Exports | S5.1–S5.3 | ✅ Terminé |
| E7 — Améliorations V1.1 | S7.1–S7.10 | 🔄 S7.9 en cours |

**Branche active** : `feature/7.9-tests-coverage-updates`

### S7.9 scope (en cours)
- Toggle "Transitions en fondu" + champ durée (défaut 0.5 s)
- Indicateur visuel jonctions sur AssemblageTimeline
- Filtre FFmpeg `xfade` à l'export assemblage
- Tests + coverage à compléter

### S7.10 (à venir)
- `POST /api/v1/assemblage/export` → job_id (202)
- Job manager progression + téléchargement
- Option sauvegarde dans projet existant

---

## Conventions de code

- Commits : `feat:`, `fix:`, `test:`, `refactor:` — 1 commit par story terminée
- Types TS partagés dans `frontend/src/types/`
- Stores Zustand pour état global ; TanStack Query pour état serveur
- `useVideoKeyboard` désactivé si focus dans `<input>` / `<textarea>`
- Canvas 2D pour VideoTimeline et IntervalHistogram

---

## Références fichiers stories
`_bmad-output/stories.md` — source de vérité pour AC et TDD snippets
`_bmad/core/config.yaml` — config BMad core
