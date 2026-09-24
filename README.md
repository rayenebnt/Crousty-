# Le Crousty — site du restaurant

Fast-food à Bonneuil-sur-Marne (94) : Crousty (bols de riz), sandwichs gratinés, tacos, burgers, brasserie, desserts.
Site vitrine d'une page (sans prix ni commande) :
- un accueil animé au défilement, qui fait entrer le visiteur dans le restaurant (d'après la vidéo TikTok) ;
- un configurateur de menu qui assemble **de vraies photos** des plats ;
- la carte complète, une galerie et les infos pratiques.

Stack : React + TypeScript (Vite), React Three Fiber (affichage des photos), Tailwind CSS, Zustand, zod, Vitest.

## Lancer

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # tests de la carte et du configurateur
npm run build          # tests + typage + build de production
npm run menu:report    # tout ce qui reste à compléter / vérifier dans la carte
npm run photos:liste   # liste des photos à prendre (docs/photos/liste-des-photos.md)

# Traiter les photos déposées dans photos/brutes (détourage, échelle, WebP)
cd tools/photos && npm install && cd ../..
node tools/photos/preparer.mjs
```

## Avancement

| Étape | Contenu | Statut |
|---|---|---|
| 1 | Arborescence, modèle `menu.json`, composants 3D, animations, questions | Validée → [`docs/etape-1-proposition.md`](docs/etape-1-proposition.md) |
| 2 | Configurateur sur un produit complet (Crousty + gratiné + frites + boisson), en photos réelles | **En attente des photos** → [`docs/etape-2-configurateur.md`](docs/etape-2-configurateur.md), [`docs/photos/protocole.md`](docs/photos/protocole.md) |
| 3 | Généralisation à toute la carte | À venir |
| 4 | Site complet : accueil animé, carte, galerie, infos, pied de page | **À valider** → [`docs/etape-4-site.md`](docs/etape-4-site.md) |
| 5 | Performance, mobile, accessibilité, finitions | À venir |

## Où est quoi

| Dossier | Rôle |
|---|---|
| `src/data/menu.json` | **Source unique** de la carte. Ajouter un produit = modifier ce fichier |
| `src/data/menu.types.ts` | Contrat du fichier (types commentés) |
| `src/domain/` | Logique pure et testée : sélections, `resolveBuild`, récap, validation |
| `src/photo/` | Rendu photo : liste des prises de vue, calques, fondus (gratiné, nappage), relief |
| `src/scene/` | Outils communs : animations, vapeur, papier journal de secours |
| `tools/photos/` | Outil hors site : prépare les photos brutes (détourage, échelle, WebP) |
| `photos/brutes/` | Photos déposées par le restaurant |
| `public/photos/` | Photos prêtes pour le site (générées) |
| `src/ui/` | Interface du configurateur : options accessibles, récap |
| `src/site/` | Les sections du site : accueil animé, carte, le resto, infos, pied de page |
| `src/data/restaurant.json` | Infos pratiques (adresse, horaires…) : « [À COMPLÉTER] » tant qu'elles manquent |
| `tools/hero/` | Outil hors site : vidéo → images de l'accueil (filigrane effacé, personne détourée), galerie |
| `public/hero/`, `public/galerie/` | Images de l'accueil et de la galerie (générées) |
| `tests/` | Chaque produit × chaque option se construit ; règles du configurateur |
