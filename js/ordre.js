// Questions « remettre dans l'ordre » (glisser-déposer). o = étapes dans le bon ordre ; l'appli les mélange.
// Source en fin d'explication. Ne mettre ici que des séquences dont l'ordre est donné par le texte cité.
const QORDRE=(()=>{
const S={
 route:"(GDO Opérations de secours en milieu routier 2025)",
 cmd:"(GDO Exercice du commandement et conduite des opérations 2020)"
};
const O=(q,o,e,s)=>({q,o,e:e+" "+S[s]});
return {
sr:[
O("Remets dans l'ordre les phases de la marche générale des opérations (MGO) en secours routier.",
 ["Sécurisation du site","Sécurisation et stabilisation du véhicule","Secours d'urgence aux personnes","Sécurisation des techniques","Sortie de la victime"],
 "La MGO d'une opération de secours routier repose sur ces cinq phases. La sécurisation du site s'appuie d'abord sur le zonage opérationnel, la signalisation d'urgence et une protection incendie adaptée à l'énergie du véhicule.","route"),
O("Remets dans l'ordre les « 5 i » de la sécurisation du véhicule, tels que le GDO les présente.",
 ["Identifier","Inspecter","Interdire","Immobiliser","Isoler"],
 "Identifier le véhicule et son énergie (lecture de la fiche d'aide à la décision), inspecter (fuite, câble HT sectionné, batterie HT endommagée…), interdire de toucher, couper ou comprimer toute source ou vecteur d'énergie, immobiliser (arrêt moteur, frein de parc, position P, calage), isoler (batterie 12 V, après réflexion sur les mobilités utiles à la désincarcération).","route")
],
inc:[
O("Remets dans l'ordre les phases de la marche générale des opérations (MGO) en lutte contre l'incendie.",
 ["Reconnaissance","Placement des engins","Sauvetage et mise en sécurité","Établissements","Attaque","Ventilation","Protection","Déblai","Préservation des traces et indices","Surveillance","Remise en condition"],
 "Le GDO donne ces onze phases pour la MGO en lutte contre l'incendie. Elles ne sont pas toujours chronologiques selon l'opération, et la MGO ne remplace pas la méthode de raisonnement tactique.","cmd"),
O("Remets dans l'ordre ces six phases de la MGO en lutte contre l'incendie.",
 ["Placement des engins","Sauvetage et mise en sécurité","Attaque","Ventilation","Déblai","Préservation des traces et indices"],
 "MGO incendie complète : reconnaissance, placement des engins, sauvetage et mise en sécurité, établissements, attaque, ventilation, protection, déblai, préservation des traces et indices, surveillance, remise en condition.","cmd")
],
com:[
O("Remets dans l'ordre les champs communs à toutes les marches générales des opérations.",
 ["La reconnaissance","Les sauvetages et mises en sécurité","Les actions spécifiques au domaine d'intervention","La protection","Le reconditionnement"],
 "Quel que soit le type d'opération, ces champs sont communs. La MGO se décline ensuite selon le domaine (secours routier, incendie, sauvetage-déblaiement…).","cmd"),
O("Remets dans l'ordre les phases de la MGO en sauvetage-déblaiement.",
 ["Reconnaissance et évaluation générale de la zone","Reconnaissance et évaluation du secteur","Recherche et sauvetage des victimes légèrement ensevelies","Recherche et sauvetage des victimes en profondeur","Déblaiement généralisé, recherche des corps"],
 "On va du général (la zone) au particulier (le secteur), puis des victimes les plus accessibles aux plus profondes, avant le déblaiement généralisé.","cmd"),
O("Un chef d'agrès donne son ordre initial. Remets ses parties dans l'ordre.",
 ["Description de la situation","Objectifs à atteindre","Expression des ordres","Mesures de sécurité individuelles et collectives"],
 "Chefs d'agrès et chefs d'équipe utilisent le SMES : Situation, Mission, Exécution, Sécurité.","cmd"),
O("Un chef de groupe donne son ordre initial. Remets ses parties dans l'ordre.",
 ["Description de la situation initiale","Buts à atteindre","Techniques envisagées pour atteindre l'objectif","Répartition des tâches, sectorisation","Transmissions, position du COS et de son adjoint, mesures de sécurité"],
 "Le chef de groupe utilise le SOIEC : Situation, Objectif, Idée de manœuvre, Exécution, Commandement.","cmd"),
O("Remets dans l'ordre les rubriques de l'ordre initial d'un chef de colonne ou d'un chef de site.",
 ["Situation","Anticipation","Objectif","Idée de manœuvre","Exécution","Logistique","Commandement"],
 "Chef de colonne et chef de site utilisent le SAOIELC, l'ordre le plus complet : il ajoute l'anticipation (évolution possible) et la logistique (soutien sanitaire, éclairage…) au SOIEC.","cmd"),
O("Remets dans l'ordre les rubriques d'un message de compte rendu.",
 ["Je suis","Je vois","Je prévois","Je fais","Je demande"],
 "Le message de compte rendu informe l'autorité de la situation, de ses évolutions possibles, des actions entreprises et des besoins. Le message d'ambiance, lui, se limite à : je suis, je vois, je demande.","cmd"),
O("Remets dans l'ordre les phases d'une opération de secours.",
 ["La montée en puissance","La stabilisation","La sortie de l'opération de secours"],
 "Une opération se découpe en trois phases de durées variables. La montée en puissance est la phase prépondérante.","cmd")
]
};
})();
