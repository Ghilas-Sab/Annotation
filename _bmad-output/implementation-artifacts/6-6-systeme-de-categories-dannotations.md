# Story 6.6: Système de Catégories d'Annotations

Status: backlog

## Story

En tant qu'utilisateur,
I want créer des catégories (nom + couleur) et assigner chaque annotation à une catégorie,
so that je visualise différents types d'événements rythmiques avec des couleurs distinctes sur la timeline.

## Acceptance Criteria

### Gestion des catégories
1. L'utilisateur peut créer, modifier et supprimer des catégories avant de commencer l'annotation
2. Chaque catégorie a un nom (texte libre) et une couleur (palette prédéfinie de 8 couleurs ou color picker)
3. Une catégorie "Par défaut" (gris `#9CA3AF`) existe toujours et ne peut pas être supprimée
4. Les catégories sont persistées côté backend par vidéo (endpoints CRUD)

### Lors de l'annotation
5. Un sélecteur de catégorie active est visible avant de créer une annotation
6. L'annotation créée hérite de la catégorie active
7. Chaque entrée de la liste des annotations affiche un badge coloré de sa catégorie

### Timeline
8. Chaque barre de la timeline (Canvas) est rendue avec la couleur de la catégorie de son annotation
9. Une légende des catégories est affichée sous la timeline

### Bulk placement
10. Le formulaire de bulk placement inclut un sélecteur de catégorie
11. Toutes les annotations créées en bulk appartiennent à la catégorie sélectionnée

### Backend
12. Nouveau modèle `Category` : `{ id, video_id, name, color, created_at }`
13. Endpoints CRUD : `GET/POST /api/v1/videos/{id}/categories`, `PUT/DELETE /api/v1/categories/{id}`
14. Le modèle `Annotation` a un champ `category_id` (FK, nullable → catégorie par défaut auto-assignée)
15. Migration rétrocompatible : les annotations existantes sans catégorie reçoivent la catégorie par défaut

## MANDAT TESTS — COUVERTURE MAXIMALE OBLIGATOIRE

> TDD STRICT : écrire les tests avant tout code. Couverture cible : **≥ 80%** frontend, **100%** backend (nouveaux endpoints).
> C'est la story la plus complexe de l'epic — le TDD est critique pour éviter les régressions.

### Tests backend obligatoires à écrire en PREMIER

```python
# backend/tests/test_categories.py (nouveau fichier)

async def test_create_category(client):
    resp = await client.post("/api/v1/videos/uuid-2/categories",
        json={"name": "Temps fort", "color": "#FF5733"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Temps fort"
    assert data["color"] == "#FF5733"
    assert "id" in data

async def test_get_categories_includes_default(client):
    resp = await client.get("/api/v1/videos/uuid-2/categories")
    assert resp.status_code == 200
    categories = resp.json()
    default_cat = next((c for c in categories if c["name"] == "Par défaut"), None)
    assert default_cat is not None
    assert default_cat["color"] == "#9CA3AF"

async def test_cannot_delete_default_category(client):
    categories = (await client.get("/api/v1/videos/uuid-2/categories")).json()
    default_id = next(c["id"] for c in categories if c["name"] == "Par défaut")
    resp = await client.delete(f"/api/v1/categories/{default_id}")
    assert resp.status_code == 409  # ou 403

async def test_update_category(client):
    cat = (await client.post("/api/v1/videos/uuid-2/categories",
        json={"name": "Beat", "color": "#3498DB"})).json()
    resp = await client.put(f"/api/v1/categories/{cat['id']}",
        json={"name": "Beat fort", "color": "#E74C3C"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Beat fort"

async def test_delete_category(client):
    cat = (await client.post("/api/v1/videos/uuid-2/categories",
        json={"name": "Temp", "color": "#000000"})).json()
    resp = await client.delete(f"/api/v1/categories/{cat['id']}")
    assert resp.status_code == 204

async def test_annotation_with_category(client):
    cat = (await client.post("/api/v1/videos/uuid-2/categories",
        json={"name": "Beat", "color": "#3498DB"})).json()
    ann = (await client.post("/api/v1/videos/uuid-2/annotations",
        json={"frame_number": 42, "category_id": cat["id"]})).json()
    assert ann["category_id"] == cat["id"]

async def test_annotation_without_category_gets_default(client):
    ann = (await client.post("/api/v1/videos/uuid-2/annotations",
        json={"frame_number": 42})).json()
    # category_id doit être l'id de la catégorie par défaut, pas null
    assert ann["category_id"] is not None

async def test_existing_annotations_get_default_category(client):
    # Rétrocompatibilité : les annotations créées avant le système de catégories
    ann = (await client.get("/api/v1/videos/uuid-2/annotations")).json()
    for a in ann:
        assert a["category_id"] is not None
```

### Tests frontend obligatoires à écrire en PREMIER

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

test('calls onChange when category selected', async () => {
  const onChange = vi.fn();
  const categories = [
    { id: 'c1', name: 'Beat', color: '#FF0000' },
    { id: 'c2', name: 'Temps fort', color: '#0000FF' },
  ];
  render(<CategorySelector categories={categories} value="c1" onChange={onChange} />);
  await userEvent.selectOptions(screen.getByRole('combobox'), 'c2');
  expect(onChange).toHaveBeenCalledWith('c2');
});

// frontend/src/components/annotations/AnnotationItem.test.tsx (ajouts)

