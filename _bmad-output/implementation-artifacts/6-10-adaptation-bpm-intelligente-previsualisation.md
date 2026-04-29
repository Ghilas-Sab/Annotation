# Story 6.10: Prévisualisation BPM en Arrière-Plan + Sauvegarde et Réutilisation

Status: done

## Story

En tant qu'utilisateur,
Je veux lancer une prévisualisation de la vidéo adaptée au BPM cible depuis la page statistiques, suivre sa progression en arrière-plan, valider le résultat visuellement, puis soit l'exporter directement, soit le sauvegarder pour que l'export projet le réutilise sans retraitement,
Afin d'obtenir une vidéo rythmiquement correcte en évitant toute double génération coûteuse.

## Acceptance Criteria

### AC1 — Bouton prévisualisation dans StatisticsPage
- Un panneau "Prévisualisation BPM" est visible en bas de `StatisticsPage`
- Il contient : champ BPM cible (pré-rempli avec `stats.bpm_global`), bouton "Prévisualiser"
- Le bouton est désactivé si `annotations.length < 2` ou si BPM cible ≤ 0

### AC2 — Génération en arrière-plan via job_manager
- Cliquer "Prévisualiser" appelle `POST /api/v1/videos/{id}/preview-jobs` (body: `{target_bpm: float}`)
- L'endpoint crée un job `job_manager` et retourne immédiatement `{job_id}`
- Le job génère la vidéo adaptée en 720p max (paramètre `max_height=720` sur `adapt_video_to_bpm`)
- Le frontend poll `GET /api/v1/exports/jobs/{job_id}` toutes les 2 secondes

### AC3 — Indicateur de progression
- Une barre de progression affiche `job.progress` (0-100%)
- Le temps restant estimé est affiché (`job.estimated_remaining_s` → format "~Xs")
- Un bouton "Annuler" appelle `DELETE /api/v1/exports/jobs/{job_id}`

### AC4 — Lecteur vidéo intégré après génération
- Quand `job.status === "done"`, un `<video>` s'affiche avec `src` = URL blob du job download
- L'URL est obtenue via `GET /api/v1/exports/jobs/{job_id}/download` (endpoint existant)
- Le lecteur a `data-testid="preview-player"`, `controls`, `autoPlay`
- En cas d'erreur (`job.status === "error"`), un message d'erreur s'affiche

### AC5 — Actions après prévisualisation
- Bouton **"Télécharger cette version"** : télécharge la vidéo preview (basse résolution)
- Bouton **"Sauvegarder pour le projet"** : appelle `POST /api/v1/videos/{id}/preview-adapted/save` avec `{job_id}`, persiste la référence dans le record vidéo
- Bouton **"Fermer"** : masque le lecteur, conserve l'état sauvegardé éventuel

### AC6 — Persistance du preview sauvegardé
- `POST /api/v1/videos/{id}/preview-adapted/save` :
  - Copie le fichier temp du job vers `TEMP_DIR/previews/{video_id}_preview.mp4` (permanent)
  - Met à jour le record vidéo : `adapted_preview = { path, bpm, created_at }`
  - Retourne `{ adapted_preview: {...} }`
- `DELETE /api/v1/videos/{id}/preview-adapted` :
  - Supprime le fichier et retire `adapted_preview` du record vidéo
- `update_video()` dans `json_store.py` doit autoriser la clé `"adapted_preview"`

### AC7 — Réutilisation dans ExportPage
- Si `video.adapted_preview` existe pour une vidéo sélectionnée :
  - Un badge "Aperçu sauvegardé (X BPM)" est affiché sur la ligne vidéo dans `ExportPage`
  - Si le BPM cible de l'export correspond au BPM du preview → `generate_project_zip` utilise le fichier sauvegardé (skip `adapt_video_to_bpm`)
- Dans `generate_project_zip` : avant d'appeler `adapt_video_to_bpm`, vérifier `video.adapted_preview` et comparer `bpm`

### AC8 — Notification quand le job se termine
- Utiliser le même mécanisme que `ExportJobsContext` : `Notification` navigateur quand le job preview passe à "done"
- Le composant preview gère lui-même son polling (hook dédié `usePreviewJob`) sans dépendre de `ExportJobsContext`

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT. `compute_segment_speeds` et `adapt_video_to_bpm` sont DÉJÀ implémentés et testés (commit S6.9/S6.10).
> Ne PAS réécrire ces tests. Focus sur les NOUVEAUX endpoints et composants.

