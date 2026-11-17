# Audit cybersécurité Foxes Darts — 17 novembre 2026

## État de la validation

**Rapport initial, non certification de sécurité.** Analyse approfondie automatique encore en cours. Aucun code applicatif, droit, secret ou donnée métier n’a été modifié. Aucune publication effectuée. Les contrôles décrits portent sur le code disponible et la base accessible aux outils ; leur parité avec le déploiement public reste à vérifier.

Le contrôle rapide ne signale aucun problème, mais le linter et les vérifications ciblées relèvent des problèmes que ce contrôle ne couvre pas. La protection RLS de toutes les tables ne protège pas contre une fonction privilégiée mal exposée.

## Cartographie des accès

| Entrée | Identité / droits | Flux |
|---|---|---|
| Accueil, tournois, pages organisation | Anonyme, visibilité publique | Client public → RLS → contenus, équipes et résultats publics |
| Profil, inscriptions, tableau de bord | Session vérifiée | Client utilisateur → RLS → données personnelles autorisées |
| Gestion tournoi / organisation | Session + permission sur la ressource | Vérification de gestion → RLS ou opération privilégiée transactionnelle |
| Compteur libre | Session ; confirmation par mot de passe pour un autre membre | Jeton HMAC → enregistrement atomique et statistiques |
| Jeu tournoi invité | Code courant + tournoi commencé + organisation active | Vérification serveur → résultat / manches provisoires |
| HelloAsso manuel | Gestionnaire Foxes, tournoi rattaché à Foxes | API HelloAsso fixe → import privé |
| HelloAsso automatique / rappels | Secret de tâche vérifié | Tâche authentifiée → intégration / envoi |
| MCP | Jeton OAuth associé à un client et utilisateur | Lectures limitées au demandeur et RLS |
| Fichiers | Deux espaces privés ; chemins utilisateur / organisation | Politiques de stockage, signature temporaire pour médias autorisés |

## Risques identifiés et corrections proposées

### A-01 — Critique : droits d’exécution des fonctions de validation de tournoi

**NON CONFORME dans la base inspectée.** Les requêtes `has_function_privilege` retournent `true` pour `anon` et `authenticated` sur `commit_tournament_start` et les deux signatures de `commit_tournament_result`. Leurs définitions sont `SECURITY DEFINER` et décident des droits du gestionnaire à partir du paramètre `_actor`, sans le lier à `auth.uid()`.

Une invocation directe avec l’identité d’un gestionnaire pourrait contourner les vérifications de l’application et altérer les tableaux. Aucun appel de mutation n’a été tenté : l’exploit n’a pas été exécuté sur les données réelles. La disponibilité HTTP et la parité de ces droits avec la production doivent être confirmées avant d’attribuer le même diagnostic au site publié.

Preuves : définitions et privilèges lus le 17 novembre ; `src/lib/tournament.functions.ts:52–74, 161–196`. Les migrations `0034_atomic_match_commit_and_progression.sql` et `0041_leg_winners_per_match.sql` prévoient des restrictions d’exécution, mais les privilèges effectifs observés sont plus larges.

**Proposition prioritaire :** migration additive retirant explicitement EXECUTE à PUBLIC, anon et authenticated sur les trois signatures, conservant service_role. Ne pas modifier les fonctions de permissions nécessaires aux politiques RLS. Vérifier ensuite les privilèges effectifs et le refus d’appel direct anonyme/utilisateur, puis les parcours organisateur et invité via les fonctions serveur. Rechercher le mécanisme à l’origine de la différence entre migration et droits effectifs.

### A-02 — Moyen : recherche mondiale de comptes

**NON CONFORME.** `findMemberForGame` permet à tout compte connecté de rechercher un email ou nom dans l’ensemble des comptes grâce au client privilégié ; les réponses différencient compte absent, ambigu et trouvé. Aucun mot de passe de la cible n’est requis pour cette recherche. Un email absent peut provoquer jusqu’à 20 pages de 1 000 utilisateurs lues.

