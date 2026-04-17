# PRD — Epic 6 : Retours Client V1

**Projet :** AnnotaRythm  
**Version :** 1.1  
**Date :** Avril 2026  
**Auteur :** John (BMad PM)  
**Statut :** Prêt pour implémentation  
**Source :** `_bmad-output/planning-artifacts/retours-client-v1.md`

---

## Contexte et objectif

Suite à la démonstration de la V1 d'AnnotaRythm, le client a formulé des retours couvrant trois zones : la page Gestion de Projets, la page Annotation, et le module Exportation.

Cet Epic traduit ces retours en stories implémentables, priorisées par impact utilisateur et couplage technique. Aucune story ne doit casser les tests existants (Epics 1–5).

---

## Périmètre — ce qui change

| Zone | Changement | Complexité |
|------|-----------|------------|
| Projets | Refonte layout page détail | Faible |
| Projets | Renommage vidéo à l'import | Faible |
| Projets | Bug compteur annotations + pluriel | Faible |
| Projets | Affichage BPM conditionnel | Faible |
| Annotation | Boutons équivalents raccourcis (tablette) | Moyenne |
| Annotation | Correction Ctrl+flèche + Alt+flèche | Faible |
| Annotation | Système de catégories d'annotations | Élevée |
| Annotation | Fix vidéo plein espace | Faible |
| Annotation | Formulaire plage avec aperçu vidéo | Moyenne |
| Export | Export par projet (pas par vidéo) | Moyenne |
| Export | Adaptation BPM intelligente locale | Élevée |
| Export | Prévisualisation avant export | Élevée |

---

## Stories

---

### S6.1 — Refonte layout page détail projet

**En tant qu'** utilisateur,  
**Je veux** que la page détail d'un projet réorganise la dropzone à gauche et la liste des vidéos à droite,  
**Afin d'** exploiter tout l'espace disponible et améliorer la lisibilité.

#### Critères d'acceptation
- [ ] La page détail projet affiche un layout deux colonnes : dropzone (gauche, ~35%) / liste vidéos (droite, ~65%)
- [ ] Le layout est responsive : sur mobile (<768px) les colonnes s'empilent verticalement (dropzone en haut)
- [ ] La dropzone conserve son comportement existant (drag & drop + clic pour sélectionner)
- [ ] La liste des vidéos s'affiche en colonne scrollable si le nombre de vidéos dépasse la hauteur visible
- [ ] Les tests existants de `VideoUpload.tsx` et `ProjectCard.tsx` passent sans modification

#### Section TDD — Tests à écrire en premier
```tsx
// frontend/src/pages/ProjectDetailPage.test.tsx
test('layout has two columns: dropzone left, video list right', () => {
  render(<ProjectDetailPage projectId="uuid-1" />);
  const dropzone = screen.getByTestId('dropzone-column');
  const videoList = screen.getByTestId('video-list-column');
  // Vérifie que les deux colonnes sont présentes et dans le bon ordre DOM
  expect(dropzone).toBeInTheDocument();
  expect(videoList).toBeInTheDocument();
  expect(dropzone.compareDocumentPosition(videoList))
    .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});
```

#### Fichiers à modifier
```
frontend/src/pages/ProjectDetailPage.tsx   # ou ProjectsPage.tsx selon implémentation actuelle
frontend/src/components/projects/VideoUpload.tsx   # ajout data-testid
```

#### Dépendances
- Aucune (pure refonte CSS/layout)

---

### S6.2 — Renommage vidéo à l'import

**En tant qu'** utilisateur,  
**Je veux** pouvoir modifier le nom de la vidéo avant de valider l'upload,  
**Afin de** nommer mes vidéos de manière significative sans avoir à renommer le fichier source.

#### Critères d'acceptation
- [ ] Après sélection d'un fichier (drag & drop ou clic), un champ texte pré-rempli avec le nom du fichier apparaît
- [ ] L'utilisateur peut modifier ce nom avant de cliquer sur "Uploader"
- [ ] Le champ est vidé automatiquement à l'annulation ou après upload réussi
- [ ] Le backend stocke `original_name` avec la valeur saisie par l'utilisateur (pas le nom du fichier système)
- [ ] La valeur ne peut pas être vide (validation côté frontend : fallback sur le nom du fichier)
- [ ] Le backend accepte un paramètre `display_name` dans le multipart upload

