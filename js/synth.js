/* Synthèses par référentiel : chiffres clés tirés des GTO/GDO (déjà vérifiés dans data.js).
   Chaque entrée : { id, ref (titre officiel + édition), g: [ [sous-titre, [faits…]] ] }.
   Ne pas ajouter de chiffre sans l'avoir retrouvé dans le PDF source. */
const SYNTH = [
{ id:"etex", ref:"GTO Établissements et techniques d'extinction (2018)", g:[
  ["Hydrants et DECI", [
    "PI 80 : 30 m³/h · PI 100 : 60 m³/h (1 000 L/min) · PI 150 : 120 m³/h",
    "Ouverture : PI 80 et PI 100 = 13 tours · PI 150 = 17 tours",
    "BI 100 : 1 000 L/min ; pas de bouche de 80 ; deux BI 100 jumelées = 2 000 L/min",
    "PEI : pression de 1 à 16 bars, débit réglementaire tenu au moins 2 heures, incongelable (colonne à 1 m sous terre)",
    "Haute pression : pression dynamique supérieure à 6 bar à 60 m³/h",
    "PI jaune (au moins 50 % de la surface) : réseau surpressé et/ou additivé",
    "Plaque BI : 220 × 100 mm, fond blanc, caractères rouges",
    "Risque faible : 30 m³ en 1 h · ordinaire : 60 m³ en 1 h à 120 m³ en 2 h · important : au-delà de 120 m³ en 2 h (valeurs indicatives, RDDECI arrêté par le préfet)"]],
  ["Hydraulique", [
    "1 bar par 10 m de dénivelée",
    "Pression atmosphérique : 10,33 m d'eau = 1,013 bar",
    "Arrivée à la pompe : au moins 1 bar ; ne pas dépasser 80 % des capacités de la pompe",
    "Aire d'aspiration : 4 × 3 m (motopompe remorquable), 8 × 4 m (poids lourd) ; pente 2 % à 7 %",
    "Crépine : au moins 0,5 m du fond et 0,3 m sous le niveau le plus bas",
    "Alimentation seule par le conducteur si prise d'eau à moins de 20 m"]],
  ["Établissements", [
    "LDT : 40 à 80 m de semi-rigides de 23 ou 33 mm, 80 à 300 L/min",
    "Ligne d'attaque : une lance sur 2 ou 3 tuyaux de 45",
    "Dévidoir mobile : 200 m de 70 ; deux dévidoirs = jusqu'à 400 m, au-delà ligne de 110",
    "Dévidoir automobile (110) : environ 2 min pour 100 m",
    "Citerne souple : 3 000 à 10 000 L, environ 20 min de montage",
    "FPT : environ 3 000 L · VPI : 600 à 1 200 L en général",
    "LDV sur division d'alimentation : en général jusqu'au R+4",
    "Angle de diffusion d'un phénomène rapide devant un ouvrant : environ 30°"]],
  ["Techniques de lance", [
    "Binôme : le chef d'équipe tient la lance, l'équipier est double porte-lance (vision à 360°)",
    "Impulsions courtes : 0,5 s au plus, 100 à 250 L/min, lance inclinée de 30 à 60°",
    "Impulsions longues : 2 à 5 s (grands volumes, passages de portes)",
    "Jet droit au plafond : 250 L/min minimum ; refroidissement des fumées en jet droit 100 à 300 L/min",
    "Attaque massive depuis l'extérieur : mouvements posés jusqu'à 5 à 6 s",
    "Trouée de paroi : environ 20 × 20 cm"]]
]},
{ id:"fdf", ref:"GTO Lutte contre les feux de forêts et d'espaces naturels (2021)", g:[
  ["Engins", [
    "CCFL : 3 t à 7,5 t · CCFM : à partir de 7,5 t · CCFS : au-delà (seuil 14 t au chapitre 1, 16 t dans le tableau des capacités : le GTO varie)",
    "Capacité utile minimale : CCFL 600 L · CCFM 1 500 L · CCFS 5 000 L",
    "Capacité d'autoprotection : au moins 300 L pour tous les CCF",
    "Cabine : air respirable 10 min minimum pour 4 personnes à 30 L/min",
    "Conducteur : rend compte quand la citerne est aux 3/4 vide",
    "CCFM en catégorie 3 (tout-terrain) ; CCR en catégorie 2"]],
  ["Organisation", [
    "UIFF = 2 CCF ; renforcée d'un CCF de classe S = ULIFF",
    "Colonne : 3 GIFF minimum + commandement et soutien, chef de colonne FDF 4",
    "FDF 1 et 2 : équipiers et chefs d'agrès · FDF 3 : chef de groupe · FDF 4 : chef de colonne",
    "Convoi : environ 50 m entre véhicules ; 60 km/h sur route, 50 km/h en agglomération",
    "Groupe : 320 m couverts en jalonnement, 100 m en attaque de front",
    "Groupe appui : 300 m d'ouverture en 1 h ou une piste de 1 km en 1 journée"]],
  ["Lances et établissements", [
    "Lance 150 : DN 25, 150 L/min max · lance 500 : DN 45, 500 L/min max",
    "Queue de paon DN 45 : écran d'environ 7 m × 25 m (≈ 6 min avec une demi-citerne) · DN 70 : 10 m × 30 m",
    "Groupe : 4 lances 500 à 120 m · 2 lances 500 à 280 m · 1 lance 500 à 440 m ; au-delà = grande longueur",
    "Unité : 1 lance à 120 m ou 2 lances à 60 m",
    "Division placée entre le dernier et l'avant-dernier tuyau ; l'équipier 2 établit avant l'équipier 1",
    "Balayage de la lisière : 1/3 dans le brûlé, 2/3 dans la végétation",
    "Hydro-éjecteur : il faut au moins 300 L en citerne"]],
  ["Sécurité", [
    "STOPD : pente ≤ 50 %, dévers ≤ 30 % pour un CCF",
    "Largage aérien : évacuer l'axe sur 40 m de part et d'autre",
    "Retardant : 80 000 L ≈ 2,7 km de barrière avant recomplètement"]]
]},
{ id:"gdo-fdf", ref:"GDO Feux de forêts et d'espaces naturels (2021)", g:[
  ["Repères", [
    "Vitesse de propagation empirique : environ 3 % de la vitesse du vent",
    "Hygrométrie sous 30 % : éclosion et propagation très aggravées",
    "Au-delà de 30 °C : pénibilité et déshydratation fortement accrues",
    "Au moins un repas chaud au calme par 24 heures",
    "Risque météo : 6 niveaux pour chacune des 116 zones DFCI",
    "Plan DFCI : validité de 10 ans au plus",
    "Interface habitat/forêt : 100 m autour des groupes d'habitations",
    "Feux de chaumes : flammes d'1 m maximum en général",
    "Groupe appui : généralement 2 bulldozers"]]
]},
{ id:"vicie", ref:"GTO Engagement en milieu vicié (2e éd. 2024)", g:[
  ["ARI", [
    "Bouteilles : 200 ou 300 bar ; moyenne pression 6 à 8 bar",
    "ARI prêt à l'emploi : 18 kg au plus (NF EN 137)",
    "Sifflet vers 55 bar : retour immédiat vers le point de pénétration",
    "Capacité : P × V / (Z × Patm) ; 300 × 7 / 1,1 ≈ 1 909 L",
    "Consommation de calcul : 100 L/min (10 au repos, jusqu'à 135) ; 1 909 L ≈ 19 min",
    "Ligne guide : 1 olive = vers la sortie (« vie ») · 3 olives = vers le feu (« in-cen-die »)"]]
]},
{ id:"struct", ref:"GDO Interventions sur les incendies de structures (2018)", g:[
  ["Repères", [
    "EGE : 3 à 5 min après la naissance du feu s'il est bien alimenté en air",
    "Plafond de fumée : 20 à 25 kW/m², près de 10 fois le supportable",
    "Le CO cause 90 % des décès",
    "Stabilité au feu minimale (ERP, code du travail) : 30 min",
    "Attaque limitée en temps depuis l'extérieur : 10 à 15 s pour les volumes courants"]]
]},
{ id:"ventil", ref:"GTO Ventilation opérationnelle (2019)", g:[
  ["Repères", [
    "VPP thermique : le CO peut atteindre 100 ppm, surveiller l'atmosphère",
    "Sortant de surface double de l'entrant : environ 90 % du débit max",
    "Vent vers le sortant au-delà de 18 km/h (5 m/s) : efficacité réduite",
    "5 m/s × 1 m² = 18 000 m³/h, soit un appartement de 120 m² par minute"]]
]},
{ id:"routier", ref:"GDO Opérations de secours en milieu routier (2025)", g:[
  ["Véhicules et énergies", [
    "Feu de véhicule : zonage a priori de 50 m",
    "Ordres de grandeur : VL 5 MW, PL 20 à 50 MW, voire 100 MW",
    "Batterie 12 V au plomb ; systèmes HT jusqu'à 800 V (câbles orange)",
    "Couper le contact ou débrancher la 12 V rend l'airbag inerte ; déclenchement possible dès 25 km/h ; générateurs autour de 180 à 220 °C",
    "GPL : réservoir rempli à 80 % (dilatation 0,25 % par degré) ; torchère jusqu'à 15 m",
    "50 L de GPL : éclats jusqu'à 100 m, boule de feu de 30 m pendant 3 s, surpression jusqu'à 120 m",
    "GNC : libération du gaz au-delà de 110 °C ; GNC ou H2 vidé en 3 min après fusion du fusible",
    "H2 : réservoirs de 350 à 700 bar ; remorque H2 : exclusion de 50 m ; jet enflammé : flamme 10 m, LIE (4 %) à 20 m",
    "PL : BLEVE avec effets létaux possibles jusqu'à 750 m",
    "Fiches d'aide à la décision : 4 pages au plus, norme ISO 17840"]],
  ["Réseau et tunnels", [
    "Gabarit : 4,75 m sous les ponts d'autoroute, 4,30 m ailleurs",
    "Bornes d'appel d'urgence tous les 2 km",
    "Tunnel à risques particuliers : plus de 300 m",
    "Niches incendie tous les 200 m ; hydrants 60 m³/h à 6 bar tous les 200 à 250 m",
    "Mur de fumée : peut dépasser 10 km/h",
    "Marche : 1 m/s · 0,5 m/s visibilité dégradée · 0,3 m/s sans visibilité",
    "Contresens validé : voie de droite, 30 km/h, 20 m entre véhicules"]]
]},
{ id:"elec", ref:"GDO Opérations de secours en présence d'électricité (2024)", g:[
  ["Repères", [
    "BT : 230-240 V phase-neutre, 400 V entre phases",
    "HTA : de 1 000 V (1 500 V en continu) à 50 000 V, distribution généralement en 20 000 V",
    "HTB : au-delà de 50 000 V (RTE : 63 à 400 kV)",
    "Conducteur au sol : personne dans un rayon de 10 m",
    "Isolant endommagé : distance de 5 m",
    "Photovoltaïque la nuit : 10 m entre projecteurs et modules",
    "Câbles enterrés à environ 0,70 m ; lignes aériennes BT à 4 à 6 m",
    "Postes : SF6 possible, risque d'anoxie"]]
]},
{ id:"gaz", ref:"GDO Interventions en présence de gaz (2021)", g:[
  ["Repères", [
    "Réseaux à périmètre étendu : 110 m et 180 m",
    "Moyen mnémotechnique majorant : canalisation de 600 mm → 600 m",
    "Acétylène : décomposition dès 65 °C",
    "Sans ARI : jamais sous 19 % d'oxygène",
    "Bouteilles composites : dilatation de 2 à 3 % seulement",
    "Fuite haute pression : environ 130 dB à 1,50 m"]]
]},
{ id:"agri", ref:"GDO Interventions en milieu agricole (2019) et silos (2019)", g:[
  ["Milieu agricole", [
    "Fourrage : 45 °C à cœur normal ; dès 70 °C, auto-combustion possible",
    "Ammonitrates haut dosage : plus de 80 % de nitrate d'ammonium",
    "Zone contrôlée de 100 m pour les fumées toxiques",
    "H2S : s'accumule en point bas, détection avant toute descente"]],
  ["Silos", [
    "Périmètre réflexe : 25 m (silo plat), 50 m (silo vertical), puis 1,5 × la hauteur",
    "Inertage : oxygène si possible sous 8 %, azote jamais liquide",
    "Fermentation probable si le grain dépasse 15 % d'eau",
    "40 % des feux concernent les séchoirs"]]
]},
{ id:"cdt", ref:"GDO Exercice du commandement et conduite des opérations (2e éd. 2020)", g:[
  ["Commandement", [
    "4 subordonnés au plus ; ordres aux subordonnés directs ; contrôle ; compte rendu au supérieur direct",
    "Groupe : 2 à 4 agrès · colonne : 2 à 4 groupes",
    "3 phases : montée en puissance, stabilisation, sortie",
    "Ordre préparatoire : autonomie de 24 h ; repos prévu pour tout transit de plus de 3 h",
    "Officier sécurité : 4 axes (humain, technique, organisationnel, environnemental)",
    "PEX : 4 pages au plus ; défusing dans les 3 jours (idéalement 3 à 8 h après)"]],
  ["Cadre", [
    "RO élaboré par le SIS, arrêté par le préfet (art. R1424-42 du CGCT)",
    "CTA : traite les appels 18/112 en permanence",
    "Avertisseurs sonores et lumineux utilisés ensemble (art. R415-12 du code de la route)",
    "Environ 5 millions d'interventions par an pour les SIS"]]
]},
{ id:"ssuap", ref:"GDO Secours et soins d'urgence aux personnes (v1.1 2022)", g:[
  ["Repères", [
    "Régulation médicale systématique par le CRRA 15",
    "3,61 millions d'interventions en 2020, soit 71 % de l'activité",
    "Détresse vitale évidente chez l'adulte : FR > 30/min ou FC > 120/min",
    "AES : eau et savon puis désinfection 5 min minimum",
    "Saignement de nez : appuyer 10 min, tête penchée en avant",
    "Noyade : prompt secours valable jusqu'à 1 h d'immersion (2 h en eau très froide)",
    "Agressions : 80 % lors de SSUAP"]]
]},
{ id:"divers", ref:"Autres GDO (bateaux, navires, effondrements, fumées, drones, cyno)", g:[
  ["Repères", [
    "Bateaux (2018) : Freycinet 38,50 × 5,05 m ; VNF gère 80 % du réseau ; coches sans permis jusqu'à 15 m",
    "Navires (2017) : brassières = 1 par personne + 5 %",
    "Effondrements (2021) : LUSAR 1, MUSAR 2, HUSAR 4 unités ; 5 phases INSARAG (ASR 1 à 5)",
    "Fumées (2020) : jusqu'à 280 °C produits non inflammables, de 280 à 500 °C ils peuvent s'enflammer",
    "Télépilotés (2022) : aire de décollage de 5 m de diamètre au moins",
    "Cyno (2022) : avant 24 h = opération de secours, après 24 h = opération de recherche"]]
]}
];
