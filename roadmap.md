# Foxes Darts — Tâches

## Phases finales en deux manches gagnantes
- [x] Compter les manches, alterner le premier joueur et préserver la reprise du match.
- [x] Valider et afficher les résultats 2–0 / 2–1 au tableau, y compris la saisie admin.
- [x] Tester les règles et le parcours complet.

## Compteur sans défilement sur téléphone
- [x] Adapter l’affichage en jeu à la hauteur disponible, en portrait et paysage.
- [x] Vérifier les touches, le troisième tir et la fin de partie sur plusieurs tailles d’écran.

## Reprise sur le même appareil
- [x] Mémoriser le code du tournoi et le revérifier au retour, y compris sans compte.
- [x] Sauvegarder et restaurer le match, les tirs et le passage de main ; protéger une sortie volontaire.
- [x] Tester le rechargement, la reprise et le refus d'un ancien code.

## Accès aux tournois sans compte
- [x] Autoriser la saisie du code, les matchs et leurs résultats sans connexion, avec contrôle serveur du code.
- [x] Préserver la mémorisation du code pour les membres et vérifier le parcours invité.

## Règles de partie des tournois
- [x] Réglages admin 301/501 et sortie double/simple, imposés aux matchs.
- [x] En poules : cinq tours par équipe à 50 ou moins puis sortie simple avec notification.
- [x] Tests des règles et vérification du parcours connecté.

- [x] Activer Lovable Cloud
- [x] Schéma : tournaments, photos, standings, highlights, user_roles, profiles, registrations, player_stats
- [x] Bucket storage privé "tournament-photos" + URLs signées
- [x] Design system Charbon & Braise (Archivo Black + Hind)
- [x] Pages publiques : accueil (grille héro), tournois, détail tournoi, galerie, classements
- [x] Auth email/mot de passe, page /auth
- [x] Espace admin : tournois (lien HelloAsso), photos, classements, actions, inscriptions, stats joueurs
- [x] Espace joueur : profil, inscriptions, statistiques
- [x] Vérification build + contrôle visuel

- [x] Nommer le premier admin : simon.ansel@outlook.com a le rôle admin (onglet Admin visible dans le menu)
- [x] Cartes tournois (accueil + /tournois) : bouton "S'inscrire" retiré quand un lien HelloAsso existe, bouton HelloAsso en orange ; titre cliquable vers la fiche du tournoi

- [x] Tournois solo/équipe, limite de places (blocage serveur), poules optionnelles, tableau généré par « Commencer le tournoi », mise à jour admin ou via Compteur ; tournoi test 16 doublettes / 4 poules
- [x] Fiche tournoi : affichage au choix « Toutes les poules / une poule », bouton « Poules | Tableau final » pour voir le tableau final seul, aperçu du tableau pendant les poules

## En attente (bloqué côté utilisateur)
- (rien pour le moment)

## Affichage des tournois
- [x] Afficher « Complet » au lieu de l’inscription quand la capacité est atteinte.
- [x] Accueil : carrousel prochains tournois / en cours / terminés ; onglet Tournois : trois sections successives.
- [x] Vérifier les règles et les deux pages.
- [x] Corriger l’erreur du carrousel et vérifier la navigation après rechargement.
- [x] Carte de tournoi entièrement cliquable vers sa fiche (accueil + Tournois), les boutons HelloAsso / inscription gardés au-dessus.

## Bouton « Recommencer la partie »
- [x] Retiré pendant les matchs de tournoi, conservé dans les parties libres du Compteur.