test('shows color badge matching category color', () => {
  const annotation = { id: 'a1', frame_number: 42, category: { id: 'c1', name: 'Beat', color: '#FF5733' } };
  render(<AnnotationItem annotation={annotation} />);
  const badge = screen.getByTestId('category-badge');
  expect(badge).toHaveStyle({ backgroundColor: '#FF5733' });
});
```

## Tasks / Subtasks

### Backend
- [ ] Écrire `backend/tests/test_categories.py` EN PREMIER — 8 tests (AC: 12–15)
- [ ] Créer `backend/app/schemas/category.py` (AC: 12)
  - [ ] `CategoryCreate`, `CategoryUpdate`, `CategoryResponse`
- [ ] Modifier `backend/app/storage/json_store.py` (AC: 12, 15)
  - [ ] Ajouter `categories` dans la structure JSON par vidéo
  - [ ] Créer catégorie "Par défaut" automatiquement à la création d'une vidéo
  - [ ] Migration : itérer les annotations sans `category_id` → assigner la catégorie par défaut
- [ ] Créer `backend/app/routers/categories.py` (AC: 13)
  - [ ] `GET /api/v1/videos/{id}/categories`
  - [ ] `POST /api/v1/videos/{id}/categories`
  - [ ] `PUT /api/v1/categories/{id}`
  - [ ] `DELETE /api/v1/categories/{id}` (interdit si catégorie par défaut → 409)
- [ ] Modifier `backend/app/main.py` (AC: 13)
  - [ ] Inclure `categories_router`
- [ ] Modifier `backend/app/routers/annotations.py` (AC: 14)
  - [ ] Accepter `category_id` optionnel dans la création d'annotation
  - [ ] Fallback sur catégorie par défaut si absent

### Frontend
- [ ] Écrire `CategorySelector.test.tsx` EN PREMIER (AC: 5, 6)
- [ ] Enrichir `AnnotationItem.test.tsx` (AC: 7)
- [ ] Créer `frontend/src/components/annotations/CategorySelector.tsx` (AC: 5, 6)
- [ ] Modifier `frontend/src/components/annotations/AnnotationItem.tsx` (AC: 7)
  - [ ] Ajouter badge coloré `data-testid="category-badge"`
- [ ] Modifier `frontend/src/components/video/VideoTimeline.tsx` (AC: 8, 9)
  - [ ] Utiliser `category.color` pour chaque barre Canvas
  - [ ] Afficher une légende sous la timeline
- [ ] Modifier `frontend/src/components/annotations/BulkPlacementForm.tsx` (AC: 10, 11)
  - [ ] Ajouter `<CategorySelector>` dans le formulaire
- [ ] Modifier `frontend/src/types/annotation.ts` (AC: 14)
  - [ ] Ajouter `category_id?: string` et `category?: Category`
- [ ] Modifier `frontend/src/api/annotations.ts` (AC: 14)
  - [ ] Passer `category_id` dans les requêtes de création
- [ ] Passer tous les tests → GREEN

## Dev Notes

### Dépendances

- Aucune dépendance (mais story la plus complexe — implémenter en dernier dans la Phase C)

### Contexte codebase

- Backend : stockage JSON (`json_store.py`) — ajouter `categories: []` dans chaque `Video`
- La catégorie "Par défaut" doit être créée automatiquement à la création d'une vidéo (ou lazily)
- `VideoTimeline.tsx` : le Canvas rend les barres d'annotation — passer `color` par annotation
- `BulkPlacementForm.tsx` existe (Epic 3) — ajouter le sélecteur de catégorie

### Palette couleurs prédéfinie (8 couleurs)

```ts
const PRESET_COLORS = [
  '#9CA3AF', // Gris (Par défaut)
  '#EF4444', // Rouge
  '#F97316', // Orange
  '#EAB308', // Jaune
  '#22C55E', // Vert
  '#3B82F6', // Bleu
  '#A855F7', // Violet
  '#EC4899', // Rose
];
```

### Structure des fichiers

```
backend/app/
├── schemas/category.py              ← créer
├── routers/categories.py            ← créer
├── routers/annotations.py           ← modifier (category_id)
├── storage/json_store.py            ← modifier (categories)
├── main.py                          ← modifier (inclure router)
└── tests/test_categories.py         ← créer

frontend/src/
├── types/annotation.ts              ← modifier (category_id)
├── api/annotations.ts               ← modifier
├── components/annotations/
│   ├── CategorySelector.tsx         ← créer
│   ├── CategorySelector.test.tsx    ← créer
│   ├── AnnotationItem.tsx           ← modifier (badge)
│   └── AnnotationItem.test.tsx      ← enrichir
├── components/video/
│   └── VideoTimeline.tsx            ← modifier (couleurs Canvas)
└── components/annotations/
    └── BulkPlacementForm.tsx        ← modifier (sélecteur)
```

### Anti-patterns à éviter

- Ne PAS utiliser `category_id: null` pour la catégorie par défaut — stocker l'id réel
- Ne PAS casser le rendu existant de la timeline — les barres grises sont le fallback
- Ne PAS oublier la migration rétrocompatible — les vidéos existantes doivent fonctionner

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

- 2026-04-17 : Story créée par SM (Bob) — Epic 6 Retours Client, Phase C (complexité élevée, implémenter en dernier). Exigence couverture tests maximale.
