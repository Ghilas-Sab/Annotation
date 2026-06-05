# Référence API REST

> Toutes les routes sont préfixées `/api/v1`.
> Documentation interactive auto-générée : http://localhost:8000/docs (Swagger UI) · http://localhost:8000/redoc (ReDoc).

## Conventions

- Méthodes HTTP : `GET` (lecture), `POST` (création), `PUT` (remplacement), `PATCH` (modification partielle), `DELETE` (suppression).
- Format d'échange : JSON UTF-8, sauf `multipart/form-data` (upload vidéo) et flux binaires (streaming, export).
- Codes :
  - `200 OK` — succès
  - `201 Created` — création
  - `204 No Content` — suppression
  - `400 Bad Request` — validation Pydantic
  - `404 Not Found` — ressource inexistante
  - `413 Payload Too Large` — fichier > `MAX_VIDEO_SIZE_MB`
  - `422 Unprocessable Entity` — payload mal formé
- Identifiants : chaînes UUID-like générées côté backend.

---

## 1. Santé

### `GET /health`

```json
{ "status": "ok" }
```

---

## 2. Projets

### `POST /projects` · création

```json
// Body
{ "name": "Concert Paris", "description": "Session live" }
// 201 Response
{
  "id": "p-abc123",
  "name": "Concert Paris",
  "description": "Session live",
  "created_at": "2026-05-22T10:15:00",
  "videos": []
}
```

### `GET /projects` · liste

Triée par date de création décroissante.

```json
[ { "id": "p-abc123", "name": "...", "videos": [...] } ]
```

### `GET /projects/{project_id}` · détail
### `PUT /projects/{project_id}` · mise à jour (`{name, description}`)
### `DELETE /projects/{project_id}` · suppression (cascade : supprime les fichiers vidéo associés)
### `POST /projects/{project_id}/export` · export ZIP complet du projet (annotations + clips)

---

## 3. Vidéos

### `POST /projects/{project_id}/videos` · upload

`multipart/form-data` :

| Champ   | Type | Description                                |
|---------|------|--------------------------------------------|
| `file`  | File | Fichier vidéo (mp4, mov, avi, mkv…)        |

Backend invoque FFmpeg pour extraire fps, durée, résolution, codec, total frames.

### `GET /projects/{project_id}/videos` · liste des vidéos du projet
### `GET /videos/{video_id}` · détail (avec annotations imbriquées)
### `PATCH /videos/{video_id}` · modifier les métadonnées (ex. renommer)
### `DELETE /videos/{video_id}` · supprime fichier + annotations

### `GET /videos/{video_id}/stream` · streaming HTTP Range

Accepte l'en-tête `Range: bytes=0-1023` (utilisé par `<video>`).

---

## 4. Annotations

### `POST /videos/{video_id}/annotations`

```json
// Body (AnnotationCreate)
{
  "frame_number": 240,
  "label": "kick",
  "category_id": "c-snare"   // optionnel
}
// 201 (AnnotationRead)
{
  "id": "a-001",
  "video_id": "v-xyz",
  "frame_number": 240,
  "timestamp_ms": 8000.0,
  "label": "kick",
  "category_id": "c-snare",
  "created_at": "2026-05-22T10:15:00",
  "updated_at": "2026-05-22T10:15:00"
}
```

### `GET /videos/{video_id}/annotations` · liste triée par `frame_number`

### `PUT /annotations/{annotation_id}` · remplacement complet (`{frame_number, label, category_id?}`)

### `DELETE /annotations/{annotation_id}`

### `DELETE /videos/{video_id}/annotations` · supprime toutes les annotations de la vidéo

### `POST /videos/{video_id}/annotations/bulk` · placement automatique équidistant

```json
{
  "start_frame": 120,
  "end_frame": 600,
  "count": 25,
  "prefix": "beat",        // optionnel — sinon labels "1", "2", …
  "category_id": null
}
```

Intervalle = `(end_frame - start_frame) / (count - 1)`. Les annotations créées sont identiques aux manuelles (déplaçables, supprimables individuellement).

### `PATCH /videos/{video_id}/annotations/shift` · décalage global

```json
{ "offset_ms": 200 }   // peut être négatif
```

Translate toutes les annotations de l'offset (en ms → conversion en frames via fps).

---

## 5. Catégories

### `GET /videos/{video_id}/categories` · liste

### `POST /videos/{video_id}/categories`

```json
{ "name": "snare", "color": "#ff8800" }
```

