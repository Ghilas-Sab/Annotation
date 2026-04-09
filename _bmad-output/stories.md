# Stories — AnnotaRythm v1

**Auteur :** Bob (BMad Scrum Master)  
**Date :** 2026-04-09  
**Statut :** Validé par Ghilas

---

## EPIC 1 — Socle Technique

---

### S1.1 — Infrastructure Docker Compose

**En tant que** développeur,  
**Je veux** un `docker-compose.yml` fonctionnel avec frontend, backend et volumes,  
**Afin de** démarrer l'environnement complet avec `docker compose up`.

#### Critères d'acceptation
- [ ] `docker compose up` démarre les deux services sans erreur
- [ ] Le backend répond sur `http://localhost:8000/api/v1/health` → `{"status": "ok"}`
- [ ] Le frontend est accessible sur `http://localhost:3000`
- [ ] Les volumes `videos_data` et `db_data` sont montés correctement
- [ ] `.env.example` présent à la racine avec toutes les variables documentées
- [ ] `.gitignore` exclut `.env`, `__pycache__`, `node_modules`, `*.db`

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_health.py
def test_health_check_returns_ok(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

#### Fichiers à créer
```
docker-compose.yml
.env.example
.gitignore
backend/Dockerfile
frontend/Dockerfile
backend/app/main.py          # FastAPI app + /health endpoint + CORS
frontend/nginx.conf
```

#### Dépendances
- Aucune (point de départ)

---

### S1.2 — Bootstrap Backend FastAPI + Base de Données

**En tant que** développeur,  
**Je veux** un backend FastAPI avec SQLAlchemy, Alembic et les modèles initiaux,  
**Afin de** disposer d'une base de données versionnée dès le premier commit.

#### Critères d'acceptation
- [ ] `alembic upgrade head` crée les tables `projects`, `videos`, `annotations`
- [ ] Les modèles SQLAlchemy correspondent exactement au schéma de données de l'architecture
- [ ] Les schémas Pydantic sont définis pour Project, Video, Annotation
- [ ] `pytest` passe avec la fixture `db_session` et `client` en place
- [ ] `get_db` injecte une session SQLAlchemy dans les routes

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/conftest.py  (fixture complète)
# backend/tests/test_db.py
def test_tables_created(db_session):
    """Vérifie que les 3 tables existent après migration."""
    from sqlalchemy import inspect
    inspector = inspect(db_session.bind)
    tables = inspector.get_table_names()
    assert "projects" in tables
    assert "videos" in tables
    assert "annotations" in tables

def test_project_model_fields(db_session):
    from app.models.project import Project
    import uuid
    p = Project(id=str(uuid.uuid4()), name="Test", description="desc")
    db_session.add(p)
    db_session.commit()
    assert db_session.query(Project).count() == 1
```

#### Fichiers à créer
```
backend/app/database.py
backend/app/config.py
backend/app/models/__init__.py
backend/app/models/project.py
backend/app/models/video.py
backend/app/models/annotation.py
backend/app/schemas/__init__.py
backend/app/schemas/project.py
backend/app/schemas/video.py
backend/app/schemas/annotation.py
backend/alembic.ini
backend/alembic/env.py
backend/alembic/versions/001_initial.py
backend/tests/conftest.py
backend/tests/test_db.py
backend/requirements.txt
```

#### Dépendances
- S1.1 (Docker + structure de projet)

---

### S1.3 — Bootstrap Frontend React/TypeScript

**En tant que** développeur,  
**Je veux** un projet Vite + React + TypeScript configuré avec Zustand et TanStack Query,  
**Afin de** avoir une base de développement frontend opérationnelle et testable.

#### Critères d'acceptation
- [ ] `npm run dev` démarre le serveur Vite sur le port 3000
- [ ] `npm run test` exécute Vitest sans erreur
- [ ] `npm run build` produit un build production sans erreur TypeScript
- [ ] Zustand et TanStack Query sont initialisés (providers en place)
- [ ] Les types partagés TypeScript sont définis (`annotation.ts`, `project.ts`, `statistics.ts`)
- [ ] Un test de smoke passe (composant App se monte sans erreur)

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/App.test.tsx
import { render, screen } from '@testing-library/react'
import App from './App'

test('app renders without crash', () => {
  render(<App />)
  expect(screen.getByText(/AnnotaRythm/i)).toBeInTheDocument()
})
```

#### Fichiers à créer
```
frontend/package.json
frontend/vite.config.ts
frontend/tsconfig.json
frontend/index.html
frontend/src/main.tsx
frontend/src/App.tsx
frontend/src/App.test.tsx
frontend/src/types/annotation.ts
frontend/src/types/project.ts
frontend/src/types/statistics.ts
frontend/src/stores/videoStore.ts
frontend/src/stores/annotationStore.ts
frontend/src/stores/audioStore.ts
```

#### Dépendances
- S1.1

---

### S1.4 — CI/CD GitHub Actions

**En tant que** développeur,  
**Je veux** un pipeline CI/CD qui lance tests backend + frontend et build Docker à chaque push,  
**Afin de** détecter les régressions immédiatement.

#### Critères d'acceptation
- [ ] Le job `backend-tests` installe FFmpeg, lance `pytest --cov`, publie le rapport Codecov
- [ ] Le job `frontend-tests` lance `npm run test:coverage`
- [ ] Le job `build-docker` se déclenche uniquement si les tests passent (`needs`)
- [ ] Le pipeline passe sur `main` dès le socle S1.2 + S1.3 en place

#### Section TDD — Tests à écrire en premier
> Pas de test unitaire pour la CI elle-même. Valider manuellement en pushant sur une branche feature et vérifier le statut des checks GitHub.

#### Fichiers à créer
```
.github/workflows/ci.yml
```

#### Dépendances
- S1.2, S1.3

---

## EPIC 2 — Gestion de Projets

---

### S2.1 — CRUD Projets (Backend)

**En tant qu'** utilisateur,  
**Je veux** créer, lister, modifier et supprimer des projets via l'API,  
**Afin de** organiser mes vidéos par projet.

#### Critères d'acceptation
- [ ] `POST /api/v1/projects` crée un projet et retourne 201 + objet créé
- [ ] `GET /api/v1/projects` retourne la liste triée par `created_at` DESC
- [ ] `GET /api/v1/projects/{id}` retourne le détail avec la liste des vidéos
- [ ] `PUT /api/v1/projects/{id}` met à jour `name` et/ou `description`
- [ ] `DELETE /api/v1/projects/{id}` supprime le projet + ses vidéos + leurs annotations (cascade)
- [ ] `POST` avec `name` vide retourne 422 (validation Pydantic)
- [ ] `GET /api/v1/projects/{id}` avec UUID inconnu retourne 404

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_projects.py
async def test_create_project(client):
    res = await client.post("/api/v1/projects", json={"name": "Mon Projet", "description": ""})
    assert res.status_code == 201
    assert res.json()["name"] == "Mon Projet"

async def test_create_project_empty_name_fails(client):
    res = await client.post("/api/v1/projects", json={"name": ""})
    assert res.status_code == 422

async def test_list_projects(client):
    await client.post("/api/v1/projects", json={"name": "P1"})
    await client.post("/api/v1/projects", json={"name": "P2"})
    res = await client.get("/api/v1/projects")
    assert len(res.json()) == 2

async def test_delete_project(client):
    res = await client.post("/api/v1/projects", json={"name": "P"})
    pid = res.json()["id"]
    del_res = await client.delete(f"/api/v1/projects/{pid}")
    assert del_res.status_code == 204

async def test_get_project_not_found(client):
    res = await client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404
```

#### Fichiers à créer / modifier
```
backend/app/routers/projects.py    # créer
backend/app/main.py                # modifier — inclure le router
backend/tests/test_projects.py     # créer
```

#### Dépendances
- S1.2

---

### S2.2 — Upload Vidéo + Métadonnées FFmpeg (Backend)

**En tant qu'** utilisateur,  
**Je veux** uploader une vidéo dans un projet et obtenir ses métadonnées automatiquement,  
**Afin de** connaître la durée, le FPS et le nombre total de frames.

#### Critères d'acceptation
- [ ] `POST /api/v1/projects/{id}/videos` accepte un fichier multipart et retourne 201
- [ ] Les métadonnées (`fps`, `duration_seconds`, `total_frames`, `width`, `height`, `codec`) sont extraites via FFmpeg et stockées en base
- [ ] Le fichier vidéo est sauvegardé dans le volume `/videos/` avec un nom unique (UUID)
- [ ] `GET /api/v1/projects/{id}/videos` liste les vidéos du projet
- [ ] `GET /api/v1/videos/{id}` retourne les métadonnées complètes
- [ ] `DELETE /api/v1/videos/{id}` supprime la vidéo (fichier + DB + annotations associées)
- [ ] Upload sur un projet inexistant retourne 404

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_videos.py
async def test_upload_video(client, tmp_video_file, project_id):
    with open(tmp_video_file, "rb") as f:
        res = await client.post(
            f"/api/v1/projects/{project_id}/videos",
            files={"file": ("test.mp4", f, "video/mp4")}
        )
    assert res.status_code == 201
    data = res.json()
    assert data["fps"] > 0
    assert data["total_frames"] > 0

async def test_video_metadata_stored(client, uploaded_video_id):
    res = await client.get(f"/api/v1/videos/{uploaded_video_id}")
    assert res.status_code == 200
    assert "fps" in res.json()
    assert "duration_seconds" in res.json()

# conftest.py — ajouter fixture tmp_video_file (vidéo synthétique FFmpeg 5s)
```

#### Fichiers à créer / modifier
```
backend/app/routers/videos.py          # créer
backend/app/services/video_service.py  # créer
backend/app/main.py                    # modifier — inclure le router
backend/tests/test_videos.py           # créer
backend/tests/conftest.py              # modifier — fixture tmp_video_file
```

#### Dépendances
- S2.1

---

### S2.3 — Streaming Vidéo avec Range Requests (Backend)

**En tant qu'** utilisateur,  
**Je veux** que le lecteur vidéo streame la vidéo avec support des Range headers,  
**Afin d'** avoir une lecture fluide et un seek rapide sans télécharger toute la vidéo.

#### Critères d'acceptation
- [ ] `GET /api/v1/videos/{id}/stream` retourne le fichier vidéo en streaming
- [ ] Support des `Range` headers HTTP (réponse 206 Partial Content)
- [ ] En-tête `Content-Type` correct selon le codec vidéo
- [ ] En-tête `Accept-Ranges: bytes` présent dans la réponse
- [ ] Requête sans `Range` header retourne 200 + fichier complet

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_videos.py (ajouter)
async def test_video_stream_full(client, uploaded_video_id):
    res = await client.get(f"/api/v1/videos/{uploaded_video_id}/stream")
    assert res.status_code == 200
    assert "video" in res.headers["content-type"]

async def test_video_stream_range(client, uploaded_video_id):
    res = await client.get(
        f"/api/v1/videos/{uploaded_video_id}/stream",
        headers={"Range": "bytes=0-1023"}
    )
    assert res.status_code == 206
    assert res.headers["accept-ranges"] == "bytes"
```

#### Fichiers à créer / modifier
```
backend/app/routers/videos.py      # modifier — ajouter endpoint /stream
backend/tests/test_videos.py       # modifier — ajouter tests Range
```

#### Dépendances
- S2.2

---

### S2.4 — Page Projets (Frontend)

**En tant qu'** utilisateur,  
**Je veux** voir la liste de mes projets, en créer un nouveau et en supprimer,  
**Afin de** gérer mes projets directement depuis l'interface.

#### Critères d'acceptation
- [ ] La page affiche les projets en grille (2 colonnes desktop, 1 mobile)
- [ ] Chaque carte affiche : nom, nombre de vidéos, nombre d'annotations, date de modification
- [ ] Bouton "+ Nouveau projet" ouvre un formulaire inline (pas de modale)
- [ ] La création valide que le nom n'est pas vide (feedback immédiat)
- [ ] Le bouton supprimer demande confirmation avant suppression
- [ ] État de chargement affiché pendant les appels API (TanStack Query)
- [ ] Thème sombre appliqué (palette UX design)

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/pages/ProjectsPage.test.tsx
test('displays project list', async () => {
  server.use(http.get('/api/v1/projects', () => HttpResponse.json([
    { id: '1', name: 'Mon Projet', description: '', videos: [] }
  ])))
  render(<ProjectsPage />)
  expect(await screen.findByText('Mon Projet')).toBeInTheDocument()
})

test('shows inline form on new project click', async () => {
  render(<ProjectsPage />)
  fireEvent.click(screen.getByText('+ Nouveau projet'))
  expect(screen.getByLabelText('Nom du projet')).toBeInTheDocument()
})

test('disables submit if name is empty', () => {
  render(<ProjectsPage />)
  fireEvent.click(screen.getByText('+ Nouveau projet'))
  expect(screen.getByText('Créer le projet →')).toBeDisabled()
})
```

#### Fichiers à créer / modifier
```
frontend/src/pages/ProjectsPage.tsx
frontend/src/pages/ProjectsPage.test.tsx
frontend/src/components/projects/ProjectList.tsx
frontend/src/components/projects/ProjectCard.tsx
frontend/src/api/projects.ts        # TanStack Query hooks
```

#### Dépendances
- S1.3, S2.1

---

### S2.5 — Page Détail Projet + Upload Vidéo (Frontend)

**En tant qu'** utilisateur,  
**Je veux** voir les vidéos d'un projet, en uploader de nouvelles et en supprimer,  
**Afin de** gérer le contenu d'un projet.

#### Critères d'acceptation
- [ ] La page affiche le nom du projet + breadcrumb (`Projets > Nom`)
- [ ] Zone drag-and-drop pour uploader une vidéo (tous formats)
- [ ] Barre de progression pendant l'upload
- [ ] Chaque vidéo affiche : nom, durée, FPS, nombre d'annotations
- [ ] Bouton "Annoter →" navigue vers la page d'annotation
- [ ] Bouton "Stats" navigue vers la page statistiques
- [ ] Suppression d'une vidéo avec confirmation

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/pages/ProjectDetailPage.test.tsx
test('renders project videos', async () => {
  // mock GET /api/v1/projects/1 avec 2 vidéos
  render(<ProjectDetailPage />)
  expect(await screen.findAllByRole('listitem')).toHaveLength(2)
})

test('shows upload zone', () => {
  render(<ProjectDetailPage />)
  expect(screen.getByText(/Glissez-déposez/i)).toBeInTheDocument()
})
```

#### Fichiers à créer / modifier
```
frontend/src/pages/ProjectDetailPage.tsx
frontend/src/pages/ProjectDetailPage.test.tsx
frontend/src/components/projects/VideoUpload.tsx
frontend/src/api/projects.ts    # ajouter hooks vidéos
```

#### Dépendances
- S2.4, S2.2, S2.3

---

## EPIC 3 — Annotation Vidéo

---

### S3.1 — CRUD Annotations (Backend)

**En tant qu'** utilisateur,  
**Je veux** créer, lister, modifier et supprimer des annotations via l'API,  
**Afin de** persister mes annotations frame-précises.

#### Critères d'acceptation
- [ ] `POST /api/v1/videos/{id}/annotations` crée une annotation (frame_number + label) et calcule `timestamp_ms = frame_number / fps * 1000`
- [ ] `GET /api/v1/videos/{id}/annotations` retourne la liste triée par `frame_number` ASC
- [ ] `PUT /api/v1/annotations/{id}` modifie `frame_number` et/ou `label` (recalcule `timestamp_ms`)
- [ ] `DELETE /api/v1/annotations/{id}` supprime l'annotation
- [ ] `DELETE /api/v1/videos/{id}/annotations` supprime TOUTES les annotations d'une vidéo
- [ ] Créer une annotation sur une frame négative retourne 422
- [ ] Créer une annotation sur une frame > `total_frames` retourne 422

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_annotations.py
async def test_create_annotation(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": 42, "label": "beat"})
    assert res.status_code == 201
    data = res.json()
    assert data["frame_number"] == 42
    assert data["timestamp_ms"] == pytest.approx(42 / 25.0 * 1000, rel=1e-3)

async def test_list_annotations_sorted(client, video_id):
    for frame in [100, 10, 50]:
        await client.post(f"/api/v1/videos/{video_id}/annotations",
                          json={"frame_number": frame, "label": "x"})
    res = await client.get(f"/api/v1/videos/{video_id}/annotations")
    frames = [a["frame_number"] for a in res.json()]
    assert frames == sorted(frames)

async def test_annotation_invalid_frame(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations",
                            json={"frame_number": -1, "label": "x"})
    assert res.status_code == 422
```

#### Fichiers à créer / modifier
```
backend/app/routers/annotations.py  # créer
backend/app/main.py                 # modifier — inclure le router
backend/tests/test_annotations.py   # créer
backend/tests/conftest.py           # modifier — fixture video_id
```

#### Dépendances
- S2.2

---

### S3.2 — Bulk Placement + Décalage Global (Backend)

**En tant qu'** utilisateur,  
**Je veux** placer automatiquement N annotations équidistantes et décaler toutes les annotations,  
**Afin de** gagner du temps sur l'annotation rythmique régulière.

#### Critères d'acceptation
- [ ] `POST /api/v1/videos/{id}/annotations/bulk` crée N annotations équidistantes entre `start_frame` et `end_frame` avec le préfixe donné
- [ ] L'intervalle est calculé : `(end_frame - start_frame) / (count - 1)`
- [ ] Les labels sont `{prefix} 1`, ..., `{prefix} N` (ou `1..N` si préfixe vide)
- [ ] Les annotations bulk sont identiques aux manuelles (modifiables, supprimables)
- [ ] `PATCH /api/v1/videos/{id}/annotations/shift` décale toutes les annotations de `offset_ms` (positif ou négatif)
- [ ] Après shift, les `timestamp_ms` et `frame_number` sont recalculés
- [ ] Shift qui ferait passer une annotation sous la frame 0 retourne 422

#### Section TDD — Tests à écrire en premier
```python
async def test_bulk_placement(client, video_id):
    res = await client.post(f"/api/v1/videos/{video_id}/annotations/bulk",
                            json={"start_frame": 0, "end_frame": 100,
                                  "count": 5, "prefix": "beat"})
    assert res.status_code == 201
    annotations = res.json()
    assert len(annotations) == 5
    assert annotations[0]["label"] == "beat 1"
    assert annotations[0]["frame_number"] == 0
    assert annotations[4]["frame_number"] == 100

async def test_global_shift(client, video_id):
    await client.post(f"/api/v1/videos/{video_id}/annotations",
                      json={"frame_number": 50, "label": "x"})
    fps = 25.0
    offset_ms = 1000.0  # +1 seconde = +25 frames
    res = await client.patch(f"/api/v1/videos/{video_id}/annotations/shift",
                             json={"offset_ms": offset_ms})
    assert res.status_code == 200
    ann = res.json()[0]
    assert ann["frame_number"] == 75

async def test_shift_below_zero_fails(client, video_id):
    await client.post(f"/api/v1/videos/{video_id}/annotations",
                      json={"frame_number": 5, "label": "x"})
    res = await client.patch(f"/api/v1/videos/{video_id}/annotations/shift",
                             json={"offset_ms": -10000.0})
    assert res.status_code == 422
```

#### Fichiers à créer / modifier
```
backend/app/routers/annotations.py  # modifier — bulk + shift
backend/tests/test_annotations.py   # modifier — ajouter tests bulk/shift
```

#### Dépendances
- S3.1

---

### S3.3 — Lecteur Vidéo Frame-Précis (Frontend)

**En tant qu'** utilisateur,  
**Je veux** un lecteur vidéo avec seek frame-précis via `requestVideoFrameCallback`,  
**Afin de** naviguer à la frame exacte sans latence.

#### Critères d'acceptation
- [ ] La vidéo se charge depuis le stream backend (`/api/v1/videos/{id}/stream`)
- [ ] Le composant affiche la frame courante et le timestamp (`HH:MM:SS.mmm`)
- [ ] `seekToFrame(n)` positionne `video.currentTime = (n + 0.001) / fps`
- [ ] `requestVideoFrameCallback` met à jour `videoStore.currentFrame` à chaque frame rendue
- [ ] Le FPS affiché correspond aux métadonnées de la vidéo
- [ ] `FrameCounter` affiche : `Frame 42 / 3750 — 00:01:40.800`

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/hooks/useFrameSeek.test.ts
test('seekToFrame sets correct currentTime', () => {
  const mockVideo = { currentTime: 0 }
  seekToFrame(mockVideo as any, 42, 25)
  expect(mockVideo.currentTime).toBeCloseTo((42 + 0.001) / 25, 5)
})

// frontend/src/utils/frameUtils.test.ts
test('frameToTimestamp converts correctly', () => {
  expect(frameToTimestamp(42, 25)).toBe('00:00:01.680')
  expect(frameToTimestamp(0, 25)).toBe('00:00:00.000')
  expect(frameToTimestamp(1500, 25)).toBe('00:01:00.000')
})
```

#### Fichiers à créer / modifier
```
frontend/src/components/video/VideoPlayer.tsx
frontend/src/components/video/FrameCounter.tsx
frontend/src/components/video/PlaybackControls.tsx
frontend/src/hooks/useFrameSeek.ts
frontend/src/hooks/useRequestVideoFrame.ts
frontend/src/hooks/useFrameSeek.test.ts
frontend/src/utils/frameUtils.ts
frontend/src/utils/frameUtils.test.ts
frontend/src/stores/videoStore.ts    # compléter
```

#### Dépendances
- S1.3, S2.3

---

### S3.4 — Bindings Clavier (Frontend)

**En tant qu'** utilisateur,  
**Je veux** naviguer et annoter entièrement au clavier,  
**Afin d'** annoter sans interrompre mon flux de travail.

#### Critères d'acceptation
- [ ] `→` : frame suivante (`currentFrame + 1`)
- [ ] `←` : frame précédente (`currentFrame - 1`)
- [ ] `Shift+→` : +5 frames
- [ ] `Shift+←` : -5 frames
- [ ] `Ctrl+→` : saut dynamique inter-annotation vers l'avant (fallback 10 frames)
- [ ] `Ctrl+←` : saut dynamique inter-annotation vers l'arrière (fallback 10 frames)
- [ ] `Espace` : crée une annotation sur la frame courante (appel API + update store)
- [ ] Aucune navigation sous la frame 0 ni au-delà de `total_frames`
- [ ] Les raccourcis sont désactivés quand le focus est dans un champ texte

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/hooks/useVideoKeyboard.test.ts
test('ArrowRight seeks to next frame', () => {
  const seekFn = vi.fn()
  renderHook(() => useVideoKeyboard({ currentFrame: 10, fps: 25, seek: seekFn, annotations: [] }))
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  expect(seekFn).toHaveBeenCalledWith(11)
})

test('Space creates annotation at current frame', async () => {
  const createFn = vi.fn()
  renderHook(() => useVideoKeyboard({ currentFrame: 42, fps: 25, seek: vi.fn(),
                                       annotations: [], createAnnotation: createFn }))
  fireEvent.keyDown(window, { key: ' ' })
  expect(createFn).toHaveBeenCalledWith(42)
})

// frontend/src/utils/bpmUtils.test.ts
test('getInterAnnotationStep returns interval between last two left annotations', () => {
  const annotations = [{ frame_number: 10 }, { frame_number: 25 },
                        { frame_number: 40 }, { frame_number: 70 }]
  expect(getInterAnnotationStep(50, annotations)).toBe(15)
})

test('getInterAnnotationStep returns fallback when less than 2 left annotations', () => {
  expect(getInterAnnotationStep(5, [{ frame_number: 3 }])).toBe(10)
})
```

#### Fichiers à créer / modifier
```
frontend/src/hooks/useVideoKeyboard.ts
frontend/src/hooks/useVideoKeyboard.test.ts
frontend/src/utils/bpmUtils.ts
frontend/src/utils/bpmUtils.test.ts
```

#### Dépendances
- S3.3, S3.1

---

### S3.5 — Timeline Canvas avec Annotations (Frontend)

**En tant qu'** utilisateur,  
**Je veux** une timeline visuelle qui affiche la position courante et les marqueurs d'annotations,  
**Afin de** visualiser la distribution des annotations dans le temps.

#### Critères d'acceptation
- [ ] La timeline est rendue sur un `<canvas>` proportionnel à la durée totale
- [ ] Un curseur (ligne verticale accent primaire) indique la frame courante
- [ ] Chaque annotation est représentée par un marqueur vertical (couleur accent)
- [ ] Clic sur la timeline repositionne la vidéo à la frame correspondante
- [ ] La timeline se redessine à chaque changement de frame courante
- [ ] Hover sur un marqueur affiche le label + timestamp en tooltip

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/components/video/VideoTimeline.test.tsx
test('renders canvas element', () => {
  render(<VideoTimeline currentFrame={0} totalFrames={1000} fps={25} annotations={[]} onSeek={vi.fn()} />)
  expect(document.querySelector('canvas')).toBeInTheDocument()
})

test('calls onSeek when clicking timeline', () => {
  const onSeek = vi.fn()
  const { container } = render(
    <VideoTimeline currentFrame={0} totalFrames={1000} fps={25} annotations={[]} onSeek={onSeek} />
  )
  fireEvent.click(container.querySelector('canvas')!, { clientX: 100 })
  expect(onSeek).toHaveBeenCalled()
})
```

#### Fichiers à créer / modifier
```
frontend/src/components/video/VideoTimeline.tsx
frontend/src/components/video/VideoTimeline.test.tsx
```

#### Dépendances
- S3.3

---

### S3.6 — Mode Vérification Sonore (Frontend)

**En tant qu'** utilisateur,  
**Je veux** activer un bip sonore à chaque frame annotée lors de la lecture,  
**Afin de** valider la précision rythmique de mes annotations à l'oreille.

#### Critères d'acceptation
- [ ] Un bouton toggle "Bip ON/OFF" contrôle le mode sonore (état dans `audioStore`)
- [ ] En mode ON : un bip est émis à chaque frame annotée pendant la lecture
- [ ] Le bip est généré via Web Audio API (oscillateur 880Hz, 50ms)
- [ ] Aucun fichier audio externe nécessaire
- [ ] En mode OFF : aucun son

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/hooks/useAudioBeep.test.ts
test('playBeep creates and starts oscillator', () => {
  const mockContext = {
    createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
                                     frequency: { value: 0 } })),
    createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(),
                                                          exponentialRampToValueAtTime: vi.fn() } })),
    destination: {},
    currentTime: 0,
  }
  playBeep(mockContext as any)
  expect(mockContext.createOscillator).toHaveBeenCalled()
})
```

#### Fichiers à créer / modifier
```
frontend/src/hooks/useAudioBeep.ts
frontend/src/hooks/useAudioBeep.test.ts
frontend/src/stores/audioStore.ts    # compléter
```

#### Dépendances
- S3.3

---

### S3.7 — Formulaire Placement Automatique Équidistant (Frontend)

**En tant qu'** utilisateur,  
**Je veux** saisir un début, une fin, un nombre et un préfixe pour créer N annotations automatiquement,  
**Afin de** annoter rapidement des séquences rythmiques régulières.

#### Critères d'acceptation
- [ ] Le formulaire permet de saisir : début (frame ou timestamp), fin, nombre, préfixe
- [ ] Preview du nombre d'annotations et de l'intervalle calculé avant validation
- [ ] Validation : début < fin, nombre ≥ 2, frames dans les limites de la vidéo
- [ ] À la validation : appel `POST /api/v1/videos/{id}/annotations/bulk` + refresh liste
- [ ] Les annotations créées apparaissent immédiatement dans la timeline et la liste

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/components/annotations/BulkPlacementForm.test.tsx
test('shows interval preview', async () => {
  render(<BulkPlacementForm totalFrames={1000} fps={25} videoId="1" />)
  fireEvent.change(screen.getByLabelText('Début'), { target: { value: '0' } })
  fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '100' } })
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '5' } })
  expect(screen.getByText(/intervalle.*25/i)).toBeInTheDocument()
})

