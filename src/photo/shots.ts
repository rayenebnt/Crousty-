/**
 * Prises de vue : quelle photo réelle il faut pour chaque ingrédient et chaque support.
 *
 * Même principe que les identifiants de menu.json : une photo s'appelle comme
 * l'ingrédient (`tenders`), avec un état si besoin (`gratin-fromage__apres`).
 * La liste des photos à prendre est générée d'ici (npm run photos:liste) et le
 * rendu cherche les fichiers sous ces noms. Aucune dépendance à React ni au navigateur.
 */
import type { Id, Ingredient, IngredientArchetype, Menu, Support } from "../data/menu.types.ts";
import { productContext } from "../domain/catalog.ts";

export type ShotKind = "decor" | "support" | "ingredient" | "produit";

export interface Shot {
  /** Nom du fichier attendu (sans extension). */
  file: string;
  kind: ShotKind;
  /** Identifiant dans menu.json (ou nom du décor). */
  id: Id;
  state?: string;
  lot: 1 | 2;
  title: string;
  /** Consigne pour la personne qui photographie. */
  how: string;
  /** Même cadrage que ce fichier : ne bouger ni le téléphone ni l'aliment entre les deux photos. */
  alignWith?: string;
  /** Taille réelle approximative (cm), utilisée tant que la photo n'existe pas. */
  sizeCm: [number, number];
  /** Produits qui utilisent cette photo. */
  usedBy: string[];
}

/** Catégories couvertes par le lot 1 (configurateur de l'étape 2). */
export const LOT1_CATEGORIES = ["sandwichs", "gratines"];

export const shotName = (id: Id, state?: string) => (state ? `${id}__${state}` : id);

/** Catégories dont le produit fini peut être photographié d'un bloc (pas d'options). Aucune pour l'instant. */
export const PRODUCT_PHOTO_CATEGORIES: string[] = [];
export const productShotName = (productId: Id) => `produit__${productId}`;

/** Décors : le plateau papier journal (formule) et la feuille seule (produit seul). */
export const DECOR = {
  tray: { file: "plateau-journal", sizeCm: [45, 33] as [number, number] },
  sheet: { file: "journal", sizeCm: [36, 28] as [number, number] },
};

/** Contexte dans lequel un ingrédient est photographié. */
type Context = "long" | "tas" | "boisson";

function contextOf(support: Support): Context {
  const a = support.visual.archetype;
  if (a === "drink-spot") return "boisson";
  if (a === "fry-box" || a === "pot" || a === "bowl" || a === "plate") return "tas";
  return "long";
}

const SIZE_LONG: Partial<Record<IngredientArchetype, [number, number]>> = {
  egg: [11, 9],
  can: [11.5, 6.6],
  bottle: [22, 7],
  fries: [17, 14],
  drizzle: [20, 5],
  sausage: [20, 5],
  "cheese-slice": [20, 7],
  leaf: [20, 7],
};

/** Consigne de prise de vue selon la forme de l'ingrédient. */
function howTo(ing: Ingredient, ctx: Context): string {
  const a = ing.visual.archetype;
  if (a === "can") return "La canette couchée, étiquette vers le haut, bien droite.";
  if (a === "bottle") return "La bouteille couchée, étiquette vers le haut.";
  if (a === "fries") return "Une portion normale en tas, directement sur le fond, comme servie sur le plateau.";
  if (a === "drizzle") return "Un filet de sauce en zigzag d'environ 20 cm, fait avec le flacon habituel, sur une assiette.";
  if (ctx === "tas") return "La portion habituelle posée en petit tas (comme sur les frites), sans les frites.";
  if (a === "leaf" || a === "bits" || a === "slices") return "La portion d'un sandwich, étalée en long (≈ 20 cm × 6 cm), comme dans le pain.";
  if (a === "egg") return "L'œuf tel qu'il est servi dans le sandwich.";
  if (a === "cheese-slice" || a === "spread") return "La quantité d'un sandwich, posée en long comme dans le pain (≈ 20 cm).";
  return "La portion d'un sandwich, posée en long comme dans le pain (≈ 20 cm × 6 cm), sans le pain.";
}

