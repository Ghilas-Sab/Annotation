# UX Design — Application Web d'Annotation Vidéo Rythmée

**Version :** 1.0  
**Date :** 2026-04-09  
**Auteur :** Sally (BMad UX Designer)  
**Statut :** Validé

---

## Principes de Design

| Principe | Application |
|----------|-------------|
| **Clavier d'abord** | Chaque action critique a un raccourci. La souris est optionnelle. |
| **Zéro friction cognitive** | Une seule chose visible à la fois. Pas de modales inutiles. |
| **Feedback immédiat** | Chaque frappe clavier produit un effet visuel ET sonore (si bip activé). |
| **Densité utile** | Tout ce qui est affiché est utile. Rien de décoratif. |
| **Tonalité sombre** | Fond sombre pour les sessions longues devant écran. |

---

## Palette & Typographie

```
Fond principal   : #1a1a2e  (bleu nuit très sombre)
Fond panneau     : #16213e  (bleu marine profond)
Fond surface     : #0f3460  (bleu moyen — cartes, panneaux)
Accent primaire  : #e94560  (rouge vif — annotations, actions primaires)
Accent secondaire: #f5a623  (orange — BPM, métriques)
Texte principal  : #eaeaea  (blanc cassé)
Texte secondaire : #8892b0  (gris bleu)
Succès           : #64ffda  (vert menthe — confirmations)
Danger           : #ff6b6b  (rouge doux — suppression)

Police           : Inter (sans-serif, lisible en petite taille)
Monospace        : JetBrains Mono (timecodes, frames, valeurs numériques)
```

---

## Navigation Globale

```
┌────────────────────────────────────────────────────────────────────┐
│  ● AnnotaRythm                [Projets]  [Annotation]  [Statistiques] │
└────────────────────────────────────────────────────────────────────┘
```

- Barre de navigation fixe en haut, hauteur 48px
- 3 onglets principaux — l'onglet actif est souligné avec l'accent primaire
- Breadcrumb contextuel sous la navbar quand on est dans un projet :
  `Projets > Mon Projet > ma-video.mp4`
- Pas de sidebar : navigation linéaire, une page = un focus

---

## PAGE 1 — Gestion de Projets

### Vue d'ensemble (liste de projets)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ● AnnotaRythm          [Projets ●]  [Annotation]  [Statistiques]        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Mes Projets                                      [+ Nouveau projet]     │
│                                                                          │
│  ┌─────────────────────────┐  ┌─────────────────────────┐               │
│  │  Danse Hip-Hop           │  │  Analyse Cinéma          │               │
│  │  3 vidéos · 247 annots  │  │  1 vidéo · 0 annotation  │               │
│  │  Modifié il y a 2h      │  │  Créé aujourd'hui        │               │
│  │                         │  │                          │               │
│  │  [▶ Ouvrir]  [✎] [🗑]  │  │  [▶ Ouvrir]  [✎] [🗑]  │               │
│  └─────────────────────────┘  └─────────────────────────┘               │
│                                                                          │
│  ┌─────────────────────────┐                                             │
│  │  + Créer un projet       │                                             │
│  │  (zone cliquable)        │                                             │
│  └─────────────────────────┘                                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Comportements clés :**
- Grille responsive : 2 colonnes sur desktop, 1 sur mobile
- Tri par date de modification décroissante
- Hover sur une carte : légère surbrillance du bord (accent primaire)
- Bouton "Nouveau projet" ouvre un panneau inline (pas de modale)

---

