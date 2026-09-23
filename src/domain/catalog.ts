/**
 * Lecture de la carte : un produit, ses options (catégorie + formule), ses choix.
 * Aucune dépendance à React ni à Three.js.
 */
import type { Category, Choice, Formula, Id, Menu, OptionGroup, Product, Target } from "../data/menu.types.ts";

export interface ResolvedGroup {
  id: Id;
  group: OptionGroup;
  target: Target;
  min: number;
  max: number;
  choices: Choice[];
}

export interface ProductContext {
  product: Product;
  category: Category;
  formulaId: Id | null;
  formula: Formula | null;
  /** Support de départ du produit (avant un éventuel choix « pain / tortilla »). */
  baseSupport: Id;
  /** Options du produit puis de la formule, dans l'ordre d'affichage. */
  groups: ResolvedGroup[];
}

export function getProduct(menu: Menu, productId: Id): Product {
  const p = menu.products.find((x) => x.id === productId);
  if (!p) throw new Error(`Produit inconnu : ${productId}`);
  return p;
}

export function resolveGroup(menu: Menu, groupId: Id): ResolvedGroup {
  const group = menu.optionGroups[groupId];
  if (!group) throw new Error(`Groupe inconnu : ${groupId}`);
  // Les choix repris d'un autre groupe ne reprennent pas ses « default ».
  const choices = group.choicesFrom
    ? (menu.optionGroups[group.choicesFrom]?.choices ?? []).map(({ default: _d, ...c }) => c)
    : (group.choices ?? []);
  const min = group.min ?? (group.kind === "single" ? 1 : 0);
  const max = group.kind === "toggle" ? 1 : group.kind === "single" ? 1 : (group.max ?? choices.length * (group.allowRepeat ? 3 : 1));
  return { id: groupId, group, target: group.target ?? "main", min, max, choices };
}

export function productContext(menu: Menu, productId: Id): ProductContext {
  const product = getProduct(menu, productId);
  const category = menu.categories.find((c) => c.id === product.category);
  if (!category) throw new Error(`Catégorie inconnue : ${product.category}`);
  const formulaId = product.formula !== undefined ? product.formula : category.formula;
  const formula = formulaId ? (menu.formulas[formulaId] ?? null) : null;
  const groupIds = [...(product.optionGroups ?? category.optionGroups), ...(formula?.optionGroups ?? [])];
  return {
    product,
    category,
    formulaId,
    formula,
    baseSupport: product.support ?? category.support,
    groups: groupIds.map((g) => resolveGroup(menu, g)),
  };
}

export function productsOf(menu: Menu, categoryId: Id): Product[] {
  return menu.products.filter((p) => p.category === categoryId);
}
