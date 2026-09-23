# Le Crousty — site du restaurant

Fast-food à Bonneuil-sur-Marne (94) : sandwichs et tacos gratinés, burgers, hot-dogs, croques, brasserie, frites garnies.
Site vitrine (sans prix ni commande) avec un configurateur de menu en 3D.

Stack : React + TypeScript (Vite), React Three Fiber + drei, Tailwind CSS, Zustand, zod, Vitest.

## Lancer

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # tests de la carte et du configurateur
npm run build          # tests + typage + build de production
npm run menu:report    # tout ce qui reste à compléter / vérifier dans la carte
```

## Avancement

| Étape | Contenu | Statut |
|---|---|---|
| 1 | Arborescence, modèle `menu.json`, composants 3D, animations, questions | Validée → [`docs/etape-1-proposition.md`](docs/etape-1-proposition.md) |
| 2 | Configurateur sur un produit complet (Crousty + gratiné + frites + boisson) | **À valider** → [`docs/etape-2-configurateur.md`](docs/etape-2-configurateur.md) |
| 3 | Généralisation à toute la carte | À venir |
| 4 | Autres pages (accueil, carte, formules, galerie, infos) | À venir |
| 5 | Performance, mobile, accessibilité, finitions | À venir |

## Où est quoi

| Dossier | Rôle |
|---|---|
| `src/data/menu.json` | **Source unique** de la carte. Ajouter un produit = modifier ce fichier |
| `src/data/menu.types.ts` | Contrat du fichier (types commentés) |
| `src/domain/` | Logique pure et testée : sélections, `resolveBuild`, récap, validation |
| `src/three/` | Scène 3D : supports, formes procédurales, fromage qui fond, animations |
| `src/ui/` | Interface : options accessibles, récap |
| `tests/` | Chaque produit × chaque option se construit ; règles du configurateur |
