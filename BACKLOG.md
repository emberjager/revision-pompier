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
- ☑ **E1. Navigation mobile** — choix C : barre flottante en bas (Accueil, QCM, Cartes, Plus) + bouton rond rouge « Lancer » qui démarre la session du jour (« Continuer » si un quiz est en cours). « Plus » ouvre Fiches, Cas pratiques, Examen blanc, Réglages, Compte. Sur PC, onglets en haut.
- ☑ **E2. Session du jour** — choix A : grosse carte en tête d'accueil (nombre de questions, X à revoir / Y nouvelles, durée estimée, J-N, bouton Commencer, objectif du jour et série). 10 à 20 questions selon ce qui reste de l'objectif. Le dosage selon la date du concours viendra avec N2.
- ☑ **E3. « Relancer le dernier quiz »** sur l'accueil, avec les mêmes réglages.
- ☑ **E4. Réglages QCM mémorisés** (nombre, mode, référentiels décochés ; thèmes déjà gardés), synchronisés avec le compte.
- ☑ **E5. Favoris de réglages** : « ☆ Garder ces réglages en favori » dans le QCM (8 au maximum), lancés en un toucher depuis l'accueil ou le QCM, supprimables, synchronisés.
- ☑ **E6. Sessions interrompues** : quiz, cartes, cas et examen blanc gardés sur l'appareil et retrouvés à la réouverture (bandeau « … en cours · Continuer » sur l'accueil). Le chrono de l'examen est en pause pendant que l'appli est fermée. Non synchronisé entre appareils.
- ☑ **E7. Thème** : bouton dans l'en-tête (auto → clair → sombre) et choix dans Réglages. Propre à chaque appareil.
- ☑ **E8. Passe lisibilité (1er passage)** : boutons ≥ 44 px, réponses plus grandes, en-tête compact sur téléphone, indications clavier masquées sur écran tactile, page Réglages séparée (thème, date, objectif, remise à zéro). À reprendre selon les retours.

## Phase 2 — Fonctions quiz
- ☑ **Q1. Raccourcis clavier (PC)** : 1–4 ou A–D pour répondre (QCM, cas, examen), Entrée ou Espace pour continuer, F favori, S signaler, H hésitant, Échap ferme le signalement.
- ☑ **Q2. Signaler une question** : bouton « ⚑ Signaler » (Erreur / Doute + commentaire). Page « Mes signalements » (menu Plus et Réglages) avec « Copier la liste ». Gardé sur l'appareil seulement.
- ☑ **Q3. Favoris** : bouton « ☆ Favori » sur chaque question, mode « ★ Mes favoris » dans le QCM et sur l'accueil. Synchronisés (le dernier geste gagne).
- ☑ **Q4. Indice de confiance** — choix A : « Sûr / Hésitant » après une bonne réponse seulement (Sûr par défaut). Hésitant : la question reste dans sa boîte et revient plus tôt.
- ☑ **Q5. Chrono par question** : sans, 15, 30 ou 60 s (gardé dans les réglages et les favoris). Temps écoulé = erreur. Pause quand on quitte l'écran du quiz ou l'appli.
- ☑ **Q6. Mort subite** : mode du QCM, toutes les questions des thèmes choisis jusqu'à la première erreur. Record par thème (ou groupe de thèmes), synchronisé.
- ☑ **Q7. Révision espacée expliquée** : avant la réponse, étiquette « Nouvelle » ou « Boîte N / 5 » avec la raison du retour ; après, la boîte suivante et la date de la prochaine révision. Compteur « À revoir aujourd'hui (N) » dans le QCM, encart explicatif sur l'accueil.

