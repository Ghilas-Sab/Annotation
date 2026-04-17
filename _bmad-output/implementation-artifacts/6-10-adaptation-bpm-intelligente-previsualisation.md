# Story 6.10: Adaptation BPM Intelligente et Prévisualisation avant Export

Status: backlog

## Story

En tant qu'utilisateur,
I want que l'export vidéo ajuste localement la vitesse de chaque segment pour que les annotations tombent exactement au BPM cible, et pouvoir prévisualiser le résultat avant de télécharger,
so that j'obtiens une vidéo rythmiquement correcte et valide le résultat avant export définitif.

## Acceptance Criteria

### Algorithme d'adaptation BPM locale
1. L'algorithme découpe la vidéo en segments entre annotations consécutives
2. Pour chaque segment : `speed_factor = interval_actual_seconds / interval_target_seconds`
   - `interval_target = 60.0 / target_bpm` (en secondes)
3. Chaque segment est ré-encodé avec FFmpeg `setpts` filter : `PTS*speed_factor`
4. Les segments sont concaténés avec le filtre `concat` de FFmpeg
5. Les segments avant la première annotation et après la dernière sont copiés sans modification (`-c copy`)
6. L'export final a un audio synchronisé (filtre `atempo`, chainé si facteur > 2.0 ou < 0.5)
7. La fonction `compute_segment_speeds(annotations, fps, target_bpm)` est testée unitairement avec des valeurs précises

### Prévisualisation
8. Un bouton "Prévisualiser" génère la vidéo adaptée en basse résolution (720p max) et la lit dans le lecteur intégré
9. Endpoint `POST /api/v1/videos/{id}/preview-adapted` retourne la vidéo preview (streaming)
10. L'utilisateur peut valider ou annuler depuis l'aperçu
11. "Sauvegarder cette version" déclenche le téléchargement de la version haute qualité

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **100%** sur `compute_segment_speeds`, **≥ 80%** sur le reste.
> L'algorithme BPM est le cœur de cette story — tester tous les cas limites.

### Tests backend obligatoires à écrire en PREMIER

```python
# backend/tests/test_exports.py (ajouts)

def test_compute_segment_speeds_basic():
    """Vérifie le calcul des facteurs de vitesse par segment."""
    from app.services.export_service import compute_segment_speeds
    annotations = [
        {"frame_number": 25,  "timestamp_ms": 1000.0},
        {"frame_number": 62,  "timestamp_ms": 2480.0},  # interval = 1.48s
        {"frame_number": 100, "timestamp_ms": 4000.0},  # interval = 1.52s
    ]
    # target_bpm = 60 → interval_target = 1.0s
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=60.0)
    assert len(speeds) == 2
    assert abs(speeds[0] - 1.48) < 0.01   # segment 1: ralentir (facteur >1)
    assert abs(speeds[1] - 1.52) < 0.01   # segment 2: ralentir

def test_compute_segment_speeds_acceleration():
    """Segments plus lents que le BPM cible → facteur < 1 (accélération)."""
    from app.services.export_service import compute_segment_speeds
    annotations = [
        {"frame_number": 25,  "timestamp_ms": 1000.0},
        {"frame_number": 37,  "timestamp_ms": 1480.0},  # interval = 0.48s
    ]
    # target_bpm = 60 → interval_target = 1.0s → speed = 0.48/1.0 = 0.48
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=60.0)
    assert abs(speeds[0] - 0.48) < 0.01  # accélérer (facteur < 1)

def test_compute_segment_speeds_single_annotation_returns_empty():
    """Avec 0 ou 1 annotation, impossible de calculer des segments."""
    from app.services.export_service import compute_segment_speeds
    assert compute_segment_speeds([], fps=25.0, target_bpm=120.0) == []
    assert compute_segment_speeds(
        [{"frame_number": 25, "timestamp_ms": 1000.0}],
        fps=25.0, target_bpm=120.0
    ) == []

def test_compute_segment_speeds_exact_bpm():
    """Annotations exactement au BPM cible → speed = 1.0 (pas de modification)."""
    from app.services.export_service import compute_segment_speeds
    # BPM = 60 → interval = 1.0s → frames à 25fps: 0, 25, 50
    annotations = [
        {"frame_number": 0,  "timestamp_ms": 0.0},
        {"frame_number": 25, "timestamp_ms": 1000.0},  # interval = 1.0s
        {"frame_number": 50, "timestamp_ms": 2000.0},  # interval = 1.0s
    ]
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=60.0)
    assert all(abs(s - 1.0) < 0.001 for s in speeds)

def test_compute_segment_speeds_high_bpm():
    """BPM cible élevé (120) → interval_target court → facteurs > 1 si annotations lentes."""
    from app.services.export_service import compute_segment_speeds
    annotations = [
        {"frame_number": 0,  "timestamp_ms": 0.0},
        {"frame_number": 50, "timestamp_ms": 2000.0},  # interval = 2.0s
    ]
    # target_bpm = 120 → interval_target = 0.5s → speed = 2.0/0.5 = 4.0
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=120.0)
    assert abs(speeds[0] - 4.0) < 0.01

async def test_preview_adapted_returns_video(client, video_with_annotations):
    resp = await client.post(
        f"/api/v1/videos/{video_with_annotations}/preview-adapted",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 200
    assert "video" in resp.headers["content-type"]

async def test_preview_adapted_requires_target_bpm(client, video_with_annotations):
    resp = await client.post(
        f"/api/v1/videos/{video_with_annotations}/preview-adapted",
        json={}
    )
    assert resp.status_code == 422

async def test_preview_adapted_requires_min_2_annotations(client, video_no_annotations):
    resp = await client.post(
        f"/api/v1/videos/{video_no_annotations}/preview-adapted",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 400  # Pas assez d'annotations
```

