# Story 1.1: Infrastructure Docker Compose

Status: done

## Story

As a développeur,
I want un `docker-compose.yml` fonctionnel avec frontend, backend et volumes,
so that je puisse démarrer l'environnement complet avec `docker compose up`.

## Acceptance Criteria

1. `docker compose up` démarre les deux services sans erreur
2. Le backend répond sur `http://localhost:8000/api/v1/health` → `{"status": "ok"}`
3. Le frontend est accessible sur `http://localhost:3000`
4. Les volumes `videos_data` et `db_data` sont montés correctement
5. `.env.example` présent à la racine avec toutes les variables documentées
6. `.gitignore` exclut `.env`, `__pycache__`, `node_modules`, `*.db`, `.pytest_cache`, `dist/`

## Tasks / Subtasks

- [x] Créer la structure de dossiers racine (AC: 1)
  - [x] `mkdir -p backend frontend .github/workflows`
- [x] Créer `docker-compose.yml` avec les 2 services + volumes (AC: 1, 3, 4)
  - [x] Service `backend` : image Python 3.11, port 8000, volumes videos_data + db_data
  - [x] Service `frontend` : image Node/Nginx, port 3000, depends_on backend
  - [x] Déclarer les volumes nommés `videos_data` et `db_data`
- [x] Créer `backend/Dockerfile` multi-stage (base + production + test) (AC: 1)
  - [x] Stage `base` : python:3.11-slim + apt install ffmpeg + pip install requirements
  - [x] Stage `production` : COPY app/ + CMD uvicorn
  - [x] Stage `test` : COPY . + CMD pytest
- [x] Créer `frontend/Dockerfile` multi-stage (builder + production) (AC: 1)
  - [x] Stage `builder` : node:20-alpine + npm ci + npm run build
  - [x] Stage `production` : nginx:1.25-alpine + COPY dist + COPY nginx.conf
- [x] Créer `frontend/nginx.conf` avec SPA fallback + proxy /api/ (AC: 3)
- [x] Créer `backend/app/main.py` avec health check + CORS (AC: 2)
  - [x] `GET /api/v1/health` → `{"status": "ok"}`
  - [x] CORS avec `ALLOWED_ORIGINS` depuis env
- [x] Créer `.env.example` avec toutes les variables (AC: 5)
- [x] Créer `.gitignore` complet (AC: 6)
- [x] Écrire et faire passer le test health check (AC: 2)

## Dev Notes

### Stack technique obligatoire (ne pas dévier)

- **Backend** : Python 3.11, FastAPI 0.110+, Uvicorn 0.29+
- **Frontend** : Node 20, Nginx 1.25-alpine
- **Infrastructure** : Docker Compose v2, FFmpeg installé dans le conteneur backend via apt

### Variables d'environnement requises

```bash
# Backend
DATABASE_URL=sqlite:////data/db.sqlite3
VIDEOS_DIR=/videos
ALLOWED_ORIGINS=http://localhost:3000
MAX_VIDEO_SIZE_MB=2000
TEMP_DIR=/tmp/annotations_exports

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
```

### docker-compose.yml exact attendu

```yaml
services:
  frontend:
    build:
      context: ./frontend
      target: production
    ports:
      - "3000:80"
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
  videos_data:
  db_data:
```

### nginx.conf obligatoire (SPA + proxy API)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Pattern CORS FastAPI

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}
```

### Test à écrire EN PREMIER (TDD strict)

```python
# backend/tests/test_health.py
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check_returns_ok():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

### Project Structure Notes

```
/                           ← racine du repo
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt    ← créer vide pour l'instant (fastapi uvicorn)
│   └── app/
│       └── main.py
├── frontend/
│   ├── Dockerfile
│   └── nginx.conf
└── .github/
    └── workflows/          ← vide pour l'instant (S1.4)
```

### Anti-patterns à éviter

- Ne PAS hardcoder `http://localhost:3000` dans le code — utiliser `os.getenv("ALLOWED_ORIGINS")`
- Ne PAS committer `.env` (seulement `.env.example`)
- Ne PAS utiliser `docker-compose` (v1) — utiliser `docker compose` (v2)
- Le stage `test` du Dockerfile backend doit être indépendant du stage `production`

### References

- Architecture Docker : [Source: planning-artifacts/architecture.md#5-infrastructure-docker]
- Variables d'env : [Source: planning-artifacts/architecture.md#7-variables-denvironnement]
- Stack technique : [Source: planning-artifacts/architecture.md#2-stack-technologique]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage.

### Completion Notes List

- Test TDD écrit en premier (`backend/tests/test_health.py`) — 1/1 PASSED
- CORS via `os.getenv("ALLOWED_ORIGINS")` — aucune valeur hardcodée
- `pytest.ini` avec `asyncio_mode = auto` pour pytest-asyncio 0.23+
- `requirements.txt` inclut dépendances de test (pytest, pytest-asyncio, httpx)

### File List

- `docker-compose.yml`
- `.env.example`
- `.gitignore`
- `backend/Dockerfile`
- `backend/requirements.txt`
- `backend/pytest.ini`
- `backend/app/__init__.py`
- `backend/app/main.py`
- `backend/tests/__init__.py`
- `backend/tests/test_health.py`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `.github/workflows/` (vide — Story 1.4)
