# Story 6.2: Renommage Vidéo à l'Import

Status: done

## Story

En tant qu'utilisateur,
I want pouvoir modifier le nom de la vidéo avant de valider l'upload,
so that je nomme mes vidéos de manière significative sans avoir à renommer le fichier source.

## Acceptance Criteria

1. Après sélection d'un fichier (drag & drop ou clic), un champ texte pré-rempli avec le nom du fichier apparaît
2. L'utilisateur peut modifier ce nom avant de cliquer sur "Uploader"
3. Le champ est vidé automatiquement à l'annulation ou après upload réussi
4. Le backend stocke `original_name` avec la valeur saisie par l'utilisateur (pas le nom du fichier système)
5. La valeur ne peut pas être vide (validation côté frontend : fallback sur le nom du fichier)
6. Le backend accepte un paramètre `display_name` dans le multipart upload
7. L'input est labellisé "Nom de la vidéo" (accessible `aria-label` / `htmlFor`)

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **≥ 80%** sur les fichiers modifiés.
> Frontend ET backend — les deux couches doivent être testées.

### Tests obligatoires à écrire en PREMIER

```tsx
// frontend/src/components/projects/VideoUpload.test.tsx (ajouts)

test('shows editable name field after file selection', async () => {
  render(<VideoUpload projectId="uuid-1" />);
  const file = new File(['video'], 'my_recording.mp4', { type: 'video/mp4' });
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } });
  const nameInput = await screen.findByRole('textbox', { name: /nom de la vidéo/i });
  expect(nameInput).toHaveValue('my_recording.mp4');
});

test('sends display_name to backend on upload', async () => {
  const mockUpload = vi.fn().mockResolvedValue({ id: 'uuid-v1', original_name: 'Ma vidéo' });
  render(<VideoUpload projectId="uuid-1" onUpload={mockUpload} />);
  const file = new File(['video'], 'raw.mp4', { type: 'video/mp4' });
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } });
  const nameInput = await screen.findByRole('textbox', { name: /nom de la vidéo/i });
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, 'Ma vidéo');
  await userEvent.click(screen.getByRole('button', { name: /uploader/i }));
  expect(mockUpload).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Ma vidéo' }));
});

test('falls back to filename if name field is emptied', async () => {
  render(<VideoUpload projectId="uuid-1" />);
  const file = new File(['video'], 'original.mp4', { type: 'video/mp4' });
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } });
  const nameInput = await screen.findByRole('textbox', { name: /nom de la vidéo/i });
  await userEvent.clear(nameInput);
  await userEvent.tab(); // blur
  expect(nameInput).toHaveValue('original.mp4');
});

test('clears name field after successful upload', async () => {
  const mockUpload = vi.fn().mockResolvedValue({ id: 'uuid-v1' });
  render(<VideoUpload projectId="uuid-1" onUpload={mockUpload} />);
  const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } });
  await userEvent.click(screen.getByRole('button', { name: /uploader/i }));
  await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
});
```

```python
# backend/tests/test_videos.py (ajouts)

async def test_upload_video_with_display_name(client, tmp_video):
    response = await client.post(
        "/api/v1/projects/uuid-1/videos",
        data={"display_name": "Ma vidéo de test"},
        files={"file": ("video.mp4", tmp_video, "video/mp4")},
    )
    assert response.status_code == 201
    assert response.json()["original_name"] == "Ma vidéo de test"

async def test_upload_video_without_display_name_uses_filename(client, tmp_video):
    response = await client.post(
        "/api/v1/projects/uuid-1/videos",
        files={"file": ("my_file.mp4", tmp_video, "video/mp4")},
    )
    assert response.status_code == 201
    assert response.json()["original_name"] == "my_file.mp4"
```

## Tasks / Subtasks

- [x] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–7)
  - [x] Ajouter 4 tests dans `frontend/src/components/projects/VideoUpload.test.tsx`
  - [x] Ajouter 2 tests dans `backend/tests/test_videos.py`
- [x] Modifier `frontend/src/components/projects/VideoUpload.tsx` (AC: 1, 2, 3, 5, 7)
  - [x] État local `displayName` initialisé avec `file.name` après sélection
  - [x] Afficher `<input type="text" aria-label="Nom de la vidéo" value={displayName} />`
  - [x] onBlur : si vide → fallback sur `file.name`
  - [x] Reset `displayName` après upload réussi ou annulation
  - [x] Passer `displayName` à la fonction d'upload
- [x] Modifier `frontend/src/api/projects.ts` (AC: 6)
  - [x] Ajouter `displayName` dans la construction du `FormData`
- [x] Modifier `backend/app/routers/videos.py` (AC: 4, 6)
  - [x] Accepter `display_name: Optional[str] = Form(None)`
  - [x] Si `display_name` fourni → `original_name = display_name`, sinon `original_name = file.filename`
- [x] Modifier `backend/app/schemas/video.py` si besoin (AC: 4)
  - [x] `original_name` déjà exposé dans la réponse — aucune modification nécessaire
- [x] Passer tous les tests → GREEN

## Dev Notes

### Dépendances

- S6.1 (même zone — implémenter après S6.1 pour éviter conflits merge)

### Contexte codebase

- `VideoUpload.tsx` gère déjà le drag & drop → ajouter l'état `displayName` après sélection du fichier
- Pattern FormData backend : vérifier `backend/app/routers/videos.py` pour le paramètre `Form()`
- `original_name` est déjà un champ dans le schéma vidéo — s'assurer qu'il est bien mappé

### Structure des fichiers

```
frontend/src/
├── components/projects/
│   ├── VideoUpload.tsx          ← modifier
│   └── VideoUpload.test.tsx     ← enrichir
└── api/
    └── videos.ts (ou projects.ts) ← modifier FormData

backend/app/
├── routers/videos.py            ← ajouter display_name
├── schemas/video.py             ← vérifier original_name
└── tests/test_videos.py         ← enrichir
```

### Anti-patterns à éviter

- Ne PAS envoyer `display_name` vide au backend — le fallback doit être côté frontend
- Ne PAS modifier le comportement de drag & drop existant
- Ne PAS renommer le fichier physique stocké — uniquement `original_name` en base

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Amelia — bmad-agent-dev)

### Debug Log References

Aucun blocage — implémentation directe conforme aux AC.

### Completion Notes List

- `original_name` était déjà exposé dans le schéma vidéo — aucune modification de `schemas/video.py` nécessaire
- Le fallback `displayName.trim() || file.name` gère l'AC 5 côté frontend
- `data-testid="dropzone"` ajouté sur la dropzone pour faciliter les tests

### File List

- `frontend/src/components/projects/VideoUpload.tsx`
- `frontend/src/components/projects/VideoUpload.test.tsx`
- `frontend/src/api/projects.ts`
- `backend/app/routers/videos.py`
- `backend/tests/test_videos.py`

## Change Log

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase B. Exigence couverture tests maximale.
