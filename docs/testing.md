# Stratégie de tests

Le projet applique une **pyramide de tests** classique :

```
                    ┌────────────────┐
                    │     E2E        │   ← Playwright (25 specs · 260 tests)
                    └────────────────┘
                  ┌────────────────────┐
                  │   Intégration API   │  ← pytest + httpx (backend)
                  └────────────────────┘
                ┌────────────────────────┐
                │      Composants UI      │  ← Vitest + RTL + MSW (frontend)
                └────────────────────────┘
              ┌────────────────────────────┐
              │       Unitaires             │  ← pytest (services) + Vitest (utils, stores)
              └────────────────────────────┘
```

> **TDD strict** : les tests sont écrits **avant** le code. La CI bloque sur tout test rouge.

---

## 1. Backend — pytest

### Lancer la suite

```bash
cd backend
pytest                            # tous les tests
pytest tests/test_annotations.py  # un seul fichier
pytest -k bulk                    # filtrer par mot-clé
pytest -x                         # arrêt au premier échec
pytest --cov=app --cov-report=term-missing  # couverture
```

### Configuration

- `backend/pytest.ini` :
  ```
  [pytest]
  asyncio_mode = auto
  ```
- Fixtures globales : `backend/tests/conftest.py`.
- Client HTTP de test : `httpx.AsyncClient(app=app)`.

### Couverture des tests

| Fichier de test                  | Cible                                              |
|----------------------------------|----------------------------------------------------|
| `test_health.py`                 | Endpoint `/health`                                 |
| `test_projects.py`               | CRUD projets                                       |
| `test_videos.py`                 | Upload, streaming, suppression                     |
| `test_annotations.py`            | CRUD annotations + bulk + shift                    |
| `test_categories.py`             | CRUD catégories                                    |
| `test_statistics.py`             | BPM, distributions, segments                       |
| `test_exports.py`                | JSON, CSV, vidéo, bundle                           |
| `test_assemblage.py`             | Composition multi-pistes                           |
| `test_storage.py`                | Atomicité du JSON store                            |
| `test_video_service.py`          | Wrapper FFmpeg                                     |

### Écrire un test

Pattern AAA — Arrange / Act / Assert :

```python
@pytest.mark.asyncio
async def test_create_annotation_returns_201(client, sample_video):
    # Arrange
    payload = {"frame_number": 240, "label": "kick"}

    # Act
    response = await client.post(
        f"/api/v1/videos/{sample_video['id']}/annotations",
        json=payload,
    )

    # Assert
    assert response.status_code == 201
    body = response.json()
    assert body["frame_number"] == 240
    assert body["label"] == "kick"
    assert "id" in body
```

---

## 2. Frontend — Vitest + Testing Library

### Lancer la suite

```bash
cd frontend
npm test                  # run unique
npm run test:watch        # mode watch
npm run test:coverage     # rapport de couverture (dossier coverage/)
```

### Configuration

- Runner : **Vitest 2.x**.
- DOM : `jsdom`.
- Setup global : `src/test-setup.ts` (jest-dom matchers).
- Mock API HTTP : **MSW 2.x** (`src/mocks/`).

### Pattern composant

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnnotationItem } from './AnnotationItem';

it('appelle onDelete au clic sur la poubelle', async () => {
  const onDelete = vi.fn();
  render(<AnnotationItem annotation={mockAnn} onDelete={onDelete} />);

  await userEvent.click(screen.getByLabelText('Supprimer'));

  expect(onDelete).toHaveBeenCalledWith(mockAnn.id);
});
```

### Pattern client API (avec MSW)

```ts
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { listProjects } from './projects';