### Panneau Création / Édition de Projet (inline, sans modale)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Mes Projets                                      [+ Nouveau projet]     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Nouveau projet                                              [✕]    │ │
│  │                                                                     │ │
│  │  Nom du projet *                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Danse Hip-Hop Été 2026                                      │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  Description (optionnel)                                            │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  Analyse rythmique des performances du festival...           │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │                                    [Annuler]  [Créer le projet →]  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Vue Détail Projet (liste de vidéos)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ● AnnotaRythm          [Projets ●]  [Annotation]  [Statistiques]        │
│  ← Projets > Danse Hip-Hop                                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Danse Hip-Hop                              [✎ Renommer]  [🗑 Supprimer] │
│  Analyse rythmique des performances...                                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  + Importer une vidéo                                            │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │                                                            │  │   │
│  │  │          Glissez-déposez une vidéo ici                     │  │   │
│  │  │          ou  [Parcourir les fichiers]                      │  │   │
│  │  │          Tous formats vidéo supportés                      │  │   │
│  │  │                                                            │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Vidéos (3)                                                              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  [▶]  performance_01.mp4    2:34 · 25fps · 247 annotations        │  │
│  │       Modifiée il y a 2h                [Annoter →] [Stats] [🗑]  │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  [▶]  rehearsal_complet.mp4  8:12 · 30fps · 0 annotation          │  │
│  │       Importée il y a 1j                [Annoter →] [Stats] [🗑]  │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │  [▶]  final_cut.mp4          3:47 · 24fps · 12 annotations        │  │
│  │       Modifiée il y a 3j               [Annoter →] [Stats] [🗑]  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Comportements clés :**
- Upload : glisser-déposer OU clic sur "Parcourir"
- Pendant l'upload : barre de progression inline sur la ligne de la vidéo
- Métadonnées extraites automatiquement (fps, durée) et affichées
- "Annoter →" navigue vers la page d'annotation avec cette vidéo chargée

---

## PAGE 2 — Interface d'Annotation Vidéo (CŒUR)

### Layout global

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ● AnnotaRythm    [Projets]  [Annotation ●]  [Statistiques]              │
│  ← Projets > Danse Hip-Hop > performance_01.mp4                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────┐  ┌──────────────────────────┐   │
│  │                                    │  │  ANNOTATIONS (247)       │   │
│  │                                    │  │  ┌──────────────────────┐│   │
│  │         LECTEUR VIDÉO              │  │  │ # 001  beat 1        ││   │
│  │         (zone vidéo HTML5)         │  │  │ f.40  00:00:01.600   ││   │
│  │                                    │  │  ├──────────────────────┤│   │
│  │                                    │  │  │ # 002  beat 2     ●  ││   │
│  │                                    │  │  │ f.65  00:00:02.600   ││   │
│  ├────────────────────────────────────┤  │  ├──────────────────────┤│   │
│  │  TIMELINE                          │  │  │ # 003  beat 3        ││   │
│  ├────────────────────────────────────┤  │  │ f.90  00:00:03.600   ││   │
│  │  CONTRÔLES                         │  │  └──────────────────────┘│   │
│  └────────────────────────────────────┘  │                          │   │
│                                          │  Actions globales :      │   │
│  ┌─────────────────────────────────────┐ │  [+ Placement auto]      │   │
│  │  BARRE D'ÉTAT / RACCOURCIS          │ │  [⇄ Décalage global]     │   │
│  └─────────────────────────────────────┘ │  [Export ↓]              │   │
│                                          └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Détail : Zone Lecteur Vidéo

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                                                        │
│                   [  VIDÉO  ]                         │
│                   1280 × 720                           │
│                                                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

- Ratio maintenu automatiquement (16:9, 4:3, etc.)
- Pas d'overlay sur la vidéo (aucune incrustation)
- Fond noir autour si la vidéo ne remplit pas la zone

---

### Détail : Barre de Contrôles

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  [⏮] [◀◀] [◀] [▶/⏸] [▶] [▶▶] [⏭]          🔊 BIP [ON]  vitesse: 1.0x │
│                                                                        │
│   f. 1 234  /  3 750          00:00:49.360  /  00:02:30.000            │
│   ─────────────────────────────────────────────────────────            │
│   FRAME COURANTE / TOTAL         TIMESTAMP  / DURÉE TOTALE             │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Boutons de contrôle :**

| Bouton | Icône | Raccourci | Action |
|--------|-------|-----------|--------|
| Début | ⏮ | Home | Aller frame 0 |
| -5 frames | ◀◀ | Shift+← | Reculer 5 frames |
| -1 frame | ◀ | ← | Frame précédente |
| Play/Pause | ▶/⏸ | P | Basculer lecture |
| +1 frame | ▶ | → | Frame suivante |
| +5 frames | ▶▶ | Shift+→ | Avancer 5 frames |
| Fin | ⏭ | End | Aller dernière frame |

**Zone infos frame :**
- `f. 1 234` — numéro de frame (police monospace, grande taille)
- `/ 3 750` — total frames (texte secondaire plus petit)
- `00:00:49.360` — timestamp précis au milliseconde (police monospace)
- `/ 00:02:30.000` — durée totale