### Tests backend à écrire EN PREMIER

```python
# backend/tests/test_exports.py (ajouts)

async def test_create_preview_job_returns_job_id(client, video_with_annotations):
    """POST /preview-jobs retourne un job_id immédiatement."""
    resp = await client.post(
        f"/api/v1/videos/{video_with_annotations}/preview-jobs",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data
    assert isinstance(data["job_id"], str)

async def test_create_preview_job_requires_min_2_annotations(client, video_no_annotations):
    """Retourne 400 si moins de 2 annotations."""
    resp = await client.post(
        f"/api/v1/videos/{video_no_annotations}/preview-jobs",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 400

async def test_create_preview_job_requires_target_bpm(client, video_with_annotations):
    """422 si target_bpm absent ou invalide."""
    resp = await client.post(
        f"/api/v1/videos/{video_with_annotations}/preview-jobs",
        json={}
    )
    assert resp.status_code == 422

async def test_save_preview_updates_video_record(client, video_with_annotations, mocker):
    """POST /preview-adapted/save persiste adapted_preview dans le record vidéo."""
    # Crée un job terminé (mock)
    from app.services.job_manager import job_manager, ExportJob
    import time, tempfile, os
    
    # Crée un vrai fichier temp pour le mock du job result
    tmp = tempfile.mktemp(suffix=".mp4")
    with open(tmp, 'wb') as f:
        f.write(b'fakevideo')
    
    job = job_manager.create_job(label="test preview")
    job_manager.update(job.id, status="done", progress=100,
                       result_path=tmp, finished_at=time.time())
    
    resp = await client.post(
        f"/api/v1/videos/{video_with_annotations}/preview-adapted/save",
        json={"job_id": job.id}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "adapted_preview" in data
    assert data["adapted_preview"]["bpm"] == 120.0  # bpm du job
    
    os.unlink(tmp)

async def test_delete_preview_removes_from_record(client, video_with_saved_preview):
    """DELETE /preview-adapted retire adapted_preview du record."""
    resp = await client.delete(
        f"/api/v1/videos/{video_with_saved_preview}/preview-adapted"
    )
    assert resp.status_code == 200

async def test_generate_zip_reuses_saved_preview(project_with_saved_preview):
    """generate_project_zip réutilise le preview sauvegardé si BPM correspond."""
    from app.services.export_service import generate_project_zip
    # La vidéo a adapted_preview.bpm = 120.0
    # On exporte avec video_bpm = {video_id: 120.0}
    # → adapt_video_to_bpm ne doit PAS être appelé
    import unittest.mock as mock
    with mock.patch('app.services.video_service.adapt_video_to_bpm') as mock_adapt:
        result = generate_project_zip(
            project_with_saved_preview["project_id"],
            video_ids=None,
            formats=["video"],
            video_bpm={project_with_saved_preview["video_id"]: 120.0},
        )
        mock_adapt.assert_not_called()
        assert result is not None
```

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/components/exports/PreviewPanel.test.tsx (nouveau)

test('preview button is disabled when less than 2 annotations', () => {
  render(<PreviewPanel videoId="v1" currentBpm={120} annotationCount={1} />)
  expect(screen.getByRole('button', { name: /prévisualiser/i })).toBeDisabled()
})

test('preview button calls createPreviewJob with videoId and targetBpm', async () => {
  const createJob = vi.fn().mockResolvedValue('job-123')
  render(<PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
    onCreateJob={createJob} />)
  await userEvent.click(screen.getByRole('button', { name: /prévisualiser/i }))
  expect(createJob).toHaveBeenCalledWith('v1', 120)
})

test('shows progress bar while job is running', async () => {
  const createJob = vi.fn().mockResolvedValue('job-123')
  render(<PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
    onCreateJob={createJob} />)
  await userEvent.click(screen.getByRole('button', { name: /prévisualiser/i }))
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
})

test('shows video player when job is done', async () => {
  render(<PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
    previewUrl="/preview.mp4" jobStatus="done" />)
  expect(screen.getByTestId('preview-player')).toBeInTheDocument()
})

test('shows estimated remaining time during generation', () => {
  render(<PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
    jobStatus="running" progress={40} estimatedRemaining={30} />)
  expect(screen.getByText(/~30s/i)).toBeInTheDocument()
})