test('disables submit when start >= end', () => {
  render(<BulkPlacementForm totalFrames={1000} fps={25} videoId="1" />)
  // saisir début > fin
  expect(screen.getByRole('button', { name: /placer/i })).toBeDisabled()
})
```

#### Fichiers à créer / modifier
```
frontend/src/components/annotations/BulkPlacementForm.tsx
frontend/src/components/annotations/BulkPlacementForm.test.tsx
frontend/src/api/annotations.ts    # hooks TanStack Query
```

#### Dépendances
- S3.2, S3.3

---

### S3.8 — Page Annotation Complète (Assemblage)

**En tant qu'** utilisateur,  
**Je veux** une page d'annotation qui assemble le lecteur, la timeline, la liste d'annotations et les formulaires,  
**Afin d'** avoir un espace de travail d'annotation complet.

#### Critères d'acceptation
- [ ] Layout : lecteur vidéo (gauche, 70%) + panneau droit (liste annotations + bulk form)
- [ ] Timeline sous le lecteur, pleine largeur
- [ ] La liste d'annotations est scrollable, triée par frame ASC
- [ ] Chaque annotation dans la liste est cliquable → seek vers la frame
- [ ] Modification inline du label d'une annotation (double-clic)
- [ ] Suppression d'une annotation avec icône corbeille
- [ ] La page charge les annotations depuis l'API au montage

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/pages/AnnotationPage.test.tsx
test('loads and displays annotations', async () => {
  // mock API
  render(<AnnotationPage videoId="1" />)
  expect(await screen.findByText('beat 1')).toBeInTheDocument()
})

test('clicking annotation seeks to frame', async () => {
  const seekFn = vi.fn()
  // ...
  fireEvent.click(await screen.findByText('beat 1'))
  expect(seekFn).toHaveBeenCalledWith(expect.any(Number))
})
```

