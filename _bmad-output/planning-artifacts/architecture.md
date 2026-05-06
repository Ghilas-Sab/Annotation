# Architecture Technique — Application Web d'Annotation Vidéo

**Version :** 1.1 (condensé)  
**Date :** 2026-05-04  
**Auteur :** Winston (BMad Architect)  
**Statut :** Validé

---

## 1. Vue d'Ensemble

Architecture client-serveur locale via Docker Compose :
- **Frontend** : SPA React (Vite/Nginx) → API REST
- **Backend** : FastAPI (Python 3.11) + Uvicorn
- **Stockage** : SQLite + système de fichiers local (vidéos)

```
Docker Compose
  Frontend (React/Nginx :3000) ──REST──▶ Backend (FastAPI :8000)
                                                 │
                                        SQLite + /videos/
```

### Principes directeurs

| Principe | Application |
|----------|-------------|
| Simplicité d'abord | SQLite v1 → migration PostgreSQL sans changer les routers |
| Performance perçue | Seek vidéo 100% navigateur (zero appel réseau par frame) |
| Évolutivité progressive | Interface abstraite `VideoStorageService` (local → cloud) |
| TDD strict | Tests écrits avant le code, CI bloque sur rouge |

---

## 2. Stack Technologique

### Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Typage statique (frames, timestamps, BPM) |
| Vite | 5.x | Bundler / Dev server (HMR) |
| Zustand | 4.x | UI state (frame courante, mode annotation) |
| TanStack Query | 5.x | Server state + cache REST |
| HTML5 Video API | native | Lecture vidéo + seek précis via `currentTime` |
| Canvas API | native | Timeline + overlays |
| Web Audio API | native | Bip de vérification sonore |
| Vitest + RTL | 1.x / 14.x | Tests unitaires et composants |
| Nginx | 1.25 | Serving SPA + proxy `/api/` en prod |

### Backend

| Technologie | Version | Rôle |
|-------------|---------|------|
| Python | 3.11 | Runtime |
| FastAPI | 0.110+ | Framework REST (Pydantic v2, OpenAPI auto) |
| Uvicorn | 0.29+ | Serveur ASGI |
| SQLite (json store) | — | Persistance (fichier `projects.json`) |
| ffmpeg-python | 0.2+ | Métadonnées vidéo + découpe export |
| NumPy + SciPy | 1.26+ / 1.12+ | Calculs BPM, distributions, statistiques |
| aiofiles | 23.x | I/O fichiers non-bloquante |
| pytest + httpx | 8.x / 0.27+ | TDD + tests d'intégration API |

---

## 3. Structure Frontend

```
frontend/src/
├── components/
│   ├── video/          VideoPlayer, VideoTimeline (Canvas), FrameCounter, PlaybackControls
│   ├── annotations/    AnnotationList, AnnotationItem, BulkPlacementForm
│   ├── statistics/     BpmMetrics, IntervalHistogram (Canvas), BpmAdjuster
│   ├── projects/       ProjectList, ProjectCard, VideoUpload
│   └── assemblage/     AssemblageTimeline, AssemblageVideoCard, ...
├── pages/              ProjectsPage, AnnotationPage, StatisticsPage, AssemblagePage
├── stores/             videoStore, annotationStore, audioStore, assemblageStore (Zustand)
├── hooks/              useVideoKeyboard, useFrameSeek, useAudioBeep, useRequestVideoFrame
├── api/                projects, annotations, statistics, exports (TanStack Query)
├── types/              annotation.ts, project.ts, statistics.ts
└── utils/              frameUtils.ts, bpmUtils.ts
```

### Stratégie seek frame-précis

- `video.currentTime = (frameIndex + 0.001) / fps` — offset +1ms pour précision
- `requestVideoFrameCallback` pour lire la frame rendue réelle
- Bip : Web Audio API (oscillateur + gain), zéro fichier audio externe

### Raccourcis clavier (AnnotationPage)

| Action | Touche |
|--------|--------|
| Frame +1 / -1 | → / ← |
| +5 / -5 frames | Shift+→ / Shift+← |
| Saut inter-annotation | Ctrl+→ / Ctrl+← |
| Annoter | Espace |

**Logique Ctrl+flèche** : le pas = distance entre les 2 annotations les plus proches à gauche de `currentFrame`. Fallback 10 frames si < 2 annotations à gauche.

---

## 4. Structure Backend