#### Section TDD — Tests à écrire en premier
```tsx
// frontend/src/components/projects/VideoUpload.test.tsx (ajout)
test('shows editable name field after file selection', async () => {
  render(<VideoUpload projectId="uuid-1" />);
  const file = new File(['video'], 'my_recording.mp4', { type: 'video/mp4' });
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } });
  const nameInput = await screen.findByRole('textbox', { name: /nom de la vidéo/i });
  expect(nameInput).toHaveValue('my_recording.mp4');
});

test('sends display_name to backend on upload', async () => {
  // Mock API, vérifie que display_name='Ma vidéo' est envoyé dans FormData
});
```
```python
# backend/tests/test_videos.py (ajout)
async def test_upload_video_with_display_name(client, tmp_video):
    response = await client.post(
        "/api/v1/projects/uuid-1/videos",
        data={"display_name": "Ma vidéo de test"},
        files={"file": ("video.mp4", tmp_video, "video/mp4")},
    )
    assert response.status_code == 201
    assert response.json()["original_name"] == "Ma vidéo de test"
```

#### Fichiers à modifier
```
frontend/src/components/projects/VideoUpload.tsx     # Champ nom + logique
backend/app/routers/videos.py                        # Paramètre display_name dans upload
backend/app/schemas/video.py                         # Champ display_name optionnel
```

#### Dépendances
- S6.1 (même zone, éviter conflits de merge)

---

### S6.3 — Correction compteur annotations + affichage BPM conditionnel

**En tant qu'** utilisateur,  
**Je veux** que chaque carte vidéo affiche le bon nombre d'annotations (avec singulier/pluriel correct) et le BPM calculé uniquement si la vidéo a été annotée,  
**Afin d'** avoir une information fiable et propre sur l'état de mes vidéos.

#### Critères d'acceptation
- [ ] Le compteur affiche "0 annotation", "1 annotation", "2 annotations" (gestion singulier/pluriel)
- [ ] Le compteur se met à jour après chaque annotation ajoutée ou supprimée sans rechargement de page
- [ ] Si `annotations.length === 0` → pas d'affichage BPM sur la carte
- [ ] Si `annotations.length >= 2` → affichage du BPM global calculé (ex : "72 BPM")
- [ ] Si `annotations.length === 1` → pas d'affichage BPM (impossible de calculer)
- [ ] Le BPM affiché provient de l'endpoint existant `GET /api/v1/videos/{id}/statistics`

#### Section TDD — Tests à écrire en premier
```tsx
// frontend/src/components/projects/VideoCard.test.tsx (nouveau ou ajout)
test.each([
  [0, '0 annotation'],
  [1, '1 annotation'],
  [3, '3 annotations'],
])('displays correct annotation count: %i → "%s"', (count, expected) => {
  render(<VideoCard video={buildVideo({ annotationCount: count })} />);
  expect(screen.getByText(expected)).toBeInTheDocument();
});

test('hides BPM when no annotations', () => {
  render(<VideoCard video={buildVideo({ annotationCount: 0 })} />);
  expect(screen.queryByText(/BPM/)).not.toBeInTheDocument();
});

test('shows BPM when video has 2+ annotations', () => {
  render(<VideoCard video={buildVideo({ annotationCount: 5, bpm: 72 })} />);
  expect(screen.getByText('72 BPM')).toBeInTheDocument();
});
```

#### Fichiers à modifier
```
frontend/src/components/projects/VideoCard.tsx     # Logique compteur + BPM conditionnel
frontend/src/api/statistics.ts                     # Appel BPM depuis la carte si nécessaire
```

#### Dépendances
- Aucune (bug fix isolé)

---

### S6.4 — Boutons équivalents pour tous les raccourcis clavier

**En tant qu'** utilisateur sur tablette (sans clavier physique),  
**Je veux** avoir des boutons cliquables pour toutes les actions de la page annotation,  
**Afin de** pouvoir annoter une vidéo sans avoir besoin d'un clavier.

#### Critères d'acceptation
- [ ] Un panneau "Contrôles" visible affiche des boutons pour chaque raccourci :

| Action | Raccourci | Bouton |
|--------|-----------|--------|
| Frame précédente | ← | ◀ |
| Frame suivante | → | ▶ |
| −5 frames | Shift+← | ◀◀ |
| +5 frames | Shift+→ | ▶▶ |
| Annotation précédente | Ctrl+← | ⏮ |
| Annotation suivante | Ctrl+→ | ⏭ |
| Début vidéo | Alt+← | ⏪ |
| Fin vidéo | Alt+→ | ⏩ |
| Annoter | Espace | ● Annoter |
| Lecture/Pause | — | ▶/⏸ |

