# Architecture technique

> Version condensée et opérationnelle. Pour la version originale de planification, voir [`_bmad-output/planning-artifacts/architecture.md`](../_bmad-output/planning-artifacts/architecture.md).

---

## 1. Vue d'ensemble

AnnotaRythm est une application **client-serveur locale** orchestrée par Docker Compose :

```
┌────────────────────────────────────────────────────────────────┐
│  Docker Compose                                                │
│                                                                │
│   ┌─────────────────────┐         ┌─────────────────────────┐  │
│   │  Frontend           │  REST   │  Backend                │  │
│   │  React/Nginx :3000  │ ──────▶ │  FastAPI/Uvicorn :8000  │  │
│   │  (SPA + reverse     │         │  + FFmpeg + NumPy/SciPy │  │
│   │   proxy /api/*)     │         │                         │  │
│   └─────────────────────┘         └────────────┬────────────┘  │
│                                                │               │
│                                  ┌─────────────┴────────────┐  │
│                                  │ Volumes Docker           │  │
│                                  │  json_data  → /data      │  │
│                                  │  videos_data → /videos   │  │
│                                  └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Principes directeurs

| Principe                  | Application concrète                                                              |
|---------------------------|------------------------------------------------------------------------------------|
| **Simplicité d'abord**    | JSON store atomique (`projects.json`) → migration PostgreSQL sans toucher aux routers |
| **Performance perçue**    | Seek vidéo 100 % navigateur (`video.currentTime` + `requestVideoFrameCallback`)    |
| **Évolutivité progressive** | Interface `VideoStorageService` prévue pour stockage cloud futur                |
| **TDD strict**            | Tests rédigés avant chaque ligne de code, CI bloque sur rouge                      |
| **Séparation UI / serveur** | Zustand pour l'état UI local, TanStack Query pour l'état serveur + cache REST    |

---

## 2. Stack technologique

### Frontend

| Technologie         | Version  | Rôle                                                  |
|---------------------|----------|-------------------------------------------------------|
| React               | 18.x     | Framework UI                                          |
| TypeScript          | 5.x      | Typage statique (frames, timestamps, BPM)             |
| Vite                | 6.x      | Bundler / dev server avec HMR                         |
| Zustand             | 5.x      | UI state (frame courante, mode annotation, audio)     |
| TanStack Query      | 5.x      | Server state + cache + invalidations REST             |
| React Router        | 6.x      | Routing SPA                                           |
| HTML5 Video API     | natif    | Lecture + seek précis via `currentTime`               |
| Canvas API          | natif    | Timeline d'annotations + histogramme BPM              |
| Web Audio API       | natif    | Bip de vérification sonore (oscillateur + gain)       |
| wavesurfer.js       | 7.x      | Waveform audio (page Assemblage)                      |
| Vitest + RTL + MSW  | 2.x      | Tests unitaires, composants, mock API                 |
| Nginx               | 1.25     | Serving SPA + reverse proxy `/api/`                   |

### Backend

| Technologie     | Version    | Rôle                                              |
|-----------------|------------|---------------------------------------------------|
| Python          | 3.11       | Runtime                                           |
| FastAPI         | 0.110+     | Framework REST (Pydantic v2, OpenAPI auto)        |
| Uvicorn         | 0.29+      | Serveur ASGI                                      |
| ffmpeg-python   | 0.2+       | Wrapper FFmpeg : métadonnées + découpe export     |
| NumPy + SciPy   | 1.26 / 1.12| Calculs BPM, distributions, segmentation rythmique|
| aiofiles        | 23.x       | I/O fichiers non-bloquante                        |
| pytest + httpx  | 8 / 0.27   | TDD et tests d'intégration API                    |

### Infrastructure

| Composant       | Détails                                                          |
|-----------------|------------------------------------------------------------------|
| Docker Compose  | 2 services (`frontend`, `backend`) + 2 volumes (`json_data`, `videos_data`) |
| Dockerfile back | Multi-stage `base` → `production` / `test`, FFmpeg installé      |
| Dockerfile front| Multi-stage `builder` (Node 20) → `production` (Nginx 1.25)      |
| GitHub Actions  | Pipeline 3 jobs : `backend-tests` ∥ `frontend-tests` → `build-docker` |

---

## 3. Structure du code

### 3.1 Backend (`backend/app/`)

```
backend/app/
├── main.py             Point d'entrée FastAPI (CORS + montage des routers)
├── config.py           Settings basés sur variables d'environnement
├── storage/
│   └── json_store.py   Lecture/écriture atomique de projects.json (os.replace)
├── schemas/            Modèles Pydantic
│   ├── project.py
│   ├── video.py
│   ├── annotation.py
│   ├── category.py
│   ├── statistics.py
│   ├── export.py
│   └── assemblage.py
├── routers/            Endpoints HTTP (préfixés /api/v1)
│   ├── projects.py
│   ├── videos.py
│   ├── annotations.py
│   ├── categories.py
│   ├── statistics.py
│   ├── exports.py
│   └── assemblage.py
└── services/           Logique métier
    ├── video_service.py     ← FFmpeg (métadonnées, découpe)
    ├── stats_service.py     ← NumPy/SciPy (BPM, histogramme, segments)
    ├── export_service.py    ← JSON / CSV / vidéo / bundle
    ├── assemblage_service.py← Assemblage multi-pistes (vidéo + audio + transitions)
    └── job_manager.py       ← Jobs asynchrones d'export
