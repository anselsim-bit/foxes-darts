# Foxes Darts — Tâches

## Noms des doublettes — 12 novembre 2026
- [x] Prénoms seuls sans nom d’équipe ; initiales uniquement en cas d’homonyme, y compris dans la même doublette.
- [x] Séparer le champ HelloAsso combiné Nom/Prénom du partenaire ; corriger l’équipe existante « Gautier & Romain », sans toucher aux noms verrouillés.
- [x] Vérification publique réelle et 27 tests réussis, contrôles automatiques sans erreur.

## Synchronisation HelloAsso — 12 novembre 2026
- [x] Rétablir l’import manuel sur la page de gestion, limité au tournoi affiché.
- [x] Remplacer l’import horaire par deux imports à 8 h et 20 h, heure de Paris ; réglage quotidien UTC pour les changements d’heure, authentification de la tâche existante préservée.
- [x] Import réel connecté réussi (une inscription), affichage téléphone sans débordement, 27 tests réussis ; horaires actifs confirmés, aucun résultat historique modifié.

## Connexion et description — 12 novembre 2026
- [x] Afficher les erreurs de connexion en rouge et proposer l’envoi d’un lien de réinitialisation par e-mail ; envoi réel confirmé dans le journal des e-mails.
- [x] Agrandir la description et proposer une mise en forme avec émojis, conservée sur la page du tournoi ; tournoi temporaire créé, relu publiquement puis supprimé.
- [x] Vérifier les parcours et l’affichage sur téléphone ; neuf tests réussis et contrôles automatiques sans erreur. Le changement du mot de passe via le lien reçu n’a pas été exécuté pour préserver le compte existant.

## Inscriptions exclusivement HelloAsso — 12 novembre 2026
- [x] Bloquer les inscriptions membres et invités hors HelloAsso lorsqu’un lien existe ; ajout organisateur conservé, 14 tests réussis et refus connecté vérifié sans modifier les inscrits.

## Gestion dédiée d’un tournoi — 12 novembre 2026
- [x] Ajouter une page organisateur avec inscrits, paramètres, tableau et accès, en réutilisant les contrôles existants.
- [x] Vérifier le parcours connecté, les listes réelles, les onglets et l’affichage sur téléphone ; paramètres du tournoi terminé verrouillés, aucun résultat ni inscription modifié.

## Intégrations d’agents — 9 novembre 2026
- [x] Ajouter le serveur MCP protégé avec trois lectures personnelles, le consentement et le retour après connexion/confirmation du compte ; OAuth activé sur Lovable Cloud déjà présent.
- [x] Ajouter la lecture du tableau de bord dans le navigateur via WebMCP avec suivi sans données personnelles.
- [x] Vérifier les limites par compte (19 tests), refus anonyme HTTP 401, métadonnées HTTP 200, retour de connexion et erreur lisible ; catalogue extrait et contrôles automatiques réussis.
- [ ] Validation OAuth complète avec accord/refus et lecture réelle : aucun compte ne correspond à l’identité du demandeur pour la connexion de test ; nécessite une connexion dans l’aperçu. Le parcours externe nécessite aussi la republication.

## Évolution multi-organisations — cahier des charges du 9 novembre 2026
- [x] Phase 1 : audit technique, inventaire réel et proposition de migration, sans changer le site ni ses données ; rapport dans docs/audit-multi-organisations.md.
- [x] Phase 2, préparation : plan approuvé, contrôle du secret HelloAsso branché ; tests de reprise fiabilisés et 80/80 tests passent.
- [x] Phase 2, fondations : rattachement additif à Foxes, rôles initiaux et contraintes ; sauvegarde du 9 novembre 2026 à 00:28:16 UTC signalée et export confirmé. Empreintes historiques identiques, accès admin et refus d’élévation vérifiés, 88/88 tests.
- [ ] Phase 2, bascule : limiter tous les chemins admin/HelloAsso/Storage/listes publiques à leur organisation avant ouverture d’un deuxième espace ; création et réaffectation restent volontairement verrouillées dans la base.
  - [x] Étape demandée le 9 novembre : accès et corrections des tournois limités à l’organisation, politiques tournois/contenus basculées, listes historiques et import HelloAsso réservés à Foxes ; 98 tests passent, 16 équipes et 39 résultats inchangés, admin/inscrits/consolante vérifiés.
  - [ ] Ensuite : annuaire et droits locaux, fichiers, transactions complètes et isolation entre deux organisations avant déverrouillage.
    - [x] Étape du 9 novembre à 17h45 : deux membres historiques rattachés, annuaire et réinitialisations limités à Foxes, droits locaux transactionnels et journalisés, fichiers préfixés et contrôlés ; ajout/lecture/suppression d’une photo et refus étrangers vérifiés, 39 résultats et trois fichiers historiques conservés.
- [ ] Phases 3–7 : organisations, collaborateurs, espaces organisateurs, joueurs universels, pages publiques et administration centrale — phases suivantes, après la bascule sécurisée ; non ouvertes pendant cette étape.
- [ ] Phase 8 : validation isolation, sécurité, historique, anciennes URL et performances — attend les phases précédentes.