it('retourne la liste des projets', async () => {
  server.use(
    http.get('/api/v1/projects', () => HttpResponse.json([{ id: 'p1', name: 'A' }]))
  );

  const projects = await listProjects();
  expect(projects).toHaveLength(1);
});
```

---

## 3. E2E — Playwright

Suite complète de bout en bout (vrai backend, vrai frontend, navigateur réel).

### Lancer la suite

#### Via Docker (recommandé, mêmes conditions que la CI)

```bash
./e2e/run-e2e.sh
```

Sous le capot : `docker compose -f docker-compose.e2e.yml up --exit-code-from playwright --abort-on-container-exit`.

#### En mode développeur

```bash
# Démarrer le backend et le frontend en dev (cf. installation.md §4)
cd e2e
npm ci
npx playwright install --with-deps   # première fois
npm test                              # run headless
npm run test:headed                   # avec navigateur visible
npm run test:ui                       # Playwright Inspector
npm run report                        # ouvrir le dernier rapport HTML
```

### Configuration

- `e2e/playwright.config.ts` : navigateurs, timeouts, base URL.
- `e2e/global-setup.ts` : RAZ des données, seed des fixtures.
- `e2e/fixtures/` : vidéos d'exemple, helpers.

### Suites (25 specs, 260 tests)

```
01-projects.spec.ts          gestion CRUD projets
02-project-detail.spec.ts    page détail + upload
03-annotations.spec.ts       CRUD annotations
04-categories.spec.ts        gestion catégories
05-statistics.spec.ts        métriques BPM
06-export.spec.ts            exports JSON/CSV/vidéo
07-assemblage.spec.ts        composition multi-pistes
08-keyboard.spec.ts          raccourcis clavier
09-theme.spec.ts             dark/light mode
10-playback-controls.spec.ts ▶/⏸/vitesse
11-annotation-edit.spec.ts   édition inline
12-upload-validation.spec.ts validation formats / taille
13-annotation-details.spec.ts label, catégorie
14-category-full.spec.ts     parcours catégories complet
15-video-trim-modal.spec.ts  trim avant assemblage
16-assemblage-full.spec.ts   parcours assemblage complet
17-keyboard-full.spec.ts     tous les raccourcis
18-stats-accuracy.spec.ts    précision des calculs BPM
19-export-full.spec.ts       bundle + jobs async
20-navigation-errors.spec.ts 404, états vides
21-bulk-placement.spec.ts    placement équidistant
22-shift-form.spec.ts        décalage global
23-video-timeline.spec.ts    canvas timeline
24-assemblage-timeline.spec.ts timeline multi-pistes
25-video-import-modal.spec.ts modal d'import
```

### Pattern E2E

```ts
import { test, expect } from '@playwright/test';

test('création projet → upload → annotation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  await page.getByLabel('Nom').fill('Demo');
  await page.getByRole('button', { name: 'Créer' }).click();

  await expect(page.getByRole('heading', { name: 'Demo' })).toBeVisible();
});
```

---

## 4. Couverture et qualité

| Couche    | Outil               | Rapport                                 |
|-----------|---------------------|-----------------------------------------|
| Backend   | `pytest-cov`        | `backend/coverage.xml` + Codecov         |
| Frontend  | `@vitest/coverage-v8` | `frontend/coverage/index.html`         |
| E2E       | Playwright report   | `e2e/playwright-report/index.html`      |

**Objectifs informels** :
- Backend > 90 %
- Frontend > 80 %
- E2E : couverture des golden paths de toutes les pages + cas d'erreur principaux.

---

## 5. Debug

### Backend

```bash
pytest -vv -s tests/test_annotations.py::test_bulk_distribution
# -s désactive la capture, -vv verbose
```

`pdb` :

```python
import pdb; pdb.set_trace()
```

### Frontend

```bash
npm run test:watch -- src/components/annotations/AnnotationItem.test.tsx
```

Dans le test : `screen.debug()` pour dumper le DOM.

### E2E

```bash
npx playwright test --debug              # Playwright Inspector
npx playwright test 03-annotations --ui  # UI mode interactif
npx playwright codegen http://localhost:3000  # générer un script
```

---

## 6. Pièges fréquents

| Symptôme                                              | Cause / solution                                                       |
|-------------------------------------------------------|------------------------------------------------------------------------|
| Tests backend en pagaille selon l'ordre               | Données partagées → utiliser fixtures isolées (`tmp_path`)              |
| `act(...)` warnings côté React                        | Wrapping nécessaire dans Testing Library → utiliser `userEvent`         |
| MSW handlers non utilisés                             | Lancer `server.listen()` dans `test-setup.ts` (déjà fait)               |
| E2E flaky sur le upload                               | Augmenter le `timeout` du `expect(...).toBeVisible()` ou attendre FFmpeg|
| Playwright ne trouve pas un élément                   | Préférer `getByRole`/`getByLabel` au CSS selector ; vérifier les `aria-*` |
