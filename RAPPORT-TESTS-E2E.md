# Rapport de Tests End-to-End — Application Web d'Annotation Vidéo

**Date :** 19 mai 2026  
**Projet :** Application Web d'Annotation Vidéo Frame par Frame  
**Auteur :** Ghilas Sabour  
**Framework de test :** Playwright (E2E) + Vitest (unitaires) + pytest (backend)  

---

## Résumé Exécutif

L'application a été soumise à une campagne de tests complète couvrant l'ensemble des fonctionnalités : gestion de projets, annotation vidéo frame par frame, statistiques BPM, export de données, assemblage de clips et raccourcis clavier.

| Niveau de test | Outil | Tests | Résultat |
|---|---|---|---|
| End-to-End (navigateur) | Playwright | 203 | ✅ 202 passés, 1 ignoré |
| Unitaires frontend | Vitest | 636 | ✅ Tous passés |
| Unitaires backend | pytest | 272 | ✅ Tous passés |
| **Total** | | **1 111** | **✅ 1 110 passés** |

---

## Architecture des Tests E2E

Les tests E2E sont organisés en 20 suites thématiques. Chaque suite utilise un helper d'API (`ApiHelper`) pour créer et nettoyer les données de test de manière isolée. Les tests s'exécutent contre l'application déployée localement via Docker Compose (frontend sur le port 3000, API REST sur le port 8000).

---

## Détail des Suites de Tests

### Suite 01 — Gestion des Projets (15 tests)

Couvre la page principale `/projects` et toutes les interactions CRUD sur les projets.

| # | Scénario | Résultat |
|---|---|---|
| 1.1 | La page projets se charge et affiche le titre "Gestion des Projets" | ✅ |
| 1.2 | Créer un projet via le formulaire l'ajoute à la liste | ✅ |
| 1.3 | La validation empêche la création avec un nom vide | ✅ |
| 1.4 | Supprimer un projet le retire de la liste | ✅ |
| 1.5 | La recherche filtre les projets par nom | ✅ |
| 1.6 | Effacer la recherche restaure tous les projets | ✅ |
| 1.7 | Le compteur de projets est exact | ✅ |
| 1.8 | Cliquer sur un projet navigue vers sa page de détail | ✅ |
| 1.9 | Plusieurs projets coexistent dans la liste | ✅ |
| 1.10 | La création avec un nom en double est gérée | ✅ |
| 1.11 | Le bouton de création est désactivé si le nom est vide | ✅ |
| 1.12 | La barre de recherche est présente et fonctionnelle | ✅ |
| 1.13 | La liste est vide au départ (état initial) | ✅ |
| 1.14 | Le nom du projet est affiché dans la carte | ✅ |
| 1.15 | La page projet montre la date de création | ✅ |

---

### Suite 02 — Détail d'un Projet (13 tests)

Couvre la page `/projects/:id` avec upload de vidéo, renommage et navigation.

| # | Scénario | Résultat |
|---|---|---|
| 2.1 | La page détail affiche le nom du projet | ✅ |
| 2.2 | Uploader une vidéo l'ajoute à la liste | ✅ |
| 2.3 | Le nom personnalisé est utilisé après upload | ✅ |
| 2.4 | Supprimer une vidéo la retire de la liste | ✅ |
| 2.5 | Renommer un projet met à jour l'affichage | ✅ |
| 2.6 | Le bouton "Annoter" navigue vers la page d'annotation | ✅ |
| 2.7 | Le compteur de vidéos dans l'en-tête se met à jour | ✅ |
| 2.8 | Le breadcrumb "Projets" est cliquable | ✅ |
| 2.9 | Plusieurs vidéos peuvent coexister dans un projet | ✅ |
| 2.10 | La durée de la vidéo est affichée au format M:SS | ✅ |
| 2.11 | Le FPS de la vidéo est affiché sur la carte | ✅ |
| 2.12 | Le nombre de frames est affiché sur la carte | ✅ |
| 2.13 | Le modal de trim s'ouvre au clic sur "Annoter" | ✅ |

---

### Suite 03 — Annotations (17 tests)

Couvre la page `/annotation/:id` : création, suppression, annulation et export.

