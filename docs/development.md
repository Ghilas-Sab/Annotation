# Guide développeur

Ce document décrit l'environnement de développement, les conventions et les workflows utilisés pour contribuer au projet.

---

## 1. Setup local

Voir [`installation.md`](installation.md) section 4 pour le démarrage hot-reload (backend + frontend séparés).

### Outils recommandés

| Outil          | Usage                                                         |
|----------------|---------------------------------------------------------------|
| **VS Code**    | Éditeur principal — extensions Python, ESLint, Prettier        |
| **direnv**     | Charger `.env` automatiquement par dossier                     |
| **httpie / jq**| Interroger l'API en ligne de commande                          |
| **Playwright Inspector** | Debug visuel des tests E2E (`npx playwright test --ui`) |

---

## 2. Méthodologie BMAD + TDD

Le projet est développé selon **BMAD** (Business → PRD → Architecture → Stories → Dev → QA) :

1. **Product brief** rédigé avec l'agent *Mary*.
2. **PRD** validé.
3. **Architecture** par l'agent *Winston*.
4. **Stories** découpées par l'agent *Bob* (SM).
5. **Implémentation** TDD par l'agent *Amelia* (Dev).
6. **QA** par l'agent *Quinn*.

Tous les artefacts vivent dans [`_bmad-output/`](../_bmad-output/) :

```
_bmad-output/
├── planning-artifacts/         ← brief, PRD, architecture, UX, retours client
├── implementation-artifacts/   ← stories implémentées + sprint-status.yaml
└── stories.md                  ← liste maître des stories
```

### Règles absolues (cf. `CLAUDE.md`)

- 🟥 **Écrire les tests AVANT le code** (TDD strict).
- 🟥 **Un commit Git par story terminée**.
- 🟥 **Ne jamais casser les tests existants**.
- 🟥 **Variables d'environnement dans `.env`**, jamais en dur dans le code.

---

## 3. Workflow d'une nouvelle story

1. **Lire la story** dans `_bmad-output/implementation-artifacts/X-Y-titre.md`.
2. **Écrire les tests** d'abord (rouges).
3. **Implémenter** le minimum pour passer les tests (vert).
4. **Refactorer** sans casser les tests.
5. **Mettre à jour** `_bmad-output/implementation-artifacts/sprint-status.yaml`.
6. **Commit** avec un message du type :

   ```
   feat(annotations): bulk placement equidistant
   ```

7. Push sur la branche `feature/...`, ouvrir une PR.

---

## 4. Conventions de code

### Backend (Python)

- **Style** : PEP 8 (indentation 4 espaces, snake_case).
- **Typage** : annotations Pydantic v2 systématiques sur les schémas, hints sur les fonctions publiques.
- **Validation** : toujours côté Pydantic, jamais à la main dans les routers.
- **Organisation** :
  - `routers/` : juste le binding HTTP, pas de logique métier.
  - `services/` : logique métier pure, testable sans HTTP.
  - `storage/` : I/O fichier uniquement.
  - `schemas/` : Pydantic Create / Read / Update.
- **Tests** : un fichier `tests/test_<feature>.py` par feature, fixtures dans `conftest.py`.

### Frontend (TypeScript/React)

- **Style** : Prettier + ESLint (configs dans `frontend/`).
- **Composants** : functional + hooks, pas de class components.
- **State** :
  - UI state local → **Zustand** (un store par domaine).
  - Server state → **TanStack Query** (clients dans `src/api/`).
  - Pas de Redux.
- **Tests** :
  - Composants : Vitest + Testing Library, un fichier `.test.tsx` par composant.
  - API : mock via **MSW** dans `src/api/*.test.ts`.
- **Nommage** :
  - Composants en `PascalCase` (`AnnotationItem.tsx`).
  - Hooks en `useCamelCase` (`useFrameSeek.ts`).
  - Stores en `camelCaseStore` (`videoStore.ts`).

### Commits

Style Conventional Commits :

```
<type>(<scope>): <description>

[corps optionnel]
```

Types courants : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.

---

## 5. Lancer les tests

Voir [`testing.md`](testing.md) pour le détail. Résumé :

| Suite              | Commande                                  |
|--------------------|-------------------------------------------|
| Backend pytest     | `cd backend && pytest`                    |
| Backend + coverage | `cd backend && pytest --cov=app`          |
| Frontend Vitest    | `cd frontend && npm test`                 |
| Frontend coverage  | `cd frontend && npm run test:coverage`    |
| E2E Playwright     | `cd e2e && npm test`                      |
| E2E via Docker     | `./e2e/run-e2e.sh`                        |

---

## 6. Ajouter un endpoint backend

1. **Schéma Pydantic** dans `backend/app/schemas/`.
2. **Test** dans `backend/tests/test_<feature>.py` (rouge).
3. **Service** dans `backend/app/services/` (logique pure).
4. **Router** dans `backend/app/routers/` (binding HTTP).
5. Brancher le router dans `main.py` si nouveau.
6. **Test E2E** dans `e2e/tests/` si le flux est utilisateur-visible.
7. **Documenter** dans [`api.md`](api.md).

---

## 7. Ajouter une feature frontend

1. **Type** dans `frontend/src/types/` si besoin.
2. **Client API** dans `frontend/src/api/<feature>.ts` (+ test MSW).
3. **Store Zustand** si état partagé.
4. **Composant** dans `frontend/src/components/<feature>/` (+ test RTL).
5. **Page** ou wiring dans une page existante.
6. **Test E2E** dans `e2e/tests/`.

---

## 8. Variables d'environnement

| Variable             | Côté    | Détails                                            |
|----------------------|---------|----------------------------------------------------|
| `DATA_DIR`           | Back    | Chemin du JSON store                               |
| `VIDEOS_DIR`         | Back    | Stockage des fichiers vidéo                        |
| `ALLOWED_ORIGINS`    | Back    | CORS, séparé par `,`                               |
| `MAX_VIDEO_SIZE_MB`  | Back    | Limite upload                                      |
| `TEMP_DIR`           | Back    | Exports vidéo temporaires                          |
| `VITE_API_URL`       | Front   | URL backend (build-time, gravée dans le bundle)    |

**Règle** : ajouter toute nouvelle variable à `.env.example` ET à la table ci-dessus.

---

## 9. CI/CD GitHub Actions

Workflow : `.github/workflows/ci.yml`.

```
backend-tests  ─┐
                ├─▶ build-docker  (déclenché seulement si les deux suites passent)
frontend-tests ─┘
```

- **backend-tests** : `pytest --cov=app --cov-report=xml` + upload Codecov.
- **frontend-tests** : `npm run test:coverage` + `npm run build`.
- **build-docker** : construit les images backend et frontend.

> Toute branche pushée déclenche la CI. Une PR ne peut pas être mergée si la CI est rouge.

---

## 10. Branches et releases

- `main` : branche stable, toujours déployable.
- `feature/<nom>` : branches de développement.
- `feature/redesign-v2` : refonte design system courante.

Une PR doit :

1. Passer la CI.
2. Avoir au moins un commit propre par story (pas de "wip"-fest).
3. Référencer la story BMAD dans la description.

---

## 11. Pour aller plus loin

- [`architecture.md`](architecture.md) : choix techniques détaillés.
- [`api.md`](api.md) : référence complète des endpoints.
- [`testing.md`](testing.md) : stratégie de tests (unitaires + E2E).
- [`data-model.md`](data-model.md) : schéma des entités.
- [`_bmad-output/`](../_bmad-output/) : artefacts BMAD originaux.