**Mode BIP :**
- Bouton toggle `[BIP ON]` / `[BIP OFF]`
- Fond vert quand actif (`#64ffda`), gris quand inactif
- Un bip (880Hz, 50ms) est émis à chaque frame annotée pendant la lecture

**Vitesse de lecture :**
- Affichage `1.0x`
- Clic → dropdown : `0.25x / 0.5x / 0.75x / 1.0x / 1.25x / 1.5x / 2.0x`
- Également contrôlable depuis la page Statistiques (BPM cible)

---

### Détail : Timeline avec Annotations (Canvas)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  00:00                                                        02:30    │
│  ├────────────────────────────────────────────────────────────────────┤│
│  │  ·  ·  · |·  ·  · |·  ·  · |·  ·  · |·  ·  · |·  ·  · |·  ·  · ││
│  │          ▲         ▲        ▲▲        ▲         ▲▲▲               ││
│  │          │         │        ││        │         │││               ││
│  │     [beat 1]  [beat 2] [beat 3][beat 4]      [beat 5-7]          ││
│  └──────────────────────────────────────────────────────────────────┘│
│                             ▼ (curseur position courante)              │
│                        00:00:49.360                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Rendu Canvas (détails) :**

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Zone grise claire : fond timeline                                   │
│                                                                      │
│  ──────────────────────────────────────  ← Ligne de base (fond)      │
│        ↑             ↑      ↑↑          ← Traits rouges = annotations │
│   (label tooltip au survol)              hauteur : 16px               │
│                                                                      │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░   ← Barre de progression       │
│  (bleu rempli = temps écoulé)            (cliquable pour seek)        │
│                                                                      │
│  │  ← Curseur vertical (ligne blanche, draggable)                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Interactions timeline :**
- **Clic** sur la timeline → seek immédiat à ce timestamp
- **Drag** du curseur → navigation continue
- **Survol** d'un marqueur d'annotation → tooltip `"beat 3 — f.90 — 00:00:03.600"`
- **Clic** sur un marqueur → sélectionne l'annotation dans la liste à droite (auto-scroll)
- **Scroll molette** sur la timeline → zoom temporel (facteur 0.5x à 8x)
- En mode zoomé : une fenêtre de navigation apparaît en dessous (minimap)

---

### Détail : Panneau Annotations (droite)

```
┌──────────────────────────────────────┐
│  ANNOTATIONS (247)              [+]  │
│  ──────────────────────────────────  │
│  Filtrer...          [Tout sélect.]  │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ ▶ # 001  beat 1                 ││  ← annotation active (surbrillance)
│  │   f.40   00:00:01.600    [✎][🗑] ││
│  ├──────────────────────────────────┤│
│  │   # 002  beat 2                 ││
│  │   f.65   00:00:02.600    [✎][🗑] ││
│  ├──────────────────────────────────┤│
│  │   # 003  beat 3                 ││
│  │   f.90   00:00:03.600    [✎][🗑] ││
│  ├──────────────────────────────────┤│
│  │   # 004  beat 4                 ││
│  │   f.115  00:00:04.600    [✎][🗑] ││
│  └──────────────────────────────────┘│
│                                      │
│  ─────────────────────────────────   │
│  [+ Placement auto]                  │
│  [⇄ Décalage global]                 │
│  ─────────────────────────────────   │
│  [↓ Export JSON]  [↓ Export CSV]     │
│  [↓ Export clip vidéo]               │
└──────────────────────────────────────┘
```

**Comportements :**
- L'annotation courante (frame active) est auto-scrollée et surlignée en accent
- `▶` à gauche indique l'annotation à la position courante (ou la plus proche)
- Cliquer sur une annotation → seek vidéo vers cette frame
- `[✎]` → édition inline du label (champ texte apparaît en place)
- `[🗑]` → suppression avec confirmation discrète (undo possible 3s via toast)
- `[+]` en haut → ajouter annotation à la frame courante (= Espace)

**Édition inline :**
```
│   # 002  [__beat 2______]   [✓][✕]  │
│   f.65   00:00:02.600               │
```

---

### Détail : Placement Automatique (panneau flottant)