function ingredientShots(ing: Ingredient, id: Id, ctx: Context): Omit<Shot, "lot" | "usedBy">[] {
  const a = ing.visual.archetype;
  if (a === "melt" && ing.visual.variant === "pour") {
    // Nappage : photographié sur les frites, au même cadrage que la photo des frites seules.
    return [
      {
        file: shotName(id, "sur-frites"),
        kind: "ingredient",
        id,
        state: "sur-frites",
        title: `${ing.label} (sur les frites)`,
        how: "Le tas de frites de la photo « frites », nappé de cheddar comme au service. Ne bouge ni le tas ni le téléphone entre les deux photos.",
        alignWith: "frites",
        sizeCm: [17, 14],
      },
    ];
  }
  if (a === "melt") {
    // Gratiné : même sandwich, avant et après le four, au même cadrage.
    return [
      {
        file: shotName(id, "avant"),
        kind: "ingredient",
        id,
        state: "avant",
        title: `${ing.label} : avant le four`,
        how: "Un sandwich garni (tenders par exemple) avec le fromage râpé posé dessus, juste avant d'enfourner.",
        sizeCm: [27, 10],
      },
      {
        file: shotName(id, "apres"),
        kind: "ingredient",
        id,
        state: "apres",
        title: `${ing.label} : sorti du four`,
        how: "Le même sandwich à la sortie du four, remis exactement à la même place. Ne bouge pas le téléphone entre les deux photos.",
        alignWith: shotName(id, "avant"),
        sizeCm: [27, 10],
      },
    ];
  }
  const state = ctx === "tas" && a !== "fries" ? "tas" : undefined;
  return [
    {
      file: shotName(id, state),
      kind: "ingredient",
      id,
      state,
      title: state ? `${ing.label} (en tas)` : ing.label,
      how: howTo(ing, ctx),
      sizeCm: ctx === "tas" && a !== "fries" ? [11, 9] : (SIZE_LONG[a] ?? [20, 6]),
    },
  ];
}

function supportShots(s: Support, id: Id): Omit<Shot, "lot" | "usedBy">[] {
  const a = s.visual.archetype;
  if (a === "bread")
    return [{ file: shotName(id, "ouvert"), kind: "support", id, state: "ouvert", title: `${s.label} ouvert, vide`, how: "Le pain fendu sur le dessus comme pour le garnir, vide, légèrement écarté.", sizeCm: [27, 10] }];
  if (a === "tortilla" && s.visual.variant === "wrap")
    return [
      { file: shotName(id, "a-plat"), kind: "support", id, state: "a-plat", title: "Tortilla à plat, vide", how: "La tortilla posée à plat, vide.", sizeCm: [26, 26] },
      { file: shotName(id, "roulee"), kind: "support", id, state: "roulee", title: "Tortilla roulée, garnie", how: "Une tortilla garnie et roulée, telle qu'elle est servie.", sizeCm: [24, 7] },
    ];
  // Frites servies directement sur le papier ; boisson posée à même le plateau.
  if (a === "fry-box" || a === "drink-spot") return [];
  return [{ file: shotName(id, "vide"), kind: "support", id, state: "vide", title: `${s.label}, vide`, how: `${s.label} vide, tel qu'il arrive au client.`, sizeCm: [20, 14] }];
}

