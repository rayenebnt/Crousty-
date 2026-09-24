/**
 * Textes dérivés d'une composition : récap à l'écran, description pour
 * lecteur d'écran, liste d'ingrédients d'une fiche produit.
 */
import type { Id, IngredientRef, Menu, Selections } from "../data/menu.types.ts";
import { productContext } from "./catalog.ts";
import { sanitize } from "./selections.ts";

export interface SummaryLine {
  groupId: Id;
  label: string;
  values: string[];
}

export interface Summary {
  title: string;
  category: string;
  formula: string | null;
  lines: SummaryLine[];
  /** Phrase complète (aria-label de la scène 3D). */
  sentence: string;
}

const refId = (r: IngredientRef) => (typeof r === "string" ? r : r.id);
const qtyWord = (n: number) => (n === 2 ? "double " : n === 3 ? "triple " : "");

/** Ingrédients de base, lisibles : « Steak, escalope, double cheddar ». */
export function ingredientList(menu: Menu, refs: IngredientRef[]): string[] {
  const counts = new Map<Id, number>();
  for (const r of refs) counts.set(refId(r), (counts.get(refId(r)) ?? 0) + (typeof r === "string" ? 1 : r.qty));
  return [...counts].map(([id, n]) => `${qtyWord(n)}${menu.ingredients[id]?.label ?? id}`);
}

export function describe(menu: Menu, productId: Id, input: Selections): Summary {
  const ctx = productContext(menu, productId);
  const sel = sanitize(menu, ctx, input);
  const lines: SummaryLine[] = [];
  for (const g of ctx.groups) {
    const ids = sel[g.id] ?? [];
    if (!ids.length) continue;
    const counts = new Map<Id, number>();
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    const values = [...counts].map(([id, n]) => {
      const label = g.choices.find((c) => c.id === id)?.label ?? id;
      return n > 1 ? `${label} ×${n}` : label;
    });
    lines.push({ groupId: g.id, label: g.group.label, values });
  }
  const base = ingredientList(menu, ctx.product.defaults);
  const parts = [
    `${ctx.category.label} ${ctx.product.name}`,
    ...(base.length ? [base.join(", ")] : []),
    ...lines.map((l) => `${l.label} : ${l.values.join(", ")}`),
  ];
  return {
    title: ctx.product.name,
    category: ctx.category.label,
    formula: ctx.formula?.label ?? null,
    lines,
    sentence: parts.join(". ") + ".",
  };
}

/** Ce qu'on affiche sous le nom d'un produit : le texte de la carte, sinon sa composition (null s'il n'y a rien d'utile). */
export function productText(menu: Menu, productId: Id): string | null {
  const p = menu.products.find((x) => x.id === productId);
  if (!p) return null;
  if (!p.description.includes(menu.meta.todoMarker)) return p.description;
  const parts = ingredientList(menu, p.defaults);
  // Un seul ingrédient (« Tiramisu » sous « Caramel Spéculoos ») n'apprend rien.
  return parts.length > 1 ? parts.join(", ") : null;
}