#### Fichiers à créer / modifier
```
frontend/src/pages/AnnotationPage.tsx
frontend/src/pages/AnnotationPage.test.tsx
frontend/src/components/annotations/AnnotationList.tsx
frontend/src/components/annotations/AnnotationItem.tsx
frontend/src/api/annotations.ts    # compléter
```

#### Dépendances
- S3.4, S3.5, S3.6, S3.7

---

## EPIC 4 — Statistiques Rythmiques

---

### S4.1 — Service de Calcul BPM (Backend)

**En tant que** système,  
**Je veux** calculer toutes les métriques BPM à partir des annotations d'une vidéo,  
**Afin de** fournir une analyse rythmique précise.

#### Critères d'acceptation
- [ ] `compute_bpm_metrics` retourne : `bpm_global`, `bpm_mean`, `bpm_median`, `bpm_variation`, `interval_std_seconds`, `annotation_density_per_minute`, `interval_distribution`, `rhythmic_segments`, `activity_peaks`
- [ ] Avec moins de 2 annotations, retourne `{"error": "Minimum 2 annotations requises"}`
- [ ] Les valeurs correspondent aux calculs NumPy/SciPy attendus sur des données fixes
- [ ] `compute_playback_speed(current_bpm, target_bpm)` retourne `target_bpm / current_bpm`

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_statistics.py
def test_bpm_global():
    # 5 annotations à 25fps, intervalles de 25 frames = 1 bpm = 60
    annotations = [MockAnnotation(i * 25) for i in range(5)]
    result = compute_bpm_metrics(annotations, fps=25.0)
    assert result["bpm_global"] == pytest.approx(60.0, rel=1e-3)

