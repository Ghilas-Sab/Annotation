# Product Brief — Application Web d'Annotation Vidéo Rythmée

**Version :** 1.0  
**Date :** 2026-04-09  
**Auteur :** Mary (BMad Business Analyst)  
**Statut :** Validé

---

## 1. Résumé Exécutif

Développer une application web locale d'annotation vidéo rythmée, permettant à des professionnels et chercheurs (monteurs, chorégraphes, analystes, etc.) de poser des annotations temporellement précises sur des vidéos, d'analyser des métriques rythmiques et d'exporter les résultats. L'outil se distingue des solutions existantes (CVAT, Labelbox, VIA) par sa simplicité, sa focalisation sur l'annotation rythmée et son interface orientée productivité clavier.

---

## 2. Problème

### 2.1 Contexte
Les professionnels qui analysent des vidéos liées au rythme (musique, danse, sport, cinéma) manquent d'outils adaptés à leur besoin spécifique. Les solutions disponibles sont :
- **Trop complexes** : orientées dataset IA (CVAT, Labelbox)
- **Trop payantes** : accès limité pour des usages de recherche
- **Inadaptées** : pas de notion de BPM, de signal sonore de vérification, ni d'analyse rythmique

### 2.2 Besoin Non Couvert
Un outil simple, local, précis à la frame, avec analyse rythmique intégrée et navigation clavier fluide.

---

## 3. Solution

Application web (architecture locale, évolutive vers le cloud) structurée autour de trois modules :

1. **Gestion de projets** — organiser les vidéos par projet
2. **Annotation vidéo** — poser des annotations frame-précises avec navigation clavier et vérification sonore
3. **Statistiques rythmiques** — analyser le BPM et ajuster la vitesse de lecture

---

## 4. Utilisateurs Cibles

| Profil | Description |
|--------|-------------|
| Chercheurs | Analyse de contenu vidéo en lien avec le rythme ou le mouvement |
| Chorégraphes | Annotation de beats sur des vidéos de danse |
| Monteurs vidéo | Synchronisation et repérage temporel précis |
| Analystes de contenu | Tout professionnel ayant besoin d'annotation temporelle rythmée |

**Mode d'utilisation :** Solo uniquement (v1). Pas de collaboration temps réel.  
**Volume utilisateurs :** Faible à moyen (outil individuel).

---

## 5. Fonctionnalités

### 5.1 Module — Gestion de Projets

- Créer un projet (nom, description)
- Importer des vidéos depuis le PC local (tous formats vidéo supportés)
- Organiser et lister les vidéos au sein d'un projet
- Prévu futur : import depuis le cloud

### 5.2 Module — Annotation Vidéo

#### Navigation
| Action | Commande |
|--------|----------|
| Avancer/reculer d'une frame | Flèche droite / gauche |
| Saut rapide | Ctrl+flèche |
| Saut très rapide | Shift+flèche |
| Poser une annotation | Barre Espace |
| Navigation timeline | Clic souris sur la timeline |

#### Gestion des annotations
- **Format** : étiquette textuelle + numéro de frame + timestamp exact (ex : frame 40 — 00:01:23.456)
- **Opérations** : créer, déplacer, supprimer, modifier le texte
- **Décalage global** : déplacer toutes les annotations simultanément d'une durée donnée (ex : +200ms)
- **Catégories** : prévu en version future

#### Placement automatique à intervalles réguliers
L'utilisateur définit une plage temporelle et un nombre d'annotations, et l'application les distribue automatiquement de façon équidistante.

**Paramètres saisis par l'utilisateur :**
| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| Point de début | Frame ou timestamp de départ | 00:00:05.000 |
| Point de fin | Frame ou timestamp de fin | 00:00:25.000 |
| Nombre d'annotations | Quantité à placer | 50 |
| Préfixe de label | Texte commun à toutes les annotations | "saut" |

**Comportement :**
- L'intervalle est calculé comme : `(fin - début) / (nombre - 1)`
- Les annotations sont nommées automatiquement : `{préfixe} 1`, `{préfixe} 2`, ..., `{préfixe} N`
- Si aucun préfixe n'est fourni, les annotations sont nommées `1`, `2`, ..., `N`
- Une fois placées, les annotations sont **identiques aux annotations manuelles** : elles peuvent être déplacées, supprimées ou modifiées individuellement
- Elles apparaissent dans les statistiques rythmiques au même titre que les annotations manuelles

#### Mode de vérification sonore
- Activable / désactivable librement
- Lors de la relecture : un bip est émis à chaque frame annotée
- Permet de valider la précision du placement rythmique

