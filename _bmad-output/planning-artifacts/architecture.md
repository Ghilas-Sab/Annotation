# Architecture Technique — Application Web d'Annotation Vidéo Rythmée

**Version :** 1.0  
**Date :** 2026-04-09  
**Auteur :** Winston (BMad Architect)  
**Statut :** Validé  

---

## 1. Vue d'Ensemble

### 1.1 Résumé Architectural

Application web locale déployée via Docker Compose, structurée en architecture client-serveur :
- **Frontend** : SPA React communiquant avec le backend via API REST
- **Backend** : API REST FastAPI gérant la persistance, le traitement vidéo et les calculs statistiques
- **Stockage** : SQLite (données structurées) + système de fichiers local (vidéos)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose                           │
│                                                                 │
│  ┌──────────────────┐  REST/HTTP  ┌──────────────────────────┐  │
│  │                  │ ──────────▶ │                          │  │
│  │  Frontend        │             │  Backend                 │  │
│  │  React 18 + TS   │ ◀────────── │  FastAPI (Python 3.11)   │  │
│  │  Vite / Nginx    │             │  Uvicorn                 │  │
│  │                  │             │                          │  │
│  └──────────────────┘             └──────────┬───────────────┘  │
│                                              │                  │
│                                   ┌──────────▼───────────────┐  │
│                                   │  SQLite + Volume vidéos  │  │
│                                   │  /data/db.sqlite3        │  │
│                                   │  /videos/                │  │
│                                   └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Principes Directeurs

| Principe | Application concrète |
|----------|---------------------|
| Simplicité d'abord | SQLite en v1, migration PostgreSQL sans changement de code |
| Developer productivity | FastAPI auto-docs, Vite HMR, TDD dès le premier commit |
| Évolutivité progressive | Interfaces abstraites pour le stockage vidéo (local → cloud) |
| Performance perçue | Rendu vidéo 100% navigateur, zéro latence réseau sur navigation frame |

---

## 2. Stack Technologique

### 2.1 Frontend

| Technologie | Version | Rôle | Justification |
|-------------|---------|------|---------------|
| React | 18.x | Framework UI | State management complexe (annotations, video state, BPM). Écosystème TDD le plus mature. |
| TypeScript | 5.x | Typage statique | Précision critique sur les calculs frame/timestamp/BPM |
| Vite | 5.x | Bundler / Dev server | HMR ultra-rapide, build optimisé, compatible Vitest |
| Zustand | 4.x | State management local | Léger, sans boilerplate, parfait pour UI state (frame courante, mode annotation) |
| TanStack Query | 5.x | Cache API | Gestion loading/error/refetch pour les appels REST |
| HTML5 Video API | native | Lecture vidéo | Support universel, seek précis via `currentTime` |
| Canvas API | native | Overlays / timeline | Rendu timeline, indicateurs de frame |
| Web Audio API | native | Bip de vérification sonore | Génération programmatique, synchronisation précise, zéro fichier externe |
| Vitest | 1.x | Tests unitaires | API Jest-compatible, natif Vite |
| React Testing Library | 14.x | Tests composants | Standard TDD pour React |
| Nginx | 1.25 | Serveur web (prod) | Serving SPA + proxy API |

### 2.2 Backend

| Technologie | Version | Rôle | Justification |
|-------------|---------|------|---------------|
| Python | 3.11 | Runtime | Écosystème vidéo/stats inégalé (NumPy, FFmpeg, SciPy) |
| FastAPI | 0.110+ | Framework API REST | Async natif, Pydantic v2, OpenAPI auto, DX excellent |
| Uvicorn | 0.29+ | Serveur ASGI | Performant, compatible async |
| Pydantic | v2 | Validation / Sérialisation | Intégré FastAPI, validation stricte des entrées |
| json (stdlib) | — | Stockage données | Zéro dépendance, lisible, suffisant pour prototype |
| ffmpeg-python | 0.2+ | Wrapper FFmpeg | Découpe vidéo, extraction métadonnées, tous formats |
| NumPy | 1.26+ | Calculs numériques | Statistiques BPM, intervalles, distributions |
| SciPy | 1.12+ | Statistiques avancées | Médiane, écart-type, segmentation par densité |
| python-multipart | 0.0.9+ | Upload fichiers | Réception des vidéos via multipart/form-data |
| aiofiles | 23.x | I/O async | Lecture/écriture fichiers non-bloquante |
| pytest | 8.x | Tests | TDD, fixtures, paramétrage |
| httpx | 0.27+ | Client HTTP async (tests) | Tests d'intégration de l'API |
| pytest-cov | 4.x | Couverture de code | Rapport de couverture CI |

