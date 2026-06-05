# Guide utilisateur

Ce guide s'adresse aux **annotateurs** : chercheurs, chorégraphes, monteurs, analystes vidéo. Il décrit pas à pas l'usage de l'application, depuis la création d'un projet jusqu'à l'export final.

> Pré-requis : application démarrée → http://localhost:3000 (voir [`installation.md`](installation.md)).

---

## 1. Vue d'ensemble

L'application s'organise en 5 grandes pages :

| Page                       | Rôle                                                   |
|----------------------------|--------------------------------------------------------|
| **Projets**                | Création / gestion des projets et de leurs vidéos      |
| **Détail projet**          | Liste des vidéos d'un projet, upload, renommage         |
| **Annotation**             | Cœur de l'app — pose et édition des annotations         |
| **Statistiques**           | Métriques BPM, histogramme, ajustement vitesse          |
| **Export / Assemblage**    | Export annotations, clip vidéo, montage multi-pistes    |

---

## 2. Créer un projet

1. Page d'accueil → bouton **+ Nouveau projet**.
2. Renseigner un **nom** (obligatoire) et une **description** (optionnelle).
3. **Créer** → vous arrivez sur la page de détail du projet.

> Astuce : organisez par contexte (un projet par séance d'enregistrement, par danseur, par sport, etc.).

---

## 3. Importer une vidéo

Depuis la page **Détail projet** :

1. Cliquer **Importer une vidéo**.
2. Sélectionner un fichier local. Formats supportés : tout ce que FFmpeg lit (mp4, mov, mkv, avi, webm…).
3. Limite de taille par défaut : **2000 Mo** (configurable via `MAX_VIDEO_SIZE_MB`).
4. Patienter pendant l'analyse FFmpeg (durée, fps, codec, résolution sont extraits).
5. La vidéo apparaît dans la liste avec sa miniature et ses métadonnées.

> **Renommage** : cliquer sur le nom de la vidéo dans la liste pour le modifier sans toucher au fichier d'origine.

---

## 4. Annoter une vidéo

Cliquer sur une vidéo → page **Annotation**.

### 4.1 Interface

```
┌─────────────────────────────────────────────┬────────────────────────┐
│  Lecteur vidéo                              │  Liste des annotations │
│  ┌───────────────────────────────────────┐  │  ┌──────────────────┐  │
│  │                                       │  │  │ #1  frame 12     │  │
│  │              VIDÉO                    │  │  │ #2  frame 48     │  │
│  │                                       │  │  │ #3  frame 84     │  │
│  └───────────────────────────────────────┘  │  │  …               │  │
│  ▶ ⏸ ◀ ▶  vitesse: 1.0×   frame 240/3600    │  └──────────────────┘  │
│  ┌───────────────────────────────────────┐  │                        │
│  │ Timeline canvas avec marqueurs        │  │  Catégories            │
│  └───────────────────────────────────────┘  │                        │
└─────────────────────────────────────────────┴────────────────────────┘
```

### 4.2 Raccourcis clavier

| Action                          | Touche                |
|---------------------------------|-----------------------|
| Lecture / pause                 | `K` ou clic sur ▶/⏸   |
| Frame +1 / -1                   | `→` / `←`             |
| +5 / -5 frames                  | `Shift+→` / `Shift+←` |
| Saut à l'annotation suivante / précédente | `Ctrl+→` / `Ctrl+←` (logique adaptée au rythme local — voir plus bas) |
| **Poser une annotation**        | `Espace`              |
| Aide raccourcis                 | `?`                   |

> **Logique `Ctrl+flèche` intelligente** : le pas est calculé comme la **distance entre les deux annotations les plus proches à gauche** de la frame courante. Si moins de 2 annotations à gauche, fallback à **10 frames**. Cela permet de "sauter de beat en beat" automatiquement.

### 4.3 Poser des annotations manuellement

- Naviguer jusqu'à la frame voulue (clavier ou clic sur la timeline).
- **Espace** → annotation créée instantanément à la frame courante.
- Le label par défaut est vide ; éditez-le dans la liste de droite.

### 4.4 Placement automatique (bulk)

Pour distribuer un grand nombre d'annotations équidistantes :

1. Cliquer **+ Placement automatique** (ou icône équivalente).
2. Saisir :
   - **Point de début** (frame ou timestamp)
   - **Point de fin**
   - **Nombre d'annotations**
   - **Préfixe** optionnel (ex. `beat` → labels `beat 1`, `beat 2`, …)
   - **Catégorie** optionnelle
3. **Aperçu** : visualisez les positions sur la timeline.
4. **Valider** : les annotations sont créées et restent éditables individuellement.

### 4.5 Décalage global

Si vos annotations sont toutes en avance ou en retard de la même durée :

1. Ouvrir **Décalage global**.
2. Saisir un offset en millisecondes (ex. `+200`, `-150`).
3. **Appliquer** → toutes les annotations sont translatées.

### 4.6 Modifier / supprimer

Dans la **liste de droite** :

- Cliquer sur le label pour éditer le texte.
- Cliquer sur l'icône poubelle pour supprimer.
- Drag & drop ou édition de la frame pour déplacer.

### 4.7 Vérification sonore

- Bouton **🔉 Activer son** (toggle).
- Lors de la lecture, un **bip** est joué à chaque frame annotée.
- Idéal pour valider la précision rythmique à l'oreille avant export.

### 4.8 Catégories

1. Bouton **Catégories** → ouvrir le gestionnaire.
2. Créer une catégorie : nom + couleur (palette).
3. Lors de la pose d'une annotation, sélectionner la catégorie active.
4. Les annotations héritent de la couleur sur la timeline et la liste.

---

## 5. Statistiques rythmiques

Onglet / page **Statistiques** (depuis la page d'annotation).

| Métrique                        | Description                                              |
|---------------------------------|----------------------------------------------------------|
| **BPM global**                  | Calculé sur la durée totale annotée                      |
| **BPM moyen / médian**          | Moyenne et médiane des BPM inter-annotations             |
| **Variation BPM**               | Écart max-min entre intervalles                          |
| **Écart-type des intervalles**  | Régularité du rythme (s)                                 |
| **Densité d'annotations**       | Annotations par minute                                   |
| **Histogramme**                 | Distribution des intervalles inter-annotations           |
| **Segments rythmiques**         | Découpage automatique par densité                        |
| **Pics d'activité**             | Zones de haute densité d'annotations                     |

### Ajustement BPM

1. Saisir un **BPM cible** (ex. `120`).
2. L'app calcule la **vitesse de lecture** à appliquer : `target_bpm / current_bpm`.
3. Cliquer **Appliquer** → la vidéo se lit à la vitesse ajustée.
4. Optionnel : **Générer une preview adaptée** (ré-encodage FFmpeg) → utile pour exporter à la nouvelle vitesse.

---

## 6. Exports

Onglet **Export** dans la page d'annotation.

### 6.1 Exports rapides (téléchargement immédiat)

| Bouton            | Format          | Contenu                                       |
|-------------------|-----------------|-----------------------------------------------|
| Exporter JSON     | `.json`         | Annotations + métadonnées vidéo               |
| Exporter CSV      | `.csv`          | Annotations en tabulaire (Excel-compatible)   |
| Exporter clip     | `.mp4`          | Portion entre 1re et dernière annotation      |

### 6.2 Bundle (asynchrone)

Tout-en-un : JSON + CSV + clip dans un ZIP. Le job tourne en arrière-plan ; le widget **Mes exports** liste les jobs en cours / terminés.

### 6.3 Export projet complet

Depuis la page **Détail projet** : exporte **toutes les vidéos** annotées du projet en une seule archive ZIP. Pratique pour archiver / partager une session entière.

---

## 7. Mode Assemblage

Page **Assemblage** (depuis le menu ou un raccourci de projet).

Permet de composer un **montage final multi-pistes** :

- **Pistes vidéo** : ajouter, réordonner, trimmer (sélection d'un sous-extrait).
- **Pistes audio** : importer un fichier audio externe, visualiser la waveform (wavesurfer.js).
- **Calage** : aligner les annotations sur le tempo de la piste audio.
- **Transitions** : fade in / fade out entre les segments.
- **Aperçu** : prévisualisation dans le navigateur.
- **Exporter** : génère un fichier vidéo final via FFmpeg.

---

## 8. Bonnes pratiques

- **Sauvegardez régulièrement** vos données (`docker compose down` ne supprime rien, mais `down -v` efface les volumes).
- **Renommez** vos vidéos à l'import — le label par défaut est le nom de fichier.
- **Utilisez les catégories** dès qu'un projet contient plus d'un type d'annotation (kick / snare, saut / pirouette, etc.).
- **Activez le bip** pour valider à l'oreille avant export.
- **Préférez l'export bundle** pour archiver : il regroupe JSON + CSV + clip en un fichier.

---

## 9. Limites connues (v1)

- **Mono-utilisateur** : pas de collaboration temps réel.
- **Pas d'annotation graphique** (zones / formes sur l'image).
- **Export vidéo** : stream copy → delta possible de quelques frames sur les coupes (alignement keyframe).
- **Pas d'import cloud** (S3, Drive) — prévu en v2.
- **Pas d'authentification** — l'app est volontairement locale.