### 5.3 Module — Statistiques Rythmiques

#### Métriques calculées automatiquement
| Métrique | Description |
|----------|-------------|
| BPM global | Calculé à partir de l'ensemble des annotations |
| BPM moyen | Moyenne des BPM inter-annotations |
| BPM médian | Médiane des BPM inter-annotations |
| Variation BPM | Écart max-min |
| Écart-type des intervalles | Régularité du rythme |
| Distribution des intervalles | Histogramme des durées inter-annotations |
| Segments rythmiques | Découpage automatique par densité |
| Pics d'activité | Zones de haute densité d'annotations |
| Densité d'annotations | Annotations par unité de temps |

#### Ajustement du BPM
1. L'app calcule automatiquement le BPM à partir des annotations
2. L'utilisateur peut saisir un **BPM cible**
3. L'app recalcule automatiquement la **vitesse de lecture** de la vidéo pour s'aligner sur ce rythme
4. Les deux approches sont combinées (calcul automatique + saisie manuelle)

### 5.4 Export

| Type | Format | Contenu |
|------|--------|---------|
| Annotations | JSON (obligatoire) | Frame, timestamp, texte, métadonnées |
| Annotations | CSV (obligatoire) | Même contenu, format tabulaire |
| Annotations | XML (optionnel) | Même contenu, format XML |
| Vidéo | MP4 (ou format source) | Extrait de la portion annotée, sans modification visuelle |

**Export vidéo** : uniquement la portion temporelle couverte par les annotations (de la première à la dernière annotation). Aucune incrustation sur la vidéo.

---

## 6. Architecture Technique

### 6.1 Contraintes Définies
- **Infrastructure** : Docker Compose (frontend + backend + éventuellement base de données)
- **Communication** : API REST entre frontend et backend
- **Qualité** : TDD obligatoire dès le début, CI/CD, tests automatisés
- **Stockage vidéo** : local (PC utilisateur), évolution cloud prévue
- **Formats vidéo** : aucune contrainte (tous formats)
- **Taille vidéos** : 10 secondes à 10 minutes

### 6.2 À Définir par l'Architecte
- Choix du framework frontend (React, Vue, Svelte...)
- Choix du framework backend (FastAPI, Django, Node/Express...)
- Choix de la base de données (SQLite, PostgreSQL...)
- Stratégie de traitement vidéo (FFmpeg, navigateur natif...)
- Stratégie de rendu frame-par-frame (Canvas, WebCodecs...)

### 6.3 Évolutions Futures Anticipées
| Évolution | Complexité estimée |
|-----------|-------------------|
| Import vidéo depuis le cloud | Moyenne |
| Déploiement web multi-utilisateurs | Haute |
| Catégories d'annotations | Faible |
| Collaboration / partage de projets | Haute |

---

## 7. Critères de Succès

| Critère | Indicateur |
|---------|-----------|
| Précision temporelle | Annotation à la frame exacte, timestamp affiché |
| Fluidité clavier | Navigation frame/frame sans latence perceptible |
| Calcul BPM fiable | Cohérence entre annotations et BPM calculé |
| Export fonctionnel | JSON/CSV générés et lisibles |
| Extrait vidéo propre | Portion annotée exportée sans artefact |
| Couverture de tests | TDD respecté, CI/CD vert |

---

## 8. Hors Périmètre (v1)

- Collaboration multi-utilisateurs
- Annotations graphiques (formes, zones sur l'image)
- Import cloud
- Déploiement SaaS / multi-tenant
- Catégories d'annotations
- Export XML (optionnel, best effort)

---

## 9. Risques Identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Latence rendu vidéo frame/frame dans le navigateur | Moyenne | Haute | Évaluer WebCodecs vs approche backend |
| Performance sur grandes vidéos (>5 min) | Moyenne | Moyenne | Streaming progressif, lazy loading |
| Complexité export vidéo (découpe propre) | Faible | Moyenne | Utiliser FFmpeg côté backend |
| Dérive du scope (features v2 glissant en v1) | Haute | Moyenne | Backlog strict, priorisation par module |

---

## 10. Prochaines Étapes Recommandées

1. **Architecture** — Faire valider les choix de stack par l'agent Architect (Winston)
2. **UX Design** — Concevoir les wireframes de l'interface d'annotation (agent UX Sally)
3. **Épics & Stories** — Décomposer en stories développables (agent SM Bob)
4. **Développement** — Implémenter module par module en TDD (agent Dev Amelia)
