# Documentation AnnotaRythm

Bienvenue dans la documentation du projet **AnnotaRythm** — application web locale d'annotation vidéo orientée analyse rythmique.

> Pour le pitch global, l'installation rapide et la licence, voir le [README principal](../README.md).

---

## Sommaire

### Pour utiliser l'application

| Document                                  | Description                                                 |
|-------------------------------------------|-------------------------------------------------------------|
| 📦 [installation.md](installation.md)     | Pré-requis, démarrage Docker, mode dev, variables d'env     |
| 🧑‍💻 [user-guide.md](user-guide.md)        | Guide complet pour les annotateurs                          |

### Pour comprendre la solution

| Document                                  | Description                                                 |
|-------------------------------------------|-------------------------------------------------------------|
| 🏛️ [architecture.md](architecture.md)     | Stack, structure, flux de données, ADR                      |
| 🗃️ [data-model.md](data-model.md)         | Entités, schémas Pydantic, stockage JSON atomique           |
| 🔌 [api.md](api.md)                       | Référence complète de l'API REST `/api/v1`                  |

### Pour contribuer

| Document                                  | Description                                                 |
|-------------------------------------------|-------------------------------------------------------------|
| 🛠️ [development.md](development.md)       | Setup dev, conventions, workflow BMAD + TDD, CI/CD          |
| ✅ [testing.md](testing.md)               | pytest, Vitest, Playwright — comment lancer et écrire       |

---

## Artefacts BMAD originaux

Les artefacts de planification (PRD, architecture initiale, UX, stories) vivent dans [`_bmad-output/`](../_bmad-output/) :

- `planning-artifacts/product-brief.md`
- `planning-artifacts/architecture.md`
- `planning-artifacts/ux-design.md`
- `planning-artifacts/prd-epic6-retours-client-v1.md`
- `implementation-artifacts/` — une story par fichier + `sprint-status.yaml`

> Les documents sous `docs/` sont la **doc vivante** dérivée du code. Les artefacts `_bmad-output/` documentent l'**intention** au moment de la conception.

---

## Conventions documentaires

- **Langue** : français.
- **Style** : phrases courtes, exemples concrets, tableaux dès qu'il y a > 3 éléments à comparer.
- **Fraîcheur** : chaque doc est mise à jour quand un comportement change. Si vous trouvez une incohérence entre la doc et le code, **le code fait foi** — corrigez la doc.
- **Liens** : préférer les liens relatifs (`./api.md`) aux URLs absolues.

---

## Contribuer à la doc

1. Modifier le fichier `.md` concerné.
2. Vérifier les liens relatifs (`Ctrl+clic` dans VS Code).
3. Commit selon Conventional Commits :

   ```
   docs(api): documenter l'endpoint preview-jobs
   ```