Déclenché par `[+ Placement auto]` → panneau flottant ancré au-dessus de la liste :

```
┌──────────────────────────────────────┐
│  Placement automatique          [✕]  │
│  ──────────────────────────────────  │
│  Début          Fin                  │
│  [00:00:05.000] [00:00:25.000]       │
│  (clic → cherche frame courante)     │
│                                      │
│  Nombre d'annotations                │
│  [50        ]                        │
│                                      │
│  Préfixe du label (optionnel)        │
│  [beat      ]                        │
│                                      │
│  Aperçu : intervalle ≈ 0.408s        │
│  Labels : beat 1 … beat 50           │
│                                      │
│         [Annuler]  [Placer 50 →]     │
└──────────────────────────────────────┘
```

**Micro-interactions :**
- `[Début]` et `[Fin]` : clic sur le bouton → capture la frame courante comme valeur
- Calcul de l'intervalle et aperçu du label mis à jour en temps réel
- Après confirmation : les 50 annotations apparaissent sur la timeline (animation d'apparition groupée)

---

### Détail : Décalage Global (panneau flottant)

```
┌──────────────────────────────────────┐
│  Décalage global               [✕]  │
│  ──────────────────────────────────  │
│  Déplacer toutes les annotations     │
│                                      │
│  Décalage (ms)                       │
│  [- ]  [_+200_______]  [+ ]          │
│                                      │
│  + = vers l'avance (frames supér.)   │
│  - = vers le début (frames infer.)   │
│                                      │
│  Aperçu : 247 annotations décalées  │
│  de +200ms (≈ +5 frames à 25fps)     │
│                                      │
│         [Annuler]  [Appliquer →]     │
└──────────────────────────────────────┘
```

---

### Barre de Raccourcis Clavier (bas de page, rétractable)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [?] Raccourcis clavier                                          [▲] │
│  ←/→ frame  · Shift+←/→ ±5f  · Ctrl+←/→ saut inter-annot           │
│  Espace : annoter  ·  P : play/pause  ·  Suppr : suppr. annot.      │
│  B : toggle bip  ·  Home/End : début/fin                             │
└──────────────────────────────────────────────────────────────────────┘
```

- Par défaut visible, peut être réduit au clic sur `[▲]`
- Persistance de l'état réduit/développé en localStorage

---

### Raccourcis Clavier Complets

| Raccourci | Action | Zone d'effet |
|-----------|--------|--------------|
| `←` | Frame précédente | Global |
| `→` | Frame suivante | Global |
| `Shift+←` | -5 frames | Global |
| `Shift+→` | +5 frames | Global |
| `Ctrl+←` | Saut vers annot. précédente (pas inter-annot) | Global |
| `Ctrl+→` | Saut vers annot. suivante (pas inter-annot) | Global |
| `Espace` | Poser / supprimer annotation à la frame courante | Global (hors input) |
| `P` | Play / Pause | Global (hors input) |
| `B` | Toggle mode bip | Global (hors input) |
| `Home` | Aller frame 0 | Global |
| `End` | Aller dernière frame | Global |
| `Suppr` | Supprimer annotation sélectionnée | Si annot. sélectionnée |
| `Échap` | Fermer panneau flottant / désélectionner | Global |
| `Ctrl+Z` | Annuler dernière action | Global |

**Règle d'activation clavier :**
Les raccourcis sont désactivés quand le focus est dans un champ de saisie (`<input>`, `<textarea>`). Quand le focus quitte le champ (Échap ou Tab), les raccourcis reprennent.

---

## PAGE 3 — Statistiques et Ajustement BPM

### Layout global

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ● AnnotaRythm    [Projets]  [Annotation]  [Statistiques ●]              │
│  ← Projets > Danse Hip-Hop > performance_01.mp4                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  MÉTRIQUES BPM                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │  AJUSTEMENT VITESSE              │  │  HISTOGRAMME DES INTERVALLES  │ │
│  └──────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Détail : Métriques BPM

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Métriques rythmiques — performance_01.mp4 · 247 annotations             │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  BPM GLOBAL     │  │  BPM MOYEN      │  │  BPM MÉDIAN     │          │
│  │                 │  │                 │  │                 │          │
│  │    128.4        │  │    127.8        │  │    128.0        │          │
│  │    BPM          │  │    BPM          │  │    BPM          │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │  VARIATION BPM  │  │  ÉCART-TYPE     │  │  DENSITÉ        │          │
│  │                 │  │  INTERVALLES    │  │                 │          │
│  │    ±12.3        │  │    0.023s       │  │    128.4 /min   │          │
│  │    BPM          │  │    (±2.3ms)     │  │                 │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Design des cartes métriques :**
- Grande valeur numérique en police monospace (32px, accent orange)
- Libellé en dessous (12px, texte secondaire)
- Fond légèrement différent du fond principal pour le contraste
- Pas de graphique dans les cartes — juste les chiffres, lisibles d'un coup d'œil

---

### Détail : Ajustement Vitesse de Lecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Ajustement vitesse de lecture                                   │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  BPM calculé depuis vos annotations                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  128.4 BPM                                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│  (lecture seule — calculé automatiquement)                       │
│                                                                  │
│  BPM cible souhaité                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  140                                                 BPM │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Vitesse calculée                                        │   │
│  │                                                          │   │
│  │              1.09×                                       │   │
│  │                                                          │   │
│  │  140 / 128.4 = 1.09                                      │   │
│  │  La vidéo sera lue 9% plus rapidement                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│         [Appliquer cette vitesse à la lecture  →]               │
│         (redirige vers la page Annotation avec 1.09x actif)     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Comportements :**
- Saisie du BPM cible → calcul en temps réel du facteur de vitesse
- Résultat affiché immédiatement avec explication textuelle
- "Appliquer" → navigue vers la page Annotation avec la vitesse pré-configurée
- Le facteur de vitesse est stocké dans `videoStore` (Zustand)

---

### Détail : Histogramme des Intervalles (Canvas)

```
┌──────────────────────────────────────────────────────────────────┐
│  Distribution des intervalles inter-annotations                  │
│                                                                  │
│   12 ┤   ██                                                      │
│   10 ┤   ██  ██                                                  │
│    8 ┤   ██  ██  ██                                              │
│    6 ┤   ██  ██  ██  ██                                          │
│    4 ┤   ██  ██  ██  ██  ██                                      │
│    2 ┤   ██  ██  ██  ██  ██  ██                                  │
│    0 └───────────────────────────────                            │
│      0.3 0.4 0.5 0.6 0.7 0.8 (secondes)                         │
│                                                                  │
│  Pic à 0.468s  ·  Médiane : 0.469s  ·  (≈ 128 BPM)              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Comportements Canvas :**
- Les barres sont dessinées en accent primaire (rouge) avec 60% d'opacité
- Ligne verticale en pointillés sur la médiane (orange)
- Survol d'une barre → tooltip `"12 intervalles à 0.468s"`
- Axe Y : nombre d'occurrences, Axe X : durée en secondes
- Hauteur : 200px fixe, largeur : 100% du panneau

---

### Segments Rythmiques (liste)

```
┌──────────────────────────────────────────────────────────────────┐
│  Segments rythmiques détectés                                    │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  Segment 1  00:00:01.600 → 00:00:32.040    125.1 BPM   (19 ann.)│
│  Segment 2  00:00:32.520 → 00:01:04.080    129.6 BPM   (43 ann.)│
│  Segment 3  00:01:04.960 → 00:01:47.200    131.2 BPM   (55 ann.)│
│  ...                                                             │
│                                                                  │
│  [▶ Aller au segment]  (clic sur une ligne → seek vers début)   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Zone Export

```
┌──────────────────────────────────────────────────────────────────┐
│  Export                                                          │
│  ──────────────────────────────────────────────────────────────  │
│                                                                  │
│  [↓ Télécharger JSON]   [↓ Télécharger CSV]                     │
│                                                                  │
│  [↓ Exporter le clip vidéo]                                      │
│  Extrait de 00:00:01.600 à 00:02:29.400                         │
│  (de la 1ère à la dernière annotation)                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## États de l'Interface

### États vides (empty states)

**Aucun projet :**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│             Aucun projet pour l'instant.             │
│          Créez votre premier projet pour             │
│               commencer à annoter.                   │
│                                                      │
│              [+ Créer un projet]                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Aucune annotation sur une vidéo :**
```
┌──────────────────────────────────────────────────────┐
│  ANNOTATIONS (0)                                     │
│                                                      │
│     Appuyez sur Espace pour poser                    │
│     votre première annotation.                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Statistiques sans assez d'annotations :**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│     Minimum 2 annotations requises                  │
│     pour calculer les métriques BPM.                 │
│                                                      │
│     [Aller annoter →]                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### États de chargement

- Upload vidéo : barre de progression inline sur la ligne de la vidéo
- Calcul stats : spinner discret à côté du titre "Métriques rythmiques"
- Export vidéo : barre de progression avec message "Découpe en cours..." 
- Seek frame : aucun loader (< 16ms, imperceptible)

---

### Notifications (Toast)

Positionnées en bas à droite, empilables, disparaissent après 3s :

```
┌───────────────────────────────┐
│  ✓  Annotation ajoutée        │  ← vert, 3s
└───────────────────────────────┘

┌───────────────────────────────┐
│  ✓  Export JSON téléchargé    │  ← vert, 3s
└───────────────────────────────┘

┌─────────────────────────────────┐
│  ↩  Annotation supprimée  [Annuler] │  ← orange, 5s (undo possible)
└─────────────────────────────────┘

┌───────────────────────────────┐
│  ✗  Erreur : vidéo non lue    │  ← rouge, persistant
└───────────────────────────────┘
```

---

## Composants React — Mapping UX → Architecture

| Composant UX | Fichier Architecture |
|-------------|---------------------|
| Barre navigation | `App.tsx` + React Router |
| Carte projet | `ProjectCard.tsx` |
| Upload drag & drop | `VideoUpload.tsx` |
| Lecteur vidéo | `VideoPlayer.tsx` |
| Timeline annotations | `VideoTimeline.tsx` (Canvas) |
| Compteur frame + timestamp | `FrameCounter.tsx` |
| Contrôles + vitesse + bip | `PlaybackControls.tsx` |
| Liste annotations + édition | `AnnotationList.tsx` + `AnnotationItem.tsx` |
| Placement auto | `BulkPlacementForm.tsx` |
| Cartes métriques | `BpmMetrics.tsx` |
| Histogramme | `IntervalHistogram.tsx` (Canvas) |
| Ajusteur BPM cible | `BpmAdjuster.tsx` |
| Raccourcis clavier | `useVideoKeyboard.ts` (hook) |
| Bip sonore | `useAudioBeep.ts` (hook) + `audioStore.ts` |

---

## Points d'Attention pour l'Implémentation

1. **Focus management** : quand un panneau flottant s'ouvre (placement auto, décalage global), le focus doit se déplacer vers le premier champ. À la fermeture (Échap), le focus retourne à la zone vidéo.

2. **Scroll auto de la liste** : quand la frame courante correspond à une annotation, la liste doit auto-scroller pour la garder visible (sans override un scroll manuel de l'utilisateur — détecter si l'utilisateur a scrollé manuellement).

3. **Canvas timeline** : le rendu doit être throttlé à 60fps max via `requestAnimationFrame`. Ne pas re-render à chaque évènement clavier — utiliser le store Zustand comme source de vérité.

4. **Espace / annotations** : si une annotation existe déjà à la frame courante, Espace la supprime (toggle). Feedback visuel immédiat dans la liste ET sur la timeline.

5. **Ctrl+Z** : l'annulation doit fonctionner pour : ajout, suppression, modification de label, placement auto (annule le groupe entier), décalage global. Implémenter une pile d'historique dans `annotationStore`.

6. **Accessibilité minimale** : toutes les icônes-boutons ont un `aria-label`. Les raccourcis sont annoncés via un `aria-live` region discret.

---

## Résumé des Décisions UX

| Décision | Justification |
|----------|---------------|
| Thème sombre | Sessions longues, focus sur la vidéo |
| Pas de modale | Fluidité, le focus reste sur la vidéo |
| Panneau droit pour annotations | Toujours visible, sans masquer la vidéo |
| Barre raccourcis visible | Courbe d'apprentissage réduite |
| Espace = annoter/désannoter | Un seul geste répétitif = muscle memory |
| Toast pour confirmations | Non-bloquant, ne casse pas le flow |
| Timestamp au milliseconde | Précision affichée = confiance utilisateur |
| Police monospace pour frames/temps | Lecture rapide, pas de saut de layout |