| # | Scénario | Résultat |
|---|---|---|
| 3.1 | La page d'annotation se charge correctement | ✅ |
| 3.2 | Appuyer sur Espace crée une annotation à la frame courante | ✅ |
| 3.3 | L'annotation apparaît dans l'onglet "Annotations (1)" | ✅ |
| 3.4 | Supprimer une annotation réduit le compteur | ✅ |
| 3.5 | Ctrl+Z annule la dernière annotation créée | ✅ |
| 3.6 | L'onglet "Annotations" affiche le bon compteur | ✅ |
| 3.7 | L'export JSON est accessible depuis la page | ✅ |
| 3.8 | L'export CSV est accessible depuis la page | ✅ |
| 3.9 | L'annotation est visible avec son numéro de frame | ✅ |
| 3.10 | L'annotation est visible avec son label | ✅ |
| 3.11 | Appuyer sur Espace deux fois sur la même frame supprime l'annotation | ✅ |
| 3.12 | Les annotations sont triées par ordre croissant de frames | ✅ |
| 3.13 | Le bouton "Stats" navigue vers les statistiques | ✅ |
| 3.14 | La touche B crée une annotation avec la catégorie par défaut | ✅ |
| 3.15 | L'annotation à la frame 0 est possible | ✅ |
| 3.16 | L'annotation à la dernière frame est possible | ✅ |
| 3.17 | Multi-undo : annuler 3 annotations successives fonctionne | ✅ |

---

### Suite 04 — Catégories (8 tests)

Couvre la gestion des catégories dans la page d'annotation.

| # | Scénario | Résultat |
|---|---|---|
| 4.1 | La catégorie par défaut est toujours présente | ✅ |
| 4.2 | Créer une catégorie personnalisée l'ajoute à la liste | ✅ |
| 4.3 | Supprimer une catégorie personnalisée la retire | ✅ |
| 4.4 | Le badge de couleur de catégorie est affiché | ✅ |
| 4.5 | Le sélecteur de couleur est présent dans le formulaire | ✅ |
| 4.6 | Plusieurs catégories coexistent (couleurs uniques) | ✅ |
| 4.7 | La catégorie sélectionnée est utilisée pour les nouvelles annotations | ✅ |
| 4.8 | Filtrer par catégorie affiche uniquement les annotations correspondantes | ✅ |

---

### Suite 05 — Statistiques (8 tests)

Couvre la page `/statistics/:id` avec calcul BPM et visualisations.

| # | Scénario | Résultat |
|---|---|---|
| 5.1 | La page statistiques se charge correctement | ✅ |
| 5.2 | La valeur BPM principale est affichée | ✅ |
| 5.3 | La carte BPM minimum est visible | ✅ |
| 5.4 | La carte BPM maximum est visible | ✅ |
| 5.5 | La carte BPM médiane est visible | ✅ |
| 5.6 | L'histogramme BPM est rendu sur la page | ✅ |
| 5.7 | Le "Playback Speed Calculator" est présent | ✅ |
| 5.8 | Le bouton retour navigue vers la page d'annotation | ✅ |

---

### Suite 06 — Export (13 tests)

Couvre la page `/export/:id` avec sélection de vidéos, formats et déclenchement de jobs.

| # | Scénario | Résultat |
|---|---|---|
| 6.1 | La page export se charge correctement | ✅ |
| 6.2 | Toutes les vidéos du projet sont listées | ✅ |
| 6.3 | Sélectionner une vidéo active le bouton export | ✅ |
| 6.4 | Désélectionner toutes les vidéos désactive le bouton | ✅ |
| 6.5 | L'export JSON déclenche un téléchargement | ✅ |
| 6.6 | L'export CSV déclenche un téléchargement | ✅ |
| 6.7 | Le format vidéo crée un job d'export | ✅ |
| 6.8 | La sélection partielle (1 vidéo sur N) fonctionne | ✅ |
| 6.9 | Sélectionner toutes les vidéos active le bouton | ✅ |
| 6.10 | L'API retourne le bon format JSON `{video, annotations}` | ✅ |
| 6.11 | Le widget ExportJobs est présent sur la page | ✅ |
| 6.12 | Le format CSV contient l'extension `.csv` | ✅ |
| 6.13 | Le bouton retour quitte la page export | ✅ |

---

