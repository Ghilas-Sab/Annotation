# Story 6.9: Export par Projet Complet

Status: backlog

## Story

En tant qu'utilisateur,
I want exporter un projet entier (annotations + statistiques + vidéo) en une seule action,
so that j'obtiens un package complet sans devoir exporter chaque vidéo séparément.

## Acceptance Criteria

1. Nouvel endpoint `POST /api/v1/projects/{id}/export` acceptant :
   ```json
   {
     "video_ids": ["uuid-1", "uuid-2"],  // null = tout le projet
     "formats": ["json", "csv", "video"],
     "target_bpm": 120.0                 // optionnel
   }
   ```
2. La réponse est un fichier ZIP contenant pour chaque vidéo sélectionnée :
   - `{video_name}_annotations.json`
   - `{video_name}_annotations.csv`
   - `{video_name}_statistics.json`
   - `{video_name}_adapted.mp4` (si `target_bpm` fourni, sinon clip brut)
3. Les anciens endpoints vidéo-par-vidéo (`GET /api/v1/videos/{id}/export/*`) restent fonctionnels
4. L'UI de la page Export est refonte :
   - Sélecteur de vidéos (checkboxes) avec sélection tout/partielle
   - Sélection des formats (checkboxes : JSON, CSV, Vidéo)
   - Champ BPM cible optionnel
5. Un indicateur de progression est affiché pendant la génération (polling ou état loading)
6. Le ZIP est valide et extractible

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **100%** backend (nouveau endpoint), **≥ 80%** frontend.
> Tester : ZIP valide, sélection partielle, formats multiples, rétrocompatibilité endpoints.

### Tests backend obligatoires à écrire en PREMIER

```python
# backend/tests/test_exports.py (ajouts)
import zipfile
import io

async def test_export_project_zip_contains_expected_files(
    client, project_with_two_annotated_videos
):
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["json", "csv"]}
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    names = z.namelist()
    assert any(n.endswith('_annotations.json') for n in names)
    assert any(n.endswith('_annotations.csv') for n in names)

async def test_export_project_partial_selection(
    client, project_with_two_annotated_videos, video_ids
):
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": [video_ids[0]], "formats": ["json"]}
    )
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    json_files = [n for n in z.namelist() if n.endswith('.json') and 'statistics' not in n]
    assert len(json_files) == 1  # Seulement 1 vidéo sélectionnée

async def test_export_project_includes_statistics(
    client, project_with_two_annotated_videos
):
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["json"]}
    )
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    assert any(n.endswith('_statistics.json') for n in z.namelist())

async def test_export_project_zip_is_valid(client, project_with_two_annotated_videos):
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["json"]}
    )
    assert zipfile.is_zipfile(io.BytesIO(resp.content))

async def test_export_project_all_formats(client, project_with_two_annotated_videos):
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["json", "csv"]}
    )
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    names = z.namelist()
    assert any(n.endswith('.json') and 'statistics' not in n for n in names)
    assert any(n.endswith('.csv') for n in names)

async def test_legacy_video_export_endpoints_still_work(client, video_with_annotations):
    """Rétrocompatibilité : les anciens endpoints doivent rester fonctionnels."""
    resp = await client.get(f"/api/v1/videos/{video_with_annotations}/export/json")
    assert resp.status_code == 200
    resp2 = await client.get(f"/api/v1/videos/{video_with_annotations}/export/csv")
    assert resp2.status_code == 200

async def test_export_project_400_on_invalid_format(client, project_with_two_annotated_videos):
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": None, "formats": ["invalid_format"]}
    )
    assert resp.status_code == 422
```

### Tests frontend obligatoires à écrire en PREMIER