test('save button calls savePreview with videoId and jobId', async () => {
  const onSave = vi.fn()
  render(<PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
    previewUrl="/preview.mp4" jobStatus="done" jobId="job-123" onSave={onSave} />)
  await userEvent.click(screen.getByRole('button', { name: /sauvegarder pour le projet/i }))
  expect(onSave).toHaveBeenCalledWith('v1', 'job-123')
})

test('cancel button calls cancelJob with jobId', async () => {
  const onCancel = vi.fn()
  render(<PreviewPanel videoId="v1" currentBpm={120} annotationCount={5}
    jobStatus="running" jobId="job-123" onCancel={onCancel} />)
  await userEvent.click(screen.getByRole('button', { name: /annuler/i }))
  expect(onCancel).toHaveBeenCalledWith('job-123')
})

// frontend/src/pages/StatisticsPage.test.tsx (ajout)
test('statistics page shows preview panel at the bottom', () => {
  render(<StatisticsPage />)
  expect(screen.getByTestId('bpm-preview-panel')).toBeInTheDocument()
})

// frontend/src/pages/ExportPage.test.tsx (ajout)
test('shows saved preview badge when video has adapted_preview', () => {
  const videos = [buildVideo({ adapted_preview: { bpm: 120, created_at: '...' } })]
  render(<ExportPage projectId="p1" videos={videos} />)
  expect(screen.getByText(/aperçu sauvegardé/i)).toBeInTheDocument()
})
```

## Tasks / Subtasks

### Backend

- [x] Écrire tous les tests backend EN PREMIER (6 tests listés ci-dessus)
- [x] Étendre `update_video()` dans `json_store.py` pour autoriser la clé `"adapted_preview"`
- [x] Ajouter paramètre `max_height: int | None = None` à `adapt_video_to_bpm()` dans `video_service.py`
  - [x] Si `max_height` fourni → ajouter `-vf "scale=-2:min({max_height}\\,ih)"` dans la commande ffmpeg
- [x] Implémenter `POST /api/v1/videos/{id}/preview-jobs` dans `exports.py`
  - [x] Valider `target_bpm > 0` (422) et `len(annotations) >= 2` (400)
  - [x] Créer un job via `job_manager.create_job()`
  - [x] Lancer `adapt_video_to_bpm(..., max_height=720)` dans le thread du job
  - [x] Retourner `{job_id}` avec status 202
- [x] Implémenter `POST /api/v1/videos/{id}/preview-adapted/save` dans `exports.py`
  - [x] Vérifier que le job existe et est "done"
  - [x] Copier `job.result_path` vers `TEMP_DIR/previews/{video_id}_preview.mp4` (créer le répertoire si besoin)
  - [x] Appeler `update_video(video_id, adapted_preview={"path": ..., "bpm": job_bpm, "created_at": now})`
  - [x] Retourner le record vidéo mis à jour
- [x] Implémenter `DELETE /api/v1/videos/{id}/preview-adapted` dans `exports.py`
  - [x] Lire `video.adapted_preview.path`, supprimer le fichier (`os.remove` + `try/except OSError`)
  - [x] Mettre à jour le record : `update_video(video_id, adapted_preview=None)`
- [x] Modifier `generate_project_zip()` dans `export_service.py`
  - [x] Avant `adapt_video_to_bpm`, vérifier `video.get("adapted_preview")` et comparer `bpm`
  - [x] Si preview sauvegardée avec même BPM ET fichier existe → `zf.write(preview_path, ...)` directement
  - [x] Sinon → comportement existant (`adapt_video_to_bpm`)

### Frontend

- [x] Écrire tous les tests frontend EN PREMIER (9 tests listés ci-dessus)
- [x] Créer `frontend/src/api/exports.ts` — ajouter les nouvelles fonctions :
  - [x] `createPreviewJob(videoId: string, targetBpm: number): Promise<string>` → POST /videos/{id}/preview-jobs
  - [x] `savePreview(videoId: string, jobId: string): Promise<Video>` → POST /videos/{id}/preview-adapted/save
  - [x] `deletePreview(videoId: string): Promise<void>` → DELETE /videos/{id}/preview-adapted
  - [x] `getJobStatus(jobId: string): Promise<JobStatus>` → GET /exports/jobs/{job_id}
  - [x] `getJobDownloadUrl(jobId: string): string` → retourne l'URL (pas de fetch, le `<video src>` la charge)
- [x] Créer hook `frontend/src/hooks/usePreviewJob.ts`
  - [x] Gère le cycle : idle → creating → polling → done/error
  - [x] Poll `getJobStatus` toutes les 2s (setInterval, cleanup on unmount)
  - [x] Envoie `Notification` navigateur quand `status === "done"`
  - [x] Retourne `{ jobId, status, progress, estimatedRemaining, previewUrl, start, cancel }`
- [x] Créer `frontend/src/components/exports/PreviewPanel.tsx`
  - [x] Champ BPM de prévisualisation (nombre, min=1, pré-rempli avec prop `currentBpm`)
  - [x] Bouton "Prévisualiser" (désactivé si `annotationCount < 2` ou `targetBpm <= 0`)
  - [x] État idle : bouton seul
  - [x] État running : `<progress>` + texte "~Xs restant" + bouton "Annuler"
  - [x] État done : `<video data-testid="preview-player" controls autoPlay src={previewUrl}>`
    + boutons "Télécharger" + "Sauvegarder pour le projet" + "Fermer"
  - [x] État error : message d'erreur
  - [x] `data-testid="bpm-preview-panel"` sur le conteneur racine
- [x] Modifier `frontend/src/pages/StatisticsPage.tsx`
  - [x] Ajouter un 6ème panneau (après BpmAdjuster) avec `<PreviewPanel>`
  - [x] Passer `videoId`, `currentBpm={stats?.bpm_global ?? 0}`, `annotationCount={annotations.length}`
- [x] Modifier `frontend/src/types/project.ts` (ou `video.ts`)
  - [x] Ajouter champ optionnel `adapted_preview?: { path?: string; bpm: number; created_at: string }` à `Video`
- [x] Modifier `frontend/src/pages/ExportPage.tsx`
  - [x] Dans la liste des vidéos, si `v.adapted_preview` existe → afficher badge "Aperçu sauvegardé (X BPM)"
- [x] Passer tous les tests → GREEN

## Dev Notes

### DÉJÀ IMPLÉMENTÉ — NE PAS RÉÉCRIRE

Les éléments suivants sont présents depuis le commit `ac096fb` :
- `compute_segment_speeds()` dans `export_service.py` ✅
- `adapt_video_to_bpm()` dans `video_service.py` ✅
- `job_manager` + `ExportJob` dans `job_manager.py` ✅
- Tests `test_compute_segment_speeds_*` dans `test_exports.py` ✅
- Endpoints existants utilisables : `GET /exports/jobs/{id}`, `DELETE /exports/jobs/{id}`, `GET /exports/jobs/{id}/download`

### Patterns établis à réutiliser (S6.9)

```python
# Pattern création job (exports.py) — COPIER CE PATTERN
job = job_manager.create_job(label=f"preview:{target_bpm}:{video_id}")
Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
result_path = os.path.join(settings.TEMP_DIR, f"preview_{job.id}.mp4")

