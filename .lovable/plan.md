# Foxes Darts — Audit et évolution multi-organisations

## Résultat de la phase 1

L'audit est documenté dans `docs/audit-multi-organisations.md`. Le site, les comptes et les données sont inchangés.

**À conserver :** identité Charbon & Braise, comptes universels existants, compteur, moteur des tournois, poules, finales, petite finale, consolante, QR codes, reprises appareil, HelloAsso, emails et anciennes adresses.

**Inventaire vérifié :** 2 comptes, 2 profils, 1 tournoi, 16 équipes, 39 rencontres, 16 inscriptions HelloAsso et 2 parties libres. Les premiers contrôles de rattachement n'ont trouvé aucune anomalie.

**Risques principaux :** droits admin globaux, accès serveur privilégiés, import HelloAsso global, données publiques à distinguer des données privées, références croisées non interdites par toutes les contraintes et opérations non atomiques.

**Point de sécurité à traiter en premier :** le déclencheur HelloAsso ne vérifie actuellement que la présence d'un en-tête, pas sa validité. Réutiliser la vérification sécurisée existante avant d'ouvrir les nouveaux espaces.

**Tests :** 75 tests présents ; le fichier de reprise passe seul, mais les exécutions complètes restent instables (73 ou 74 succès). Corriger et revérifier cette instabilité avant migration. L'isolation entre clubs n'est pas encore testée.

## Phase 2 — Architecture et préparation sécurisée

- Préparer une migration additive, sans supprimer ni renommer les structures existantes.
- Créer Foxes Darts comme première organisation et rattacher les données historiques sans changer leurs identifiants.
- Conserver les comptes et profils globaux ; compléter le profil existant avec prénom, nom et photo, sans créer un second système de profils.
- Simon (`simon.ansel@outlook.com`) sera le SUPER_ADMIN initial et le propriétaire de Foxes Darts, par une attribution administrative vérifiée. Les autres anciens admins deviendront admins de Foxes, sans être promus automatiquement administrateurs généraux.
- Définir la matrice des autorisations, les politiques de confidentialité, les transactions, les contraintes d'appartenance et la journalisation.
- Fermer les chemins d'administration globale avant de permettre la création d'autres organisations. Ne pas laisser les anciennes politiques globales coexister avec des politiques locales permissives.

**Condition avant application :** vérifier la sauvegarde disponible et réaliser un export de la base via More → Database → Manage → Settings → Export project data. Les fichiers Storage sont à sauvegarder séparément ; ils ne sont pas inclus dans l'export ni dans les sauvegardes quotidiennes. Aucun inventaire de sauvegarde n'a été vérifié à ce stade.

## Phase 3 — Organisations et collaborateurs

- Tout utilisateur connecté peut créer une organisation depuis `/create-organization` : coordonnées, type, responsable, logo et couleurs, slug unique.
- Création et attribution du propriétaire dans une même opération transactionnelle ; aucune attribution de droits par le navigateur.
- Invitations par email : jeton aléatoire stocké sous forme de hash, expiration, annulation, renvoi, refus et acceptation unique par le bon compte ; limitation des abus.
- Propriétaire : gestion complète et transfert sécurisé. Admin local : gestion autorisée sans transfert de propriété. Organisateur : tournois assignés ou créés par lui. Joueur : son compte et ses participations.
- Protéger le dernier propriétaire et interdire l'auto-élévation de droits. Les exceptions SUPER_ADMIN sont vérifiées et journalisées côté serveur.

## Phase 4 — Espaces de gestion

- `/dashboard` : organisations, tournois, prochaines rencontres, résultats, statistiques et notifications du compte connecté.
- `/dashboard/organizations/$slug` : vue d'ensemble, tournois, joueurs, collaborateurs, statistiques, personnalisation et paramètres.
- Sélecteur d'organisation ; distinction claire entre espace joueur et gestion. Les caches, listes paginées et abonnements changent avec l'organisation active.
- Réutiliser les formulaires, cartes, tableaux et compteur existants ; ne pas dupliquer le moteur des tournois.
- Import HelloAsso limité à l'organisation autorisée. La connexion actuelle reste réservée à Foxes ; les autres connexions doivent être autorisées individuellement, avec secrets côté serveur.

## Phase 5 — Joueurs universels

- Un compte et un profil global conservés ; inscriptions, catégories, équipes et éventuelle adhésion propres à chaque organisation.
- Garder `player_stats` pour les statistiques globales existantes ; les statistiques par club sont calculées à partir des participations attribuées, sans inventer une attribution des anciennes parties libres.
- Les invités par code restent invités : ne pas les associer automatiquement à un membre sur simple ressemblance de nom ou email HelloAsso.
- Historique partagé et privé accessible au joueur ; annuaire local limité aux informations nécessaires pour l'organisation.
- Fusion de doublons uniquement après vérification et validation, avec journalisation et préservation de l'historique.
- Aller à `/dashboard` après une connexion sans destination explicite ; conserver le retour à la page d'origine lorsqu'une destination valide existe.

