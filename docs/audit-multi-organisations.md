# Foxes Darts — Audit préalable multi-organisations

Date : 9 novembre 2026. Phase 1 uniquement. Aucun changement du code applicatif, du schéma, des comptes ou des données.

## 1. Conclusion

L'application est mono-organisation. Le moteur de fléchettes et de tournois peut être conservé. L'évolution exige une nouvelle frontière d'autorisation dans la base, les fonctions serveur, les fichiers et les intégrations : un sélecteur d'organisation seul ne suffit pas.

Le compte demandé pour SUPER_ADMIN et propriétaire de Foxes Darts est celui de Simon, vérifié comme existant et confirmé. Aucun droit n'a été attribué pendant l'audit.

## 2. Architecture observée

- React 19, TypeScript, TanStack Start v1 et TanStack Router ; Vite déclaré en version 8 dans le manifeste actuel.
- React Query pour les lectures et caches ; Tailwind v4, composants UI existants, Archivo Black/Hind, Charbon & Braise.
- `src/routes/` : pages et handlers HTTP ; `src/components/` : compteur, tableaux, cartes, navigation ; `src/lib/` : règles, tableaux, fonctions serveur, HelloAsso et emails.
- Lovable Cloud : authentification, PostgreSQL, Storage et Realtime. Migrations SQL versionnées sous `drizzle/migrations/` (0000 à 0022).
- Les server functions authentifiées utilisent le Bearer de `src/start.ts` et `requireSupabaseAuth`. Les actions admin vérifient `has_role` côté serveur. Le groupe `_authenticated` protège la navigation sans SSR.
- Le client de service contourne les politiques RLS : ses chemins doivent donc vérifier leurs autorisations explicitement.
- Aucun moteur de tournoi externe à remplacer ; les règles et algorithmes partagés sont dans `dart-rules.ts` et `bracket.ts`.

## 3. Routes à préserver

| Public | Privé |
|---|---|
| `/`, `/tournois`, `/tournois/$id` | `/mon-espace`, `/admin` |
| `/tournois/$id/jouer`, `/compteur` | Groupe technique `_authenticated` |
| `/galerie`, `/classements`, `/auth`, `/reset-password` | |

Handlers : `/api/public/hooks/helloasso-sync`, webhook et previews d'emails sous `/lovable/email/`. Ils doivent conserver leur authentification propre.

Les pages de contenu possèdent des métadonnées spécifiques, y compris l'accueil. Les nouvelles pages publiques devront faire de même. `/admin` est déjà occupé par l'administration historique : la transition doit éviter un doublon et fournir un accès explicite à la gestion Foxes pour les anciens administrateurs.

## 4. Fonctionnalités à conserver

- Comptes, confirmation du mot de passe, modification du nom/mot de passe et réinitialisation par email.
- Compteur libre, invités/membres, confirmation serveur des autres membres par mot de passe et jeton HMAC, statistiques, choix et alternance des premiers joueurs.
- Trois tirs visibles, passage après 0–3 fléchettes, retour tactile, moyenne et meilleure volée, affichage téléphone, reprise locale.
- Tournois solo/équipe, capacité, inscriptions, imports HelloAsso, horaires et lieu, modification des participants et noms par admin.
- Poules, classement aux points restants du perdant, croisements de poules et exemptions des meilleurs premiers.
- Finales, petite finale et consolante facultative générées automatiquement ; deux manches gagnantes hors poules ; formats propres à chaque phase.
- Accès invité par code/QR sans compte, changement de code invalidant les accès mémorisés, reprise des matchs et retour au tableau après résultat.
- Manches provisoires et résultats en direct, corrections admin, galerie, classements, grandes actions et catégories/carrousels de tournois.

## 5. Inventaire réel des données

Comptages en lecture seule dans la base connectée à ce projet, au moment de l'audit ; ils ne constituent pas une sauvegarde et peuvent évoluer.

