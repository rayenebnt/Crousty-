# Le Crousty — site du restaurant

Fast-food à Bonneuil-sur-Marne (94) : sandwichs et tacos gratinés, burgers, hot-dogs, frites garnies.
Site vitrine avec configurateur de menu en 3D (React + TypeScript, React Three Fiber, GSAP, Tailwind, Zustand).

## Avancement

| Étape | Contenu | Statut |
|---|---|---|
| 1 | Arborescence, modèle `menu.json`, composants 3D, animations, questions | **À valider** → [`docs/etape-1-proposition.md`](docs/etape-1-proposition.md) |
| 2 | Configurateur sur un produit complet (Sandwich Tenders + gratiné + frites + boisson) | À venir |
| 3 | Généralisation à toute la carte | À venir |
| 4 | Autres pages (carte, formules, galerie, infos) | À venir |
| 5 | Performance, mobile, accessibilité, finitions | À venir |

## Données

- `src/data/menu.json` : source unique de la carte (brouillon, aucun prix, manques marqués `[À COMPLÉTER]`).
- `src/data/menu.types.ts` : contrat du fichier.
- `src/data/restaurant.json` : infos pratiques (à remplir).