### 2.3 Infrastructure

| Technologie | Rôle |
|-------------|------|
| Docker Compose v2 | Orchestration locale (frontend + backend + volumes) |
| SQLite | Base de données locale (fichier unique, zéro config) |
| FFmpeg (système) | Traitement vidéo (installé dans le conteneur backend) |
| GitHub Actions | CI/CD (lint, tests, build Docker) |

---

## 3. Architecture Frontend

### 3.1 Structure des Dossiers

```
frontend/
├── src/
│   ├── components/           # Composants UI réutilisables
│   │   ├── video/
│   │   │   ├── VideoPlayer.tsx         # Lecteur vidéo principal
│   │   │   ├── VideoTimeline.tsx       # Timeline avec annotations (Canvas)
│   │   │   ├── FrameCounter.tsx        # Affichage frame / timestamp
│   │   │   └── PlaybackControls.tsx    # Contrôles lecture + vitesse
│   │   ├── annotations/
│   │   │   ├── AnnotationList.tsx      # Liste scrollable
│   │   │   ├── AnnotationItem.tsx      # Entrée individuelle
│   │   │   └── BulkPlacementForm.tsx   # Placement automatique équidistant
│   │   ├── statistics/
│   │   │   ├── BpmMetrics.tsx          # Dashboard métriques
│   │   │   ├── IntervalHistogram.tsx   # Distribution intervalles (Canvas)
│   │   │   └── BpmAdjuster.tsx         # Saisie BPM cible → vitesse
│   │   └── projects/
│   │       ├── ProjectList.tsx
│   │       ├── ProjectCard.tsx
│   │       └── VideoUpload.tsx
│   ├── pages/
│   │   ├── ProjectsPage.tsx
│   │   ├── AnnotationPage.tsx
│   │   └── StatisticsPage.tsx
│   ├── stores/               # Zustand stores
│   │   ├── videoStore.ts     # État lecteur (frame courante, fps, durée, vitesse)
│   │   ├── annotationStore.ts # Annotations en mémoire + CRUD optimiste
│   │   └── audioStore.ts     # Mode vérification sonore on/off
│   ├── hooks/
│   │   ├── useVideoKeyboard.ts  # Bindings clavier (←→, Ctrl, Shift, Espace)
│   │   ├── useFrameSeek.ts      # Seek précis : currentTime = frame / fps
│   │   ├── useAudioBeep.ts      # Web Audio API bip
│   │   └── useRequestVideoFrame.ts  # requestVideoFrameCallback wrapper
│   ├── api/                  # Clients TanStack Query
│   │   ├── projects.ts
│   │   ├── annotations.ts
│   │   ├── statistics.ts
│   │   └── exports.ts
│   ├── types/                # Types TypeScript partagés
│   │   ├── annotation.ts
│   │   ├── project.ts
│   │   └── statistics.ts
│   └── utils/
│       ├── frameUtils.ts     # frame ↔ timestamp conversions
│       └── bpmUtils.ts       # Calculs BPM locaux (preview temps réel)
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 3.2 Stratégie de Rendu Vidéo Frame-Précis

**Approche retenue : HTML5 Video + `requestVideoFrameCallback`**

```typescript
// Seek précis vers une frame donnée
const seekToFrame = (frameIndex: number, fps: number) => {
  const targetTime = (frameIndex + 0.001) / fps;  // offset +1ms pour la précision
  videoElement.currentTime = targetTime;
};