def _run() -> str:
    def _progress(pct: int) -> None:
        job_manager.update(job.id, progress=pct)
    adapt_video_to_bpm(video["filepath"], annotations, target_bpm,
                       progress_cb=_progress, cancel_event=job.cancel_event,
                       max_height=720)
    return result_path  # adapt_video_to_bpm écrit dans output_path, pas return

job_manager.launch(job, _run)
return {"job_id": job.id}
```

> **ATTENTION** : `adapt_video_to_bpm` n'a pas de paramètre `output_path` — il génère lui-même le path via `tempfile`. Il retourne le path. Adapter le wrapper en conséquence : `result_path = adapt_video_to_bpm(...)`.

### Encodage du BPM dans le label du job

Pour récupérer le BPM lors de `save`, encoder dans le label :
```python
label = f"preview:{target_bpm}"
# Lors du save :
bpm_from_label = float(job.label.split(":")[1])  # "preview:120.0" → 120.0
```

### Paramètre max_height dans adapt_video_to_bpm

```python
# Dans video_service.py, adapter la commande ffmpeg :
vf_filters = []
if max_height:
    vf_filters.append(f"scale=-2:min({max_height}\\,ih)")

# Insérer avant les codec args si vf_filters non vide :
if vf_filters:
    cmd += ["-vf", ",".join(vf_filters)]