```tsx
// frontend/src/pages/ExportPage.test.tsx (refonte)

test('shows checkboxes for each video in project', () => {
  render(<ExportPage projectId="uuid-p1" videos={mockVideos} />);
  mockVideos.forEach(v => {
    expect(screen.getByRole('checkbox', { name: v.original_name })).toBeInTheDocument();
  });
});

test('select all checkbox selects all videos', async () => {
  render(<ExportPage projectId="uuid-p1" videos={mockVideos} />);
  await userEvent.click(screen.getByRole('checkbox', { name: /tout sélectionner/i }));
  mockVideos.forEach(v => {
    expect(screen.getByRole('checkbox', { name: v.original_name })).toBeChecked();
  });
});

test('shows format checkboxes: JSON, CSV, Video', () => {
  render(<ExportPage projectId="uuid-p1" videos={mockVideos} />);
  expect(screen.getByRole('checkbox', { name: /json/i })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /csv/i })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /vidéo/i })).toBeInTheDocument();
});

test('shows loading indicator during export', async () => {
  const exportFn = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves
  render(<ExportPage projectId="uuid-p1" videos={mockVideos} onExport={exportFn} />);
  await userEvent.click(screen.getByRole('button', { name: /exporter/i }));
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

test('triggers download after successful export', async () => {
  const exportFn = vi.fn().mockResolvedValue(new Blob(['zip']));
  render(<ExportPage projectId="uuid-p1" videos={mockVideos} onExport={exportFn} />);
  await userEvent.click(screen.getByRole('button', { name: /exporter/i }));
  await waitFor(() => expect(exportFn).toHaveBeenCalled());
});
```

## Tasks / Subtasks

### Backend
- [ ] Écrire les 7 tests backend EN PREMIER (AC: 1, 2, 3, 6)
- [ ] Créer `backend/app/schemas/export.py` (AC: 1)
  - [ ] `ProjectExportRequest` : `video_ids: Optional[List[str]]`, `formats: List[str]`, `target_bpm: Optional[float]`
- [ ] Modifier `backend/app/services/export_service.py` (AC: 2)
  - [ ] Ajouter `generate_project_zip(project_id, request: ProjectExportRequest) -> bytes`
  - [ ] Générer les fichiers JSON/CSV/stats par vidéo, les zipper avec `zipfile`
- [ ] Modifier `backend/app/routers/exports.py` (AC: 1, 2, 3)
  - [ ] `POST /api/v1/projects/{id}/export` → appel `generate_project_zip`
  - [ ] Retourner `StreamingResponse` avec `content-type: application/zip`
  - [ ] Vérifier que les anciens endpoints restent intacts
- [ ] Passer tests backend → GREEN

### Frontend
- [ ] Écrire les 5 tests frontend EN PREMIER (AC: 4, 5)
- [ ] Modifier `frontend/src/pages/ExportPage.tsx` (AC: 4, 5)
  - [ ] Checkboxes vidéos avec "Tout sélectionner"
  - [ ] Checkboxes formats (JSON, CSV, Vidéo)
  - [ ] Champ BPM cible optionnel
  - [ ] Indicateur de chargement `role="progressbar"` pendant l'export
  - [ ] Téléchargement automatique du ZIP après succès
- [ ] Modifier `frontend/src/api/exports.ts` (AC: 4)
  - [ ] `exportProject(projectId, request: ProjectExportRequest): Promise<Blob>`
- [ ] Passer tests frontend → GREEN

## Dev Notes

### Dépendances

- Aucune (les anciens endpoints restent — pas de dépendances bloquantes)

### Contexte codebase

- `export_service.py` existe déjà (Epic 5) — ajouter la fonction `generate_project_zip`
- `exports.py` router existe déjà — ajouter le nouvel endpoint sans toucher aux existants
- `ExportPage.tsx` existe (Epic 5) — refonte UI mais garder la logique d'export individuel
- Pattern ZIP Python : `zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED)`

### Structure des fichiers

```
backend/app/
├── schemas/export.py           ← modifier (ajouter ProjectExportRequest)
├── services/export_service.py  ← modifier (ajouter generate_project_zip)
├── routers/exports.py          ← modifier (nouvel endpoint POST)
└── tests/test_exports.py       ← enrichir (7 tests)

frontend/src/
├── pages/ExportPage.tsx         ← refonte UI
├── pages/ExportPage.test.tsx    ← enrichir / réécrire
└── api/exports.ts               ← modifier (exportProject)
```

### Anti-patterns à éviter

- Ne PAS supprimer les anciens endpoints — rétrocompatibilité obligatoire (AC: 3)
- Ne PAS streamer le ZIP en chunks — générer en mémoire et retourner (suffisant pour v1)
- Ne PAS oublier `URL.revokeObjectURL` après le téléchargement du blob côté frontend

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

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase D. Bloquée par S6.10 (algorithme BPM). Exigence couverture tests maximale.