// Callback précis sur chaque frame rendue
videoElement.requestVideoFrameCallback((now, metadata) => {
  const currentFrame = Math.round(metadata.mediaTime * fps);
  videoStore.setCurrentFrame(currentFrame);
  // Déclencher le bip si annotation présente sur cette frame
  if (audioStore.enabled && annotationStore.hasAnnotationAt(currentFrame)) {
    audioStore.playBeep();
  }
});
```

**Raccourcis clavier :**

| Action | Touche | Implémentation |
|--------|--------|----------------|
| Frame suivante | → | `seekToFrame(current + 1, fps)` |
| Frame précédente | ← | `seekToFrame(current - 1, fps)` |
| Saut inter-annotation | Ctrl+→ | `seekToFrame(current + getInterAnnotationStep(current), fps)` |
| Saut inter-annotation | Ctrl+← | `seekToFrame(current - getInterAnnotationStep(current), fps)` |
| +5 frames | Shift+→ | `seekToFrame(current + 5, fps)` |
| -5 frames | Shift+← | `seekToFrame(current - 5, fps)` |
| Annoter | Espace | `annotationStore.add(currentFrame)` |

**Logique du saut Ctrl+flèche — `getInterAnnotationStep` :**

Le pas est dynamique : il correspond à la distance entre l'annotation la plus proche à gauche de la position courante et celle qui la précède. Il se recalcule à chaque déplacement.

```typescript
/**
 * Retourne le pas de saut Ctrl+flèche.
 * = distance entre l'annotation immédiatement à gauche de `currentFrame`
 *   et l'annotation qui la précède.
 * Fallback : 10 frames si moins de 2 annotations disponibles à gauche.
 */
const getInterAnnotationStep = (
  currentFrame: number,
  annotations: Annotation[]  // triées par frame_number croissant
): number => {
  const FALLBACK = 10;
  const sorted = [...annotations].sort((a, b) => a.frame_number - b.frame_number);

  // Annotations strictement à gauche de la position courante
  const left = sorted.filter(a => a.frame_number < currentFrame);
  if (left.length < 2) return FALLBACK;

  const prev = left[left.length - 1];   // annotation la plus proche à gauche
  const prevPrev = left[left.length - 2]; // celle qui la précède
  return prev.frame_number - prevPrev.frame_number;
};
```

**Exemple :**
```
Annotations : [frame 10, frame 25, frame 40, frame 70]
Position courante : frame 50
  → left = [10, 25, 40]
  → prev = 40, prevPrev = 25
  → step = 40 - 25 = 15 frames
  → Ctrl+→ : seek vers frame 65
  → Ctrl+← : seek vers frame 35

Position courante : frame 65 (après le saut précédent)
  → left = [10, 25, 40]  (frame 70 n'est pas encore dépassée)
  → step = 40 - 25 = 15 frames  (recalculé)
  → Ctrl+→ : seek vers frame 80
```

### 3.3 Génération du Bip Sonore (Web Audio API)

```typescript
const playBeep = (context: AudioContext, frequency = 880, duration = 0.05) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.3, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + duration);
};
```

---

## 4. Architecture Backend

### 4.1 Structure des Dossiers

```
backend/
├── app/
│   ├── main.py               # Point d'entrée FastAPI, CORS, routers
│   ├── config.py             # Paramètres (paths, env vars)
│   ├── storage/
│   │   └── json_store.py     # Lecture/écriture JSON atomique (DATA_DIR/projects.json)
│   ├── schemas/              # Schémas Pydantic (validation I/O)
│   │   ├── project.py
│   │   ├── video.py
│   │   ├── annotation.py
│   │   ├── statistics.py
│   │   └── export.py
│   ├── routers/              # Endpoints FastAPI
│   │   ├── projects.py       # CRUD projets
│   │   ├── videos.py         # Upload + métadonnées vidéo
│   │   ├── annotations.py    # CRUD + bulk + décalage global
│   │   ├── statistics.py     # Calcul BPM + métriques
│   │   └── exports.py        # Export JSON/CSV/vidéo
│   └── services/             # Logique métier
│       ├── video_service.py  # FFmpeg : métadonnées, découpe
│       ├── stats_service.py  # NumPy/SciPy : BPM, distributions
│       └── export_service.py # Génération fichiers export
├── tests/
│   ├── conftest.py           # Fixtures pytest (data_dir tmp_path, client HTTP)
│   ├── test_storage.py
│   ├── test_projects.py
│   ├── test_videos.py
│   ├── test_annotations.py
│   ├── test_statistics.py
│   └── test_exports.py
├── Dockerfile
└── requirements.txt
```

### 4.2 Modèle de Données

Stocké dans `DATA_DIR/projects.json` — structure imbriquée :

```
Project (objet JSON)
├── id: str (UUID)
├── name: str
├── description: str (défaut "")
├── created_at: str (ISO 8601)
└── videos: list[Video]        ← imbriqué