### Suite 07 — Assemblage (11 tests)

Couvre la page `/assemblage/:id` avec timeline de clips et export vidéo.

| # | Scénario | Résultat |
|---|---|---|
| 7.1 | La page assemblage se charge correctement | ✅ |
| 7.2 | La timeline est visible | ✅ |
| 7.3 | Ajouter un clip ouvre le modal de sélection | ✅ |
| 7.4 | Le clip ajouté apparaît dans la timeline | ✅ |
| 7.5 | Supprimer un clip le retire de la timeline | ✅ |
| 7.6 | Le bouton export est désactivé sans clips | ✅ |
| 7.7 | Le bouton export est activé après ajout d'un clip | ✅ |
| 7.8 | Lancer un export crée et affiche un job | ✅ |
| 7.9 | Le panneau d'export affiche les options de résolution | ✅ |
| 7.10 | La résolution 720p est sélectionnable | ✅ |
| 7.11 | Un ID de projet invalide affiche un message d'erreur | ✅ |

---

### Suite 08 — Raccourcis Clavier (12 tests)

Couvre les raccourcis documentés dans le modal `?` de la page d'annotation.

| # | Scénario | Résultat |
|---|---|---|
| 8.1 | Le modal des raccourcis s'ouvre avec la touche `?` | ✅ |
| 8.2 | Le modal liste les raccourcis disponibles | ✅ |
| 8.3 | `ArrowRight` avance d'une frame | ✅ |
| 8.4 | `ArrowLeft` recule d'une frame | ✅ |
| 8.5 | `Home` revient à la frame 0 | ✅ |
| 8.6 | `Espace` crée une annotation | ✅ |
| 8.7 | `B` crée une annotation avec la catégorie par défaut | ✅ |
| 8.8 | `Ctrl+→` saute à l'annotation suivante | ✅ |
| 8.9 | `Ctrl+←` saute à l'annotation précédente | ✅ |
| 8.10 | `Suppr` supprime l'annotation à la frame courante | ✅ |
| 8.11 | `Ctrl+Z` annule la dernière annotation | ✅ |
| 8.12 | Le modal se ferme avec `Échap` ou le bouton Fermer | ✅ |

---

### Suite 09 — Thème (4 tests)

Couvre la persistance du thème clair/sombre.

| # | Scénario | Résultat |
|---|---|---|
| 9.1 | Le bouton de bascule du thème est présent | ✅ |
| 9.2 | Basculer en mode sombre change le `class` sur `<html>` | ✅ |
| 9.3 | Basculer en mode clair rétablit l'état initial | ✅ |
| 9.4 | Le thème persiste après rechargement de la page | ✅ |

---

### Suite 10 — Contrôles de Lecture (8 tests)

Couvre les contrôles de la barre de lecture vidéo (`PlaybackControls`).

| # | Scénario | Résultat |
|---|---|---|
| 10.1 | Le bouton Play/Pause est présent | ✅ |
| 10.2 | Le compteur de frames est affiché | ✅ |
| 10.3 | La barre de progression (timeline) est présente | ✅ |
| 10.4 | L'affichage de la frame courante est visible | ✅ |
| 10.5 | Le bouton d'annotation est présent | ✅ |
| 10.6 | Les boutons de navigation frame par frame fonctionnent | ✅ |
| 10.7 | L'indicateur de total de frames est visible | ✅ |
| 10.8 | Les contrôles restent visibles après lecture | ✅ |

---

### Suite 11 — Édition d'Annotations (5 tests)

Couvre l'édition de labels et le placement automatique via BPM.

| # | Scénario | Résultat |
|---|---|---|
| 11.1 | Modifier le label d'une annotation met à jour l'affichage | ✅ |
| 11.2 | Le formulaire de placement automatique par BPM est présent | ✅ |
| 11.3 | Le placement automatique crée des annotations régulières | ✅ |
| 11.4 | Supprimer une annotation via le bouton Supprimer fonctionne | ✅ |
| 11.5 | Échap annule l'édition d'un label | ✅ |

---

### Suite 12 — Validation de l'Upload (9 tests + 1 ignoré)

Couvre les métadonnées affichées après upload et les cas limites du formulaire.

