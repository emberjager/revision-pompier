# Backlog — Révisions Sapeur-Pompier

Issu du questionnaire du 2026-11-07. Ordre validé : **ergonomie → fonctions quiz → suivi du niveau → motivation → contenu → technique**, la technique pouvant être menée en parallèle.
Légende : ☐ à faire · ◐ en cours · ☑ fait · 🎨 choix visuel à valider sur maquette · ❓ info à fournir par l'utilisateur.

## Contexte d'usage (ce qui guide les choix)
- Téléphone et PC à parts égales : priorité au mobile, avec raccourcis clavier sur PC.
- Sessions courtes (5–10 min) et longues (30 min et plus).
- Révision en garde, donc interruptions fréquentes (départs).
- Parfois sans réseau.
- Utilisateurs : l'auteur et quelques collègues du CIS.
- Irritants actuels :
  - trop de clics pour lancer une révision ;
  - lisibilité et mise en page ;
  - lenteur au chargement.

## Phase 1 — Ergonomie (priorité)
- ☐ **E1. Barre d'onglets fixe en bas sur mobile** 🎨 : icônes et libellés, accessible au pouce, zone sûre iPhone. Sur PC, les onglets restent en haut. Six sections pour cinq places : choisir lesquelles garder et quoi mettre dans « Plus ».
- ☐ **E2. Session du jour en 1 clic** 🎨 : gros bouton sur l'accueil qui mélange les questions à revoir et des nouvelles, dosées selon l'objectif du jour et la date du concours.
- ☐ **E3. Bouton « Reprendre »** : relance le dernier quiz avec les mêmes réglages.
- ☐ **E4. Réglages QCM mémorisés** : thèmes, référentiels décochés, nombre et mode sont gardés en localStorage et synchronisés.
- ☐ **E5. Favoris de réglages** : presets nommés, par exemple « FDF + SR · 20 q », lancés depuis l'accueil.
- ☐ **E6. Sauver et reprendre un quiz interrompu** : un quiz, des cartes ou un cas en cours sont retrouvés à la réouverture, même après fermeture de l'app. L'examen blanc garde le temps écoulé.
- ☐ **E7. Thème clair/sombre** : automatique par défaut, avec un bouton manuel (clair / sombre / auto) dans l'en-tête.
- ☐ **E8. Passe lisibilité** : taille du texte, contrastes, espacements, scroll inutile, zones tactiles d'au moins 44 px, et options du QCM bien séparées.

## Phase 2 — Fonctions quiz
- ☐ **Q1. Raccourcis clavier (PC)** :
  - 1–4 ou A–D pour répondre ;
  - Entrée ou espace pour passer à la suivante ;
  - F pour mettre en favori, S pour signaler.
- ☐ **Q2. Signaler une question** : bouton « erreur / doute » avec un commentaire facultatif. Les signalements sont listés dans une page « Mes signalements » et exportables en texte à copier pour correction. Ils restent stockés en local, sans Supabase pour l'instant.
- ☐ **Q3. Favoris** : une étoile sur chaque question, et un mode de quiz « Mes favoris ».
- ☐ **Q4. Indice de confiance** 🎨 : choix « Sûr / Hésitant ». Une bonne réponse hésitante n'avance pas dans les boîtes de Leitner, ou revient plus vite.
- ☐ **Q5. Chrono par question** : mode vitesse avec 30 s par question par défaut, réglable. Le temps écoulé compte comme une erreur.
- ☐ **Q6. Mode « mort subite »** : on enchaîne les questions jusqu'à la première erreur, avec un record par thème.
- ☐ **Q7. Mieux expliquer la révision espacée** : afficher « X à revoir aujourd'hui » et, sur chaque question, pourquoi elle revient (boîte N, prochaine révision le…).

