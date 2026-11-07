# CLAUDE.md — Révisions Sapeur-Pompier

Site de révision pour le concours caporal SPP, préparé par un SPV du SDIS 83.
Utilisé par lui et quelques collègues du CIS. Tâches à faire : voir `BACKLOG.md`.

## Communication
- Répondre **en français**, simplement : l'utilisateur est pompier, pas développeur.
- Poser des questions quand un choix lui revient. Pour un choix **visuel**, lui montrer des maquettes (artefact) avant de coder.
- Terminer chaque livraison par un compte rendu : ce qui a changé, où, et comment le voir.

## Règles absolues
- **Jamais** publier `cours/` : il est dans `.gitignore`, ce sont ses supports de cours et les PDF officiels.
- **Jamais** mettre dans le dépôt la clé secrète ou service_role de Supabase, ni le mot de passe de la base. Seule la clé publishable (`js/config.js`) est publique ; la sécurité repose sur les règles RLS (`supabase/schema.sql`, non publié).
- **Contenu vérifié** : chaque question vient d'un GTO/GDO/GODR ou d'un référentiel officiel, jamais d'un souvenir. La source est citée.
- **Barèmes sportifs et format officiel de l'examen** : ne rien inventer, demander à l'utilisateur.
- Ne pas supprimer ses fichiers sans demander.

## Architecture
Site statique en HTML/CSS/JS, sans compilation ni framework. Publié par GitHub Pages à chaque `git push origin main`.
- `index.html` : la coquille de la page.
- `js/data.js` : le contenu. On y trouve :
  - `TH` (thèmes), `LV` (objectifs) ;
  - `QDATA` (QCM), `FDATA` (cartes) ;
  - `CAS` (cas pratiques) et les fiches.
- `js/app.js` : toute l'interface. Le rendu passe par des vues `vAccueil`, `vQcm`, `vCartes`, `vFiches`, `vCas` et `vExamen`, et la route est le hash de l'URL. L'état `S` est gardé en localStorage avec le préfixe `rsp:`.
- `js/sync.js` : synchronisation Supabase de la progression et connexion par lien magique.
- `sw.js` : service worker pour le hors ligne. **Incrémenter `rsp-vN` à chaque modification publiée**, sinon les téléphones gardent l'ancienne version.
- `css/style.css` : couleurs en variables, avec thèmes clair et sombre.

## Format d'une question (`QDATA.<thème>`)
```js
{q:"Énoncé ?", o:["bonne réponse","faux","faux","faux"], e:"Explication. (GDO Titre exact 2022)", l:"spp"}
```
- La **bonne réponse est toujours en premier**. L'ordre est mélangé à l'affichage.
- **La source est la dernière parenthèse de `e`.** Il faut garder exactement le même nom pour un même document, sinon il apparaît en double dans le filtre « Référentiels ». Les variantes existantes sont fusionnées par `SRC_ALIAS` (app.js).
- `l` est facultatif et vaut `spv`, `spp` ou `av`. Sans `l`, la question est visible pour tous les objectifs.
- Thèmes : `suap inc div sr fdf cult com fr math`.
- L'identifiant d'une question est un hash de son énoncé : **modifier l'énoncé efface la progression** de cette question.

## Procédure pour un lot de questions
1. Extraire les faits du PDF officiel dans `cours/`. Certains PDF ne contiennent que des images : il faut alors les passer à l'OCR.
2. Écrire le lot, puis vérifier les doublons par recouvrement de mots avec les questions existantes.
3. Ajouter le lot à `data.js`, contrôler le nombre de questions par thème et la syntaxe, puis incrémenter `sw.js`.
4. Tester en headless (voir ci-dessous), commiter, pousser, puis vérifier que les questions sont en ligne.

## Tester
- En local : Laragon sur http://localhost/revision-pompier/
- En headless : Edge `--headless --dump-dom`. La page de test temporaire `_t.html` doit avoir `<meta charset="utf-8">` et charger `index.html` dans une iframe. Elle pilote l'app par des clics, car `S` n'est pas sur `window`. Il faut la supprimer après le test.
- Il n'y a pas de Python sur le poste : utiliser node.

## Publier
- `git push origin main`. GitHub renvoie parfois une erreur 500 : réessayer. Si Pages ne se reconstruit pas, un commit vide relance le build.
- Vérifier ensuite que la nouvelle version est en ligne sur https://emberjager.github.io/revision-pompier/
