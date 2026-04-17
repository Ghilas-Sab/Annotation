# Story 6.2: Renommage Vidéo à l'Import

Status: backlog

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

- [ ] Écrire les tests EN PREMIER — RED confirmé avant tout code (AC: 1–7)
  - [ ] Ajouter 4 tests dans `frontend/src/components/projects/VideoUpload.test.tsx`
  - [ ] Ajouter 2 tests dans `backend/tests/test_videos.py`
- [ ] Modifier `frontend/src/components/projects/VideoUpload.tsx` (AC: 1, 2, 3, 5, 7)
  - [ ] État local `displayName` initialisé avec `file.name` après sélection
  - [ ] Afficher `<input type="text" aria-label="Nom de la vidéo" value={displayName} />`
  - [ ] onBlur : si vide → fallback sur `file.name`
  - [ ] Reset `displayName` après upload réussi ou annulation
  - [ ] Passer `displayName` à la fonction d'upload
- [ ] Modifier `frontend/src/api/projects.ts` (ou `videos.ts`) (AC: 6)
  - [ ] Ajouter `displayName` dans la construction du `FormData`
- [ ] Modifier `backend/app/routers/videos.py` (AC: 4, 6)
  - [ ] Accepter `display_name: Optional[str] = Form(None)`
  - [ ] Si `display_name` fourni → `original_name = display_name`, sinon `original_name = file.filename`
- [ ] Modifier `backend/app/schemas/video.py` si besoin (AC: 4)
  - [ ] Vérifier que `original_name` est bien exposé dans la réponse
- [ ] Passer tous les tests → GREEN

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

_à remplir_

### Debug Log References

_à remplir_

### Completion Notes List

_à remplir_

### File List

_à remplir_

## Change Log

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase B. Exigence couverture tests maximale.