### Tests frontend obligatoires à écrire en PREMIER

```tsx
// frontend/src/components/exports/PreviewPlayer.test.tsx (nouveau)

test('preview button triggers preview generation', async () => {
  const generatePreview = vi.fn().mockResolvedValue('/preview.mp4');
  render(<ExportForm onGeneratePreview={generatePreview} targetBpm={120} videoId="uuid-1" />);
  await userEvent.click(screen.getByRole('button', { name: /prévisualiser/i }));
  expect(generatePreview).toHaveBeenCalledWith({ videoId: 'uuid-1', targetBpm: 120 });
});

test('shows video player after preview is generated', async () => {
  const generatePreview = vi.fn().mockResolvedValue('/preview.mp4');
  render(<ExportForm onGeneratePreview={generatePreview} targetBpm={120} videoId="uuid-1" />);
  await userEvent.click(screen.getByRole('button', { name: /prévisualiser/i }));
  await waitFor(() =>
    expect(screen.getByTestId('preview-player')).toBeInTheDocument()
  );
});

test('shows loading state while preview is generating', async () => {
  const generatePreview = vi.fn().mockImplementation(() => new Promise(() => {}));
  render(<ExportForm onGeneratePreview={generatePreview} targetBpm={120} videoId="uuid-1" />);
  await userEvent.click(screen.getByRole('button', { name: /prévisualiser/i }));
  expect(screen.getByRole('button', { name: /prévisualiser/i })).toBeDisabled();
  expect(screen.getByText(/génération/i)).toBeInTheDocument();
});

test('save button triggers high quality download', async () => {
  const onSave = vi.fn();
  render(<PreviewPlayer previewUrl="/preview.mp4" onSave={onSave} onCancel={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));
  expect(onSave).toHaveBeenCalled();
});

test('cancel button hides preview player', async () => {
  const onCancel = vi.fn();
  render(<PreviewPlayer previewUrl="/preview.mp4" onSave={vi.fn()} onCancel={onCancel} />);
  await userEvent.click(screen.getByRole('button', { name: /annuler/i }));
  expect(onCancel).toHaveBeenCalled();
});
```

## Tasks / Subtasks

### Backend — Algorithme
- [ ] Écrire les 8 tests backend EN PREMIER — tous les cas de `compute_segment_speeds`
- [ ] Implémenter `compute_segment_speeds(annotations, fps, target_bpm) -> List[float]` dans `export_service.py`
  - [ ] Calcul : `speed = interval_actual / interval_target` pour chaque paire d'annotations consécutives
  - [ ] `interval_target = 60.0 / target_bpm`
  - [ ] Retourne `[]` si 0 ou 1 annotation
- [ ] Implémenter `adapt_video_bpm(video_path, annotations, target_bpm, output_path, resolution='720p')` dans `export_service.py`
  - [ ] Découper en segments avec FFmpeg
  - [ ] Appliquer `setpts=PTS*speed` sur chaque segment vidéo
  - [ ] Appliquer `atempo=1/speed` sur chaque segment audio (chainé si > 2.0 ou < 0.5)
  - [ ] Copier les segments avant/après sans modification (`-c copy`)
  - [ ] Concaténer avec `concat` filter
