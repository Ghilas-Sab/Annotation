# Story 7.10: Page Assemblage — Export Vidéo Assemblée

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux exporter ma timeline assemblée (vidéos + musique optionnelle + transitions optionnelles) en une seule vidéo,
Afin de télécharger le résultat final ou de le sauvegarder dans un projet.

## Acceptance Criteria

### AC1 — Bouton d'export
- Un bouton "Exporter l'assemblage" est visible dans la page assemblage
- Il est désactivé si `clips.length === 0`
- Cliquer ouvre un panneau d'options d'export

### AC2 — Options d'export
- **Résolution** : sélecteur (720p / 1080p / Original)
- **Avec musique** : si des pistes musicales ont été importées, option d'inclure la musique en remplacement de l'audio source des clips (checkbox, défaut : activé si pistes présentes)
- **Sauvegarder dans un projet** : sélecteur de projet (optionnel) pour rattacher la vidéo exportée

### AC3 — Génération en arrière-plan
- Cliquer "Lancer l'export" appelle `POST /api/v1/assemblage/export` et retourne un `job_id`
- La progression est affichée via polling `GET /api/v1/exports/jobs/{job_id}` (réutiliser `job_manager`)
- Barre de progression visible pendant la génération

### AC4 — Téléchargement du résultat
- Quand le job est terminé, un bouton "Télécharger" déclenche le download via `GET /api/v1/exports/jobs/{job_id}/download`
- Le fichier téléchargé est nommé `assemblage_{timestamp}.mp4`

### AC5 — Sauvegarde dans un projet (optionnel)
- Si un projet a été sélectionné, un bouton "Sauvegarder dans le projet" appelle `POST /api/v1/projects/{id}/videos` avec le fichier résultat
- Après sauvegarde, un message de confirmation est affiché

### AC6 — Endpoint backend d'assemblage
- `POST /api/v1/assemblage/export` accepte :
  ```json
  {
    "clips": [
      { "video_id": "uuid-1", "order": 0 },
      { "video_id": "uuid-2", "order": 1 }
    ],
    "use_transitions": false,
    "transition_duration_s": 0.5,
    "resolution": "720p",
    "include_music": false
  }
  ```
- Retourne `{ "job_id": "..." }` (status 202)
- Le job utilise `job_manager` (pattern S6.10)
- Le job génère la vidéo avec FFmpeg concat (+ xfade si transitions, + mix audio si musique)

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT.

### Tests backend à écrire EN PREMIER

```python
# backend/tests/test_assemblage.py (ajouts)

async def test_export_assemblage_returns_job_id(client, two_videos):
    """POST /assemblage/export retourne un job_id immédiatement."""
    resp = await client.post("/api/v1/assemblage/export", json={
        "clips": [
            {"video_id": two_videos[0], "order": 0},
            {"video_id": two_videos[1], "order": 1},
        ],
        "use_transitions": False,
        "transition_duration_s": 0.5,
        "resolution": "720p",
        "include_music": False,
    })
    assert resp.status_code == 202
    data = resp.json()
    assert "job_id" in data

async def test_export_assemblage_empty_clips_returns_422(client):
    """400 si clips est vide."""
    resp = await client.post("/api/v1/assemblage/export", json={
        "clips": [],
        "use_transitions": False,
    })
    assert resp.status_code in (400, 422)

async def test_export_assemblage_invalid_video_id_returns_404(client):
    """404 si un video_id est invalide."""
    resp = await client.post("/api/v1/assemblage/export", json={
        "clips": [{"video_id": "00000000-0000-0000-0000-000000000000", "order": 0}],
        "use_transitions": False,
    })
    assert resp.status_code == 404

async def test_export_assemblage_job_is_trackable(client, two_videos):
    """Le job créé est interrogeable via GET /exports/jobs/{id}."""
    resp = await client.post("/api/v1/assemblage/export", json={
        "clips": [{"video_id": two_videos[0], "order": 0}],
        "use_transitions": False,
    })
    job_id = resp.json()["job_id"]
    status_resp = await client.get(f"/api/v1/exports/jobs/{job_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] in ("pending", "running", "done", "error")
```

### Tests frontend à écrire EN PREMIER

```tsx
// frontend/src/pages/AssemblagePage.test.tsx (ajouts)

test('export button is disabled when no clips', () => {
  render(<AssemblagePage />)
  expect(screen.getByRole('button', { name: /exporter l.assemblage/i })).toBeDisabled()
})

test('export button is enabled when clips are present', () => {
  render(<AssemblagePage initialClips={[buildClip()]} />)
  expect(screen.getByRole('button', { name: /exporter l.assemblage/i })).not.toBeDisabled()
})

test('clicking export button opens export panel', async () => {
  render(<AssemblagePage initialClips={[buildClip()]} />)
  await userEvent.click(screen.getByRole('button', { name: /exporter l.assemblage/i }))
  expect(screen.getByRole('heading', { name: /options d.export/i })).toBeInTheDocument()
})

test('progress bar shown during export', async () => {
  const startExport = vi.fn().mockResolvedValue('job-123')
  render(<AssemblagePage initialClips={[buildClip()]} onStartExport={startExport} />)
  await userEvent.click(screen.getByRole('button', { name: /exporter l.assemblage/i }))
  await userEvent.click(screen.getByRole('button', { name: /lancer l.export/i }))
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
})

test('download button appears when export is done', () => {
  render(<AssemblagePage initialClips={[buildClip()]} exportJobStatus="done" jobId="j1" />)
  expect(screen.getByRole('button', { name: /télécharger/i })).toBeInTheDocument()
})
```