### `PUT /categories/{category_id}` · modifier nom/couleur
### `DELETE /categories/{category_id}` · suppression (les annotations conservent `category_id = null`)

---

## 6. Statistiques

### `GET /videos/{video_id}/statistics`

```json
{
  "bpm_global": 124.3,
  "bpm_mean": 124.0,
  "bpm_median": 125.0,
  "bpm_variation": 8.5,
  "interval_std_seconds": 0.012,
  "annotation_density_per_minute": 124.3,
  "interval_distribution": [0.480, 0.482, 0.479, ...],
  "rhythmic_segments": [
    { "start_frame": 0, "end_frame": 240, "bpm": 120.0 }
  ],
  "activity_peaks": [
    { "frame": 1200, "density": 4.5 }
  ],
  "error": null
}
```

> Si moins de 2 annotations : `error: "not_enough_annotations"`, les autres champs à 0.

### `POST /videos/{video_id}/statistics/playback-speed`

Calcule la vitesse de lecture pour atteindre un BPM cible.

```json
// Body
{ "target_bpm": 130 }
// Response
{ "playback_speed": 1.046, "current_bpm": 124.3, "target_bpm": 130 }
```

---

## 7. Exports

### Exports synchrones (download direct)

| Méthode | Route                                | Réponse                       |
|---------|--------------------------------------|-------------------------------|
| GET     | `/videos/{video_id}/export/json`     | `application/json` (download) |
| GET     | `/videos/{video_id}/export/csv`      | `text/csv` (download)         |
| GET     | `/videos/{video_id}/export/video`    | `video/mp4` (download)        |

L'export vidéo couvre la portion entre la **première** et la **dernière** annotation (stream copy FFmpeg).

### Exports asynchrones (jobs)

Pour les exports lourds (bundle, projet complet) :

| Méthode | Route                                  | Rôle                                |
|---------|----------------------------------------|-------------------------------------|
| POST    | `/exports/jobs`                        | Lancer un job                       |
| GET     | `/exports/jobs/{job_id}`               | État du job (queued/running/done)   |
| GET     | `/exports/jobs/{job_id}/download`      | Télécharger le résultat             |
| GET     | `/exports/jobs/{job_id}/stream`        | Streamer le résultat                |
| DELETE  | `/exports/jobs/{job_id}`               | Annuler / supprimer le job          |
| POST    | `/videos/{video_id}/export/bundle`     | Bundle (JSON + CSV + vidéo) en async |

---

## 8. Prévisualisation adaptée (BPM cible)

Génère une version ré-encodée à la vitesse calculée pour matcher un BPM cible.

| Méthode | Route                                            | Description                           |
|---------|--------------------------------------------------|---------------------------------------|
| POST    | `/videos/{video_id}/preview-jobs`                | Lancer le job de génération            |
| GET     | `/videos/{video_id}/preview-adapted/stream`      | Stream HTTP Range de la preview        |
| GET     | `/videos/{video_id}/preview-adapted/download`    | Télécharger la preview                 |
| POST    | `/videos/{video_id}/preview-adapted/save`        | Persister la preview comme vidéo officielle |
| DELETE  | `/videos/{video_id}/preview-adapted`             | Supprimer la preview                   |

---

## 9. Assemblage multi-pistes

Composition d'un montage final (vidéos + audio + transitions).

| Méthode | Route                                       | Description                          |
|---------|---------------------------------------------|--------------------------------------|
| POST    | `/assemblage/export`                        | Lancer l'export d'un assemblage      |
| GET     | `/assemblage/jobs/{job_id}/download`        | Télécharger le résultat              |

Payload : timeline JSON (pistes vidéo, pistes audio, transitions fade, annotations à incruster).

---

## 10. Exemples client

### cURL : créer un projet et uploader une vidéo

```bash
# Créer le projet
PID=$(curl -s -X POST http://localhost:8000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo","description":"test"}' | jq -r .id)

# Uploader la vidéo
curl -X POST http://localhost:8000/api/v1/projects/$PID/videos \
  -F "file=@./videos/sample.mp4"
```

### TypeScript : poser une annotation (TanStack Query)

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

const qc = useQueryClient();
const createAnnotation = useMutation({
  mutationFn: ({ videoId, frameNumber, label }: ...) =>
    fetch(`/api/v1/videos/${videoId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame_number: frameNumber, label }),
    }).then(r => r.json()),
  onSuccess: (_, { videoId }) => {
    qc.invalidateQueries({ queryKey: ['annotations', videoId] });
  },
});
```