- [ ] Ajouter `POST /api/v1/videos/{id}/preview-adapted` dans `exports.py` (AC: 9)
  - [ ] Accepter `target_bpm: float`
  - [ ] Générer avec `adapt_video_bpm(..., resolution='720p')`
  - [ ] Streamer la vidéo générée
  - [ ] Retourner 400 si < 2 annotations
- [ ] Intégrer `adapt_video_bpm` dans `generate_project_zip` quand `target_bpm` fourni (AC: S6.9)

### Frontend
- [ ] Écrire les 5 tests frontend EN PREMIER
- [ ] Créer `frontend/src/components/exports/PreviewPlayer.tsx` (AC: 8, 10, 11)
  - [ ] Lecteur vidéo avec `data-testid="preview-player"`
  - [ ] Boutons "Sauvegarder cette version" et "Annuler"
- [ ] Modifier `frontend/src/pages/ExportPage.tsx` (AC: 8, 11)
  - [ ] Intégrer `<PreviewPlayer>` dans le workflow d'export
  - [ ] État loading pendant la génération preview
  - [ ] "Sauvegarder" → téléchargement haute qualité
- [ ] Modifier `frontend/src/api/exports.ts` (AC: 9)
  - [ ] `generatePreview(videoId, targetBpm): Promise<string>` (URL du blob preview)
- [ ] Passer tous les tests → GREEN

## Dev Notes

### Dépendances

- **S6.9 DOIT être implémentée avant S6.10** (l'algorithme est intégré dans le ZIP projet)

### Contexte codebase

- `export_service.py` existe déjà (Epic 5) — ajouter les nouvelles fonctions
- FFmpeg est déjà disponible dans le container Docker (S5.2)
- Pattern FFmpeg Python : `ffmpeg.input(...).filter(...).output(...).run()`
- `atempo` range : 0.5 à 2.0. Pour facteurs hors range → chaîner : `atempo=0.5,atempo=0.5` pour 0.25

### Algorithme FFmpeg détaillé

```python
# Pseudo-code pour l'adaptation par segments
def adapt_video_bpm(video_path, annotations, target_bpm, output_path, resolution='720p'):
    interval_target = 60.0 / target_bpm
    speeds = compute_segment_speeds(annotations, fps, target_bpm)
    
    segments = []
    # Segment avant première annotation : copie directe
    # Pour chaque paire d'annotations consécutives :
    #   filter_video = f"[v{i}]setpts={speed}*PTS[ov{i}]"
    #   filter_audio = build_atempo_chain(1.0/speed)
    # Segment après dernière annotation : copie directe
    # Concat final : ffmpeg concat filter
```

### atempo chain builder

```python
def build_atempo_chain(speed: float) -> str:
    """Construit la chaîne atempo pour un facteur de vitesse audio."""
    filters = []
    while speed > 2.0:
        filters.append("atempo=2.0")
        speed /= 2.0
    while speed < 0.5:
        filters.append("atempo=0.5")
        speed /= 0.5
    filters.append(f"atempo={speed:.4f}")
    return ",".join(filters)
```

### Structure des fichiers

```
backend/app/
├── services/export_service.py       ← modifier (compute_segment_speeds + adapt_video_bpm)
├── routers/exports.py               ← modifier (endpoint preview-adapted)
└── tests/test_exports.py            ← enrichir (8 tests)

frontend/src/
├── components/exports/
│   ├── PreviewPlayer.tsx             ← créer
│   └── PreviewPlayer.test.tsx        ← créer
├── pages/ExportPage.tsx              ← modifier (workflow preview)
└── api/exports.ts                    ← modifier (generatePreview)
```

### Anti-patterns à éviter

- Ne PAS utiliser `WebCodecs` côté client — FFmpeg côté serveur uniquement (ADR-002)
- Ne PAS mettre en queue les exports preview — synchrone en v1
- Ne PAS supprimer les fichiers temporaires en cas d'erreur — utiliser `try/finally` ou `tempfile`
- Ne PAS hardcoder le chemin de sortie — utiliser `tempfile.mktemp()` + cleanup

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

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase D (complexité élevée). Dépend de S6.9. Exigence couverture tests maximale, 100% sur compute_segment_speeds.
