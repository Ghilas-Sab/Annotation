# Story 1.4: CI/CD GitHub Actions

Status: ready-for-dev

## Story

As a développeur,
I want un pipeline CI/CD qui lance les tests backend + frontend et le build Docker à chaque push,
so that toute régression est détectée automatiquement avant le merge.

## Acceptance Criteria

1. Le job `backend-tests` installe FFmpeg, exécute `pytest --cov` et publie un rapport de couverture
2. Le job `frontend-tests` exécute `npm run test:coverage` sans erreur
3. Le job `build-docker` se déclenche uniquement si `backend-tests` ET `frontend-tests` passent (`needs`)
4. Le pipeline se déclenche sur `push` et `pull_request` vers toutes les branches
5. La couverture de code backend est publiée via Codecov
6. Le pipeline passe en vert sur `main` dès que S1.2 et S1.3 sont implémentées

## Tasks / Subtasks

- [ ] Créer `.github/workflows/ci.yml` (AC: 1, 2, 3, 4)
  - [ ] Trigger sur `push` et `pull_request`
  - [ ] Job `backend-tests` : ubuntu-latest, Python 3.11, FFmpeg, pytest --cov
  - [ ] Job `frontend-tests` : ubuntu-latest, Node 20, npm ci, npm run test:coverage
  - [ ] Job `build-docker` : ubuntu-latest, `needs: [backend-tests, frontend-tests]`, `docker compose build`
- [ ] Ajouter script `test:coverage` dans `frontend/package.json` (AC: 2)
  - [ ] `"test:coverage": "vitest run --coverage"`
- [ ] Ajouter script `test` dans `frontend/package.json` (AC: 2)
  - [ ] `"test": "vitest run"`
- [ ] Vérifier que `pytest` est dans `backend/requirements.txt` (AC: 1)
  - [ ] `pytest`, `pytest-cov`, `pytest-asyncio`, `httpx` présents
- [ ] Valider manuellement en pushant sur une branche feature (AC: 6)

## Dev Notes

### CI/CD workflow exact attendu

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
  pull_request:

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install FFmpeg
        run: sudo apt-get update && sudo apt-get install -y ffmpeg

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r backend/requirements.txt

      - name: Run tests
        run: pytest backend/tests/ --cov=backend/app --cov-report=xml
        env:
          DATABASE_URL: sqlite:///./test.db
          VIDEOS_DIR: /tmp/test_videos
          ALLOWED_ORIGINS: http://localhost:3000

      - uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
          fail_ci_if_error: false

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci --prefix frontend

      - name: Run tests
        run: npm run test:coverage --prefix frontend

  build-docker:
    needs: [backend-tests, frontend-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker images
        run: docker compose build
```

### Scripts package.json frontend requis

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### requirements.txt backend final (vérifier présence de ces packages)

```
fastapi==0.110.0
uvicorn==0.29.0
sqlalchemy==2.0.29
alembic==1.13.1
pydantic==2.6.4
python-multipart==0.0.9
aiofiles==23.2.1
ffmpeg-python==0.2.0
numpy==1.26.4
scipy==1.12.0
pytest==8.1.1
pytest-cov==4.1.0
pytest-asyncio==0.23.6
httpx==0.27.0
```

### Variables d'environnement pour pytest en CI

Les tests pytest ont besoin de ces variables dans l'environnement CI :
```
DATABASE_URL=sqlite:///./test.db
VIDEOS_DIR=/tmp/test_videos
ALLOWED_ORIGINS=http://localhost:3000
```
Les injecter via la section `env:` du step `Run tests`.

### pytest.ini ou pyproject.toml (recommandé)

Créer `backend/pytest.ini` pour éviter les warnings asyncio :
```ini
[pytest]
asyncio_mode = auto
```

### Pas de validation automatique possible

Ce story n'a pas de tests unitaires automatisables — la validation se fait en observant le statut des checks GitHub après le premier push. Considérer comme "done" quand le pipeline passe en vert.

### Project Structure Notes

```
.github/
└── workflows/
    └── ci.yml          ← créer

frontend/
└── package.json        ← modifier : ajouter scripts test et test:coverage

backend/
├── requirements.txt    ← vérifier présence de pytest, pytest-cov, pytest-asyncio, httpx
└── pytest.ini          ← créer (asyncio_mode = auto)
```

### Anti-patterns à éviter

- Ne PAS utiliser `docker-compose` (v1) dans la CI — utiliser `docker compose` (v2, sans tiret)
- Ne PAS mettre `fail_ci_if_error: true` sur Codecov pour les premières itérations (couverture faible normale)
- Ne PAS cacher `node_modules` directement — utiliser `cache: 'npm'` avec `cache-dependency-path`
- Le chemin `--cov=backend/app` doit correspondre exactement à la structure du code

### References

- CI/CD config : [Source: planning-artifacts/architecture.md#63-cicd-github-actions]
- Stack backend : [Source: planning-artifacts/architecture.md#22-backend]
- Stack frontend : [Source: planning-artifacts/architecture.md#21-frontend]

## Dev Agent Record

### Agent Model Used

_à remplir par le dev agent_

### Debug Log References

### Completion Notes List

### File List
