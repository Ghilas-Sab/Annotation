 Projet : AnnotaRythm
Version : 1.1
Date : Avril 2026
Statut : Retours client après démonstration V1

Page Gestion de Projets
Refonte du layout de la page détail projet
Le layout actuel n'est pas adapté. La dropzone d'import et la liste des vidéos doivent être réorganisées : dropzone sur le côté gauche, liste des vidéos sur le côté droit, afin de gagner de l'espace et d'améliorer la lisibilité.
Renommage de la vidéo à l'import
Lors de l'import d'une vidéo, l'utilisateur doit pouvoir modifier le nom de la vidéo avant de valider l'upload.
Correction bug compteur annotations
Sous chaque vidéo dans un projet, le compteur affiche toujours "0 annotations" même après annotation. Ce bug doit être corrigé. De plus, gérer le singulier et pluriel correctement : "0 annotation", "1 annotation", "2 annotations".
Affichage BPM conditionnel
Si une vidéo a été annotée, afficher son BPM calculé dans la carte. Si elle n'a pas encore été annotée, ne rien afficher.

Page Annotation
Raccourcis clavier transformés en boutons
Tous les raccourcis clavier doivent avoir un bouton équivalent visible dans l'interface, afin que les utilisateurs sur tablette puissent annoter sans clavier physique.
Correction Ctrl+flèche
Le raccourci Ctrl+flèche (saut intelligent inter-annotation) ne fonctionne pas de manière fiable. Le corriger.
Nouveau raccourci Alt+flèche
Ajouter Alt+flèche gauche pour aller au début de la vidéo et Alt+flèche droite pour aller à la fin de la vidéo.
Système de catégories d'annotations
Avant de commencer l'annotation, l'utilisateur crée des catégories — chacune a un nom et une couleur. Chaque annotation créée doit appartenir à une catégorie. La barre de la timeline représentant l'annotation prend la couleur de sa catégorie. Le même système s'applique aux annotations automatiques (bulk placement) — on leur assigne un nom et une couleur au moment de la création.
Fix vidéo plein espace
La vidéo ne prend pas tout l'espace disponible — il y a une zone noire importante autour. Corriger pour que la vidéo occupe tout l'espace du lecteur.
Formulaire de sélection de plage avec aperçu vidéo
Quand l'utilisateur passe de la page projets à la page annotation, un formulaire lui permet de choisir d'annoter toute la vidéo ou une plage spécifique. Ce formulaire doit intégrer un aperçu visuel de la vidéo pour que l'utilisateur puisse choisir sa plage avec précision.

Exportation
Export par projet complet
L'export ne se fait plus vidéo par vidéo mais par projet entier. L'utilisateur peut choisir d'exporter tout le projet ou une sélection.
Contenu de l'export
Chaque export de projet contient : les annotations (JSON/CSV), les statistiques, et la vidéo adaptée au BPM cible.
Adaptation BPM intelligente à l'export
L'export vidéo ne doit pas simplement accélérer ou ralentir toute la vidéo de manière uniforme. L'algorithme doit analyser les intervalles entre annotations et ajuster localement la vitesse de chaque segment pour que les annotations tombent exactement à un rythme régulier correspondant au BPM cible. Certains segments seront accélérés, d'autres ralentis, selon l'écart entre le BPM local et le BPM cible.
Prévisualisation avant export
Avant d'exporter, l'utilisateur peut prévisualiser la vidéo adaptée au BPM cible directement dans l'interface, sans télécharger. Il peut ensuite sauvegarder cette version si elle lui convient.