Video (objet JSON imbriqué dans Project)
├── id: str (UUID)
├── project_id: str
├── filename: str
├── original_name: str
├── filepath: str              # Chemin relatif dans /videos/
├── duration_seconds: float
├── fps: float
├── total_frames: int
├── width: int
├── height: int
├── codec: str
├── uploaded_at: str (ISO 8601)
└── annotations: list[Annotation]  ← imbriqué

Annotation (objet JSON imbriqué dans Video)
├── id: str (UUID)
├── video_id: str
├── frame_number: int (>= 0)
├── timestamp_ms: float        # frame_number / fps * 1000
├── label: str (défaut "")
├── created_at: str (ISO 8601)
└── updated_at: str (ISO 8601)
```

Exemple de fichier `projects.json` :
```json
{
  "projects": [
    {
      "id": "uuid-1",
      "name": "Mon projet",
      "description": "",
      "created_at": "2026-04-10T10:00:00+00:00",
      "videos": [
        {
          "id": "uuid-2",
          "project_id": "uuid-1",
          "filename": "video.mp4",
          "fps": 25.0,
          "annotations": []
        }
      ]
    }
  ]
}
```

### 4.3 API REST — Endpoints

#### Projets
```
GET    /api/v1/projects                    → Liste des projets
POST   /api/v1/projects                    → Créer un projet
GET    /api/v1/projects/{id}               → Détail projet
PUT    /api/v1/projects/{id}               → Modifier projet
DELETE /api/v1/projects/{id}               → Supprimer projet (+ vidéos + annotations)
```

#### Vidéos
```
POST   /api/v1/projects/{id}/videos        → Upload vidéo (multipart)
GET    /api/v1/projects/{id}/videos        → Liste vidéos du projet
GET    /api/v1/videos/{id}                 → Métadonnées vidéo
DELETE /api/v1/videos/{id}                 → Supprimer vidéo
GET    /api/v1/videos/{id}/stream          → Streaming vidéo (Range requests)
```

#### Annotations
```
GET    /api/v1/videos/{id}/annotations     → Liste annotations
POST   /api/v1/videos/{id}/annotations     → Créer annotation
PUT    /api/v1/annotations/{id}            → Modifier annotation
DELETE /api/v1/annotations/{id}            → Supprimer annotation
POST   /api/v1/videos/{id}/annotations/bulk          → Placement automatique équidistant
PATCH  /api/v1/videos/{id}/annotations/shift         → Décalage global (offset_ms)
DELETE /api/v1/videos/{id}/annotations               → Supprimer toutes les annotations
```

#### Statistiques
```
GET    /api/v1/videos/{id}/statistics      → Métriques BPM complètes
POST   /api/v1/videos/{id}/statistics/playback-speed → Calcul vitesse lecture pour BPM cible
```

#### Exports
```
GET    /api/v1/videos/{id}/export/json     → Export JSON des annotations
GET    /api/v1/videos/{id}/export/csv      → Export CSV des annotations
GET    /api/v1/videos/{id}/export/video    → Export clip vidéo (première→dernière annotation)
```

### 4.4 Service de Calcul BPM

```python
# stats_service.py
import numpy as np
from scipy import stats

def compute_bpm_metrics(annotations: list[Annotation], fps: float) -> dict:
    if len(annotations) < 2:
        return {"error": "Minimum 2 annotations requises"}
    
    frames = sorted([a.frame_number for a in annotations])
    intervals_frames = np.diff(frames)
    intervals_seconds = intervals_frames / fps
    intervals_bpm = 60.0 / intervals_seconds
    
    return {
        "bpm_global": 60.0 / (np.sum(intervals_seconds) / len(intervals_frames)),
        "bpm_mean": float(np.mean(intervals_bpm)),
        "bpm_median": float(np.median(intervals_bpm)),
        "bpm_variation": float(np.max(intervals_bpm) - np.min(intervals_bpm)),
        "interval_std_seconds": float(np.std(intervals_seconds)),
        "annotation_density_per_minute": len(frames) / (frames[-1] / fps / 60),
        "interval_distribution": intervals_seconds.tolist(),  # Pour histogramme
        "rhythmic_segments": _detect_segments(frames, fps),
        "activity_peaks": _detect_peaks(frames, fps),
    }

def compute_playback_speed(current_bpm: float, target_bpm: float) -> float:
    """Retourne le facteur de vitesse (ex: 0.8 = 80% de la vitesse normale)"""
    return target_bpm / current_bpm
```

### 4.5 Service Export Vidéo (FFmpeg)

```python
# video_service.py
import ffmpeg