## Livraison complète du document — demande du 9 novembre à 18h01
- [ ] Terminer les opérations atomiques et les protections de lancement, inscriptions, résultats et statistiques.
- [ ] Création d’organisation, propriétaire, invitations et collaborateurs avec expiration, refus, renvoi et transfert protégé.
- [ ] Tableau de bord personnel, sélecteur et gestion locale avec tournois, joueurs, statistiques, personnalisation et paramètres.
- [ ] Profil universel complet, historique et notifications privées ; doublons soumis à vérification, jamais fusionnés automatiquement.
- [x] Pages publiques par organisation et tournoi ajoutées ; anciennes URL et accès QR conservés. Personnalisation publique complète reste dans la validation.
- [x] Administration centrale : listes paginées organisations/utilisateurs, suspension/réactivation et journal des actions ; gestion avancée des comptes reste à compléter.
- [ ] Tests avec deux organisations et plusieurs identités, parcours réels et documentation finale ; ouvrir uniquement après contrôle.

## Compteurs et formats par phase
- [x] Moyenne et meilleure volée sur tous les compteurs, retour tactile visible et passage anticipé.
- [x] Formats indépendants pour poules, phase finale et consolante.
- [x] Limite de 5 tours d'essais de double activable aussi pour la consolante (option dédiée, repli sur le réglage des poules).
- [x] Manches en direct sur le tableau, sans avancer le vainqueur avant validation ; vérifiées sur deux écrans dans un tournoi temporaire supprimé ensuite.
- [x] Harmoniser l'affichage des tableaux et vérifier sur ordinateur et téléphone ; 54 tests passent.

## Croisements des poules et consolante
- [x] Places directes en demi-finales aux meilleurs premiers (victoires, puis points restants), testées et appliquées au tournoi interne.
- [x] Corriger les croisements au premier tour et ajouter les tests.
- [x] Réparer le tableau du tournoi concerné sans perdre les résultats joués.
- [x] Rétablir et vérifier l'affichage de la consolante.

## Classement poules, consolante et petite finale
- [x] Points restants additionnés au perdant seul ; classement au moins de points.
- [x] Tableau de consolante pour les non qualifiés des poules, optionnel à la création du tournoi.
- [x] Petite finale pour la 3e place (perdants des demi-finales).
- [x] Tests des règles et vérification de l'affichage.

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

## Synchro HelloAsso et tournois complets
- [x] La mise à jour automatique à 8 h et 20 h (heure de Paris) ignore totalement un tournoi complet (aucun appel, aucune inscription rafraîchie).
- [x] Le bouton « Importer maintenant » rafraîchit quand même un tournoi complet, à la demande de l'admin.
- [x] Corriger l'initiale ajoutée à tort à tous les prénoms : une équipe compte une seule fois dans la détection d'homonymes.
- [x] Tester les deux cas et vérifier les noms sur les tournois réels.

## État de validation de la livraison complète
- [x] Création d’un espace et tournoi via les formulaires, isolation avec le second compte, lancement et résultat 2–1 vérifiés ; données temporaires retirées et empreinte des 39 matchs Foxes inchangée.
- [ ] Compléments détaillés dans docs/multi-organisations-livraison.md : invitation bout en bout, profil/avatar, édition locale complète, publication privée, statistiques atomiques, limites et personnalisation publique ; ouverture toujours verrouillée.

## Inscriptions distinctes — 11 novembre 2026
- [x] Deux pages joueur/organisateur, coordonnées complètes privées et conservation d’un compte unique pouvant jouer.
- [x] Validation et affichage téléphone vérifiés, 13 tests réussis ; coordonnées transmises sans permissions et reprises dans la création d’organisation. Confirmation vérifiée avec une réponse simulée, pas de compte ni d’e-mail réel créé pendant ce contrôle.
- [ ] Ouverture générale des nouveaux espaces organisateurs : dépend des vérifications multi-organisations encore ouvertes ci-dessus ; le verrou existant est conservé.

## Multi-organisations — suite du 11 novembre 2026
- [x] Visibilité publique/privée de chaque organisation (page publique masquée si privée).
- [x] Page publique : logo, couverture, couleur principale et liens réseaux sociaux (https uniquement).
- [x] Modification d'un tournoi non lancé depuis l'espace organisation ; rôles et statuts en français.
- [x] Liste d'autorisation de création d'organisation (compte test wayneless).
- [ ] Ouverture générale de la création : attend la validation par les tests de l'utilisateur.
- [ ] Restant : parties libres atomiques, concurrence fin de poules, profil universel complet, signalements, pagination complète.
- [x] Adresse simple /nom-organisation (ancienne /o/... redirigée), noms réservés protégés.
- [x] Accueil et Tournois : tous les tournois de toutes les organisations publiques, filtre par organisation.
- [x] Galerie et Classements retirés du menu (pages conservées pour plus tard).
- [x] Prénom et nom modifiables dans Mon espace.
- [x] Parties libres : enregistrement + statistiques en une seule opération, sans doublon en cas de double envoi.
- [x] Derniers résultats de poule simultanés : nouvel essai automatique, phases finales générées une seule fois.
- [x] Signalements (pages organisation/tournoi) et traitement dans l'administration centrale.
- [x] Photo de profil dans Mon espace.
- [ ] Ouverture générale de la création d'organisations : attend la décision de l'utilisateur.
