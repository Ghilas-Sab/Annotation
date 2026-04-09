# Story 1.2: Bootstrap Backend FastAPI + Base de Données

Status: ready-for-dev

## Story

As a développeur,
I want un backend FastAPI avec SQLAlchemy, Alembic et les modèles initiaux,
so that je dispose d'une base de données versionnée et d'une fondation API testable dès le premier commit.

## Acceptance Criteria

1. `alembic upgrade head` crée les tables `projects`, `videos`, `annotations` sans erreur
2. Les modèles SQLAlchemy correspondent exactement au schéma de données défini en architecture
3. Les schémas Pydantic sont définis pour Project, Video, Annotation (Create + Read)
4. `pytest` passe avec les fixtures `db_session` et `client` opérationnelles
5. `get_db` injecte correctement une session SQLAlchemy dans les routes via `Depends`
6. `backend/app/config.py` lit toutes les variables depuis les variables d'environnement

## Tasks / Subtasks

- [ ] Créer `backend/app/config.py` (AC: 6)
  - [ ] Lire `DATABASE_URL`, `VIDEOS_DIR`, `ALLOWED_ORIGINS`, `MAX_VIDEO_SIZE_MB`, `TEMP_DIR` depuis `os.getenv`
- [ ] Créer `backend/app/database.py` (AC: 1, 4, 5)
  - [ ] `create_engine` avec `DATABASE_URL`
  - [ ] `SessionLocal` via `sessionmaker`
  - [ ] `Base = declarative_base()`
  - [ ] `get_db()` générateur pour injection via `Depends`
- [ ] Créer les modèles SQLAlchemy (AC: 2)
  - [ ] `backend/app/models/project.py` : Project (id UUID, name, description, created_at)
  - [ ] `backend/app/models/video.py` : Video (id UUID, project_id FK, filename, original_name, filepath, duration_seconds, fps, total_frames, width, height, codec, uploaded_at)
  - [ ] `backend/app/models/annotation.py` : Annotation (id UUID, video_id FK, frame_number, timestamp_ms, label, created_at, updated_at)
- [ ] Créer les schémas Pydantic (AC: 3)
  - [ ] `backend/app/schemas/project.py` : ProjectCreate, ProjectRead
  - [ ] `backend/app/schemas/video.py` : VideoRead
  - [ ] `backend/app/schemas/annotation.py` : AnnotationCreate, AnnotationRead
- [ ] Configurer Alembic (AC: 1)
  - [ ] `alembic init alembic` dans `backend/`
  - [ ] Modifier `alembic/env.py` pour importer `Base` et utiliser `DATABASE_URL`
  - [ ] Créer migration initiale `001_initial.py` (autogenerate ou manuel)
- [ ] Écrire et faire passer les tests (AC: 4)
  - [ ] `tests/conftest.py` : fixtures `db_session` et `client` (SQLite en mémoire)
  - [ ] `tests/test_db.py` : vérifier les 3 tables + insérer un Project

## Dev Notes

### Schéma de données EXACT (ne pas dévier)

```
Project
├── id: String (UUID, primary key)
├── name: String (not null)
├── description: String (nullable)
└── created_at: DateTime (default=now)

Video
├── id: String (UUID, primary key)
├── project_id: String (FK → projects.id, CASCADE DELETE)
├── filename: String
├── original_name: String
├── filepath: String
├── duration_seconds: Float
├── fps: Float
├── total_frames: Integer
├── width: Integer
├── height: Integer
├── codec: String
└── uploaded_at: DateTime (default=now)

Annotation
├── id: String (UUID, primary key)
├── video_id: String (FK → videos.id, CASCADE DELETE)
├── frame_number: Integer (not null, >= 0)
├── timestamp_ms: Float (calculé: frame_number / fps * 1000)
├── label: String (default="")
├── created_at: DateTime (default=now)
└── updated_at: DateTime (default=now, onupdate=now)
```

### Pattern database.py obligatoire

```python
# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite only
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Fixtures conftest.py obligatoires

```python
# backend/tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()

@pytest.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

### Tests à écrire EN PREMIER (TDD strict)