def extract_clip(input_path: str, output_path: str,
                 start_ms: float, end_ms: float) -> str:
    """Découpe sans ré-encodage (stream copy) pour la rapidité."""
    (
        ffmpeg
        .input(input_path, ss=start_ms/1000, to=end_ms/1000)
        .output(output_path, c='copy')   # Stream copy = pas de ré-encodage
        .overwrite_output()
        .run(quiet=True)
    )
    return output_path

def get_video_metadata(filepath: str) -> dict:
    probe = ffmpeg.probe(filepath)
    video_stream = next(
        s for s in probe['streams'] if s['codec_type'] == 'video'
    )
    fps_num, fps_den = video_stream['r_frame_rate'].split('/')
    fps = float(fps_num) / float(fps_den)
    return {
        "duration_seconds": float(probe['format']['duration']),
        "fps": fps,
        "total_frames": int(video_stream.get('nb_frames', fps * float(probe['format']['duration']))),
        "width": video_stream['width'],
        "height": video_stream['height'],
        "codec": video_stream['codec_name'],
    }
```

---

## 5. Infrastructure Docker

### 5.1 Structure Docker Compose

```yaml
# docker-compose.yml
services:
  frontend:
    build:
      context: ./frontend
      target: production          # Multi-stage: dev vs prod
    ports:
      - "3000:80"                 # Nginx prod / Vite dev
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:////data/db.sqlite3
      - VIDEOS_DIR=/videos
      - ALLOWED_ORIGINS=http://localhost:3000
    volumes:
      - videos_data:/videos
      - db_data:/data

volumes:
  videos_data:    # Stockage des fichiers vidéo uploadés
  db_data:        # Fichier SQLite
```

### 5.2 Dockerfile Backend (multi-stage)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS production
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

FROM base AS test
COPY . .
CMD ["pytest", "--cov=app", "--cov-report=term-missing"]
```

### 5.3 Dockerfile Frontend (multi-stage)

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
# nginx.conf — SPA routing + proxy API
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
    }

    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback
    }
}
```

---

## 6. Stratégie de Tests (TDD)

### 6.1 Backend — Fixtures et Pattern

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """Redirige DATA_DIR vers un dossier temporaire isolé par test."""
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture
async def client(data_dir):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
```

### 6.2 Ordre TDD par Module

```
Module 1 — Projets (MVP technique)
  test_create_project → POST /projects
  test_list_projects  → GET  /projects
  test_delete_project → DELETE /projects/{id}

Module 2 — Vidéos
  test_upload_video        → POST /projects/{id}/videos
  test_video_metadata      → GET  /videos/{id}
  test_video_stream_range  → GET  /videos/{id}/stream (Range headers)

Module 3 — Annotations
  test_create_annotation   → POST /videos/{id}/annotations
  test_seek_frame          → Calcul timestamp précis
  test_bulk_placement      → POST /videos/{id}/annotations/bulk
  test_global_shift        → PATCH /videos/{id}/annotations/shift

Module 4 — Statistiques
  test_bpm_global         → Calcul sur annotations fixes
  test_bpm_median         → Cohérence médiane vs numpy
  test_playback_speed     → BPM cible → facteur vitesse

Module 5 — Exports
  test_export_json        → Structure JSON validée
  test_export_csv         → Headers + lignes cohérents
  test_export_video_clip  → Fichier produit, durée correcte
```

