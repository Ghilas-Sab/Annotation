Proposition d'Épics — AnnotaRythm v1

  ---
  EPIC 1 — Socle Technique

  ▎ Mettre en place l'infrastructure Docker, le projet FastAPI/React, les migrations DB et
  ▎ le CI/CD. Aucune feature métier — juste un squelette qui tourne, se teste et se déploie.

  Scope :
  - docker-compose.yml (frontend + backend + volumes)
  - FastAPI bootstrappé : health check /api/v1/health, CORS
  - SQLAlchemy + Alembic : migration initiale (tables Project, Video, Annotation)
  - Vite + React + TypeScript + Zustand + TanStack Query bootstrappés
  - GitHub Actions CI (lint + tests backend + tests frontend)
  - .env.example + .gitignore

  Dépend de : rien
  Débloque : tous les autres épics

  ---
  EPIC 2 — Gestion de Projets

  ▎ CRUD complet des projets et vidéos, upload de fichiers, extraction des métadonnées
  ▎ FFmpeg, streaming vidéo, et interface de gestion.

  Scope :
  - Backend : CRUD projets (/api/v1/projects)
  - Backend : Upload vidéo + extraction métadonnées FFmpeg (/api/v1/projects/{id}/videos)
  - Backend : Streaming vidéo Range requests (/api/v1/videos/{id}/stream)
  - Frontend : Page Projets (liste, création inline, suppression)
  - Frontend : Page Détail Projet (liste vidéos, upload drag-and-drop)

  Dépend de : Epic 1
  Débloque : Epic 3, Epic 4, Epic 5

  ---
  EPIC 3 — Annotation Vidéo

  ▎ Le cœur du produit. Lecteur vidéo frame-précis, navigation clavier complète, pose
  ▎ d'annotations, timeline Canvas, bip sonore, placement automatique équidistant, décalage
  ▎ global.

  Scope :
  - Backend : CRUD annotations + bulk + shift
  - Frontend : Lecteur vidéo (requestVideoFrameCallback) + seek frame-précis
  - Frontend : Bindings clavier (←→, Ctrl+←→, Shift+←→, Espace)
  - Frontend : Timeline Canvas avec marqueurs d'annotations
  - Frontend : Mode vérification sonore (Web Audio API)
  - Frontend : Formulaire placement automatique équidistant
  - Frontend : Décalage global de toutes les annotations

  Dépend de : Epic 2
  Débloque : Epic 4, Epic 5

  ---
  EPIC 4 — Statistiques Rythmiques

  ▎ Calcul BPM complet (NumPy/SciPy), dashboard métriques, histogramme des intervalles,
  ▎ ajustement de la vitesse de lecture via BPM cible.

  Scope :
  - Backend : Service stats (compute_bpm_metrics, compute_playback_speed)
  - Backend : Endpoints /statistics et /statistics/playback-speed
  - Frontend : Dashboard métriques BPM (global, moyen, médian, variation, écart-type)
  - Frontend : Histogramme intervalles (Canvas)
  - Frontend : Saisie BPM cible → vitesse de lecture appliquée au lecteur

  Dépend de : Epic 3 (nécessite des annotations réelles pour être utile)
  Débloque : Epic 5

  ---
  EPIC 5 — Exports

  ▎ Génération et téléchargement des exports JSON, CSV, et clip vidéo (découpe FFmpeg stream
  ▎  copy).

  Scope :
  - Backend : Export JSON + CSV des annotations
  - Backend : Export clip vidéo via FFmpeg (première → dernière annotation)
  - Frontend : Boutons d'export sur la page annotation / statistiques

  Dépend de : Epic 3 (annotations), Epic 4 (métadonnées vidéo)
  Débloque : rien (fin de la v1)

  ---
  Résumé

  ┌─────┬─────────────────────────┬──────────┬─────────────┐
  │  #  │          Epic           │ Priorité │ Dépendances │
  ├─────┼─────────────────────────┼──────────┼─────────────┤
  │ E1  │ Socle Technique         │ Critique │ —           │
  ├─────┼─────────────────────────┼──────────┼─────────────┤
  │ E2  │ Gestion de Projets      │ Haute    │ E1          │
  ├─────┼─────────────────────────┼──────────┼─────────────┤
  │ E3  │ Annotation Vidéo        │ Haute    │ E2          │
  ├─────┼─────────────────────────┼──────────┼─────────────┤
  │ E4  │ Statistiques Rythmiques │ Moyenne  │ E3          │
  ├─────┼─────────────────────────┼──────────┼─────────────┤
  │ E5  │ Exports                 │ Moyenne  │ E3, E4      │
  └─────┴─────────────────────────┴──────────┴─────────────┘

  ---