## Phase 6 — Pages publiques

- `/o/$slug` : identité, informations publiques, tournois et classements publiés de l'organisation.
- `/o/$slug/tournament/$id` : détail et tableau existants réutilisés ; vérifier que le tournoi appartient au slug demandé.
- Maintenir les liens historiques `/tournois/$id` et `/tournois/$id/jouer`, notamment les QR codes et emails existants.
- L'accueil et les anciennes listes restent celles de Foxes ; les nouvelles organisations ne s'y mélangent pas implicitement.
- Métadonnées propres à chaque page, mise en page téléphone et aperçu de personnalisation limité à l'organisation.

## Phase 7 — Administration centrale

- Adapter `/admin`, déjà existant, à la gestion générale avec accès SUPER_ADMIN ; déplacer la gestion locale vers l'espace Foxes en conservant un accès compatible pour les admins historiques.
- Organisations, recherche utilisateurs, suspension/réactivation, statistiques globales et événements de sécurité ; aucun mécanisme d'usurpation de connexion.
- Suspension : bloquer les opérations de gestion et de jeu par code, conserver historique et résultats publics déjà publiés ; réactivation sans perte de données.
- Notifications privées par destinataire et emails utiles ; ne jamais envoyer de données d'un autre club.

## Détails techniques de la migration proposée

**Nouvelles structures justifiées :** `organizations`, `organization_members`, `organization_invitations`, `organization_settings`, assignations des organisateurs aux tournois, liens joueurs/organisations, notifications privées et journal d'audit. Les champs de profil complètent `profiles` ; aucun doublon `matches`, `scores` ou `player_profiles`.

**Rôles :** SUPER_ADMIN dans une table de rôles plateforme séparée ; OWNER/ADMIN/MANAGER dans les appartenances aux organisations. PLAYER découle du compte et de ses participations, jamais d'un champ de rôle modifiable dans le profil. Matrice de permissions centralisée et évolutive, contrôlée serveur et SQL.

**Rattachement :** ajouter `organization_id` aux tournois, photos, classements et grandes actions ; aux lignes liées aux tournois, ajouter ou garantir une relation organisationnelle fiable par FK composites/validations. Les références adversaire/vainqueur doivent rester dans le même tournoi. `created_by` reste nullable pour un historique dont l'auteur est inconnu.

**Intégrité :** UNIQUE organisation/utilisateur, slug unique, index organisation/utilisateur/tournoi et pagination. Ajouter les champs facultatifs d'abord, backfill Foxes puis validation ; ne renforcer la nullabilité que lorsque toutes les lignes et tous les chemins d'écriture sont compatibles.

**Isolation :** politiques RLS et GRANT explicites, vérification des identités réelles, interdiction de déplacer arbitrairement une ligne vers un autre club. Politiques publiques limitées aux colonnes et états publiés ; lectures privées du propriétaire conservées. Le client de service est réservé aux opérations réellement privilégiées après autorisation.

**Storage/Realtime :** préfixes d'organisation pour nouveaux fichiers, compatibilité des anciens objets Foxes, contrôle de la signature des médias, politiques Storage et abonnements autorisés. Aucun secret ou code privé diffusé en temps réel.

**Transactions :** création organisation/propriétaire, invitations, inscription, sauvegarde de score/progression et statistiques. Déduplication des résultats et invitations ; un code invité ne confère aucun droit admin ni droit de correction d'un résultat terminé.

## Phase 8 — Validation et bascule

- Tester deux organisations et plusieurs identités réelles : propriétaire A/B, admin local, organisateur assigné/non assigné, joueur commun, invité et administrateur général.
- Vérifier directement les refus SQL/API, les références croisées, les invitations, les fichiers et le temps réel, pas seulement l'interface.
- Revérifier connexion, récupération de mot de passe, inscriptions, compteurs, reprise/QR, imports, résultats, corrections et tableaux historiques.
- Comparer comptes, identifiants, nombres d'enregistrements et résultats avant/après ; ouverture à une deuxième organisation pilote seulement après ces contrôles.
- Documenter les tables, politiques, fonctions, pages, permissions, résultats des tests et limites restantes à chaque phase.

**Retour arrière :** privilégier le retrait d'accès aux nouveaux espaces et une correction additive. Après modification des politiques, un simple retour de code peut être incompatible. Une restauration quotidienne remet schéma et données à la date choisie, perd les écritures suivantes et nécessite de réaligner le code ; ce n'est pas une restauration partielle ou sans risque.

L'approbation autorise la phase 2, pas une livraison de toutes les phases en une seule opération ; aucun changement de données ne précède la vérification de sauvegarde.