### 6.3 CI/CD GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install FFmpeg
        run: sudo apt-get install -y ffmpeg
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ --cov=backend/app --cov-report=xml
      - uses: codecov/codecov-action@v4

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --prefix frontend
      - run: npm run test:coverage --prefix frontend

  build-docker:
    needs: [backend-tests, frontend-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
```

---

## 7. Variables d'Environnement

Toutes les valeurs sensibles et configurables sont dans `.env` (jamais en dur).

```bash
# .env (exemple — ne pas committer, utiliser .env.example)

# Backend
DATA_DIR=/data
VIDEOS_DIR=/videos
ALLOWED_ORIGINS=http://localhost:3000
MAX_VIDEO_SIZE_MB=2000
TEMP_DIR=/tmp/annotations_exports

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
```

```bash
# .env.example (à committer)
DATA_DIR=/data
VIDEOS_DIR=/videos
ALLOWED_ORIGINS=http://localhost:3000
MAX_VIDEO_SIZE_MB=2000
TEMP_DIR=/tmp/annotations_exports
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 8. Décisions Architecturales (ADR)

### ADR-001 : Stockage JSON au lieu de SQLite (prototype)

**Contexte :** Application locale, mono-utilisateur, volumes modestes (< 5000 annotations/vidéo). Prototype — pas de multi-utilisateurs, pas de concurrence d'écriture.  
**Décision :** Fichier JSON unique (`DATA_DIR/projects.json`) avec écriture atomique via `os.replace`. Zéro dépendance ORM.  
**Conséquence :** Migration vers SQLite/PostgreSQL en v2 = réécriture de `json_store.py` uniquement. Les schémas Pydantic et les routers restent identiques.

### ADR-002 : Rendu vidéo côté navigateur (HTML5 + Canvas)

**Contexte :** Risque de latence identifié dans le brief.  
**Décision :** `video.currentTime` + `requestVideoFrameCallback`. Aucun appel réseau pour la navigation frame.  
**Conséquence :** Dépendance au support navigateur (Chrome/Edge 83+, Firefox 132+). WebCodecs reporté à v2.

### ADR-003 : FFmpeg uniquement côté backend

**Contexte :** Export vidéo et extraction de métadonnées nécessitent FFmpeg.  
**Décision :** FFmpeg installé dans le conteneur backend. Le navigateur ne traite jamais de vidéo côté client sauf lecture.  
**Conséquence :** L'export vidéo est synchrone en v1 (taille max ~10 min). Queue de tâches (Celery/RQ) envisageable en v2.

### ADR-004 : Stream copy pour l'export vidéo

**Contexte :** Ré-encoder une vidéo de 10 min peut prendre plusieurs minutes.  
**Décision :** `-c copy` (stream copy FFmpeg) — découpe sans ré-encodage.  
**Conséquence :** Parfois un delta de quelques frames sur le point de cut (keyframe alignment). Acceptable pour v1.

### ADR-005 : Zustand + TanStack Query (pas Redux)

**Contexte :** Redux est sur-dimensionné pour cette app.  
**Décision :** Zustand pour UI state, TanStack Query pour server state.  
**Conséquence :** Architecture plus légère, boilerplate minimal, DX meilleure.

---

## 9. Évolutions v2 Anticipées

| Évolution | Impact architectural | Effort |
|-----------|---------------------|--------|
| Import vidéo cloud (S3, GDrive) | Abstraire `VideoStorageService` — interface déjà prévue | Moyen |
| Multi-utilisateurs | Remplacer SQLite par PostgreSQL (ADR-001), ajouter Auth JWT | Élevé |
| Catégories d'annotations | Ajouter table `Category` + FK dans `Annotation` | Faible |
| Export XML | Ajouter renderer dans `export_service.py` | Faible |
| WebCodecs (frame parfait) | Remplacer le hook `useFrameSeek.ts` uniquement | Moyen |
| Queue d'export vidéo async | Ajouter Celery + Redis, modifier `/export/video` → webhook | Élevé |

---

## 10. Checklist d'Implémentation

### Phase 1 — Socle (Docker + API de base)
- [ ] `docker-compose.yml` avec services frontend/backend + volumes
- [ ] FastAPI avec health check + CORS configuré
- [ ] Stockage JSON : `json_store.py` + schémas Pydantic (Project, Video, Annotation)
- [ ] Vite + React + TypeScript bootstrappé
- [ ] GitHub Actions CI (lint + tests)

### Phase 2 — Module Projets
- [ ] CRUD projets (backend TDD)
- [ ] Upload vidéo + extraction métadonnées FFmpeg
- [ ] Streaming vidéo avec Range headers
- [ ] Interface projets (frontend)

### Phase 3 — Module Annotation
- [ ] CRUD annotations (backend TDD)
- [ ] Lecteur vidéo avec seek frame-précis
- [ ] Bindings clavier complets
- [ ] Timeline Canvas avec annotations
- [ ] Mode vérification sonore (Web Audio)
- [ ] Placement automatique équidistant
- [ ] Décalage global

### Phase 4 — Module Statistiques
- [ ] Calcul BPM (NumPy/SciPy, TDD)
- [ ] Dashboard métriques frontend
- [ ] Histogramme intervalles (Canvas)
- [ ] Ajustement vitesse lecture

### Phase 5 — Exports
- [ ] Export JSON + CSV
- [ ] Export clip vidéo (FFmpeg stream copy)