| Structure | Lignes | Rôle / relation |
|---|---:|---|
| Comptes Auth | 2 | Identités universelles existantes |
| `profiles` | 2 | PK = identifiant Auth ; nom et préférences |
| `user_roles` | 2 | Rôles globaux admin/user, séparés des profils |
| `tournaments` | 1 | Compétition et formats par phase |
| `tournament_teams` | 16 | FK tournoi, capitaine éventuel, billet HelloAsso |
| `tournament_matches` | 39 | FK tournoi/équipes/vainqueur ; points et manches |
| `registrations` | 0 | FK tournoi/profil, unique tournoi/utilisateur |
| `helloasso_registrations` | 16 | FK tournoi ; email et champs privés |
| `games` | 2 | Parties libres, joueurs JSON, tournoi facultatif |
| `player_stats` | 2 | FK profil, unique utilisateur |
| `standings` | 0 | Classement public par saison |
| `photos` | 0 | Média, tournoi facultatif |
| `highlights` | 0 | Grandes actions |
| `tournament_settings_codes` | 1 | Code courant, PK tournoi |
| `tournament_code_claims` | 0 | Code mémorisé, PK tournoi/utilisateur |
| `tournament_access_codes` | 2 | Ancien mécanisme, déprécié, à conserver |

Les contrôles lus ne trouvent aucun profil orphelin, compte sans profil, équipe sans tournoi ou adversaire/vainqueur appartenant à un autre tournoi. Ces contrôles ne remplacent pas un audit complet de toutes les relations et objets Storage.

Ne pas créer de doublons `matches`, `scores`, `tournament_players` ou `player_profiles` : les structures équivalentes existent déjà.

## 6. Permissions et données publiques

Toutes les 15 tables applicatives ont RLS activée. Les privilèges effectifs de tables sont larges, y compris SELECT pour anon ; les politiques constituent donc la restriction effective. Une lecture de `information_schema.role_table_grants` était vide : les privilèges ont été revérifiés avec `has_table_privilege`, et non présumés absents.

- Tournois, équipes, matchs, galerie, classements, grandes actions et `player_stats` : lectures publiques aujourd'hui.
- Profils : soi-même ou admin ; écriture de son propre profil.
- Inscriptions : utilisateur concerné ou admin ; inscription de soi-même.
- Équipes : insertion/suppression capitaine ou admin ; modification admin.
- HelloAsso et games : lecture admin ; certaines écritures passent uniquement par le service serveur.
- Rôles : lecture de ses propres rôles, aucune écriture client autorisée.
- Codes courants et claims : aucune politique client ; service uniquement.
- Le rôle `admin` actuel est global, pas limité à Foxes : conserver ses politiques lors de l'ouverture de plusieurs organisations donnerait des droits trop larges.

Fonctions SQL observées : `has_role`, `handle_new_user`, `enforce_team_capacity`, toutes SECURITY DEFINER avec search_path fixé. Le trigger de capacité verrouille le tournoi avec `FOR UPDATE` avant comptage ; conserver cette protection et ajouter des tests concurrents.

## 7. Risques prioritaires

1. **Hook HelloAsso insuffisamment authentifié dans le code** : `src/routes/api/public/hooks/helloasso-sync.ts:9-10` accepte toute valeur Authorization non vide. `authenticateCronRequest` existe mais n'est pas appelé. Une éventuelle protection extérieure n'a pas été vérifiée. Corriger et tester avant ouverture multi-organisations, sans lancer de synchronisation de test sur les données historiques.
2. **Accès administrateur global** : `admin.functions.ts:12-18`, les politiques et la gestion des membres/emails couvrent toute la plateforme. Les emails d'autres clubs ne doivent pas apparaître à un admin local.
3. **Service serveur** : imports, signature des médias, résultats invités et statistiques contournent RLS. Vérifier organisation, tournoi, équipes et permissions dans chaque chemin.
4. **Cohérence des références** : les FK des matchs valident l'existence d'une équipe, pas son appartenance au même tournoi. Ajouter des contraintes composites et valider les données existantes avant application.
5. **Statistiques** : `player_stats` est global par utilisateur ; ne pas le transformer silencieusement en statistiques de club. Les manches invitées ne prouvent pas une identité membre et ne doivent pas alimenter ses statistiques sans validation.
6. **HelloAsso** : secrets globaux, bouton d'import global, unicités sur `item_id` seul. Vérifier le contrat fournisseur avant tout changement d'unicité ; réserver la connexion actuelle à Foxes, sans la partager implicitement avec d'autres clubs.
7. **Concurrence** : inscription équipe puis inscription, enregistrement partie puis statistiques, progression finale en plusieurs écritures. Prévoir transactions et idempotence ; les codes invités ne doivent pas permettre de réécrire arbitrairement un match déjà terminé.
8. **Caches et navigation** : ajouter l'organisation aux clés des listes/droits ; réinitialiser les écrans et abonnements lors du changement d'organisation.
9. **Vie privée** : statistiques actuellement publiques, équipes publiquement lisibles avec colonnes techniques. Préserver l'affichage public utile, séparer données publiques et privées et exposer uniquement les champs nécessaires.