- [ ] Les boutons appellent exactement les mêmes handlers que les raccourcis clavier (pas de duplication de logique)
- [ ] Les raccourcis clavier continuent de fonctionner (pas de régression)
- [ ] Un bouton "?" ouvre la modal de référence des raccourcis (déjà existante `KeyboardShortcutsModal`)

#### Section TDD — Tests à écrire en premier
```tsx
// frontend/src/components/video/PlaybackControls.test.tsx (ajout)
test('clicking next-frame button calls seekToFrame with current+1', async () => {
  const seekFn = vi.fn();
  render(<PlaybackControls onSeek={seekFn} currentFrame={10} fps={25} />);
  await userEvent.click(screen.getByRole('button', { name: /frame suivante/i }));
  expect(seekFn).toHaveBeenCalledWith(11);
});

test('clicking annotate button adds annotation at current frame', async () => {
  const annotateFn = vi.fn();
  render(<PlaybackControls onAnnotate={annotateFn} currentFrame={42} />);
  await userEvent.click(screen.getByRole('button', { name: /annoter/i }));
  expect(annotateFn).toHaveBeenCalledWith(42);
});
```

#### Fichiers à modifier
```
frontend/src/components/video/PlaybackControls.tsx   # Ajout boutons
frontend/src/hooks/useVideoKeyboard.ts               # Extraction des handlers pour réutilisation
```