Preuves : `src/lib/darts.functions.ts:35–67`. Le mot de passe reste requis pour faire jouer un autre membre et enregistrer ses statistiques : ce contrôle ne supprime pas l’énumération lors de la recherche.

**Proposition :** annuaire limité à une affiliation autorisée ou invitation consentie, sans recherche administrative globale interactive ; limitation persistante des appels et réponses minimales. Préserver la confirmation d’identité avant les statistiques.

### A-03 — Moyen : codes courts sans limitation applicative des essais

**NON CONFORME pour la limitation applicative ; NON VÉRIFIÉ pour une éventuelle protection de l’hébergement.** Code de quatre caractères accepté, vérification anonyme explicite, aucun limiteur applicatif trouvé. Un code deviné permet d’envoyer des résultats de matchs inachevés du tournoi.

Preuves : `src/lib/tournament.functions.ts:124–130, 149–170, 423–449, 490–502`.

**Proposition :** limitation persistante par tournoi et source sur tous les consommateurs du code, codes plus robustes et accès temporaire limité au tournoi après validation. Ne pas se limiter au formulaire de saisie ; préserver QR, reprise et invalidation après changement du code.

### A-04 — Élevé selon les avis : dépendances vulnérables

**NON CONFORME pour les versions signalées ; exploitabilité de chaque chemin NON VÉRIFIÉE.** Analyse du lockfile : 63 dépendances de production vérifiées, 13 occurrences d’avis, souvent liées aux mêmes dépendances transitives. Avis élevés sur Zod (épuisement mémoire), js-yaml (consommation CPU), source-map-js (déni de service) ; avis modérés sur Seroval (injection).

Paquets concernés : Zod direct, MCP, TanStack Start/Router/plugin et intégration Tailwind. Versions corrigées données par le scanner : Zod 4.6.6, js-yaml 4.3.2, source-map-js 1.2.2 et Seroval 1.6.11. Ce ne sont pas des changements aveugles à appliquer : le passage de Zod 3 à 4 nécessite une vérification de compatibilité et des tests.

**Proposition :** mises à jour compatibles des dépendances parentes, contrôle des versions transitives réellement résolues, tests de non-régression et nouvelle analyse. Évaluer séparément les outils de compilation et les bibliothèques atteignables par une entrée réseau.

### A-05 — Moyen : filtrage des fichiers insuffisant au niveau du stockage

**NON CONFORME pour le filtrage MIME du stockage.** Les deux espaces sont privés. `tournament-photos` a une limite de 10 Mo mais aucun type MIME autorisé configuré. L’espace de sauvegarde n’a ni limite de taille ni restriction MIME configurée ; sa fonction n’est pas celle d’un formulaire public.

Les contrôles d’interface ne suffisent pas à empêcher un appel direct autorisé avec un autre type de fichier. Aucun fichier n’a été envoyé pendant cet audit.

**Proposition :** définir les types autorisés selon les médias réellement acceptés, contrôler type réel et taille côté serveur, conserver les chemins et droits existants ; traiter la sauvegarde séparément pour ne pas bloquer les exports.

## Résultats vérifiés