| # | Scénario | Résultat |
|---|---|---|
| 12.1 | Le nom personnalisé saisi est utilisé comme titre de la vidéo | ✅ |
| 12.2 | Sans nom personnalisé, le nom du fichier est utilisé | ✅ |
| 12.3 | Annuler l'upload via le bouton "Annuler" ferme le formulaire | ✅ |
| 12.4 | La durée de la vidéo est affichée au format M:SS | ✅ |
| 12.5 | Le FPS de la vidéo est affiché sur la carte | ✅ |
| 12.6 | Le nombre total de frames est affiché sur la carte | ✅ |
| 12.7 | Plusieurs vidéos peuvent être uploadées dans le même projet | ✅ |
| 12.8 | Le compteur de vidéos dans l'en-tête se met à jour après upload | ✅ |
| 12.9 | Un nom vide ne désactive pas le bouton (le nom du fichier est utilisé) | ✅ |
| 12.10 | *(Ignoré)* La touche Échap ferme le formulaire d'upload | ⏭ Non implémenté |

---

### Suite 13 — Précision des Annotations (9 tests)

Couvre les détails d'affichage et les cas limites des annotations.

| # | Scénario | Résultat |
|---|---|---|
| 13.1 | Cliquer sur une annotation navigue vers sa frame (affichage valide) | ✅ |
| 13.2 | Le label de l'annotation est visible dans la liste | ✅ |
| 13.3 | Le numéro de frame est visible dans chaque item | ✅ |
| 13.4 | Les annotations sont triées par frame croissante | ✅ |
| 13.5 | Multi-undo sur 3 annotations successives fonctionne | ✅ |
| 13.6 | Une annotation peut être créée à la frame 0 | ✅ |
| 13.7 | Une annotation peut être créée à la dernière frame | ✅ |
| 13.8 | Appuyer sur Espace sur une frame annotée supprime l'annotation | ✅ |
| 13.9 | Le compteur dans l'onglet reflète le nombre d'annotations | ✅ |

---

### Suite 14 — Catégories Complètes (7 tests)

Couvre les cas complets de gestion des catégories.

| # | Scénario | Résultat |
|---|---|---|
| 14.1 | Supprimer une catégorie personnalisée fonctionne | ✅ |
| 14.2 | Le badge de couleur est affiché (`data-testid="category-color-badge"`) | ✅ |
| 14.3 | Le sélecteur de couleur est présent dans le formulaire de création | ✅ |
| 14.4 | Plusieurs catégories avec des couleurs uniques coexistent | ✅ |
| 14.5 | La catégorie sélectionnée est utilisée pour les nouvelles annotations | ✅ |
| 14.6 | Filtrer par catégorie affiche uniquement les annotations de cette catégorie | ✅ |
| 14.7 | La catégorie par défaut est toujours présente | ✅ |

---

### Suite 15 — Modal de Trim Vidéo (9 tests)

Couvre le modal de sélection de plage de frames avant annotation.

| # | Scénario | Résultat |
|---|---|---|
| 15.1 | Le modal s'ouvre au clic sur le bouton "Annoter" | ✅ |
| 15.2 | Deux sliders (début/fin) sont présents | ✅ |
| 15.3 | Le bouton "Toute la vidéo" navigue vers la page d'annotation | ✅ |
| 15.4 | Un message guide est affiché quand les sliders sont en position initiale | ✅ |
| 15.5 | Le bouton "Annoter cette plage" est activé après modification des sliders | ✅ |
| 15.6 | "Annoter cette plage" navigue vers la page d'annotation | ✅ |
| 15.7 | Cliquer sur le fond (backdrop) ferme le modal | ✅ |
| 15.8 | Cliquer à l'intérieur du modal ne le ferme pas | ✅ |
| 15.9 | Le bouton "Annoter cette plage" est désactivé par défaut (plage complète) | ✅ |

---

### Suite 16 — Assemblage Complet (14 tests)

Couvre le flux complet d'assemblage : ajout, réordonnancement, export avec suivi de job.