```python
# backend/tests/test_db.py
import pytest
import uuid

def test_tables_created(db_session):
    from sqlalchemy import inspect
    inspector = inspect(db_session.bind)
    tables = inspector.get_table_names()
    assert "projects" in tables
    assert "videos" in tables
    assert "annotations" in tables

def test_project_model_insert(db_session):
    from app.models.project import Project
    p = Project(id=str(uuid.uuid4()), name="Test Project", description="desc")
    db_session.add(p)
    db_session.commit()
    assert db_session.query(Project).count() == 1

def test_cascade_delete(db_session):
    """Supprimer un projet supprime ses vidéos et annotations."""
    from app.models.project import Project
    from app.models.video import Video
    from app.models.annotation import Annotation
    project_id = str(uuid.uuid4())
    video_id = str(uuid.uuid4())
    annotation_id = str(uuid.uuid4())
    p = Project(id=project_id, name="P")
    v = Video(id=video_id, project_id=project_id, filename="f.mp4",
              original_name="f.mp4", filepath="/videos/f.mp4",
              fps=25.0, duration_seconds=10.0, total_frames=250,
              width=1920, height=1080, codec="h264")
    a = Annotation(id=annotation_id, video_id=video_id, frame_number=10,
                   timestamp_ms=400.0, label="beat")
    db_session.add_all([p, v, a])
    db_session.commit()
    db_session.delete(p)
    db_session.commit()
    assert db_session.query(Video).count() == 0
    assert db_session.query(Annotation).count() == 0
```

### requirements.txt minimal pour cette story

```
fastapi==0.110.0
uvicorn==0.29.0
sqlalchemy==2.0.29
alembic==1.13.1
pydantic==2.6.4
pytest==8.1.1
httpx==0.27.0
pytest-asyncio==0.23.6
aiosqlite==0.20.0
```

### Configuration Pydantic v2 obligatoire

```python
# backend/app/schemas/project.py
from pydantic import BaseModel
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: str = ""

class ProjectRead(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}  # Pydantic v2 (pas orm_mode)
```

### alembic/env.py : pattern obligatoire

```python
from app.database import Base
from app.models import project, video, annotation  # importer tous les modèles
target_metadata = Base.metadata
```

### Project Structure Notes

```
backend/
├── app/
│   ├── main.py              ← déjà créé en S1.1, ajouter l'import des routers
│   ├── config.py            ← créer
│   ├── database.py          ← créer
│   ├── models/
│   │   ├── __init__.py      ← créer (vide)
│   │   ├── project.py       ← créer
│   │   ├── video.py         ← créer
│   │   └── annotation.py    ← créer
│   └── schemas/
│       ├── __init__.py      ← créer (vide)
│       ├── project.py       ← créer
│       ├── video.py         ← créer
│       └── annotation.py    ← créer
├── alembic/
│   ├── env.py               ← modifier après alembic init
│   └── versions/
│       └── 001_initial.py   ← créer (autogenerate)
├── alembic.ini              ← créer via alembic init
└── tests/
    ├── conftest.py          ← créer
    └── test_db.py           ← créer
```

### Anti-patterns à éviter

- Ne PAS utiliser `orm_mode = True` (Pydantic v1) — utiliser `model_config = {"from_attributes": True}` (Pydantic v2)
- Ne PAS hardcoder `DATABASE_URL` — lire depuis `settings`
- L'argument `check_same_thread: False` est **obligatoire** pour SQLite avec FastAPI async
- Ne PAS importer les modèles dans `database.py` — les importer dans `alembic/env.py` uniquement
- Les IDs sont des `String` (UUID sous forme de chaîne), pas de type `UUID` SQLAlchemy natif (compatibilité SQLite)

### References

- Modèle de données : [Source: planning-artifacts/architecture.md#42-modele-de-donnees]
- Pattern conftest : [Source: planning-artifacts/architecture.md#61-backend-fixtures-et-pattern]
- Stack backend : [Source: planning-artifacts/architecture.md#22-backend]

## Dev Agent Record

### Agent Model Used

_à remplir par le dev agent_

### Debug Log References

### Completion Notes List

### File List
