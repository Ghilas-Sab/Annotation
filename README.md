# AnnotaRythm

> Application web locale d'**annotation vidéo frame-précise** orientée analyse rythmique (BPM, intervalles, vérification sonore).

[![CI](https://github.com/Ghilas-Sabour/Annotation/actions/workflows/ci.yml/badge.svg)](https://github.com/Ghilas-Sabour/Annotation/actions)

AnnotaRythm permet à des chercheurs, chorégraphes, monteurs et analystes vidéo de poser des annotations précises à la frame sur leurs vidéos, d'analyser le rythme (BPM, distribution des intervalles, segments d'activité) et d'exporter les résultats — annotations (JSON/CSV) ou extraits vidéo (MP4).

---

## Fonctionnalités

- 🎬 **Gestion de projets** — Organiser des vidéos par projet, import multi-format via FFmpeg
- ⏱️ **Annotation frame-précise** — Navigation clavier frame-à-frame, raccourcis productifs, timeline canvas
- 🔉 **Vérification sonore** — Bip Web Audio à chaque frame annotée pour valider le placement
- 🏷️ **Catégories** — Étiquetage par catégorie avec couleur
- 📐 **Placement automatique** — Distribution équidistante d'annotations sur une plage
- ➡️ **Décalage global** — Translater toutes les annotations d'un offset (`+200ms`, `-1 frame`)
- 📊 **Statistiques rythmiques** — BPM global/moyen/médian, écart-type, histogramme, segments
- 🎵 **Adaptation BPM** — Ajustement automatique de la vitesse de lecture pour viser un BPM cible
- 📦 **Exports** — JSON / CSV / clip vidéo (FFmpeg stream copy), export ZIP par projet
- 🎞️ **Assemblage** — Mode multi-pistes (vidéos + audio + transitions) avec export final

---

## Démarrage rapide

**Pré-requis :** Docker + Docker Compose.

```bash
git clone https://github.com/Ghilas-Sabour/Annotation.git
cd Annotation
cp .env.example .env
docker compose up --build
```

- Frontend : http://localhost:3000
- API : http://localhost:8000/api/v1
- Docs OpenAPI auto-générées : http://localhost:8000/docs

> Pour un setup développeur (hot reload, tests, etc.) voir [`docs/installation.md`](docs/installation.md) et [`docs/development.md`](docs/development.md).

---

## Stack technique

| Couche      | Technologies                                                   |
|-------------|----------------------------------------------------------------|
| Frontend    | React 18 · TypeScript · Vite · Zustand · TanStack Query · Canvas · Web Audio |
| Backend     | FastAPI · Python 3.11 · Pydantic v2 · NumPy / SciPy · FFmpeg   |
| Stockage    | JSON store atomique (`projects.json`) + filesystem vidéos       |
| Infra       | Docker Compose · Nginx (SPA + reverse proxy `/api/`)            |
| Tests       | Pytest + httpx (backend) · Vitest + RTL + MSW (frontend) · Playwright (E2E) |
| CI          | GitHub Actions (backend-tests → frontend-tests → build-docker)  |

---

## Structure du dépôt

```
.
├── backend/                # API FastAPI (routers, services, schemas, tests)
├── frontend/               # SPA React (pages, components, hooks, stores)
├── e2e/                    # Suite Playwright (25 specs, 260 tests)
├── docs/                   # Documentation projet (vous êtes presque là)
├── _bmad-output/           # Artefacts BMAD (PRD, architecture, stories)
├── docker-compose.yml      # Stack production locale
├── docker-compose.e2e.yml  # Stack dédiée aux tests E2E
└── .env.example            # Modèle de configuration
```

---

## Documentation

Toute la doc détaillée vit dans [`docs/`](docs/) :

| Document                                     | Pour qui                              |
|----------------------------------------------|---------------------------------------|
| [docs/installation.md](docs/installation.md) | Installer / démarrer le projet        |
| [docs/user-guide.md](docs/user-guide.md)     | Utiliser l'application (annotateurs)  |
| [docs/architecture.md](docs/architecture.md) | Comprendre la stack et les choix      |
| [docs/api.md](docs/api.md)                   | Intégrer ou appeler l'API REST        |
| [docs/data-model.md](docs/data-model.md)     | Schéma des entités persistées         |
| [docs/development.md](docs/development.md)   | Contribuer (TDD, conventions, CI)     |
| [docs/testing.md](docs/testing.md)           | Lancer et écrire les tests            |

---

## Méthodologie

Le projet a été développé en suivant **BMAD** (Business → PRD → Architecture → Stories → Dev → QA) avec **TDD strict** :
les tests sont écrits **avant** le code, chaque story est livrée en un commit, et la CI bloque sur tout test rouge.

Les artefacts de planification (PRD, architecture, UX design, stories) sont versionnés dans [`_bmad-output/`](_bmad-output/).

---

## Licence

[MIT](LICENSE)

---

## Auteur

Projet de stage — **Ghilas Sabour** (2026).
