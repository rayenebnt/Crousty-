/**
 * Validation de menu.json : forme (zod) + contrôles croisés.
 * Appelée au build (tests) et par `npm run menu:report`.
 */
import { z } from "zod";
import {
  INGREDIENT_ARCHETYPES,
  LAYERS,
  SUPPORT_ARCHETYPES,
  type Id,
  type IngredientRef,
  type Menu,
} from "../data/menu.types.ts";

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "identifiant kebab-case attendu");
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "couleur hex attendue");
const layer = z.enum(LAYERS as [string, ...string[]]);
const source = z.enum(["brief", "photo", "restaurant"]).optional();
const ingredientRef = z.union([id, z.object({ id, qty: z.number().int().min(1).max(5) })]);
const anim = z
  .object({
    enter: z.enum(["drop-bounce", "flutter", "slide-in", "pour", "melt", "rain", "pop", "none"]).optional(),
    exit: z.enum(["lift-fade", "dissolve", "slide-out", "none"]).optional(),
  })
  .optional();

const visual = <T extends readonly string[]>(archetypes: T) =>
  z.object({
    archetype: z.enum(archetypes as unknown as [string, ...string[]]),
    variant: z.string().optional(),
    color: hex.optional(),
    color2: hex.optional(),
    count: z.number().int().min(1).max(80).optional(),
    size: z.number().min(0.3).max(3).optional(),
    label: z.string().optional(),
    glb: z.string().optional(),
    anim,
  });

const choice = z.object({
  id,
  label: z.string().min(1),
  note: z.string().optional(),
  adds: z.array(ingredientRef).optional(),
  removes: z.array(id).optional(),
  support: id.optional(),
  duplicate: z.object({ layer, times: z.number().int().min(1).max(3) }).optional(),
  requires: z.object({ group: id, choice: id }).optional(),
  default: z.boolean().optional(),
  toVerify: z.string().optional(),
});

const target = z.enum(["main", "side", "side2", "drink"]);
const place = z.object({ support: id, defaults: z.array(ingredientRef) });

export const menuSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    restaurant: z.string(),
    city: z.string(),
    validatedByRestaurant: z.boolean(),
    todoMarker: z.literal("[À COMPLÉTER]"),
  }),
  showcase: z.object({ hero: z.object({ product: id, selections: z.record(id, z.array(id)) }) }),
  supports: z.record(
    id,
    z.object({
      label: z.string(),
      visual: visual(SUPPORT_ARCHETYPES),
      opens: z.boolean().optional(),
      layers: z.array(layer).min(1),
      onTop: z.array(layer).optional(),
      source,
      toVerify: z.string().optional(),
    }),
  ),
  ingredients: z.record(
    id,
    z.object({ label: z.string().min(1), layer, visual: visual(INGREDIENT_ARCHETYPES), source, toVerify: z.string().optional() }),
  ),
  optionGroups: z.record(
    id,
    z.object({
      label: z.string().min(1),
      kind: z.enum(["single", "multi", "toggle"]),
      min: z.number().int().min(0).optional(),
      max: z.number().int().min(1).nullable().optional(),
      allowRepeat: z.boolean().optional(),
      target: target.optional(),
      choicesFrom: id.optional(),
      choices: z.array(choice).optional(),
      source,
      toVerify: z.string().optional(),
    }),
  ),
  formulas: z.record(
    id,
    z.object({
      label: z.string(),
      places: z.object({ side: place.optional(), side2: place.optional(), drink: place.optional() }),
      optionGroups: z.array(id),
      tray: z.boolean(),
      source,
      toVerify: z.string().optional(),
    }),
  ),
  categories: z.array(
    z.object({
      id,
      label: z.string(),
      picto: z.enum(["burger", "sandwich", "tacos", "hotdog", "fries", "bottle", "icecream", "plate", "salad"]),
      support: id,
      optionGroups: z.array(id),
      formula: id.nullable(),
      source,
      toVerify: z.string().optional(),
    }),
  ),
  products: z.array(
    z.object({
      id,
      category: id,
      name: z.string().min(1),
      description: z.string(),
      defaults: z.array(ingredientRef),
      support: id.optional(),
      optionGroups: z.array(id).optional(),
      formula: id.nullable().optional(),
      badges: z.array(z.enum(["epice", "best-seller", "nouveau"])),
      source,
      toVerify: z.string().optional(),
    }),
  ),
});

const refId = (r: IngredientRef): Id => (typeof r === "string" ? r : r.id);