## 8. Fichiers, intégrations et exploitation

- Bucket privé `tournament-photos`, limite 10 Mo. Politiques Storage fondées sur admin global ; chemins historiques non segmentés par organisation. URLs signées par le serveur pour affichage public.
- Realtime publie `tournaments`, `tournament_teams`, `tournament_matches`. Le tableau nettoie les abonnements et filtre par tournoi ; ce filtre n'est pas une permission.
- HelloAsso : OAuth serveur et import ; tâche `helloasso-sync-hourly` active, `0 * * * *`. La destination détaillée n'est pas fournie par l'inventaire de planning consulté.
- Emails Auth et transactionnels via SDK Lovable ; modèles français existants. Conserver l'identité plateforme pour l'authentification, et limiter le branding organisationnel aux messages concernés.
- Réglages hébergés d'inscription/connexion, délivrabilité actuelle et inventaire des sauvegardes : non vérifiés dans cet audit. Ne pas les déduire du code.

## 9. Tests et limites observées

- Dernier signal de compilation disponible : `build OK` du 9 novembre 2026 à 14:24:58 UTC.
- 9 fichiers, 75 tests : règles, bracket, accès tournoi simulé, HelloAsso simulé, compteur, reprise appareil, présentation et route d'accueil.
- Exécution standard globale : 73 passent, 2 échouent (timeout et brouillon encore présent).
- Exécution du fichier `tournament-play.test.tsx` seul : 6/6 passent, mais avertissements du routeur et navigation jsdom non implémentée.
- Nouvelle exécution séquentielle : 74/75, timeout de la finale. Avec délai porté à 15 s uniquement en commande : 74/75, attente de suppression du brouillon en échec. La suite n'est donc pas un feu vert fiable ; diagnostiquer l'instabilité avant migration.
- Aucun test d'isolation réel à deux organisations, RLS/Storage/Realtime, de transaction concurrente ou de parcours d'invitation n'existe encore.
- Aucun score réel n'a été envoyé et aucune connexion/invitation créée pendant cet audit ; les parcours authentifiés et l'intégration fournisseur restent à vérifier lors des phases de validation.

## 10. Proposition de migration

Voir le plan présenté pour les phases suivantes : création additive des organisations et permissions, rattachement des données à Foxes sans changement des identifiants, puis adaptation des écrans et ouverture pilote.

Conditions de passage : validation du plan ; export et sauvegarde vérifiés par l'utilisateur ; stabilité des tests ; contrôles d'isolation et absence de perte d'historique. L'audit n'autorise ni suppression, ni réinitialisation, ni attribution immédiate de rôles.

## 11. Préparation après approbation du plan

Le contrôle `authenticateCronRequest` est désormais appelé avant l'import horaire. Cinq tests vérifient les secrets courant/précédent et le refus d'un jeton arbitraire, d'identifiants absents et d'une configuration absente.

Les tests de reprise utilisent désormais une navigation simulée explicitement, attendent la suppression du brouillon et accordent au scénario complet de trois manches un délai réaliste. Exécution standard après correction : **80/80 tests, 10/10 fichiers**. Cela ne constitue pas encore un test d'isolation réel.