/** Toutes les photos à prendre, lot 1 d'abord. */
export function shotList(menu: Menu): Shot[] {
  const out = new Map<string, Shot>();
  const add = (s: Omit<Shot, "lot" | "usedBy">, lot: 1 | 2, product: string) => {
    const cur = out.get(s.file);
    if (cur) {
      if (!cur.usedBy.includes(product)) cur.usedBy.push(product);
      if (lot < cur.lot) cur.lot = lot;
    } else out.set(s.file, { ...s, lot, usedBy: [product] });
  };

  for (const lot of [1, 2] as const) {
    const products = menu.products.filter((p) => LOT1_CATEGORIES.includes(p.category) === (lot === 1));
    for (const p of products) {
      const ctx = productContext(menu, p.id);
      const name = `${ctx.category.label} ${p.name}`;
      const mainSupports = new Set<Id>([ctx.baseSupport]);
      for (const g of ctx.groups) if (g.target === "main") for (const c of g.choices) if (c.support) mainSupports.add(c.support);
      if (ctx.formula) add({ file: DECOR.tray.file, kind: "decor", id: DECOR.tray.file, title: "Plateau et papier journal, vide", how: "Le plateau noir avec sa feuille de papier journal, vide, photographié en entier.", sizeCm: DECOR.tray.sizeCm }, lot, name);
      else add({ file: DECOR.sheet.file, kind: "decor", id: DECOR.sheet.file, title: "Feuille de papier journal seule", how: "Une feuille de papier journal posée à plat, en entier.", sizeCm: DECOR.sheet.sizeCm }, lot, name);
      // Produit vendu tel quel (frites garnies) : une photo du produit fini suffit.
      if (PRODUCT_PHOTO_CATEGORIES.includes(p.category))
        add({ file: productShotName(p.id), kind: "produit", id: p.id, title: `${name} (produit fini)`, how: "Le produit fini, tel qu'il est servi, en entier.", sizeCm: [18, 15] }, lot, name);

      const place = (supportId: Id, ingredientIds: Id[]) => {
        const support = menu.supports[supportId];
        for (const s of supportShots(support, supportId)) add(s, lot, name);
        const accepted = new Set([...support.layers, ...(support.onTop ?? [])]);
        for (const iid of ingredientIds) {
          const ing = menu.ingredients[iid];
          if (!ing || !accepted.has(ing.layer)) continue;
          for (const s of ingredientShots(ing, iid, contextOf(support))) add(s, lot, name);
        }
      };
      const ref = (r: string | { id: string }) => (typeof r === "string" ? r : r.id);
      const mainIngredients = [
        ...p.defaults.map(ref),
        ...ctx.groups.filter((g) => g.target === "main").flatMap((g) => g.choices.flatMap((c) => (c.adds ?? []).map(ref))),
      ];
      for (const sid of mainSupports) place(sid, mainIngredients);
      for (const [pid, pl] of Object.entries(ctx.formula?.places ?? {})) {
        if (!pl) continue;
        const adds = ctx.groups.filter((g) => g.target === pid).flatMap((g) => g.choices.flatMap((c) => (c.adds ?? []).map(ref)));
        place(pl.support, [...pl.defaults.map(ref), ...adds]);
      }
    }
  }
  const kindOrder: Record<ShotKind, number> = { decor: 0, produit: 1, support: 2, ingredient: 3 };
  const layerOrder = ["fries", "meat", "extra", "cheese", "sauce-base", "veg", "veg-top", "sauce", "coating", "gratin", "drink"];
  const added = [...out.keys()];
  return [...out.values()].sort(
    (a, b) =>
      a.lot - b.lot ||
      kindOrder[a.kind] - kindOrder[b.kind] ||
      layerOrder.indexOf(menu.ingredients[a.id]?.layer ?? "") - layerOrder.indexOf(menu.ingredients[b.id]?.layer ?? "") ||
      a.id.localeCompare(b.id) ||
      added.indexOf(a.file) - added.indexOf(b.file),
  );
}

/** Photo à utiliser pour un ingrédient posé sur un support donné. */
export function ingredientShot(menu: Menu, ingredientId: Id, supportId: Id): { file: string; sizeCm: [number, number] }[] {
  const ing = menu.ingredients[ingredientId];
  const support = menu.supports[supportId];
  if (!ing || !support) return [];
  return ingredientShots(ing, ingredientId, contextOf(support)).map((s) => ({ file: s.file, sizeCm: s.sizeCm }));
}

/** Photos d'un support (pain ouvert, tortilla à plat / roulée…). */
export function supportShot(menu: Menu, supportId: Id): { file: string; state?: string; sizeCm: [number, number] }[] {
  const support = menu.supports[supportId];
  return support ? supportShots(support, supportId).map((s) => ({ file: s.file, state: s.state, sizeCm: s.sizeCm })) : [];
}