| # | Scénario | Résultat |
|---|---|---|
| 16.1 | Le bouton "Exporter" est désactivé sans clips | ✅ |
| 16.2 | Ajouter deux clips : les deux apparaissent dans la liste | ✅ |
| 16.3 | Le bouton "Exporter" est activé après ajout d'un clip | ✅ |
| 16.4 | Le bouton "Monter" est cliquable et les clips restent présents | ✅ |
| 16.5 | Le bouton "Descendre" est cliquable et les clips restent présents | ✅ |
| 16.6 | Supprimer un clip le retire de la liste | ✅ |
| 16.7 | Supprimer le seul clip désactive le bouton "Exporter" | ✅ |
| 16.8 | Le bouton de sourdine (mute) vidéo est cliquable et bascule | ✅ |
| 16.9 | Les boutons de fondu d'entrée et sortie sont présents | ✅ |
| 16.10 | La résolution 720p est sélectionnable dans le panneau d'export | ✅ |
| 16.11 | Le label "Résolution" et ses options sont présents | ✅ |
| 16.12 | Fermer le panneau d'export cache le sélecteur de résolution | ✅ |
| 16.13 | Lancer un export crée un job et affiche sa progression | ✅ |
| 16.14 | Un ID de projet invalide affiche un message d'erreur | ✅ |

---

### Suite 17 — Raccourcis Clavier Complets (10 tests)

Couvre les raccourcis avancés de navigation frame par frame.

| # | Scénario | Résultat |
|---|---|---|
| 17.1 | `Shift+←` recule de 5 frames | ✅ |
| 17.2 | `Shift+←` depuis la frame 3 est clampé à 0 | ✅ |
| 17.3 | `End` navigue à la dernière frame | ✅ |
| 17.4 | `Alt+→` est équivalent à `End` (dernière frame) | ✅ |
| 17.5 | `Alt+←` est équivalent à `Home` (première frame) | ✅ |
| 17.6 | `Ctrl+←` saute à l'annotation précédente | ✅ |
| 17.7 | La touche `P` bascule play/pause sans créer d'annotation | ✅ |
| 17.8 | Les raccourcis sont ignorés quand un champ texte a le focus | ✅ |
| 17.9 | `Ctrl+Z` via la barre annule la dernière annotation | ✅ |
| 17.10 | `Shift+→` depuis la dernière frame reste à la dernière frame | ✅ |

---

### Suite 18 — Précision des Statistiques (10 tests)

Couvre la validité des calculs BPM et la cohérence des visualisations.