## Tasks / Subtasks

### Backend

- [ ] Écrire les 4 tests backend → RED
- [ ] Créer `backend/app/schemas/assemblage.py` :
  - [ ] `AssemblageClipRequest` : `video_id: str, order: int`
  - [ ] `AssemblageExportRequest` : `clips: List[AssemblageClipRequest]`, `use_transitions: bool = False`, `transition_duration_s: float = 0.5`, `resolution: str = "720p"`, `include_music: bool = False`
- [ ] Compléter `backend/app/services/assemblage_service.py` (créé en S7.9) :
  - [ ] Fonction `assemble_videos(clips_paths, output_path, use_transitions, transition_duration_s, resolution)` :
    - [ ] Construire `filter_complex` via `build_concat_filter` (S7.9)
    - [ ] Appliquer scale si `resolution != "Original"` : `scale=-2:720` ou `scale=-2:1080`
    - [ ] Lancer FFmpeg avec `subprocess.Popen` + lecture progression
- [ ] Créer `backend/app/routers/assemblage.py` :
  - [ ] `POST /api/v1/assemblage/export` :
    - [ ] Valider `len(clips) >= 1` (400 si vide)
    - [ ] Résoudre les `video_id` → `video.filepath` via `json_store.get_video()` (404 si inconnu)
    - [ ] Créer un job via `job_manager.create_job()`
    - [ ] Lancer `assemble_videos(...)` dans le thread du job
    - [ ] Retourner `{ "job_id": job.id }` (202)
- [ ] Inclure le router dans `main.py`
- [ ] Passer les tests → GREEN

### Frontend

- [ ] Écrire les 5 tests → RED
- [ ] Créer `frontend/src/api/assemblage.ts` :
  - [ ] `startAssemblageExport(request): Promise<string>` → POST /api/v1/assemblage/export, retourne job_id
- [ ] Créer `frontend/src/components/assemblage/ExportPanel.tsx` :
  - [ ] Options : résolution (select), inclure musique (checkbox si tracks présentes)
  - [ ] Bouton "Lancer l'export" → `startAssemblageExport` + polling via `usePreviewJob` (adapté) ou hook dédié
  - [ ] Barre de progression pendant la génération
  - [ ] Bouton "Télécharger" quand `job.status === "done"`
  - [ ] Bouton "Sauvegarder dans un projet" (optionnel, avec sélecteur de projet)
- [ ] Modifier `AssemblagePage.tsx` :
  - [ ] Bouton "Exporter l'assemblage" (désactivé si `clips.length === 0`)
  - [ ] Afficher `<ExportPanel>` conditionnel
- [ ] Passer tous les tests → GREEN

## Dev Notes

### Endpoint FFmpeg — Concat avec scale

```python
# Exemple 2 clips, 720p, sans transitions :
cmd = [
  "ffmpeg", "-y",
  "-i", clip1_path,
  "-i", clip2_path,
  "-filter_complex",
    "[0:v]scale=-2:720[v0];[1:v]scale=-2:720[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]",
  "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-preset", "fast", "-crf", "23",
  "-c:a", "aac",
  "-movflags", "+faststart",
  "-progress", "pipe:1", "-nostats",
  output_path
]
```

### Réutilisation de job_manager

Le pattern est identique à S6.10 (preview jobs) et S6.9 (export project). Copier le wrapper `_run + job_manager.launch`.

### Fichiers à créer / modifier

```
backend/app/schemas/assemblage.py          ← nouveau
backend/app/services/assemblage_service.py ← compléter (assemble_videos)
backend/app/routers/assemblage.py          ← nouveau (POST /assemblage/export)
backend/app/main.py                        ← inclure router assemblage
backend/tests/test_assemblage.py           ← 4 nouveaux tests
frontend/src/api/assemblage.ts             ← nouveau
frontend/src/components/assemblage/ExportPanel.tsx ← nouveau
frontend/src/components/assemblage/ExportPanel.test.tsx ← tests
frontend/src/pages/AssemblagePage.tsx      ← bouton export + ExportPanel
frontend/src/pages/AssemblagePage.test.tsx ← 5 tests
```

### Anti-patterns à éviter

- Ne PAS uploader les fichiers audio côté client pour l'export — dans cette V1, si `include_music=True`, informer l'utilisateur que la musique n'est pas encore supportée côté backend (ou implémenter un upload préalable)
- Ne PAS bloquer sur la musique — l'export vidéo seul est la fonctionnalité prioritaire
- Ne PAS modifier les endpoints d'export existants (S6.9/S6.10)

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

- 2026-04-29 : Story créée par SM (Bob) — Epic 7, export final vidéo assemblée
