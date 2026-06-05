# Modèle de données

## 1. Stockage physique

Toutes les données métier (projets, vidéos, annotations, catégories) sont stockées dans **un seul fichier JSON** : `DATA_DIR/projects.json`. Les fichiers vidéo sont stockés à part dans `VIDEOS_DIR`.

### Pourquoi pas SQLite ?

Cf. [ADR-001 dans `architecture.md`](architecture.md#7-décisions-architecturales-adr-résumés). Résumé : setup zéro, idéal pour un outil local mono-utilisateur. La migration vers PostgreSQL en v2 consistera à réécrire `backend/app/storage/json_store.py` uniquement — les routers et schémas Pydantic resteront inchangés.

### Écriture atomique

Toute modification passe par `os.replace(tmp_path, projects.json)` :

1. Écriture intégrale dans un fichier temporaire `projects.json.tmp`.
2. `os.replace` : opération **atomique** au niveau du système de fichiers (POSIX).
3. Garantit qu'on ne se retrouve jamais avec un `projects.json` à demi-écrit même en cas de crash.

---

## 2. Structure logique

Hiérarchie imbriquée :

```
projects.json
└─ projects[]
   └─ Project
      ├─ id, name, description, created_at
      └─ videos[]
         └─ Video
            ├─ id, project_id, filename, original_name, filepath
            ├─ duration_seconds, fps, total_frames, width, height, codec
            ├─ uploaded_at
            ├─ adapted_preview?  (preview ré-encodée pour BPM cible)
            ├─ categories[]
            │  └─ Category { id, video_id, name, color, created_at }
            └─ annotations[]
               └─ Annotation
                  ├─ id, video_id
                  ├─ frame_number, timestamp_ms
                  ├─ label
                  ├─ category_id?
                  └─ created_at, updated_at
```

---

## 3. Entités (schémas Pydantic)

### 3.1 Project

| Champ          | Type        | Détails                                    |
|----------------|-------------|--------------------------------------------|
| `id`           | `str`       | UUID-like, généré côté backend             |
| `name`         | `str`       | Obligatoire, non vide (validé Pydantic)    |
| `description`  | `str`       | Optionnel, défaut `""`                     |
| `created_at`   | `str` ISO 8601 | Horodatage UTC                          |
| `videos`       | `Video[]`   | Liste imbriquée des vidéos du projet       |

Schéma : `backend/app/schemas/project.py`.

### 3.2 Video

| Champ              | Type     | Détails                                              |
|--------------------|----------|------------------------------------------------------|
| `id`               | `str`    | UUID-like                                            |
| `project_id`       | `str`    | Clé étrangère                                        |
| `filename`         | `str`    | Nom sur disque (slug interne)                        |
| `original_name`    | `str`    | Nom d'origine côté utilisateur                       |
| `filepath`         | `str`    | Chemin absolu dans `VIDEOS_DIR`                      |
| `duration_seconds` | `float`  | Extrait via FFmpeg                                   |
| `fps`              | `float`  | Frames par seconde (peut être fractionnaire)         |
| `total_frames`     | `int`    | Nombre total de frames                               |
| `width` / `height` | `int`    | Résolution                                           |
| `codec`            | `str`    | Codec source (h264, vp9, …)                          |
| `uploaded_at`      | `str` ISO 8601 | Horodatage                                     |
| `annotations`      | `Annotation[]` | Imbriqué                                       |
| `adapted_preview`  | `object?` | Métadonnées d'une preview ré-encodée pour BPM cible |

Schéma : `backend/app/schemas/video.py`.

### 3.3 Annotation

| Champ          | Type        | Détails                                                                  |
|----------------|-------------|--------------------------------------------------------------------------|
| `id`           | `str`       | UUID-like                                                                |
| `video_id`     | `str`       | Clé étrangère                                                            |
| `frame_number` | `int`       | Position en frames (0-indexé)                                            |
| `timestamp_ms` | `float`     | Position en millisecondes, dérivée de `frame_number / fps * 1000`        |
| `label`        | `str`       | Étiquette libre (peut être vide)                                         |
| `category_id`  | `str?`      | Référence optionnelle vers une `Category`                                |
| `created_at`   | `str` ISO 8601 | Horodatage initial                                                    |
| `updated_at`   | `str` ISO 8601 | Maj à chaque édition (label, frame, catégorie)                        |

Schéma : `backend/app/schemas/annotation.py`.

**Schémas auxiliaires** :

- `AnnotationCreate { frame_number, label="", category_id? }`
- `BulkCreate { start_frame, end_frame, count, prefix="", category_id? }`
- `ShiftRequest { offset_ms }`

### 3.4 Category

| Champ        | Type      | Détails                            |
|--------------|-----------|------------------------------------|
| `id`         | `str`     | UUID-like                          |
| `video_id`   | `str`     | Clé étrangère                      |
| `name`       | `str`     | Obligatoire, non vide              |
| `color`      | `str`     | Code couleur CSS (`#ff8800`)       |
| `created_at` | `str` ISO 8601 |                               |

Schéma : `backend/app/schemas/category.py`.

### 3.5 Statistiques (non persistées)

Calculées à la volée par `stats_service.py`, retournées par `GET /videos/{id}/statistics`.

| Champ                              | Type       | Détails                                                |
|------------------------------------|------------|--------------------------------------------------------|
| `bpm_global`                       | `float`    | BPM sur la durée totale annotée                        |
| `bpm_mean` / `bpm_median`          | `float`    | Moyenne / médiane des BPM inter-annotations            |
| `bpm_variation`                    | `float`    | Écart max-min                                          |
| `interval_std_seconds`             | `float`    | Écart-type des intervalles (régularité)                |
| `annotation_density_per_minute`    | `float`    | Densité                                                |
| `interval_distribution`            | `float[]`  | Intervalles successifs en secondes                     |
| `rhythmic_segments`                | `object[]` | `{ start_frame, end_frame, bpm }`                      |
| `activity_peaks`                   | `object[]` | `{ frame, density }`                                   |
| `error`                            | `str?`     | Ex. `"not_enough_annotations"` si < 2 annotations      |

Schéma : `backend/app/schemas/statistics.py`.

### 3.6 Assemblage (non persisté en JSON store)

L'assemblage multi-pistes est éphémère : le payload est envoyé, transformé par FFmpeg, le résultat téléchargé. Schémas dans `backend/app/schemas/assemblage.py`.

---

## 4. Exemple complet

Extrait d'un `projects.json` minimal :

```json
{
  "projects": [
    {
      "id": "p-2a4f",
      "name": "Concert Paris",
      "description": "Session live",
      "created_at": "2026-05-20T10:00:00",
      "videos": [
        {
          "id": "v-7b3c",
          "project_id": "p-2a4f",
          "filename": "v-7b3c.mp4",
          "original_name": "live-camera1.mp4",
          "filepath": "/videos/v-7b3c.mp4",
          "duration_seconds": 180.5,
          "fps": 30.0,
          "total_frames": 5415,
          "width": 1920,
          "height": 1080,
          "codec": "h264",
          "uploaded_at": "2026-05-20T10:05:00",
          "categories": [
            { "id": "c-kick", "video_id": "v-7b3c", "name": "kick",
              "color": "#ff5555", "created_at": "2026-05-20T10:06:00" }
          ],
          "annotations": [
            { "id": "a-001", "video_id": "v-7b3c",
              "frame_number": 60, "timestamp_ms": 2000.0,
              "label": "intro", "category_id": null,
              "created_at": "2026-05-20T10:07:00",
              "updated_at": "2026-05-20T10:07:00" },
            { "id": "a-002", "video_id": "v-7b3c",
              "frame_number": 120, "timestamp_ms": 4000.0,
              "label": "kick 1", "category_id": "c-kick",
              "created_at": "2026-05-20T10:07:10",
              "updated_at": "2026-05-20T10:07:10" }
          ]
        }
      ]
    }
  ]
}
```

---

## 5. Invariants

| Invariant                                                  | Garanti par                                  |
|------------------------------------------------------------|----------------------------------------------|
| `timestamp_ms` cohérent avec `frame_number / fps`          | Calcul backend à la création / mise à jour    |
| `frame_number ≥ 0` et `< total_frames` (vidéo associée)    | Validation Pydantic + service                 |
| Pas de doublon sur `Annotation.id`, `Project.id`, etc.     | UUID générés côté backend                     |
| Suppression cascade projet → vidéos → fichiers + annotations | Service `delete_project`                    |
| Suppression cascade catégorie → annotations gardent `category_id=null` | Service `delete_category`           |
| Écriture du JSON 100 % atomique                            | `os.replace(tmp, target)` dans `json_store.py`|

---

## 6. Migration v2 (anticipation)

Migration prévue vers PostgreSQL :

| Élément              | Stratégie                                                          |
|----------------------|--------------------------------------------------------------------|
| Routers              | Inchangés (consomment des fonctions storage abstraites)             |
| Schémas Pydantic     | Inchangés                                                          |
| Storage              | Réécrire `json_store.py` → `postgres_store.py` (SQLAlchemy + Alembic) |
| Script de migration  | Lire `projects.json` → INSERT batch en base                        |
| Tests                | Suite existante doit rester verte                                  |