## Phase 3 — Suivi du niveau et date du concours
- ☑ **N1. Date du concours** : saisie dans Réglages, compte à rebours J-N sur la carte du jour, utilisée par N2 et N6.
- ☑ **N2. Révisions adaptées à la date** : le délai avant la prochaine révision ne dépasse jamais un tiers du temps restant (ni la veille du concours). La session du jour ajoute assez de nouvelles questions pour tout avoir vu une semaine avant (jusqu'à 40 questions), et la carte du jour l'indique.
- ☑ **N3. Score de préparation (%)** — choix A : page « Mon niveau » (#niveau) avec une jauge ronde et un score par thème. Global = maîtrise 60 % + couverture 20 % + moyenne des 3 derniers examens blancs 20 % (sans examen : 75 % / 25 %). Le calcul est expliqué sous la jauge. Petite carte sur l'accueil.
- ☑ **N4. Points faibles** : jusqu'à 6 thèmes ou référentiels sous 80 % de bonnes réponses (au moins 5 réponses). « Travailler ça » lance 10 questions en commençant par les plus ratées (mode « points faibles », aussi dans le QCM).
- ☑ **N5. Courbe des examens blancs** : notes sur 20 des 20 derniers examens, ligne pointillée à 10, note au survol ou au toucher. Visible à partir de 2 examens.
- ☑ **N6. Plan semaine par semaine** : de cette semaine au concours, 2 thèmes prioritaires par semaine (les plus faibles en premier), nouvelles questions à découvrir, 1 examen blanc par semaine (2 dans les 8 dernières semaines), dernière semaine sans nouvelles questions. Suivi de la semaine en cours (réponses et examens faits). Recalculé à chaque visite.
- ☑ **N7. Format officiel de l'examen blanc** : formats « Maths » (1 h, 25 questions) et « QCM équipier SPV » (thèmes du programme), mention éliminatoire sous 5/20, simulateur de note de concours (coef 1+1+4+4). Source : note de cadrage. Durée et nombre de questions du QCM SPV non précisés dans la note.

## Phase 4 — Motivation
- ☑ **M1. Série et objectif du jour plus visibles** (fait le 2026-11-07) : pastille flamme + série dans l'en-tête sur toutes les pages, barre jaune = objectif du jour ; record de série sur l'accueil ; message « Objectif du jour atteint ! » une fois par jour. Sur téléphone, le bouton clair/sombre de l'en-tête est retiré (il reste dans Réglages > Affichage).
- ☑ **M2. Grades pompier** (fait le 2026-11-07, choix A) : 13 grades de Sapeur 2e classe à Colonel, écussons stylisés (pas les insignes officiels). Points = 1 par bonne réponse + 5 par question maîtrisée + 10 par examen blanc (+10 si ≥ 10/20) + 5 par jour d'objectif atteint. Carte sur l'accueil, détail et échelle dans « Mon niveau », message à chaque nouveau grade. Seuils ajustables dans GRADES (js/app.js).
- ☑ **M3. Classement CIS** (en service le 2026-11-07) : page #classement, participation volontaire avec le pseudo du compte (prénom ou surnom au choix de chacun), onglets « Cette semaine » (réponses depuis lundi) et « Grade et points ». Table `scores` créée dans Supabase (SQL en bas de supabase/schema.sql). Limite : les scores sont déclarés par l'appli de chacun (pas de contrôle anti-triche), et tout compte connecté peut lire les pseudos du classement.
- ☑ **M4. Rappel quotidien** (fait le 2026-11-07) : Réglages > Rappel quotidien (heure 8/12/18/20 h, bouton « Tester »). Le service worker notifie « N questions à revoir » si l'objectif du jour n'est pas atteint. Limite : rappel automatique seulement sur Chrome/Edge Android avec l'appli installée (synchro périodique) ; le navigateur choisit le moment exact après l'heure demandée. Ailleurs (iPhone, PC), seul le test fonctionne : il faudrait un serveur d'envoi (Web Push) pour aller plus loin.

## Phase 5 — Contenu
- ☑ **C1. Préparation à l'oral** : page #oral (2026-11-07). 43 questions de jury en 7 catégories avec méthode de réponse, chrono préparation + exposé (pause hors écran), grille d'auto-évaluation sur 5 critères (note /20), historique synchronisé (S.oral, S.oralT).
- ☑ **C2. Sport** : page Sport (carnet, notes natation / parcours / Luc Léger, note physique, records, barèmes H/F). Source : arrêté du 30 novembre 2020. Oral : mode « entretien officiel » 15 min (5 + 10).
- ☑ **C3. Vrai/faux et textes à trous** : choix « Format des questions » dans le QCM (QCM, vrai/faux, à compléter, mélange). Le texte à trous ne porte que sur les réponses chiffrées ; bouton « J'avais juste (mal tapé) ».
- ⏸ **C4. Fiches plus riches** (en attente du retour de l'utilisateur) : schémas, tableaux, lien « questions associées ». Les fiches et cartes ne sont pas encore testées par l'utilisateur : ne pas les refondre avant son retour.
- ☑ **C5. Suite des lots de questions** : lot 9 (2026-11-07) : SUAP 104, FDF 110, SR 117. Lot 10 (2026-11-09, 71200b6) : math 54, fr 40 (compréhension, vocabulaire). Lot 11 (2026-11-09) : com 69, cult 33, tirés du GDO commandement 2020. Lot 12 (2026-11-09) : inc 168 (+59, GTO Établissements et techniques d'extinction 2018 : DECI, hydrants, aspiration, pertes de charge, établissements, techniques d'extinction). 809 au total. À poursuivre : inc via GTO ventilation et GDO toxicité, cult (pas de source dans cours/culture-admin), étude de texte, OCR du GTO périlleux/montagne.
- ☑ **C6. Formulaire d'ajout de question dans le site** : page #mesq « Mes questions » (ajout, modification, suppression, synchro avec le compte, mode QCM « Mes questions »).

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
- ☑ Phase 1 Ergonomie (E1 à E8), 2026-11-07, service worker rsp-v18.
- ☑ Phase 2 Fonctions quiz (Q1 à Q7), 2026-11-07, service worker rsp-v19.
- ☑ Phase 3 Suivi du niveau (N1 à N6), 2026-11-07, service worker rsp-v20. N7 attend le format officiel.
- ☑ Phase 6 Sport (C2) et format officiel (N7), 2026-11-07, service worker rsp-v23.