#### Dépendances
- S6.5 (Alt+flèche doit être implémenté avant d'ajouter les boutons correspondants)

---

### S6.5 — Correction Ctrl+flèche et nouveaux raccourcis Alt+flèche

**En tant qu'** utilisateur,  
**Je veux** que Ctrl+flèche fonctionne de manière fiable et qu'Alt+← / Alt+→ me téléportent au début et à la fin de la vidéo,  
**Afin de** naviguer efficacement dans mes annotations.

#### Critères d'acceptation
- [ ] `Ctrl+→` saute vers la prochaine annotation (logique `getInterAnnotationStep` existante, corrigée)
- [ ] `Ctrl+←` saute vers l'annotation précédente
- [ ] Le bug de fiabilité de Ctrl+flèche est diagnostiqué et corrigé (voir note technique ci-dessous)
- [ ] `Alt+←` positionne la vidéo à la frame 0 (début absolu)
- [ ] `Alt+→` positionne la vidéo à la dernière frame (`total_frames - 1`)
- [ ] Aucun conflit avec les raccourcis navigateur (Alt+← = retour arrière dans certains navigateurs) → utiliser `event.preventDefault()`
- [ ] Les tests de `useVideoKeyboard.ts` couvrent les 4 raccourcis modifiés/ajoutés

**Note technique — bug Ctrl+flèche :**  
L'implémentation actuelle de `getInterAnnotationStep` dans `useVideoKeyboard.ts` peut retourner `FALLBACK=10` même avec suffisamment d'annotations si l'état Zustand n'est pas à jour au moment de l'événement clavier. Vérifier que le hook lit directement depuis le store (pas une closure stale) en utilisant le sélecteur avec un callback au lieu d'une variable capturée.

#### Section TDD — Tests à écrire en premier
```ts
// frontend/src/hooks/useVideoKeyboard.test.ts (ajout)
test('Alt+ArrowLeft seeks to frame 0', () => {
  const { seekFn } = setupKeyboardHook({ currentFrame: 150, totalFrames: 500 });
  fireKeyDown({ key: 'ArrowLeft', altKey: true });
  expect(seekFn).toHaveBeenCalledWith(0);
});

test('Alt+ArrowRight seeks to last frame', () => {
  const { seekFn } = setupKeyboardHook({ currentFrame: 150, totalFrames: 500 });
  fireKeyDown({ key: 'ArrowRight', altKey: true });
  expect(seekFn).toHaveBeenCalledWith(499);
});

test('Ctrl+ArrowRight uses live store annotations, not stale closure', () => {
  const { seekFn, addAnnotation } = setupKeyboardHook({ currentFrame: 50 });
  addAnnotation(20); addAnnotation(35); // step = 15
  fireKeyDown({ key: 'ArrowRight', ctrlKey: true });
  expect(seekFn).toHaveBeenCalledWith(65); // 50 + 15
});
```

#### Fichiers à modifier
```
frontend/src/hooks/useVideoKeyboard.ts   # Fix closure stale + Alt+flèche
```

#### Dépendances
- Aucune

---

### S6.6 — Système de catégories d'annotations

**En tant qu'** utilisateur,  
**Je veux** créer des catégories (nom + couleur) et assigner chaque annotation à une catégorie,  
**Afin de** visualiser différents types d'événements rythmiques avec des couleurs distinctes sur la timeline.

#### Critères d'acceptation

**Gestion des catégories :**
- [ ] Avant de commencer l'annotation, l'utilisateur peut créer/modifier/supprimer des catégories
- [ ] Chaque catégorie a un nom (texte libre) et une couleur (color picker ou palette prédéfinie de 8 couleurs)
- [ ] Une catégorie "Par défaut" (gris) existe toujours et ne peut pas être supprimée
- [ ] La liste des catégories est persistée côté backend (par vidéo)

**Lors de l'annotation :**
- [ ] Avant de créer une annotation (Espace ou bouton), la catégorie active est sélectionnable dans un sélecteur visible
- [ ] L'annotation créée hérite de la catégorie active
- [ ] Dans la liste des annotations, chaque entrée affiche un badge coloré de sa catégorie

**Timeline :**
- [ ] Chaque barre de la timeline (Canvas) est rendue avec la couleur de la catégorie de son annotation
- [ ] Une légende des catégories est affichée sous la timeline

**Bulk placement :**
- [ ] Le formulaire de bulk placement inclut un sélecteur de catégorie
- [ ] Toutes les annotations créées en bulk appartiennent à la catégorie sélectionnée

**Backend :**
- [ ] Nouveau modèle `Category` : `{ id, video_id, name, color, created_at }`
- [ ] Endpoints CRUD : `GET/POST /api/v1/videos/{id}/categories`, `PUT/DELETE /api/v1/categories/{id}`
- [ ] Le modèle `Annotation` a un champ `category_id` (FK, nullable → catégorie par défaut)
- [ ] Migration rétrocompatible : les annotations existantes sans catégorie reçoivent la catégorie par défaut

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_categories.py (nouveau)
async def test_create_category(client):
    resp = await client.post("/api/v1/videos/uuid-2/categories",
        json={"name": "Temps fort", "color": "#FF5733"})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Temps fort"

async def test_annotation_with_category(client):
    cat = (await client.post("/api/v1/videos/uuid-2/categories",
        json={"name": "Beat", "color": "#3498DB"})).json()
    ann = (await client.post("/api/v1/videos/uuid-2/annotations",
        json={"frame_number": 42, "category_id": cat["id"]})).json()
    assert ann["category_id"] == cat["id"]
```
```tsx
// frontend/src/components/annotations/CategorySelector.test.tsx (nouveau)
test('renders category list with color badges', () => {
  const categories = [
    { id: 'c1', name: 'Beat', color: '#FF0000' },
    { id: 'c2', name: 'Temps fort', color: '#0000FF' },
  ];
  render(<CategorySelector categories={categories} value="c1" onChange={vi.fn()} />);
  expect(screen.getByText('Beat')).toBeInTheDocument();
  expect(screen.getByText('Temps fort')).toBeInTheDocument();
});
```

#### Fichiers à créer / modifier
```
backend/app/schemas/category.py                  # Nouveau schéma Pydantic
backend/app/routers/categories.py                # Nouveau router CRUD
backend/app/main.py                              # Inclure le router categories
backend/app/storage/json_store.py                # Support categories dans la structure
backend/tests/test_categories.py                 # Nouveau
frontend/src/components/annotations/CategorySelector.tsx   # Nouveau composant
frontend/src/components/annotations/AnnotationItem.tsx     # Badge couleur catégorie
frontend/src/components/video/VideoTimeline.tsx            # Couleurs par catégorie sur Canvas
frontend/src/components/annotations/BulkPlacementForm.tsx  # Sélecteur catégorie
frontend/src/types/annotation.ts                           # Champ category_id
frontend/src/api/annotations.ts                            # Param category_id
```

#### Dépendances
- Aucune (mais story la plus complexe de l'Epic — implémenter en dernier dans la zone Annotation)

---

### S6.7 — Fix vidéo plein espace dans le lecteur

**En tant qu'** utilisateur,  
**Je veux** que la vidéo occupe tout l'espace du lecteur sans zones noires,  
**Afin d'** avoir une expérience de visionnage optimale lors de l'annotation.

#### Critères d'acceptation
- [ ] L'élément `<video>` utilise `object-fit: contain` avec `width: 100%` et `height: 100%` sur son conteneur
- [ ] Le conteneur vidéo occupe tout l'espace disponible dans la colonne dédiée
- [ ] Si le ratio de la vidéo diffère du conteneur, des barres noires apparaissent uniquement sur les côtés (letterbox) — comportement CSS natif
- [ ] Les tests de `VideoPlayer.test.tsx` passent sans modification
- [ ] Vérifié visuellement avec une vidéo 16:9 et une vidéo 4:3

#### Section TDD — Tests à écrire en premier
```tsx
// frontend/src/components/video/VideoPlayer.test.tsx (ajout)
test('video element has correct CSS classes for full-space rendering', () => {
  render(<VideoPlayer src="/test.mp4" />);
  const video = screen.getByTestId('video-element');
  // Vérification des styles appliqués
  expect(video).toHaveStyle({ width: '100%', height: '100%' });
});
```

#### Fichiers à modifier
```
frontend/src/components/video/VideoPlayer.tsx   # CSS : object-fit + dimensions conteneur
```

#### Dépendances
- Aucune (fix CSS isolé)

---

### S6.8 — Formulaire de sélection de plage d'annotation avec aperçu vidéo

**En tant qu'** utilisateur,  
**Je veux** qu'un formulaire apparaisse lors de l'accès à la page d'annotation pour choisir d'annoter toute la vidéo ou une plage temporelle précise, avec un aperçu de la vidéo,  
**Afin de** travailler sur la section pertinente sans distractions.

#### Critères d'acceptation
- [ ] À l'ouverture de la page annotation, une modale ou un écran intermédiaire propose :
  - Option A : "Annoter toute la vidéo"
  - Option B : "Annoter une plage" → deux champs timestamp (début / fin)
- [ ] L'aperçu vidéo est intégré dans le formulaire (miniature du lecteur HTML5 avec les mêmes contrôles de base)
- [ ] En mode "plage", l'utilisateur peut naviguer dans l'aperçu pour choisir ses points de début et de fin précisément
- [ ] Un bouton "Marquer comme début" et "Marquer comme fin" capture la frame courante de l'aperçu
- [ ] La validation passe le contexte de plage `{ start_frame, end_frame }` à la page d'annotation
- [ ] La page d'annotation respecte cette plage : le lecteur démarre à `start_frame` et ne peut pas naviguer avant/après
- [ ] Si "toute la vidéo" est sélectionnée, pas de restriction

#### Section TDD — Tests à écrire en premier
```tsx
// frontend/src/components/annotations/RangeSelectionModal.test.tsx (nouveau)
test('shows two options: full video and range', () => {
  render(<RangeSelectionModal video={mockVideo} onConfirm={vi.fn()} />);
  expect(screen.getByText(/toute la vidéo/i)).toBeInTheDocument();
  expect(screen.getByText(/plage spécifique/i)).toBeInTheDocument();
});

test('confirm with full video passes null range', async () => {
  const onConfirm = vi.fn();
  render(<RangeSelectionModal video={mockVideo} onConfirm={onConfirm} />);
  await userEvent.click(screen.getByRole('radio', { name: /toute la vidéo/i }));
  await userEvent.click(screen.getByRole('button', { name: /commencer/i }));
  expect(onConfirm).toHaveBeenCalledWith({ startFrame: null, endFrame: null });
});

test('mark start frame captures current preview frame', async () => {
  const onConfirm = vi.fn();
  render(<RangeSelectionModal video={mockVideo} onConfirm={onConfirm} />);
  await userEvent.click(screen.getByRole('radio', { name: /plage/i }));
  // Simule la frame courante de l'aperçu à 42
  fireEvent.click(screen.getByRole('button', { name: /marquer début/i }));
  expect(screen.getByTestId('start-frame-value')).toHaveTextContent('42');
});
```

#### Fichiers à créer / modifier
```
frontend/src/components/annotations/RangeSelectionModal.tsx   # Nouveau composant
frontend/src/pages/AnnotationPage.tsx                         # Intégration modale + état plage
frontend/src/stores/videoStore.ts                             # Champs startFrame / endFrame
```

#### Dépendances
- S6.7 (le même composant VideoPlayer est réutilisé dans l'aperçu)

---

### S6.9 — Export par projet complet

**En tant qu'** utilisateur,  
**Je veux** exporter un projet entier (annotations + statistiques + vidéo) en une seule action,  
**Afin d'** obtenir un package complet sans devoir exporter chaque vidéo séparément.

#### Critères d'acceptation
- [ ] Nouvel endpoint `POST /api/v1/projects/{id}/export` acceptant :
  ```json
  { "video_ids": ["uuid-1", "uuid-2"],  // null = tout le projet
    "formats": ["json", "csv", "video"],
    "target_bpm": 120.0 }               // optionnel, pour l'export vidéo adapté
  ```
- [ ] La réponse est un fichier ZIP contenant pour chaque vidéo sélectionnée :
  - `{video_name}_annotations.json`
  - `{video_name}_annotations.csv`
  - `{video_name}_statistics.json`
  - `{video_name}_adapted.mp4` (si `target_bpm` fourni, sinon clip brut)
- [ ] Les anciens endpoints vidéo-par-vidéo (`GET /api/v1/videos/{id}/export/*`) restent fonctionnels
- [ ] L'UI de la page Export est refonte : sélecteur de vidéos checkboxes + sélection des formats + champ BPM cible optionnel
- [ ] Un indicateur de progression est affiché pendant la génération (l'export peut prendre plusieurs secondes)

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_exports.py (ajout)
async def test_export_project_zip_contains_expected_files(client, project_with_two_annotated_videos):
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

async def test_export_project_partial_selection(client, project_with_two_annotated_videos):
    resp = await client.post(
        f"/api/v1/projects/{project_with_two_annotated_videos}/export",
        json={"video_ids": ["uuid-video-1"], "formats": ["json"]}
    )
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    # Seulement 1 vidéo dans le ZIP
    assert len([n for n in z.namelist() if n.endswith('.json')]) == 1
```

#### Fichiers à créer / modifier
```
backend/app/routers/exports.py                    # Nouvel endpoint POST /projects/{id}/export
backend/app/services/export_service.py            # Génération ZIP multi-vidéos
backend/app/schemas/export.py                     # ProjectExportRequest schema
backend/tests/test_exports.py                     # Tests ajoutés
frontend/src/pages/ExportPage.tsx                 # Refonte UI
frontend/src/api/exports.ts                       # Appel nouvel endpoint
```

#### Dépendances
- Aucune (les anciens endpoints restent)

---

### S6.10 — Adaptation BPM intelligente et prévisualisation avant export

**En tant qu'** utilisateur,  
**Je veux** que l'export vidéo ajuste localement la vitesse de chaque segment pour que les annotations tombent exactement au BPM cible, et pouvoir prévisualiser le résultat avant de télécharger,  
**Afin d'** obtenir une vidéo rythmiquement correcte et valider le résultat avant export définitif.

#### Critères d'acceptation

**Algorithme d'adaptation BPM locale :**
- [ ] L'algorithme découpe la vidéo en segments entre annotations consécutives
- [ ] Pour chaque segment, il calcule le facteur de vitesse : `speed = interval_actual / interval_target`
  - `interval_target = 60 / target_bpm` (en secondes)
- [ ] Chaque segment est ré-encodé avec FFmpeg `setpts` filter (`PTS*speed_factor`)
- [ ] Les segments sont concaténés avec le filter `concat` de FFmpeg
- [ ] Les segments avant la première annotation et après la dernière sont copiés sans modification (`-c copy`)
- [ ] L'export final a un audio synchronisé (filtre `atempo` pour l'audio, chainé si facteur > 2.0)

**Prévisualisation :**
- [ ] Avant de lancer l'export final, un bouton "Prévisualiser" génère la vidéo adaptée en basse résolution (720p max) et la lit dans le lecteur intégré
- [ ] Le backend expose `POST /api/v1/videos/{id}/preview-adapted` qui renvoie la vidéo preview directement (streaming)
- [ ] L'utilisateur peut valider ou annuler depuis l'aperçu
- [ ] En cas de validation, le bouton "Sauvegarder cette version" déclenche le téléchargement de la version haute qualité

#### Section TDD — Tests à écrire en premier
```python
# backend/tests/test_exports.py (ajout)
def test_compute_segment_speeds():
    """Vérifie le calcul des facteurs de vitesse par segment."""
    from app.services.export_service import compute_segment_speeds
    annotations = [
        {"frame_number": 25,  "timestamp_ms": 1000.0},
        {"frame_number": 62,  "timestamp_ms": 2480.0},  # interval = 1.48s
        {"frame_number": 100, "timestamp_ms": 4000.0},  # interval = 1.52s
    ]
    # target_bpm = 60 → interval_target = 1.0s
    speeds = compute_segment_speeds(annotations, fps=25.0, target_bpm=60.0)
    assert abs(speeds[0] - 1.48) < 0.01   # segment 1: ralentir (facteur >1)
    assert abs(speeds[1] - 1.52) < 0.01   # segment 2: ralentir

async def test_preview_adapted_returns_video(client, video_with_annotations):
    resp = await client.post(
        f"/api/v1/videos/{video_with_annotations}/preview-adapted",
        json={"target_bpm": 120.0}
    )
    assert resp.status_code == 200
    assert "video" in resp.headers["content-type"]
```
```tsx
// frontend/src/components/exports/PreviewPlayer.test.tsx (nouveau)
test('preview button triggers preview generation', async () => {
  const generatePreview = vi.fn().mockResolvedValue('/preview.mp4');
  render(<ExportForm onGeneratePreview={generatePreview} />);
  await userEvent.click(screen.getByRole('button', { name: /prévisualiser/i }));
  expect(generatePreview).toHaveBeenCalled();
});

test('shows video player after preview is generated', async () => {
  render(<ExportForm previewUrl="/preview.mp4" />);
  expect(screen.getByTestId('preview-player')).toBeInTheDocument();
});
```

#### Fichiers à créer / modifier
```
backend/app/services/export_service.py            # Fonction compute_segment_speeds + adapt_video_bpm
backend/app/routers/exports.py                    # Endpoint POST /videos/{id}/preview-adapted
backend/tests/test_exports.py                     # Tests algorithme + endpoint preview
frontend/src/components/exports/PreviewPlayer.tsx # Nouveau composant lecteur preview
frontend/src/pages/ExportPage.tsx                 # Intégration workflow prévisualisation
frontend/src/api/exports.ts                       # Appel preview-adapted
```

#### Dépendances
- S6.9 (l'algorithme est utilisé dans le ZIP d'export projet)

---

## Ordre d'implémentation recommandé

```
Phase A — Corrections rapides (sans dépendances)
  S6.3  Bug compteur + BPM conditionnel        ← 1h
  S6.5  Fix Ctrl+flèche + Alt+flèche           ← 1h
  S6.7  Fix vidéo plein espace                 ← 30min

Phase B — Layout et UX page projets
  S6.1  Refonte layout page détail             ← 2h
  S6.2  Renommage vidéo à l'import             ← 2h

Phase C — Page annotation
  S6.8  Formulaire plage avec aperçu           ← 3h
  S6.4  Boutons équivalents raccourcis         ← 2h (dépend S6.5)
  S6.6  Système catégories                     ← 1 jour (complexe)

Phase D — Export
  S6.9  Export par projet complet              ← 4h
  S6.10 Adaptation BPM + prévisualisation      ← 1 jour (complexe)
```

**Total estimé : ~4 jours de développement**

---

## Impact sur l'architecture existante

| Composant | Modification |
|-----------|-------------|
| `projects.json` | Ajout liste `categories` imbriquée dans `Video` |
| `Annotation` schema | Champ `category_id` nullable |
| API exports | Nouvel endpoint projet + endpoint preview |
| `VideoPlayer.tsx` | Fix CSS (non breaking) |
| `useVideoKeyboard.ts` | Fix closure + nouveaux raccourcis |
| Aucune migration de données requise | Les annotations existantes → catégorie par défaut |

---

## Contraintes et non-objectifs

- Ne pas casser les tests des Epics 1–5
- L'export individuel vidéo-par-vidéo reste fonctionnel (rétrocompatibilité)
- Pas de changement de la structure Docker Compose
- L'adaptation BPM utilise FFmpeg (pas WebCodecs côté client — reporté à v2 per ADR-002)
- La prévisualisation est synchrone en v1 (pas de queue de tâches)