Fichiers applicatifs modifiés : uniquement `src/routes/api/public/hooks/helloasso-sync.ts`. Tests : `src/lib/cron-auth.test.ts`, `src/components/tournament-play.test.tsx`. Documentation et suivi : ce rapport, `AGENTS.md`, `roadmap.md`.

Aucune table, politique de données, compte, droit ou donnée historique n'a été modifié. L'application de la migration reste bloquée par la vérification de la sauvegarde et de l'export demandée dans le plan approuvé.

## 12. Phase 2 — Fondations appliquées le 9 novembre 2026

L'utilisateur a confirmé l'export puis indiqué la sauvegarde du **9 novembre 2026 à 00:28:16 UTC**. Cette date est déclarée par l'utilisateur, pas issue d'un inventaire consulté par l'agent. Aucun fichier Storage n'a été copié ou vérifié comme sauvegardé ; cette étape ne modifie pas les fichiers.

- Migrations 0023–0025 : organisations, rôles plateforme, collaborateurs, paramètres, invitations privées à hash, assignations de managers, liens joueurs, notifications privées et journal d'audit. RLS activée, droits de lecture explicites ; aucun droit client d'écriture, aucune lecture client des invitations et de leurs hashes.
- Foxes Darts créée comme organisation centrale. Simon, compte confirmé et vérifié par identifiant/email, est SUPER_ADMIN et ORGANIZATION_OWNER ; l'autre admin historique est ORGANIZATION_ADMIN de Foxes, pas SUPER_ADMIN. Les rôles historiques restent compatibles avec le site existant.
- Rattachement des tournois, photos, classements et actions à Foxes ; identifiants inchangés. Champs de profil facultatifs ajoutés, sans inventer prénom, nom ou photo. Les parties libres et les statistiques globales ne sont pas attribuées artificiellement à une organisation.
- Références composites : adversaires/vainqueur appartiennent au même tournoi ; une photo liée à un tournoi appartient à la même organisation. Les références différées préservent les suppressions historiques qui remettent les références d'équipe à NULL.
- La création d'autres organisations et le changement d'organisation des contenus sont bloqués par des triggers, même via le service, jusqu'à la bascule des chemins historiques. Les anciennes politiques et fonctions admin restent globales : **l'isolation multi-organisations complète n'est pas encore livrée** et aucune deuxième organisation ne peut être ouverte à ce stade.
- Matrice testée : propriétaire, admin local, manager assigné/non assigné, joueur, administrateur général et organisation suspendue. Les checks SQL de gestion refusent les organisations inconnues/suspendues.
- Correction de compatibilité nécessaire : lecture galerie qualifiée par la FK historique, car la FK composite crée une seconde relation vers les tournois.

**Préservation vérifiée :** avant/après, mêmes nombres et empreintes MD5 de tous les anciens champs pour 1 tournoi, 16 équipes, 39 matchs, 16 inscriptions HelloAsso, 2 profils et 2 parties libres. Empreintes : tournois `f037b421460b082f4047018fc8d340ee`, équipes `d980f16610c4d465273c7226c6c23d36`, matchs `eb81b0574a8b1a7e1dd27fd6400af8de`, HelloAsso `fda1122a127d6f7cface1800f46eb84b`, profils `241ce713bd2ccaafb30c69f61c22ea75`, parties `3c25a97eeb0bad6a7f2f35ea3646b643`.

**Vérifications :** 88/88 tests, 11 fichiers ; dernier build OK après correction. Navigateur connecté avec le compte de Simon : administration accessible, rôle plateforme lu, gestion Foxes autorisée, organisation inconnue refusée, insertion de rôle et lecture des invitations refusées. Tournoi historique, poules, tableau final, consolante et galerie ouverts sans erreur runtime. Aucun score, email ou inscription réelle modifié pour les tests.

**Suite non ouverte :** basculer tous les contrôles historiques (fonctions serveur, RLS, profils/emails, listes publiques, HelloAsso, Storage, Realtime), transactions et droits de correction avant de retirer les verrous ; puis phases 3–8 avec deux organisations et plusieurs identités. Invitations, notifications, création et tableaux de gestion multi-organisations sont des fondations de données uniquement, pas des fonctionnalités utilisables à ce stade.