def test_bpm_median():
    annotations = [MockAnnotation(f) for f in [0, 25, 50, 75, 100]]
    result = compute_bpm_metrics(annotations, fps=25.0)
    assert result["bpm_median"] == pytest.approx(60.0, rel=1e-3)

def test_insufficient_annotations():
    result = compute_bpm_metrics([MockAnnotation(0)], fps=25.0)
    assert "error" in result

def test_playback_speed():
    assert compute_playback_speed(120.0, 60.0) == pytest.approx(0.5)
    assert compute_playback_speed(60.0, 120.0) == pytest.approx(2.0)
```

#### Fichiers à créer / modifier
```
backend/app/services/stats_service.py  # créer
backend/tests/test_statistics.py       # créer
```

#### Dépendances
- S3.1

---

### S4.2 — Endpoints Statistiques (Backend)

**En tant qu'** utilisateur,  
**Je veux** appeler l'API pour obtenir les métriques BPM et calculer une vitesse de lecture,  
**Afin d'** intégrer les statistiques dans l'interface.

#### Critères d'acceptation
- [ ] `GET /api/v1/videos/{id}/statistics` retourne les métriques complètes (ou l'erreur si < 2 annotations)
- [ ] `POST /api/v1/videos/{id}/statistics/playback-speed` avec `{"target_bpm": 120}` retourne `{"playback_speed": 2.0, "current_bpm": 60.0}`
- [ ] Les deux endpoints retournent 404 si la vidéo n'existe pas

#### Section TDD — Tests à écrire en premier
```python
async def test_get_statistics(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/statistics")
    assert res.status_code == 200
    assert "bpm_global" in res.json()

async def test_playback_speed(client, video_id_with_annotations):
    res = await client.post(f"/api/v1/videos/{video_id_with_annotations}/statistics/playback-speed",
                            json={"target_bpm": 120.0})
    assert res.status_code == 200
    assert "playback_speed" in res.json()
```

#### Fichiers à créer / modifier
```
backend/app/routers/statistics.py  # créer
backend/app/schemas/statistics.py  # compléter
backend/app/main.py                # modifier — inclure le router
backend/tests/test_statistics.py   # modifier — ajouter tests API
```

#### Dépendances
- S4.1

---

### S4.3 — Dashboard Métriques BPM (Frontend)

**En tant qu'** utilisateur,  
**Je veux** voir un dashboard avec toutes les métriques BPM de mes annotations,  
**Afin d'** analyser le rythme de ma vidéo.

#### Critères d'acceptation
- [ ] Affiche : BPM global, BPM moyen, BPM médian, variation BPM, écart-type des intervalles
- [ ] Affiche : densité d'annotations / minute, nombre total d'annotations
- [ ] Message clair si moins de 2 annotations
- [ ] Données rechargées automatiquement quand les annotations changent (TanStack Query invalidation)

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/components/statistics/BpmMetrics.test.tsx
test('displays bpm global', async () => {
  server.use(http.get('/api/v1/videos/1/statistics', () =>
    HttpResponse.json({ bpm_global: 120.5, bpm_mean: 119.8, bpm_median: 120.0,
                        bpm_variation: 5.2, interval_std_seconds: 0.02,
                        annotation_density_per_minute: 120 })))
  render(<BpmMetrics videoId="1" />)
  expect(await screen.findByText('120.5')).toBeInTheDocument()
})

test('shows error message when less than 2 annotations', async () => {
  server.use(http.get('/api/v1/videos/1/statistics', () =>
    HttpResponse.json({ error: 'Minimum 2 annotations requises' })))
  render(<BpmMetrics videoId="1" />)
  expect(await screen.findByText(/minimum 2/i)).toBeInTheDocument()
})
```

#### Fichiers à créer / modifier
```
frontend/src/pages/StatisticsPage.tsx
frontend/src/components/statistics/BpmMetrics.tsx
frontend/src/components/statistics/BpmMetrics.test.tsx
frontend/src/api/statistics.ts
```

#### Dépendances
- S4.2, S2.5

---

### S4.4 — Histogramme Intervalles + Ajustement Vitesse (Frontend)

**En tant qu'** utilisateur,  
**Je veux** voir l'histogramme des intervalles et saisir un BPM cible pour ajuster la vitesse de lecture,  
**Afin d'** analyser la régularité rythmique et tester mon annotation à un BPM différent.

#### Critères d'acceptation
- [ ] L'histogramme est rendu sur `<canvas>`, barres représentant la distribution des intervalles
- [ ] Saisie d'un BPM cible → appel API → facteur de vitesse affiché (`x0.80`)
- [ ] Le facteur est appliqué à `video.playbackRate` dans le lecteur
- [ ] Validation : BPM cible > 0

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/components/statistics/BpmAdjuster.test.tsx
test('calls playback speed API on submit', async () => {
  const onSpeedChange = vi.fn()
  render(<BpmAdjuster videoId="1" currentBpm={60} onSpeedChange={onSpeedChange} />)
  fireEvent.change(screen.getByLabelText(/BPM cible/i), { target: { value: '120' } })
  fireEvent.click(screen.getByRole('button', { name: /calculer/i }))
  await waitFor(() => expect(onSpeedChange).toHaveBeenCalledWith(2.0))
})
```

#### Fichiers à créer / modifier
```
frontend/src/components/statistics/IntervalHistogram.tsx
frontend/src/components/statistics/BpmAdjuster.tsx
frontend/src/components/statistics/BpmAdjuster.test.tsx
frontend/src/pages/StatisticsPage.tsx    # modifier — assembler
```

#### Dépendances
- S4.3

---

## EPIC 5 — Exports

---

### S5.1 — Export JSON et CSV (Backend)

**En tant qu'** utilisateur,  
**Je veux** exporter mes annotations au format JSON et CSV,  
**Afin de** réutiliser mes données dans d'autres outils.

#### Critères d'acceptation
- [ ] `GET /api/v1/videos/{id}/export/json` retourne un fichier JSON téléchargeable
- [ ] Structure JSON : `{"video": {...metadata}, "annotations": [{frame_number, timestamp_ms, label, created_at}]}`
- [ ] `GET /api/v1/videos/{id}/export/csv` retourne un fichier CSV téléchargeable
- [ ] Headers CSV : `frame_number,timestamp_ms,timestamp_formatted,label`
- [ ] `Content-Disposition: attachment; filename="annotations_{video_name}.{ext}"` dans les headers
- [ ] Si aucune annotation : fichier vide mais valide (JSON `[]`, CSV avec headers seulement)

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_exports.py
async def test_export_json_structure(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/json")
    assert res.status_code == 200
    data = res.json()
    assert "video" in data
    assert "annotations" in data
    assert len(data["annotations"]) > 0
    assert "frame_number" in data["annotations"][0]
    assert "timestamp_ms" in data["annotations"][0]

async def test_export_csv_headers(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/csv")
    assert res.status_code == 200
    lines = res.text.split('\n')
    assert lines[0] == "frame_number,timestamp_ms,timestamp_formatted,label"
```

#### Fichiers à créer / modifier
```
backend/app/routers/exports.py          # créer
backend/app/services/export_service.py  # créer
backend/app/schemas/export.py           # compléter
backend/app/main.py                     # modifier — inclure le router
backend/tests/test_exports.py           # créer
```

#### Dépendances
- S3.1

---

### S5.2 — Export Clip Vidéo FFmpeg (Backend)

**En tant qu'** utilisateur,  
**Je veux** exporter le clip vidéo entre la première et la dernière annotation,  
**Afin d'** isoler la portion annotée de la vidéo.

#### Critères d'acceptation
- [ ] `GET /api/v1/videos/{id}/export/video` retourne un fichier vidéo téléchargeable
- [ ] La découpe correspond à `[timestamp_ms(première annotation), timestamp_ms(dernière annotation)]`
- [ ] Utilise FFmpeg stream copy (`-c copy`) — pas de ré-encodage
- [ ] Le fichier produit a une durée correcte (± quelques frames pour le keyframe alignment)
- [ ] Retourne 422 si moins de 2 annotations (impossible de définir un intervalle)
- [ ] Le fichier temporaire est supprimé après envoi

#### Section TDD — Tests à écrire en premier
```python
async def test_export_video_clip(client, video_id_with_annotations):
    res = await client.get(f"/api/v1/videos/{video_id_with_annotations}/export/video")
    assert res.status_code == 200
    assert "video" in res.headers["content-type"]
    assert len(res.content) > 0

async def test_export_video_requires_2_annotations(client, video_id):
    # vidéo sans annotation
    res = await client.get(f"/api/v1/videos/{video_id}/export/video")
    assert res.status_code == 422
```

#### Fichiers à créer / modifier
```
backend/app/routers/exports.py          # modifier — ajouter /export/video
backend/app/services/video_service.py   # modifier — ajouter extract_clip
backend/tests/test_exports.py           # modifier — ajouter tests vidéo
```

#### Dépendances
- S5.1, S2.2

---

### S5.3 — UI Exports (Frontend)

**En tant qu'** utilisateur,  
**Je veux** des boutons d'export dans l'interface pour télécharger JSON, CSV et le clip vidéo,  
**Afin d'** exporter mes données sans passer par l'API directement.

#### Critères d'acceptation
- [ ] 3 boutons d'export visibles sur la page annotation et/ou statistiques : JSON, CSV, Vidéo
- [ ] Clic sur un bouton déclenche le téléchargement du fichier
- [ ] État de chargement sur le bouton pendant la génération (surtout pour la vidéo)
- [ ] Bouton export vidéo désactivé si moins de 2 annotations
- [ ] Toast de confirmation après téléchargement réussi

#### Section TDD — Tests à écrire en premier
```typescript
// frontend/src/components/exports/ExportButtons.test.tsx
test('triggers json download on click', async () => {
  const mockFetch = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({})))
  render(<ExportButtons videoId="1" annotationCount={3} />)
  fireEvent.click(screen.getByRole('button', { name: /JSON/i }))
  expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/export/json'))
})

test('disables video export when less than 2 annotations', () => {
  render(<ExportButtons videoId="1" annotationCount={1} />)
  expect(screen.getByRole('button', { name: /vidéo/i })).toBeDisabled()
})
```

#### Fichiers à créer / modifier
```
frontend/src/components/exports/ExportButtons.tsx
frontend/src/components/exports/ExportButtons.test.tsx
frontend/src/api/exports.ts
```

#### Dépendances
- S5.1, S5.2, S3.8

---

## Tableau de Bord des Stories

| ID | Story | Epic | Dépend de |
|----|-------|------|-----------|
| S1.1 | Infrastructure Docker Compose | E1 | — |
| S1.2 | Bootstrap Backend FastAPI + DB | E1 | S1.1 |
| S1.3 | Bootstrap Frontend React/TS | E1 | S1.1 |
| S1.4 | CI/CD GitHub Actions | E1 | S1.2, S1.3 |
| S2.1 | CRUD Projets (Backend) | E2 | S1.2 |
| S2.2 | Upload Vidéo + Métadonnées FFmpeg | E2 | S2.1 |
| S2.3 | Streaming Vidéo Range | E2 | S2.2 |
| S2.4 | Page Projets (Frontend) | E2 | S1.3, S2.1 |
| S2.5 | Page Détail Projet + Upload | E2 | S2.4, S2.2, S2.3 |
| S3.1 | CRUD Annotations (Backend) | E3 | S2.2 |
| S3.2 | Bulk Placement + Décalage Global | E3 | S3.1 |
| S3.3 | Lecteur Vidéo Frame-Précis | E3 | S1.3, S2.3 |
| S3.4 | Bindings Clavier | E3 | S3.3, S3.1 |
| S3.5 | Timeline Canvas | E3 | S3.3 |
| S3.6 | Mode Bip Sonore | E3 | S3.3 |
| S3.7 | Formulaire Bulk Placement | E3 | S3.2, S3.3 |
| S3.8 | Page Annotation Complète | E3 | S3.4, S3.5, S3.6, S3.7 |
| S4.1 | Service Calcul BPM | E4 | S3.1 |
| S4.2 | Endpoints Statistiques | E4 | S4.1 |
| S4.3 | Dashboard Métriques BPM | E4 | S4.2, S2.5 |
| S4.4 | Histogramme + Ajustement Vitesse | E4 | S4.3 |
| S5.1 | Export JSON et CSV | E5 | S3.1 |
| S5.2 | Export Clip Vidéo FFmpeg | E5 | S5.1, S2.2 |
| S5.3 | UI Exports | E5 | S5.1, S5.2, S3.8 |
