# Évolution multi-organisations — état vérifié au 9 novembre 2026

## Architecture
React 19, TanStack Start, PostgreSQL/Lovable Cloud. Les comptes et profils restent universels. Les anciennes URL et le moteur de tournoi sont conservés. Les nouvelles pages réutilisent le tableau et les règles existantes.

## Routes ajoutées
- `/dashboard` : organisations du compte, participations, parties enregistrées, statistiques et notifications.
- `/create-organization` : création atomique du club, du propriétaire et des paramètres.
- `/dashboard/organizations/$slug` : tournois, collaborateurs, joueurs, statistiques locales et paramètres.
- `/invitation?token=…` : acceptation/refus avec compte correspondant à l’adresse invitée.
- `/o/$slug`, `/o/$slug/tournament/$id` : informations publiques et tableau.
- `/admin` : administration centrale ; gestion locale accessible depuis le tableau de bord.

## Données et permissions
Structures existantes conservées : organizations, organization_members, organization_settings, organization_invitations, organization_players, platform_roles, tournament_manager_assignments, organization_audit_events, notifications, profiles, tournaments, tournament_teams, tournament_matches, registrations, helloasso_registrations, games, player_stats, photos, standings, highlights.

Rôles : SUPER_ADMIN global, OWNER/ADMIN locaux, TOURNAMENT_MANAGER limité aux assignations, PLAYER universel. Les appartenances proviennent de la base authentifiée. Les droits ne sont jamais déduits du navigateur. Les fonctions SQL de gestion vérifient identité, rôle et état de l’organisation. Les invitations sont hashées, liées à l’adresse réelle, uniques et expirent après sept jours ; limite de vingt créations par heure et organisation. Création limitée à trois espaces par jour et compte.

Fonctions ajoutées : create_organization_space, create_organization_invitation, respond_organization_invitation, change_organization_collaborator, transfer_organization_ownership, save_organization_settings, set_organization_status, platform_counts, register_tournament_player, cancel_tournament_registration, commit_tournament_start, commit_tournament_result. Les commits de tableaux sont réservés au service serveur et revalident l’acteur dans la transaction.

Les politiques locales portent sur organization_id ou le tournoi parent. Le propriétaire et l’auto-retrait d’accès sont protégés. Les fichiers sont préfixés par organisation ; les anciens fichiers appartiennent à Foxes seulement. Les exports privés ne sont pas rendus publics.

## Vérifications réalisées
- Création réelle d’une organisation via le formulaire, puis de son tournoi.
- Tournoi étranger absent de la liste centrale et présent sur sa propre page.
- Second compte historique : refus de gestion de l’organisation étrangère, refus du tournoi et aucune lecture des paramètres/invitations privés ; droits Foxes conservés.
- Lancement atomique, second lancement refusé, résultat 2–1 enregistré, reprise du résultat invité refusée et lecture du résultat sur le tableau.
- Pages dashboard, gestion locale, collaborateurs et admin central sans erreur de navigateur.
- Tests unitaires existants : 106 succès, puis cinq tests supplémentaires de slug, expiration, réutilisation et couleurs.
- Organisation et tournoi temporaires supprimés après contrôle. Foxes : 39 matchs conservés, empreinte a16b1199f9fdaa15d23a602e219a5696 identique.

## Travail restant — ne pas présenter comme livré
La totalité du cahier des charges n’est pas encore terminée. L’ouverture publique de la création reste verrouillée par platform_release_flags jusqu’aux contrôles suivants :
- Parcours d’invitation complet avec plusieurs comptes, email réel, expiration, refus, renvoi et transfert.
- Sauvegarde atomique/idempotente des parties libres et compteurs de statistiques.
- Concurrence sur les derniers résultats de poules avec recalcul/retry, corrections avancées et propagation complète.
- Édition locale complète des tournois/images/HelloAsso, assignation des organisateurs, pagination de toutes les listes et statistiques agrégées non tronquées.
- Profil universel : nom/prénom/avatar, prochaines rencontres et historique de participation détaillé ; processus de vérification des doublons.
- Personnalisation publique : logo/couverture réellement rendus, couleurs appliquées via tokens et aperçu complet ; réseaux sociaux.
- Publication privée/publique explicite, protection des identifiants de capitaines dans les lectures publiques, limitation des essais de codes.
- Administration centrale complète des comptes et signalements, notifications de modification et nouvelles rencontres.
- Validation smartphone/tablette et contrôles de non-régression des anciennes fonctions admin déplacées.

Aucune fusion automatique, aucun compte réinitialisé. Le garde d’ouverture ne doit être levé qu’après traitement et validation de ces points.
