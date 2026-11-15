# Réglages de jeu par phase et par étape

## Dans la création et les paramètres du tournoi
- Choisir le nombre de manches gagnantes, le score de départ (301 ou 501) et la sortie simple ou double pour les poules, la phase finale et la consolante.
- Ajouter des réglages spécifiques pour chaque étape : finale, demi-finales, quarts, huitièmes et tours précédents, ainsi que la petite finale.
- Présenter les étapes de la phase finale et de la consolante séparément. Chaque étape reprend les réglages de sa phase tant qu’elle n’est pas personnalisée.
- Masquer les réglages des phases désactivées et conserver les options existantes de limite des essais de double, seulement en poules et consolante.

## Pendant le tournoi
- Appliquer les réglages du match au compteur, à la sauvegarde et reprise sur l’appareil, au suivi des manches en direct et à la saisie/correction des résultats par l’organisateur.
- Afficher les règles propres à chaque étape dans les tableaux et dans les rappels par mail.
- Conserver pour les tournois existants leurs règles actuelles : une manche en poules, deux manches gagnantes ailleurs, sauf modification explicite avant lancement.
- Préserver les contrôles d’accès, les places disponibles, les classements et les résultats historiques.

## Détails techniques
- Ajouter une configuration de jeu versionnée au tournoi, avec valeurs par phase et exceptions par étape.
- Identifier les étapes depuis la finale vers les tours précédents, indépendamment du nombre d’équipes et des exemptions.
- Centraliser la résolution des règles et remplacer les limites fixes de deux manches dans les validations serveur, les contraintes de stockage, les brouillons et les contrôles du tableau.
- Garder les modifications des règles verrouillées après le lancement, comme les paramètres actuels.

## Vérification
- Tester l’héritage des règles, les exceptions par étape, les tournois existants et les résultats valides/invalides selon le nombre de manches choisi.
- Créer un tournoi temporaire avec des règles différentes, relire les paramètres enregistrés et vérifier un match complet jusqu’au tableau, puis supprimer les données de test.
- Vérifier les champs et les tableaux sur ordinateur et téléphone.
