# Révisions Sapeur-Pompier

Site de révision : QCM, cartes mémoire, fiches et cas pratiques (SUAP, INC, DIV, SR, FDF, culture, commandement).
Site statique (HTML/CSS/JS, sans compilation), publié sur GitHub Pages.

- `index.html` : la page
- `css/style.css` : l'apparence
- `js/data.js` : **le contenu** (questions, cartes, fiches, cas pratiques)
- `js/app.js` : le fonctionnement
- `cours/` : tes supports de cours, **jamais publiés** (exclus par `.gitignore`)

## Tester sur ton PC
Avec Laragon : ouvre http://localhost/revision-pompier/ (le dossier est relié à `C:\laragon\www`).

## Ajouter une question
Dans `js/data.js`, copie une ligne `{q:"…",o:["bonne réponse","faux","faux","faux"],e:"explication"}` dans le bon thème.
La bonne réponse est toujours la première ; l'ordre est mélangé à l'affichage.
