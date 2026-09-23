# Le Crousty — Étape 2 : le configurateur en photos réelles

> **Statut : en attente des photos.**
>
> - La première version en 3D dessinée par le code faisait « jeu vidéo ». Elle est remplacée par un rendu qui assemble **de vraies photos** de vos plats (option A).
> - Le moteur est prêt. Il ne manque que les photos : voir le [protocole](photos/protocole.md) et la [liste des photos](photos/liste-des-photos.md).

## Ce que vous verrez

| Crousty gratiné (vraie photo, provisoire) | Le fromage qui fond | Photos pas encore prises |
|---|---|---|
| ![](captures/1-crousty-photo-reelle.jpg) | ![](captures/2-gratine-qui-fond.jpg) | ![](captures/3-photos-a-venir.jpg) |

Le gratiné de ces captures vient d'une de vos photos, détourée automatiquement. C'est une démonstration **provisoire**, à remplacer par vos propres photos.

Tant qu'une photo manque, une étiquette « photo à venir » prend sa place, et un compteur en bas à droite indique où en est la séance (`Photos réelles : 0 / 59`).

## Comment ça marche

1. Chaque ingrédient est **photographié seul, vu de dessus**, toujours au même endroit et à la même hauteur ([protocole](photos/protocole.md)).
2. Vous déposez les photos dans `photos/brutes/`, nommées comme dans la [liste](photos/liste-des-photos.md).
3. `node tools/photos/preparer.mjs` fait le reste :
   - détourage automatique (le fond disparaît) ;
   - recadrage et mise à la même échelle ;
   - export en WebP léger dans `public/photos/`, avec le manifeste `src/data/photos.json`.
4. Le configurateur assemble les photos en direct :

| Action | Ce qui se passe à l'écran |
|---|---|
| Choisir une viande, un supplément, une crudité | La photo de l'ingrédient tombe dans le pain ouvert, avec un rebond et une ombre qui se resserre |
| Changer de viande | L'ancienne se soulève et disparaît, la nouvelle tombe |
| Gratiné | La photo « fromage râpé, avant le four » apparaît. Elle se change en « sorti du four » par un fondu irrégulier, avec une lueur chaude et de la vapeur |
| Tortilla | La garniture tombe sur la tortilla à plat, qui se change en tortilla roulée au repos. Le gratiné reste indisponible |
| Sauces (2 max) | La photo du filet de sauce se pose sur la garniture |
| Frites garnies | Le cheddar s'étale depuis le centre en coulures sur la photo des frites, puis le poulet ou le bacon tombe dessus |
| Boisson | La canette arrive en glissant |
| Menu | Tout est posé sur la photo de votre plateau papier journal |
| Relief | La vue s'incline légèrement sous le doigt (et doucement au repos) : les couches du dessus bougent plus que le plateau |

Rien n'a changé dans la carte (`menu.json`), la logique des options, le formulaire accessible et le récap. Seul l'affichage a été remplacé.

## Lancer le site

```bash
npm install
npm run dev                 # http://localhost:5173
npm test                    # 126 tests (carte, options, liste des photos)
npm run photos:liste        # régénère la liste des photos (et coche celles reçues)
cd tools/photos && npm install && cd ../..
node tools/photos/preparer.mjs   # traite les photos de photos/brutes
```

## Limites connues

| Sujet | Quand |
|---|---|
| Les emplacements des ingrédients dans le pain seront réglés sur les vraies photos (aujourd'hui : valeurs de départ) | Dès réception du premier lot |
| Burgers, hot-dogs, tacos, croques, brasserie, salade, starters : la liste des photos est prête (lot 2) ; leur angle de prise de vue (de profil pour les burgers ?) est à valider | Étape 3 |
| Poids : le moteur d'affichage (three.js) pèse ~240 Ko compressés ; un moteur 2D plus léger est possible pour ce rendu photo | Étape 5 |
| Pages accueil, carte, galerie, infos | Étape 4 |