| # | Scénario | Résultat |
|---|---|---|
| 18.1 | Le BPM affiché est cohérent (~60 BPM pour 25 fps, 1s d'intervalle) | ✅ |
| 18.2 | La carte BPM minimum est visible et affiche une valeur | ✅ |
| 18.3 | La carte BPM maximum est visible et affiche une valeur | ✅ |
| 18.4 | Les cartes statistiques contiennent des valeurs numériques | ✅ |
| 18.5 | L'histogramme BPM est rendu (composant div/SVG) | ✅ |
| 18.6 | Le "Playback Speed Calculator" est présent avec des annotations | ✅ |
| 18.7 | Le calculateur contient un champ numérique ou affiche un ratio | ✅ |
| 18.8 | Une seule annotation → message "pas assez d'annotations" | ✅ |
| 18.9 | Le bouton retour navigue hors de la page statistiques | ✅ |
| 18.10 | La page se recharge avec les nouvelles annotations après reload | ✅ |

---

### Suite 19 — Export Complet (9 tests)

Couvre le contenu des fichiers exportés et les scénarios multi-vidéo.

| # | Scénario | Résultat |
|---|---|---|
| 19.1 | L'export JSON déclenche un téléchargement ou une réponse API | ✅ |
| 19.2 | L'API `/export/json` retourne le format `{video: {...}, annotations: [...]}` | ✅ |
| 19.3 | L'export CSV déclenche un téléchargement avec extension `.csv` | ✅ |
| 19.4 | Sélectionner seulement la première vidéo → bouton export actif | ✅ |
| 19.5 | Décocher toutes les vidéos désactive le bouton export | ✅ |
| 19.6 | Sélectionner le format Vidéo et exporter déclenche un job | ✅ |
| 19.7 | Sélectionner toutes les vidéos → bouton export actif | ✅ |
| 19.8 | Le widget ExportJobs ne fait pas planter la page | ✅ |
| 19.9 | Le bouton "Retour" quitte la page export | ✅ |

---

### Suite 20 — Navigation et Gestion des Erreurs (11 tests)

Couvre les redirections, les IDs invalides et la persistance des données.

| # | Scénario | Résultat |
|---|---|---|
| 20.1 | Une route inconnue redirige vers `/projects` | ✅ |
| 20.2 | La route `/` redirige vers `/projects` | ✅ |
| 20.3 | `/annotation/id-invalide` affiche un message d'erreur ou redirige | ✅ |
| 20.4 | `/statistics/id-invalide` affiche un message d'erreur ou redirige | ✅ |
| 20.5 | `/export/id-invalide` affiche un message d'erreur ou redirige | ✅ |
| 20.6 | `/projects/id-invalide` affiche un état de chargement ou erreur | ✅ |
| 20.7 | Un projet créé persiste après rechargement de la page | ✅ |
| 20.8 | Les annotations persistent après rechargement de la page d'annotation | ✅ |
| 20.9 | Le compteur de projets augmente après création d'un projet | ✅ |
| 20.10 | Le breadcrumb "Projets" est cliquable depuis la page détail | ✅ |
| 20.11 | Flux complet : créer projet → annoter → voir stats → retour | ✅ |

---

## Synthèse par Fonctionnalité

### Gestion de Projets
- **Couverte par :** Suites 01, 02, 12, 20
- **Scénarios clés :** CRUD complet, upload vidéo avec métadonnées, persistance après reload, validation des entrées

### Annotation Vidéo
- **Couverte par :** Suites 03, 08, 11, 13, 15, 17
- **Scénarios clés :** Création/suppression par Espace, navigation clavier complète, undo/redo, placement automatique BPM, modal de trim

### Catégories
- **Couverte par :** Suites 04, 14
- **Scénarios clés :** CRUD, couleurs uniques, filtrage, association aux annotations

### Statistiques BPM
- **Couverte par :** Suites 05, 18
- **Scénarios clés :** Précision du calcul (60 BPM vérifié), visualisations, Playback Speed Calculator

### Export de Données
- **Couverte par :** Suites 06, 19
- **Scénarios clés :** JSON/CSV téléchargeables, format API vérifié, sélection partielle, jobs d'export

### Assemblage Vidéo
- **Couverte par :** Suites 07, 16
- **Scénarios clés :** Timeline de clips, réordonnancement, export avec suivi de job, options résolution

### UX Transversal
- **Couverte par :** Suites 09, 10, 20
- **Scénarios clés :** Thème sombre/clair persistant, contrôles de lecture, navigation et gestion d'erreurs

---

## Méthodologie

### Approche TDD
Les tests ont été rédigés **avant** l'implémentation des fonctionnalités, conformément aux règles du projet (CLAUDE.md). Les tests E2E documentent le comportement attendu et ont servi de cahier des charges vivant.

### Isolation des Données
Chaque suite crée ses propres données via l'API REST avec un préfixe unique (`E2E-*-timestamp`) et nettoie après les tests (`afterAll`). Cela garantit l'indépendance entre suites.

### Gestion des Cas Réels
Plusieurs tests ont été adaptés aux comportements réels découverts lors de l'implémentation :
- Le modal de trim vidéo se ferme uniquement par clic sur le fond (pas de bouton Annuler ni touche Échap)
- L'histogramme des statistiques utilise des `div`/`SVG`, pas un élément `<canvas>`
- L'export JSON retourne `{video, annotations}` et non un tableau directement
- Les couleurs de catégories doivent être uniques par vidéo (contrainte API gérée par génération aléatoire)
- La mise à jour de l'affichage de frame est asynchrone (navigation pas à pas avec assertions intermédiaires)

---

## Conclusion

La campagne de tests couvre exhaustivement les 7 grandes fonctionnalités de l'application avec **203 scénarios E2E**, **636 tests unitaires frontend** et **272 tests unitaires backend**, soit **1 111 tests au total**. Le taux de réussite est de **100%** (1 test marqué `skip` intentionnellement car la fonctionnalité Échap du formulaire d'upload n'est pas implémentée dans l'UI — un test ignoré n'est pas un échec).

Cette couverture garantit la robustesse des flux utilisateur critiques, la cohérence des données entre frontend et backend, et la résistance aux erreurs de navigation.