## Phase 3 — Suivi du niveau et date du concours
- ☐ **N1. Date du concours** : saisie dans les réglages, avec un compte à rebours sur l'accueil.
- ☐ **N2. Révisions adaptées à la date** : plus le concours approche, plus les intervalles se resserrent pour que tout soit revu avant la date. La part de nouvelles questions augmente quand il reste beaucoup de questions jamais vues.
- ☐ **N3. Score de préparation (%)** 🎨 : jauge globale calculée sur la maîtrise par thème, la couverture des questions vues et les notes aux examens blancs. Afficher le détail du calcul.
- ☐ **N4. Points faibles** : liste des thèmes et référentiels au plus faible taux de réussite, avec un bouton « Travailler ça » qui lance le quiz ciblé.
- ☐ **N5. Courbe des examens blancs** : évolution des notes sur 20 dans le temps.
- ☐ **N6. Plan semaine par semaine** : objectifs automatiques jusqu'à la date, par exemple « cette semaine : FDF + SR, 1 examen blanc », recalculés selon les points faibles.
- ☐ **N7. Format officiel de l'examen blanc** ❓ : bouton « Format officiel » préréglé. L'utilisateur donnera le nombre de questions, la durée et le barème.

## Phase 4 — Motivation
- ☐ **M1. Série et objectif du jour plus visibles** : ils existent déjà, à mettre en avant sur l'accueil.
- ☐ **M2. Grades pompier** 🎨 : grades débloqués selon la progression (sapeur, caporal, caporal-chef, sergent…), avec un écusson.
- ☐ **M3. Classement CIS** : entre collègues, via Supabase (table de scores et RLS). Demander s'il faut un pseudo ou un prénom.
- ☐ **M4. Rappel quotidien** : notification « N questions à revoir » quand l'app est installée sur le téléphone (PWA). Limite : sur iPhone, il faut iOS 16.4 ou plus et l'app ajoutée à l'écran d'accueil.

## Phase 5 — Contenu
- ☐ **C1. Préparation à l'oral** : questions de jury types, chrono de présentation, éléments de réponse modèles et grille d'auto-évaluation.
- ☐ **C2. Sport** ❓ : carnet de performances et calcul de la note. Les barèmes officiels sont à fournir par l'utilisateur (dossier `cours/sport`).
- ☐ **C3. Vrai/faux et textes à trous** : nouveaux formats de question, mélangés aux QCM.
- ☐ **C4. Fiches plus riches** : schémas, tableaux, lien « questions associées ». Les fiches et cartes ne sont pas encore testées par l'utilisateur : ne pas les refondre avant son retour.
- ☐ **C5. Suite des lots de questions** : viser 100 et plus par thème. Au lot 8 : SUAP 84, FDF 88, SR 93. OCR du GTO périlleux/montagne à faire.
- ☐ **C6. Formulaire d'ajout de question dans le site** : prévu dans la feuille de route initiale.

## Phase T — Technique (en parallèle)
- ☐ **T1. Chargement plus rapide** :
  - ne charger que les graisses de police utilisées et précharger ;
  - charger supabase-js en différé ;
  - découper `data.js` par thème si besoin ;
  - mesurer avant et après.
- ☐ **T2. Bandeau « nouvelle version disponible »** : le service worker détecte la mise à jour, avec un bouton « Mettre à jour » à la place du rechargement manuel.
- ☐ **T3. Export / restauration de la progression** : fichier JSON à télécharger et à réimporter.
- ☐ **T4. Recherche globale** : un mot, par exemple « LDV », cherché dans les questions, les explications et les cartes, avec un lien vers la question.
- ☐ **T5. Hors ligne fiable** : mettre en cache les polices et supabase-js, et afficher un indicateur « hors ligne ». Les réponses sont gardées puis synchronisées au retour du réseau.
- ☐ **T6. Emails de connexion** : SMTP personnalisé pour l'envoi des liens de connexion (feuille de route).

## Fait
- ☑ Explication après chaque réponse, juste ou fausse, avec la source.
- ☑ Correction détaillée en fin de quiz et d'examen.
- ☑ Filtre par référentiel, groupé par thème, tout coché par défaut, avec boutons « tout » / « aucun » (commit 675205f).
- ☑ Lots 1 à 8 : 573 questions.