```

### 3.2 Frontend (`frontend/src/`)

```
frontend/src/
├── App.tsx              Bootstrap React + provider TanStack Query
├── main.tsx             Entry Vite
├── pages/               Pages routées
│   ├── ProjectsPage.tsx
│   ├── ProjectDetailPage.tsx
│   ├── AnnotationPage.tsx
│   ├── StatisticsPage.tsx
│   ├── ExportPage.tsx · ExportPageRoute.tsx
│   └── AssemblagePage.tsx
├── components/
│   ├── video/           VideoPlayer · VideoTimeline · FrameCounter · PlaybackControls · VideoTrimModal
│   ├── annotations/     AnnotationList · AnnotationItem · BulkPlacementForm · ShiftForm · CategoryManager · CategorySelector
│   ├── statistics/      BpmMetrics · IntervalHistogram · BpmAdjuster
│   ├── projects/        ProjectList · ProjectCard · VideoUpload
│   ├── exports/         ExportButtons · ExportBundleModal · ExportJobsWidget · PreviewPanel
│   ├── assemblage/      AssemblageTimeline · AssemblagePreviewPanel · AudioTrackRow · VideoImportModal
│   ├── ui/              Boutons, modals et widgets partagés
│   └── KeyboardShortcutsModal.tsx
├── stores/              Zustand : videoStore, annotationStore, audioStore, assemblageStore
├── hooks/               useVideoKeyboard, useFrameSeek, useAudioBeep, useRequestVideoFrame…
├── api/                 Clients TanStack Query (projects, annotations, statistics, exports, assemblage)
├── types/               annotation.ts, project.ts, statistics.ts…
├── utils/               frameUtils.ts, bpmUtils.ts…
└── contexts/            ThemeContext etc.
```

---

## 4. Flux de données critiques

### 4.1 Seek frame-précis

1. L'utilisateur appuie sur **→** (avance d'une frame).
2. `useVideoKeyboard` met à jour `videoStore.currentFrame` dans Zustand.
3. `useFrameSeek` calcule `video.currentTime = (frame + 0.001) / fps` (offset +1 ms pour la précision).
4. `requestVideoFrameCallback` lit la frame réellement rendue → resync si dérive.

> Pas un seul appel réseau par frame : tout est local au navigateur.

### 4.2 Pose d'une annotation

1. **Espace** → `videoStore.currentFrame` + `videoStore.currentTimestampMs` capturés.
2. Mutation TanStack Query → `POST /api/v1/videos/{id}/annotations`.
3. Backend valide via Pydantic, persiste dans `projects.json` (verrou + `os.replace`).
4. La query `getAnnotations(videoId)` est invalidée → `AnnotationList` et `VideoTimeline` se rafraîchissent.
5. Si le mode son est ON : `useAudioBeep` joue un oscillateur Web Audio.

### 4.3 Calcul du BPM

1. Frontend appelle `GET /api/v1/videos/{id}/statistics`.
2. `stats_service` charge les annotations, convertit en intervalles inter-annotations (ms).
3. NumPy calcule moyenne / médiane / écart-type ; SciPy produit l'histogramme.
4. Réponse JSON consommée par `BpmMetrics` et `IntervalHistogram` (canvas).

### 4.4 Export vidéo

1. `POST /api/v1/videos/{id}/export/bundle` (ou `GET /export/video`).
2. `export_service` invoque FFmpeg en **stream copy** (`-c copy`) entre la première et la dernière annotation.
3. Fichier généré dans `TEMP_DIR`, servi en download.

> **Stream copy** = découpe sans ré-encodage → rapide. Compromis : alignement à la keyframe (delta possible de quelques frames). Acceptable en v1.

---

## 5. Modèle de données (résumé)

Stockage : un seul fichier JSON `DATA_DIR/projects.json`, structure imbriquée :

```
Project    { id, name, description, created_at, videos[] }
Video      { id, project_id, filename, original_name, filepath,
             duration_seconds, fps, total_frames, width, height, codec,
             uploaded_at, annotations[], categories[] }