```
backend/app/
├── main.py             Point d'entrée FastAPI, CORS, routers
├── config.py           Paramètres env (DATA_DIR, VIDEOS_DIR, ALLOWED_ORIGINS)
├── storage/
│   └── json_store.py   Lecture/écriture JSON atomique (os.replace)
├── schemas/            Pydantic : project, video, annotation, statistics, export
├── routers/            projects, videos, annotations, statistics, exports
└── services/
    ├── video_service.py   FFmpeg : métadonnées, découpe clip
    ├── stats_service.py   NumPy/SciPy : BPM, distributions
    └── export_service.py  JSON / CSV / vidéo
```

---

## 5. Modèle de Données

Stocké dans `DATA_DIR/projects.json` — structure imbriquée :

```
Project  { id, name, description, created_at, videos[] }
Video    { id, project_id, filename, original_name, filepath,
           duration_seconds, fps, total_frames, width, height,
           codec, uploaded_at, annotations[] }
Annotation { id, video_id, frame_number, timestamp_ms,
             label, category?, created_at, updated_at }
```

---

## 6. API REST

```
# Projets
GET|POST        /api/v1/projects
GET|PUT|DELETE  /api/v1/projects/{id}

# Vidéos
POST            /api/v1/projects/{id}/videos       upload multipart
GET             /api/v1/projects/{id}/videos
GET|DELETE      /api/v1/videos/{id}
GET             /api/v1/videos/{id}/stream          Range requests

# Annotations
GET|POST        /api/v1/videos/{id}/annotations
PUT|DELETE      /api/v1/annotations/{id}
POST            /api/v1/videos/{id}/annotations/bulk    placement équidistant
PATCH           /api/v1/videos/{id}/annotations/shift   décalage global (offset_ms)
DELETE          /api/v1/videos/{id}/annotations         supprimer toutes

# Statistiques
GET             /api/v1/videos/{id}/statistics
POST            /api/v1/videos/{id}/statistics/playback-speed

# Exports
GET             /api/v1/videos/{id}/export/json|csv|video
GET             /api/v1/projects/{id}/export/zip        export projet complet
```

---

## 7. Infrastructure

- **Docker Compose** : services `frontend` (:3000) + `backend` (:8000), volumes `videos_data` + `db_data`
- **Backend Dockerfile** : multi-stage (`base` → `production` / `test`), FFmpeg installé système
- **Frontend Dockerfile** : multi-stage (`builder` Node 20 → `production` Nginx 1.25)
- **Nginx** : `location /api/` → proxy backend, `location /` → SPA fallback `try_files`
- **CI GitHub Actions** : jobs `backend-tests`, `frontend-tests`, `build-docker` (séquentiel)

---

## 8. Variables d'Environnement

```bash
# Backend
DATA_DIR=/data
VIDEOS_DIR=/videos
ALLOWED_ORIGINS=http://localhost:3000
MAX_VIDEO_SIZE_MB=2000
TEMP_DIR=/tmp/annotations_exports

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 9. Décisions Architecturales (ADR)

**ADR-001 — JSON au lieu de SQLite (v1)**  
Fichier unique `DATA_DIR/projects.json`, écriture atomique via `os.replace`. Migration v2 = réécriture de `json_store.py` uniquement, routers inchangés.

**ADR-002 — Rendu vidéo côté navigateur**  
`video.currentTime` + `requestVideoFrameCallback`. Zéro appel réseau par frame. Dépendance : Chrome/Edge 83+, Firefox 132+. WebCodecs reporté v2.

**ADR-003 — FFmpeg backend uniquement**  
Le navigateur ne traite jamais de vidéo (sauf lecture). Export vidéo synchrone v1 (≤10 min). Queue Celery/RQ envisageable v2.

**ADR-004 — Stream copy pour export vidéo**  
`-c copy` = découpe sans ré-encodage → rapide. Conséquence : delta possible de quelques frames (keyframe alignment). Acceptable v1.

**ADR-005 — Zustand + TanStack Query (pas Redux)**  
Zustand = UI state local. TanStack Query = server state + cache. Redux est sur-dimensionné pour cette app.

---

## 10. Évolutions v2 Anticipées

| Évolution | Impact | Effort |
|-----------|--------|--------|
| Import cloud (S3, GDrive) | Implémenter `VideoStorageService` (interface prévue) | Moyen |
| Multi-utilisateurs | PostgreSQL + Auth JWT | Élevé |
| Export XML | Ajouter renderer dans `export_service.py` | Faible |
| WebCodecs (frame parfait) | Remplacer `useFrameSeek.ts` uniquement | Moyen |
| Queue export async | Celery + Redis, endpoint → webhook | Élevé |