| Contrôle | Statut | Preuve / limite |
|---|---|---|
| RLS activée sur toutes les tables publiques | CONFORME | 29/29 tables, lecture pg_tables |
| Absence de politiques sur codes internes / exceptions | CONFORME pour verrouillage client | Trois tables RLS sans politiques ; ne pas les ouvrir pour supprimer un avertissement |
| Lectures anonymes privées | CONFORME pour les six sondes | Aucun profil, contact HelloAsso, contact invité, code de réglage, invitation ou paiement retourné |
| Tableau de bord anonyme | CONFORME | Redirection vers connexion avec retour /dashboard, ordinateur et téléphone |
| Stockage privé | CONFORME pour visibilité | Deux espaces public=false ; téléchargements étrangers non testés |
| Permission organisateur avant mutations serveur examinées | CONFORME pour code examiné | Contrôles ressource avant import privilégié ; ne couvre pas A-01 |
| Authentification des tâches automatiques | CONFORME pour code et tests | Secret vérifié avant intégration, cinq tests réussis |
| Origine HelloAsso | CONFORME pour destination fetch | API fixe api.helloasso.com ; pas de destination arbitraire fournie par utilisateur |
| Retours de connexion | CONFORME pour validateur | Sept tests réussis, rejets d’URL externe |
| Rôles séparés des profils | CONFORME pour structure / politiques examinées | user_roles, platform_roles, organization_members ; aucun rôle tiré de métadonnées utilisateur |
| MCP limité à l’appelant | CONFORME pour code et six tests | Client portant le jeton du demandeur, projections limitées ; parcours OAuth complet NON VÉRIFIÉ |
| Régression ciblée sécurité | CONFORME | 39 tests réussis dans sept fichiers existants |
| Paramètres hébergés d’inscription, confirmation email, expiration et anti-bruteforce | NON VÉRIFIÉ | Pas de lecture des réglages hébergés réalisée |
| Rotation en cas de compromission | NON VÉRIFIÉ | Aucun secret exposé confirmé, aucune rotation exécutée |
| Secrets dans tout l’historique et toutes les réponses/logs | NON VÉRIFIÉ | Pas de scan exhaustif historique/réseau réalisé ; ne pas conclure à l’absence totale de fuite |
| XSS, CSRF, SQL injection et assignation de champs | NON VÉRIFIÉ globalement | Nécessitent tests et analyse approfondie, pas seulement absence de motifs suspects |
| Isolation réelle entre deux comptes et deux organisations | NON VÉRIFIÉ dans cet audit | Tests unitaires des permissions réussis, pas de tests croisés complets |
| Paiement Stripe / abonnement | NON APPLICABLE au périmètre identifié | Stripe non activé ; HelloAsso doit encore être évalué sur remboursement/statuts |
| Upload et suppression non autorisés, faux webhooks, rejeu et saturation | NON VÉRIFIÉ | Aucun test de mutation ou charge sur production |

Le linter retourne 95 alertes réparties en quatre types : trois tables verrouillées sans politique, pg_net dans public, fonctions privilégiées exécutables anonymement et privilèges TRUNCATE. Les alertes ne sont pas toutes des failles : une fonction de contrôle de permission peut être publique intentionnellement, et TRUNCATE exige une analyse des rôles réellement joignables. Éviter de déplacer l’extension gérée sans étude.

## Corrections effectuées

Aucune correction applicative ou structurelle effectuée : le cahier des charges demande de présenter d’abord les risques et propositions. Aucun contrôle n’est marqué CORRIGÉ sans retest. Seuls le suivi des tâches et ce rapport ont été ajoutés.

## Suite et validation avant publication

1. Compléter ce rapport avec l’analyse automatique approfondie à sa notification de fin.
2. Vérifier A-01 dans le même environnement que la production ; préparer la migration ciblée et les tests sans données réelles.
3. Présenter le plan de corrections structurelles avant application, conformément au cahier des charges.
4. Traiter dépendances, annuaire, codes et stockage ; retester interfaces organisateur/joueur/invité et isolation.
5. Pour tests de mutation : utiliser un environnement isolé, deux comptes de test et données fictives, jamais les inscriptions ou résultats existants.
6. Vérifier les réglages hébergés, authentification OAuth complète, chemins de suppression, intégrations et historique/logs ; consigner chaque limite.
7. Pas de nouvelle publication tant que les risques critiques/élevés connus restent non traités ou sans dérogation explicite documentée.

Actions manuelles éventuelles : autorisation d’un compte de test si nécessaire, validation des décisions de correction et dérogations éventuelles. Ne demander ni mot de passe ni clé administrative dans le chat.