```

Attention : `adapt_video_to_bpm` utilise déjà `-filter_complex` (pour les setpts/atempo). Un deuxième `-vf` est incompatible. Il faut intégrer le scale DANS le filter_complex comme étape finale sur le flux de sortie final, OU utiliser un post-processing séparé. **Solution simple** : appliquer le scale comme `libavfilter` chaîné sur la sortie `concat` : ajouter `,scale=-2:min(720\,ih)` à la fin du dernier filtre vidéo avant le `[vout]` map.

**Alternative plus simple** : ajouter un pass de re-scale après l'adaptation BPM (deux passes ffmpeg). Utiliser l'approche deux passes pour éviter de modifier `_build_adapt_filter` :
```python
if max_height:
    # Réencoder avec scale après l'adaptation
    scaled_path = output_path.replace('.mp4', '_scaled.mp4')
    subprocess.run([
        "ffmpeg", "-y", "-i", output_path,
        "-vf", f"scale=-2:min({max_height}\\,ih)",
        "-c:v", "libx264", "-preset", "fast", "-crf", "28",
        "-c:a", "copy", scaled_path
    ], check=True, capture_output=True)
    os.replace(scaled_path, output_path)
```

### Structure json_store.py — `update_video`

```python
# Modifier la whitelist :
ALLOWED_VIDEO_KEYS = {"original_name", "adapted_preview"}
video.update({k: v for k, v in kwargs.items() if k in ALLOWED_VIDEO_KEYS})
```

### Hook usePreviewJob (frontend)

```ts
// Pattern de polling (réutiliser logique de ExportJobsContext)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export function usePreviewJob(videoId: string) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle'|'creating'|'running'|'done'|'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  // Poll avec setInterval, nettoyer sur unmount
  // Quand done : setPreviewUrl(`${API_BASE}/exports/jobs/${jobId}/download`)
  // Notification navigateur si permission accordée
}
```

### Répertoire previews permanent

```python
# Dans exports.py (save endpoint) :
import shutil
previews_dir = os.path.join(settings.TEMP_DIR, "previews")
os.makedirs(previews_dir, exist_ok=True)
dest_path = os.path.join(previews_dir, f"{video_id}_preview.mp4")
shutil.copy2(job.result_path, dest_path)
```

Note : le fichier temp du job est supprimé par le download endpoint (`background_tasks.add_task(os.remove, ...)`). Ne PAS déclencher le download endpoint avant le save. Le save endpoint copie le fichier (pas un move) pour être safe.

### Structure des fichiers modifiés

```
backend/app/
├── services/
│   ├── export_service.py    ← modifier generate_project_zip (réutilisation preview)
│   └── video_service.py     ← modifier adapt_video_to_bpm (paramètre max_height)
├── routers/
│   └── exports.py           ← ajouter 3 nouveaux endpoints
├── storage/
│   └── json_store.py        ← update_video autorise "adapted_preview"
└── tests/
    └── test_exports.py      ← 6 nouveaux tests

frontend/src/
├── api/
│   └── exports.ts           ← 5 nouvelles fonctions
├── hooks/
│   └── usePreviewJob.ts     ← nouveau hook
├── components/exports/
│   ├── PreviewPanel.tsx     ← nouveau composant
│   └── PreviewPanel.test.tsx← nouveau
├── pages/
│   ├── StatisticsPage.tsx   ← ajouter panneau PreviewPanel (6ème)
│   └── ExportPage.tsx       ← badge "Aperçu sauvegardé"
└── types/
    └── project.ts (ou video.ts) ← champ adapted_preview dans Video
```

### Anti-patterns à éviter

- Ne PAS réécrire `compute_segment_speeds` ni `adapt_video_to_bpm` — ils existent déjà
- Ne PAS utiliser `ExportJobsContext` pour le preview job — créer un hook local `usePreviewJob` pour garder le preview isolé
- Ne PAS exposer `job.result_path` côté client — toujours passer par l'endpoint `/jobs/{id}/download`
- Ne PAS supprimer le fichier temp dans le save endpoint (déjà géré par download ou TTL)
- Ne PAS hardcoder les chemins de fichiers — utiliser `settings.TEMP_DIR`
- Ne PAS bloquer l'UI pendant la génération — toujours via job + polling

## Dev Agent Record

### Agent Model Used

_à remplir_

### Debug Log References

_à remplir_

### Completion Notes List

_à remplir_

### File List

_à remplir_

## Change Log

- 2026-04-17 : Story créée initialement (version synchrone)
- 2026-04-21 : Story réécrite par SM (Bob) — passage en mode arrière-plan via job_manager, ajout bouton dans StatisticsPage, "Sauvegarder pour le projet" + réutilisation dans generate_project_zip, suppression du pattern synchrone. compute_segment_speeds et adapt_video_to_bpm déjà implémentés (commit ac096fb).