/** Contrôles que zod ne sait pas faire : références et compatibilité des couches. */
export function crossCheck(menu: Menu): string[] {
  const errors: string[] = [];
  const accepts = (supportId: Id, layerId: string) => {
    const s = menu.supports[supportId];
    return !!s && (s.layers.includes(layerId as never) || (s.onTop ?? []).includes(layerId as never));
  };
  const choicesOf = (groupId: Id) => {
    const g = menu.optionGroups[groupId];
    return (g?.choicesFrom ? menu.optionGroups[g.choicesFrom]?.choices : g?.choices) ?? [];
  };
  const checkIngredients = (ctx: string, supports: Id[], refs: IngredientRef[]) => {
    for (const r of refs) {
      const ing = menu.ingredients[refId(r)];
      if (!ing) {
        errors.push(`${ctx} : ingrédient inconnu « ${refId(r)} »`);
        continue;
      }
      for (const s of supports) {
        if (!menu.supports[s]) errors.push(`${ctx} : support inconnu « ${s} »`);
        else if (!accepts(s, ing.layer)) errors.push(`${ctx} : « ${refId(r)} » (couche ${ing.layer}) ne va pas sur « ${s} »`);
      }
    }
  };

  for (const [gid, g] of Object.entries(menu.optionGroups)) {
    if (g.choicesFrom && !menu.optionGroups[g.choicesFrom]) errors.push(`groupe ${gid} : choicesFrom inconnu`);
    if (!choicesOf(gid).length) errors.push(`groupe ${gid} : aucun choix`);
    for (const c of choicesOf(gid)) {
      if (c.support && !menu.supports[c.support]) errors.push(`groupe ${gid}/${c.id} : support inconnu`);
      if (c.requires && !choicesOf(c.requires.group).some((x) => x.id === c.requires!.choice))
        errors.push(`groupe ${gid}/${c.id} : choix requis inconnu « ${c.requires.group}/${c.requires.choice} »`);
    }
  }

  for (const [fid, f] of Object.entries(menu.formulas)) {
    for (const [pid, p] of Object.entries(f.places)) if (p) checkIngredients(`formule ${fid}/${pid}`, [p.support], p.defaults);
    for (const gid of f.optionGroups) {
      const g = menu.optionGroups[gid];
      if (!g) {
        errors.push(`formule ${fid} : groupe inconnu « ${gid} »`);
        continue;
      }
      const t = g.target ?? "main";
      const p = t === "main" ? undefined : f.places[t];
      if (!p) errors.push(`formule ${fid} : le groupe ${gid} vise « ${t} », absent de la formule`);
      else checkIngredients(`formule ${fid}/${gid}`, [p.support], choicesOf(gid).flatMap((c) => c.adds ?? []));
    }
  }

  const productIds = new Set<Id>();
  for (const p of menu.products) {
    if (productIds.has(p.id)) errors.push(`produit en double « ${p.id} »`);
    productIds.add(p.id);
    const cat = menu.categories.find((c) => c.id === p.category);
    if (!cat) {
      errors.push(`${p.id} : catégorie inconnue « ${p.category} »`);
      continue;
    }
    const formula = p.formula !== undefined ? p.formula : cat.formula;
    if (formula && !menu.formulas[formula]) errors.push(`${p.id} : formule inconnue « ${formula} »`);
    const groups = p.optionGroups ?? cat.optionGroups;
    // Tous les supports que le client peut obtenir pour ce produit.
    const supports = new Set<Id>([p.support ?? cat.support]);
    for (const gid of groups) for (const c of choicesOf(gid)) if (c.support) supports.add(c.support);
    checkIngredients(p.id, [...supports], p.defaults);
    for (const gid of groups) {
      const g = menu.optionGroups[gid];
      if (!g) {
        errors.push(`${p.id} : groupe inconnu « ${gid} »`);
        continue;
      }
      // Une option de la catégorie peut viser un emplacement de la formule (ex. frites cheddar → frites).
      const tgt = g.target ?? "main";
      const place = tgt === "main" ? null : formula ? menu.formulas[formula]?.places[tgt] : undefined;
      if (tgt !== "main" && !place) {
        errors.push(`${p.id} : le groupe ${gid} vise « ${tgt} », absent de sa formule`);
        continue;
      }
      const targetSupports = place ? [place.support] : [...supports];
      // Une option peut être indisponible sur un des supports (ex. gratiné sur tortilla),
      // mais doit être possible sur au moins un.
      for (const c of choicesOf(gid)) {
        for (const r of c.adds ?? []) {
          const ing = menu.ingredients[refId(r)];
          if (!ing) errors.push(`${p.id}/${gid}/${c.id} : ingrédient inconnu « ${refId(r)} »`);
          else if (!targetSupports.some((s) => accepts(s, ing.layer)))
            errors.push(`${p.id}/${gid}/${c.id} : « ${refId(r)} » ne va sur aucun support du produit`);
        }
      }
    }
  }

  const hero = menu.showcase.hero;
  const heroProduct = menu.products.find((p) => p.id === hero.product);
  if (!heroProduct) errors.push(`showcase : produit inconnu « ${hero.product} »`);
  else {
    for (const [gid, ids] of Object.entries(hero.selections)) {
      const valid = new Set(choicesOf(gid).map((c) => c.id));
      for (const cid of ids) if (!valid.has(cid)) errors.push(`showcase : choix inconnu ${gid}/${cid}`);
    }
  }
  return errors;
}

export function validateMenu(raw: unknown): { menu: Menu | null; errors: string[] } {
  const parsed = menuSchema.safeParse(raw);
  if (!parsed.success) {
    return { menu: null, errors: parsed.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`) };
  }
  const menu = parsed.data as Menu;
  return { menu, errors: crossCheck(menu) };
}

