# Le Crousty — Étape 1 : proposition d'architecture

> **Statut : validée avec corrections.** Tes réponses sont consignées en section 10. La suite est dans [`etape-2-configurateur.md`](etape-2-configurateur.md).

Fichiers de données :

| Fichier | Contenu |
|---|---|
| `src/data/menu.types.ts` | Le contrat de `menu.json` (types commentés) |
| `src/data/menu.json` | La carte **complète** d'après la 2ᵉ photo : 12 catégories, 55 produits, 110 ingrédients, 20 groupes d'options, 3 formules. Aucun prix. 70 `[À COMPLÉTER]` (dont 55 descriptions produit) et 41 points `toVerify` |
| `src/data/restaurant.json` | Infos pratiques (adresse, horaires, liens) : vides, à remplir plus tard |

---

## 1. Principe directeur : une donnée, trois rendus

```
menu.json + choix du client
        │
        ▼
resolveBuild()  ← fonction pure, testée, ne connaît ni React ni Three.js
        │
        ▼
   BuildSpec  (liste des éléments à afficher, avec une clé stable chacun)
        │
        ├──▶ Scène 3D (React Three Fiber)
        ├──▶ Vue 2D animée (plan B)
        └──▶ Liste accessible + récapitulatif
```

Le code 3D ne connaît **aucun produit**. Il sait seulement dessiner des « archétypes » (un steak, des morceaux, une tranche, un filet de sauce…) à une « couche » donnée d'un « support » (pain, galette, bun, barquette…). Tout le reste vient de `menu.json`.

Exemple de BuildSpec pour *Crousty aux tenders gratiné + frites paysannes + Coca* :

```ts
{
  main:  { support: "pain-sandwich", items: [
           { key: "viandes/tenders:tenders#0",          ingredient: "tenders",        layer: "meat"   },
           { key: "base:cheddar#0",                     ingredient: "cheddar",        layer: "cheese" },
           { key: "gratine/gratine:gratin-fromage#0",   ingredient: "gratin-fromage", layer: "gratin" } ] },
  places: {
    side:  { support: "barquette", items: [
             { key: "frites-formule/paysannes:frites-paysannes#0", ingredient: "frites-paysannes", layer: "fries" } ] },
    drink: { support: "emplacement-boisson", items: [
             { key: "boisson-option/coca-cola:coca-cola#0", ingredient: "coca-cola", layer: "drink" } ] } },
  tray: true
}
```

Chaque clé est stable : une clé qui apparaît joue l'animation d'entrée, une clé qui disparaît joue l'animation de sortie. Changer de viande, c'est une clé qui part et une autre qui arrive, sans code spécifique.

---

## 2. Arborescence du site

Chaque route est **pré-rendue en HTML statique**, ce qui permet l'indexation et un affichage même sans JavaScript. La 3D ne se charge qu'ensuite.

```
/                        Accueil : sandwich gratiné 3D + aperçu carte, formules, galerie, infos
/carte                   La carte : onglets par catégorie (/carte#tacos…)
/composer/:produit       Configurateur 3D (ex. /composer/sandwich-crousty), lien partageable
/formules                Ce qui est inclus, suppléments, « doublez votre viande »
/galerie                 Vraies photos du restaurant et des plats
/infos                   Adresse, horaires, téléphone, plan, livraison
/mentions-legales
```

**Parcours principal :** Accueil → « Composer mon menu » → catégorie → produit → configurateur → récap « Ta compo ». Le site est **une vitrine** : pas de commande en ligne, pas de prix. Le récap mène vers les infos pratiques (« Viens le goûter »), une fois l'adresse fournie.