Annotation { id, video_id, frame_number, timestamp_ms,
             label, category_id?, created_at, updated_at }
Category   { id, video_id, name, color, created_at }
```

Détails complets : [`docs/data-model.md`](data-model.md).

---

## 6. Sécurité et isolation

- **Application 100 % locale** : aucune authentification (v1 = mono-utilisateur).
- CORS restreint à `ALLOWED_ORIGINS` (par défaut `http://localhost:3000`).
- Pas d'exécution de code arbitraire : FFmpeg est invoqué via `ffmpeg-python` avec des arguments contrôlés.
- Upload limité à `MAX_VIDEO_SIZE_MB`.

---

## 7. Décisions architecturales (ADR résumés)

| ADR | Décision                            | Justification                                                                  |
|-----|-------------------------------------|--------------------------------------------------------------------------------|
| 001 | JSON store atomique (pas SQLite v1) | Setup zéro, idéal pour un outil local mono-utilisateur                          |
| 002 | Rendu vidéo côté navigateur         | Zéro round-trip par frame, latence imperceptible                                |
| 003 | FFmpeg backend uniquement           | Pas de traitement vidéo en JS, code FFmpeg testable et déterministe             |
| 004 | Stream copy pour l'export vidéo     | Rapide, sans ré-encodage. Compromis frame ≈ keyframe acceptable                 |
| 005 | Zustand + TanStack Query (pas Redux)| Redux sur-dimensionné ; séparation claire UI state / server state               |

---

## 8. Évolutions v2 anticipées

| Évolution                          | Impact                                            | Effort |
|------------------------------------|---------------------------------------------------|--------|
| Import vidéo cloud (S3, Drive)     | Implémenter `VideoStorageService` (interface prête) | Moyen  |
| Multi-utilisateurs                 | Migration PostgreSQL + Auth JWT                   | Élevé  |
| Export XML                         | Ajouter un renderer dans `export_service.py`      | Faible |
| WebCodecs (frame parfait garanti)  | Remplacer `useFrameSeek.ts` uniquement            | Moyen  |
| Queue d'export asynchrone          | Celery + Redis + endpoint webhook                 | Élevé  |
| Collaboration temps réel           | WebSockets + CRDT sur les annotations             | Élevé  |
