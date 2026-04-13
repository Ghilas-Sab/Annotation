---
name: Build check after each story
description: Toujours lancer npm run build à la fin de chaque story pour détecter les erreurs TypeScript avant le pipeline Docker
type: feedback
---

Toujours exécuter `npm run build` (depuis `frontend/`) après les tests à la fin de chaque story, avant de marquer en "review".

**Why:** Une erreur TypeScript (`fps` non utilisé) a cassé le build Docker lors d'un pull/merge. Les tests passaient mais le build échouait.

**How to apply:** Après `npm test` (tous verts), lancer `npm run build`. Si erreur TS, corriger avant de mettre le status en "review" et de mettre à jour le sprint-status.