**Mobile (d'abord) :**

```
┌───────────────────────────────┐
│ ←  Sandwichs · Crousty        │
│                               │
│         [ SCÈNE 3D ]          │  ~50 % de l'écran, rotation au doigt
│                               │
├───────────────────────────────┤
│ Viande · Gratiné · Sauces ·…  │  étapes (onglets défilants)
│ [Tenders] [Tandoori] [Curry]  │  choix en grosses pastilles (≥ 44 px)
├───────────────────────────────┤
│ Ta compo · Crousty · Tenders… ▲ │  récap repliable (sans prix)
└───────────────────────────────┘
```

Sur ordinateur, la 3D occupe 60 % à gauche, les options sont à droite et le récap reste visible.
Une barre basse fixe hors configurateur propose : **Carte · Composer · Nous trouver**.

---

## 3. Arborescence du code

```
crousty/
├─ public/
│  ├─ models/ingredients/<id>.glb   ← modèles designer (optionnels, même id que menu.json)
│  ├─ models/supports/<id>.glb
│  ├─ photos/                       ← galerie (AVIF/WebP + JPEG de secours)
│  ├─ og/                           ← images d'aperçu réseaux sociaux
│  └─ fonts/                        ← Anton + Inter, woff2 sous-ensemble latin
├─ scripts/menu-report.ts           ← liste tous les [À COMPLÉTER] et toVerify
├─ src/
│  ├─ data/        menu.json · menu.types.ts · menu.schema.ts (zod) · restaurant.json
│  ├─ domain/      resolveBuild.ts · selections.ts (min/max/défauts) · summary.ts (texte du récap)
│  ├─ store/       configurator.ts · cart.ts · capabilities.ts   (Zustand)
│  ├─ three/
│  │  ├─ Stage.tsx · WarmLights.tsx · Turntable.tsx · Places.tsx · Tray.tsx
│  │  ├─ assembly/    Assembly.tsx · IngredientNode.tsx · ModelSource.tsx · layout.ts
│  │  ├─ supports/    Bread · Tortilla · Bun · HotdogBun · FryBox · DrinkSpot
│  │  ├─ archetypes/  Patty · Cutlet · Strips · Chunks · Crumble · Sausage · Sliced ·
│  │  │               CheeseSlice · Spread · Melt · Leaf · Slices · Bits · Egg ·
│  │  │               Drizzle · Fries · Can · Bottle
│  │  ├─ materials/   melt · sauce · crust · fried · condensation
│  │  ├─ textures/    newspaper · crust · wood · noise   (générées en canvas, mises en cache)
│  │  ├─ fx/          Steam · Crumbs
│  │  └─ anim/        presets.ts (entrée/sortie par archétype) · timelines.ts
│  ├─ two-d/       Assembly2D.tsx + un dessin SVG par archétype
│  ├─ sections/    Hero · Carte · Configurator · Formules · Galerie · Infos · Footer
│  ├─ components/  Tabs · ProductCard · Badge · OptionGroup · OrderSummary · Picto · Todo
│  ├─ pages/       une page par route
│  ├─ seo/         jsonld.ts · meta.ts
│  └─ styles/      tokens.css
└─ tests/          resolveBuild.test.ts · menu.test.ts (chaque produit × chaque option se construit)
```

**Stack :** React + TypeScript (Vite), React Three Fiber + drei, GSAP (ScrollTrigger), Tailwind CSS, Zustand, zod (validation de `menu.json`), Vitest et un pré-rendu statique des routes. Les versions stables seront figées à l'étape 2.

**États Zustand :**
- `configurator` : produit courant, sélections, actions (`setProduct`, `toggle`, `reset`). Le BuildSpec en est dérivé.
- `cart` : lignes du récap (produit + sélections), gardées dans le navigateur par confort.
- `capabilities` : mode `3d` | `2d`, niveau de performance, `prefers-reduced-motion`.

---

## 4. Le modèle `menu.json`

Sept blocs (types complets dans `menu.types.ts`) :

| Bloc | Rôle | Exemple |
|---|---|---|
| `meta` | Réglages globaux. Aucun prix n'existe dans le fichier | |
| `showcase` | Ce que l'accueil met en scène | Crousty aux tenders, gratiné, algérienne, crudités, Coca |
| `supports` | Ce qui porte les ingrédients, et l'ordre des couches | `pain-sandwich`, `tortilla-wrap`, `galette-tacos`, `bun`, `pain-hot-dog`, `pain-de-mie`, `barquette`, `pot`, `bol-salade`, `assiette`… |
| `ingredients` | Un élément visible : nom, couche, archétype, couleurs, `.glb` optionnel | `tenders`, `gratin-fromage`, `ketchup`, `coca-cola` |
| `optionGroups` | Un choix du client : unique, multiple, interrupteur | `viandes`, `gratine`, `sauces`, `boisson` |
| `formulas` | Ce qui accompagne le produit : barquette, boisson, petite salade, plateau | `frites-maison`, `frites-boisson`, `brasserie` |
| `categories` / `products` | La carte. Un produit hérite du support, des options et de la formule de sa catégorie | `sandwich-crousty` |

### Couches (places dans l'empilement)

Chaque support liste les couches qu'il accepte, **du bas vers le haut** :

| Support | Couches intérieures | Posé dessus |
|---|---|---|
| `pain-sandwich` | sauce-base → meat → cheese → extra → veg → veg-top → sauce | gratin |
| `tortilla-wrap` | sauce-base → meat → cheese → extra → veg → veg-top → sauce | — (donc pas de gratiné) |
| `galette-tacos` | sauce-base → fries → meat → cheese → extra → veg → veg-top → sauce | gratin |
| `bun` | sauce-base → veg → meat → cheese → extra → veg-top → sauce | — |
| `pain-hot-dog` | sauce-base → meat → cheese → extra → veg → veg-top → sauce | — |
| `pain-de-mie` (croques) | sauce-base → meat → cheese → extra → veg → sauce | gratin |
| `barquette` | fries → coating → meat → extra → sauce | — |
| `pot`, `bol-salade`, `petit-bol`, `assiette` | selon le cas (brasserie, salade) | gratin sur l'assiette |
| `emplacement-boisson` | drink | — |

Plusieurs éléments sur la même couche (ex. 3 viandes dans un tacos) : les formes plates s'empilent, les morceaux se répartissent sur la surface.

### Options

- `kind` : `single` (une viande), `multi` (sauces, jusqu'à `max`), `toggle` (gratiné, doublez votre viande).
- `target` : ce que l'option modifie. `main` = le produit (par défaut), `side` / `side2` = accompagnements de la formule, `drink` = la boisson.
- Un choix peut `adds` (ajouter des ingrédients, avec quantité), `removes` (retirer, ex. frites maison → paysannes), `support` (changer de support : pain → tortilla) ou `duplicate` (dupliquer une couche : double, triple, doublez votre viande).
- `note` affiche une mention courte sous le choix, par exemple « Supplément », sans montant.
- `choicesFrom` réutilise une liste : les viandes du tacos reprennent celles du Crousty.
- **Disponibilité automatique** : une option n'est proposée que si le support courant peut l'accueillir. Le gratiné disparaît avec la tortilla sans aucune règle écrite, parce que la tortilla n'a pas de couche « gratin ».

### Ajouter un produit = modifier seulement `menu.json`

```json
{ "id": "sandwich-nouveau", "category": "sandwichs", "name": "Nouveau",
  "description": "[À COMPLÉTER]", "defaults": ["escalope", "boursin", "cheddar"], "badges": ["nouveau"] }
```

Le produit apparaît automatiquement dans la carte, le configurateur, la vue 2D, le récap et les données schema.org.

- **Nouvel ingrédient** : on choisit un archétype existant et des couleurs, sans toucher au code. Pour une forme vraiment nouvelle, on déposera `public/models/ingredients/<id>.glb` et on ajoutera `"glb"`. Le champ existe dans le contrat ; le chargement des `.glb` sera branché à l'étape 3.
- **Garde-fou** : `npm run build` lance d'abord les tests. zod vérifie la forme du fichier, puis des contrôles croisés vérifient que chaque ingrédient référencé existe, que sa couche est acceptée par le support, et que **chaque produit se construit avec chacune de ses options**. S'il y a une erreur, le build s'arrête.
- **Manques** : `npm run menu:report` liste tous les `[À COMPLÉTER]` et `toVerify`. En prévisualisation, ils sont visibles (pastille « À compléter »). En production, un champ manquant n'est **jamais affiché** : la ligne est masquée.

---

## 5. Composants 3D

| Composant | Rôle | Notes performance |
|---|---|---|
| `Stage` | Canvas, caméra, résolution adaptative, pause hors écran ou onglet caché | `PerformanceMonitor` (drei) |
| `WarmLights` | Lumière principale chaude, contre-jour orange flamme, remplissage bleu nuit, reflets d'environnement procéduraux | aucune image HDR à télécharger |
| `Turntable` | Rotation au doigt/souris, zoom limité (0,8–1,3×), angle vertical borné, rotation lente auto après 3 s de repos, boutons ← → au clavier | |
| `Places` | Place le produit, les frites et la boisson, puis recadre la caméra selon ce qui est affiché | |
| `Tray` | Plateau + papier journal vintage généré (titres « Le Crousty », fausses réclames d'époque, gravures) | texture générée une seule fois |
| `Assembly` | Dessine un support et ses ingrédients, calcule les hauteurs d'empilement, ouvre et ferme le support | |
| `IngredientNode` | Cycle de vie d'un élément : entrée → repos → sortie | |
| `ModelSource` | Charge le `.glb` s'il est déclaré, sinon le modèle procédural (même id, même place) | `.glb` chargé à la demande |
| **Supports** (6) | `Bread` (charnière), `Tortilla` (ouverte puis repliée, marques de grill), `Bun` (sésame), `HotdogBun`, `FryBox`, `DrinkSpot` | |
| **Archétypes** (18) | `Patty`, `Cutlet`, `Strips`, `Chunks`, `Crumble`, `Sausage`, `Sliced`, `CheeseSlice`, `Spread`, `Melt`, `Leaf`, `Slices`, `Bits`, `Egg`, `Drizzle`, `Fries`, `Can`, `Bottle` | petits éléments en *instancing* (1 appel de dessin pour 40 frites) |
| **Matériaux** | `melt` (fonte, coulures, dorure, bulles), `sauce` (brillant gras), `crust` (croûte, farine), `fried` (panure en relief), `condensation` (gouttes sur canette) | shaders greffés sur les matériaux PBR standard |
| **Effets** | `Steam` (vapeur en volutes), `Crumbs` (miettes à l'impact) | désactivés en mode économie |

### Le fromage qui fond (pièce maîtresse)

C'est une nappe de 48 × 24 points posée au-dessus du pain, pilotée par trois curseurs :

1. **Fonte** (0 → 1) : la nappe s'affaisse et épouse la forme du pain. Au-delà du bord, des coulures de longueurs irrégulières descendent en gouttes.
2. **Dorure** (0 → 1) : des taches grillées apparaissent d'abord sur les reliefs et les bords, avec des bulles qui gonflent puis se figent. La brillance diminue là où ça grille.
3. **Disparition** (au décochage) : la nappe s'efface par un fondu irrégulier.

Le même matériau, en variante « nappage », sert au cheddar qui coule sur les frites : il part du haut de la pile et s'infiltre entre les frites.

---

## 6. Animations

Règle : **tout effet démarre en moins de 150 ms** après le clic. La suite peut durer, mais le client voit immédiatement que ça réagit.

| Déclencheur | Animation | Durée | Avec « réduire les animations » |
|---|---|---|---|
| Choix d'un produit | L'ancien glisse et rétrécit, le nouveau tombe sur la scène, la caméra recadre | 300 + 450 ms, recadrage 600 ms | fondu 150 ms |
| Ajout d'une garniture | Le pain s'ouvre, l'ingrédient tombe avec un petit rebond (le pain s'écrase légèrement), puis le pain se referme | ouverture 250 ms, chute 450 ms, +50 ms par morceau | apparition directe |
| Changement de viande | L'ancienne se soulève et s'efface pendant que la nouvelle tombe | 220 ms / 450 ms (chevauchés) | fondu croisé |
| Gratiné activé | Le fromage apparaît, fond et coule sur les bords, puis dore (bulles, zones grillées) avec de la vapeur | 150 ms / 900 ms / 2,5 s, vapeur 2 s | fromage déjà doré, fondu 200 ms, sans vapeur |
| Gratiné désactivé | Le fromage s'efface par un fondu irrégulier | 400 ms | fondu 150 ms |
| Sauce | Un filet se dessine en zigzag avec une goutte au bout. Une 2ᵉ sauce trace un zigzag décalé | 600 ms | apparition directe |
| Crudités | La salade virevolte, les rondelles tombent en tournant, les oignons tombent en pluie | 500 ms | apparition directe |
| Suppléments | L'œuf glisse (le jaune tremble), le cheddar s'affaisse, le boursin s'étale, le bacon ondule | 400–500 ms | apparition directe |
| Frites | La barquette apparaît, les frites tombent en pluie, le cheddar coule, puis la pluie de bacon ou les morceaux de viande | 200 / 600 / 800 / 500 ms | apparition directe |
| Boisson | La canette arrive en glissant, oscille puis se pose, avec des gouttes de condensation | 400 ms | fondu |
| Formule complète | Le plateau papier journal glisse sous l'ensemble et la caméra recule | 500 / 600 ms | fondu |
| Repos | Rotation lente automatique | après 3 s | désactivée |
| Récap | La nouvelle ligne glisse, la pastille « articles » rebondit | 250 ms | sans mouvement |

**Accueil au scroll** (section épinglée, animée au défilement) :

| Défilement | Effet |
|---|---|
| 0 % | Le sandwich gratiné tourne, le fromage coule, la vapeur monte. Une image fixe s'affiche d'abord, remplacée par la 3D dès qu'elle est prête |
| 0 → 35 % | Éclaté : le dessus se soulève, chaque couche s'écarte, des étiquettes reprennent les noms de `menu.json` |
| 35 → 65 % | Les ingrédients flottent et pivotent de trois quarts |
| 65 → 100 % | Tout se reconstitue, le fromage recoule, puis « Composer mon menu » / « Voir la carte » |

Avec « réduire les animations », il n'y a pas d'épinglage : on affiche une image fixe et l'éclaté en statique.

---

## 7. Plan B 2D, accessibilité, performance

**Plan B 2D.** Il lit le même BuildSpec. Chaque archétype a un dessin SVG coloré avec les couleurs de `menu.json`, et les entrées et sorties sont faites en CSS. Il s'active dans ces cas :
- pas de WebGL ;
- l'appareil reste sous 30 i/s après les réglages de secours ;
- mémoire ≤ 2 Go ou mode « économie de données » ;
- choix « Mode léger » du client (mémorisé).

**Réglages de secours, dans l'ordre :**
1. baisser la résolution (1,5 → 1) ;
2. couper la vapeur et réduire le nombre de frites ;
3. couper l'anticrénelage ;
4. passer en 2D.

**Accessibilité.**
- Le **formulaire d'options est la vraie interface** (boutons radio et cases natifs, groupés). La 3D n'en est que le reflet : le site marche au clavier, au lecteur d'écran et sans WebGL.
- La scène porte une description qui suit la composition (« Sandwich Tenders gratiné, frites cheddar bacon, Coca-Cola »). Une zone annonce les changements (« Gratiné ajouté »).
- Onglets au clavier (flèches), focus visible (anneau jaune cheddar), zones tactiles ≥ 44 px, zoom 200 % sans casse.
- Contrastes vérifiés : blanc sur bleu nuit ≈ 19:1 · jaune cheddar sur bleu nuit ≈ 12:1 · orange flamme sur bleu nuit ≈ 6,6:1 · texte blanc sur bouton rouge ≈ 4,6:1. Le **rouge sur fond sombre (≈ 4:1)** est réservé aux grands titres.

**Budget performance (smartphone milieu de gamme, 4G) :**

| Poste | Budget |
|---|---|
| Accueil : HTML + CSS + JS critique | < 90 Ko compressés |
| Image fixe de l'accueil (AVIF) | < 120 Ko, premier affichage < 2,5 s |
| Paquet 3D (three + R3F + drei + GSAP) | ~250–300 Ko compressés, chargé **après** le premier affichage |
| Scène complète (formule) | < 150 appels de dessin, < 150 k triangles, pas d'ombres temps réel (ombre de contact précalculée), textures ≤ 512 px |
| `.glb` designer | ≤ 300 Ko chacun (Draco/Meshopt + KTX2), chargés seulement si l'ingrédient est affiché |
| Fluidité | 60 i/s visés, rendu mis en pause hors écran |

---

## 8. Identité visuelle

| Élément | Choix |
|---|---|
| Couleurs | bleu nuit `#0B1020` · noir `#06070B` · rouge vif `#E3262B` · orange flamme `#FF6A13` · jaune cheddar `#FFC21A` · blanc `#FFFFFF` · papier journal `#EFE6D2` · bois `#8A5A33` |
| Titres | **Anton** (grasse, condensée), en capitales. En option, une touche « pinceau » pour les noms de catégories, comme sur l'affiche |
| Texte | **Inter** : très lisible en petit sur mobile |
| Motifs | Pictogrammes au trait comme au mur (burger, frites, hot-dog, sandwich, bouteille, glace), en fond discret. La glace reste un motif décoratif : aucun dessert n'est à la carte |
| Textures | Papier journal vintage (plateau, bandeaux de section), bois (surface de la scène) |
| Ton | Court, gourmand, direct. Exemples de titres d'interface : « Ta viande », « Gratiné ? », « Tes sauces ». Les descriptions produits restent `[À COMPLÉTER]` jusqu'à validation |

---

## 9. Référencement local

- Pages pré-rendues, `lang="fr"`, balises canoniques, `sitemap.xml`, `robots.txt`.
- Titre d'accueil proposé : **« Le Crousty — Fast-food à Bonneuil-sur-Marne | Tacos, sandwichs gratinés, burgers »**.
- Description : « Tacos et sandwichs gratinés, smash burgers, frites cheddar : compose ton menu en 3D chez Le Crousty, fast-food à Bonneuil-sur-Marne (94). » La mention de la livraison sera ajoutée seulement si elle est confirmée.
- Données structurées `Restaurant` + `Menu` → `MenuSection` → `MenuItem`, **générées depuis `menu.json`**, sans prix. L'adresse, le téléphone et les horaires ne sont publiés qu'une fois renseignés : on ne publie jamais un `[À COMPLÉTER]`.
- Aperçus réseaux sociaux : image 1200 × 630 (rendu du sandwich gratiné), titre et description.
- Nom, adresse et téléphone identiques à la fiche Google du restaurant.

---

## 10. Décisions validées (tes réponses)

| Sujet | Décision |
|---|---|
| Prix | Aucun prix, nulle part. Le fichier n'en contient pas ; un test le vérifie |
| Commande | Aucune : le site est une vitrine. Pas de bouton « Commander » |
| Source de vérité | La carte affichée en boutique (2ᵉ photo), pas le brief |
| Sandwich Tenders | N'existe pas sur la carte : c'est le **Crousty** avec tenders (viande au choix) |
| Simple / double / triple | Seulement pour Whoop et Cheese. Ailleurs, on ajoute de la viande via les suppléments |
| Pain des sandwichs | Pain (celui de la photo du plat) **ou tortilla**. Pas de gratinage sur la tortilla |
| Gratiné | À l'emmental, sur tous les sandwichs et sur les tacos |
| Sauces | 2 au maximum |
| Crudités | Salade, tomates, oignons |
| Suppléments | Œuf, cheddar, **bacon**, oignons caramélisés (vus sur l'affiche), boursin, tandoori, curry, tenders, merguez, pastrami, escalope |
| Frites du menu | Frites maison ; les **frites paysannes** en supplément à la place. Les frites garnies se vendent à part |
| Boissons | En canette, génériques colorées, nom écrit en clair, sans logo |
| Boisson du menu | Incluse pour les classics et les smash (1ʳᵉ photo). En option (« boisson + ») pour les sandwichs, gratinés, burgers gourmets, hot-dogs (2ᵉ photo) |
| Nouvelles catégories (2ᵉ photo) | Gratinés, Croques, Brasserie, Salade signature, Starters : ajoutées à `menu.json` |
| Étape 4 | Les autres pages (carte, formules, galerie, infos, pied de page) |
| Adresse, horaires… | Plus tard |

## 11. Questions restantes (non bloquantes pour l'étape 3)

Toutes sont aussi listées par `npm run menu:report`.

1. **Gratinés** : même fromage (emmental) ? Sauces, crudités et suppléments possibles ?
2. **Tacos** : tailles ? La même viande deux fois ? Servis avec frites / boisson ?
3. **Hot-dogs et croques** : composition de chacun ? Boisson en option ?
4. **180G / 360G / 540G** : trois tailles du même burger ? Y a-t-il du fromage ?
5. **Textes peu lisibles** : Country, So Giant, « sauce Anoli » (aïoli ?) du Wood, salade signature (« grenades », « pommes » ?), « Saltiboca » (Saltimbocca ?), quantités des onion rings et des brochettes bœuf-fromage.
6. **Bacon** : de bœuf ou de dinde, dans les burgers et sur les frites ?
7. **Boissons** : variantes exactes (cocas, Oasis) ? L'eau aussi en canette ?
8. **Badges** Best-seller / Épicé / Nouveau : lesquels ?
9. **Photos** : droits sur les photos, autres photos, logo vectoriel ?
10. **Mise en ligne** : adresse, téléphone, horaires, réseaux, mentions légales, nom de domaine.
