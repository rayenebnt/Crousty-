/**
 * Règles de sélection des options : défauts, min/max, disponibilité selon le support.
 * Une option n'est disponible que si le support courant accepte ce qu'elle ajoute :
 * c'est ce qui retire le gratiné quand on passe à la tortilla, sans règle écrite.
 */
import type { Choice, Id, Menu, Selections, Target } from "../data/menu.types.ts";
import { productContext, type ProductContext, type ResolvedGroup } from "./catalog.ts";

export interface Availability {
  available: boolean;
  /** Raison affichée au client quand l'option est grisée. */
  reason?: string;
}

const refId = (r: string | { id: string }) => (typeof r === "string" ? r : r.id);

/** Support courant d'un assemblage, compte tenu des choix qui en changent. */
export function currentSupport(ctx: ProductContext, sel: Selections, target: Target): Id {
  let support = target === "main" ? ctx.baseSupport : ctx.formula?.places[target]?.support;
  if (!support) throw new Error(`Emplacement absent : ${target}`);
  for (const g of ctx.groups) {
    if (g.target !== target) continue;
    for (const cid of sel[g.id] ?? []) {
      const c = g.choices.find((x) => x.id === cid);
      if (c?.support) support = c.support;
    }
  }
  return support;
}

function fitsSupport(menu: Menu, supportId: Id, choice: Choice): boolean {
  const s = menu.supports[supportId];
  if (!s) return false;
  const accepted = new Set([...s.layers, ...(s.onTop ?? [])]);
  return (choice.adds ?? []).every((r) => {
    const ing = menu.ingredients[refId(r)];
    return !!ing && accepted.has(ing.layer);
  });
}

export function choiceAvailability(menu: Menu, ctx: ProductContext, sel: Selections, groupId: Id, choiceId: Id): Availability {
  const g = ctx.groups.find((x) => x.id === groupId);
  const c = g?.choices.find((x) => x.id === choiceId);
  if (!g || !c) return { available: false };
  if (c.support) return { available: true };
  const support = currentSupport(ctx, sel, g.target);
  if (!fitsSupport(menu, support, c)) return { available: false, reason: `Pas avec : ${menu.supports[support]?.label ?? support}` };
  return { available: true };
}

/** Le groupe a atteint son maximum (les choix non cochés deviennent inactifs). */
export function isGroupFull(g: ResolvedGroup, sel: Selections): boolean {
  return g.group.kind === "multi" && (sel[g.id]?.length ?? 0) >= g.max;
}

/** Le choix requis (ex. frites paysannes pour les frites cheddar) est-il coché ? */
function requirementMet(g: ResolvedGroup, choiceId: Id, sel: Selections): boolean {
  const req = g.choices.find((c) => c.id === choiceId)?.requires;
  return !req || (sel[req.group] ?? []).includes(req.choice);
}

/** Retire ce qui n'est plus possible et complète les groupes obligatoires. */
export function sanitize(menu: Menu, ctx: ProductContext, input: Selections): Selections {
  const sel: Selections = {};
  for (const g of ctx.groups) {
    const valid = new Set(g.choices.map((c) => c.id));
    let ids = (input[g.id] ?? []).filter((id) => valid.has(id));
    if (!g.group.allowRepeat) ids = [...new Set(ids)];
    sel[g.id] = ids.slice(0, g.max);
  }
  // Deux passes : un changement de support (pain → tortilla) peut rendre d'autres choix impossibles.
  for (let pass = 0; pass < 2; pass++) {
    for (const g of ctx.groups) {
      sel[g.id] = sel[g.id].filter((id) => choiceAvailability(menu, ctx, sel, g.id, id).available && requirementMet(g, id, sel));
      if (sel[g.id].length < g.min) {
        const fill = g.choices.find((c) => !sel[g.id].includes(c.id) && choiceAvailability(menu, ctx, sel, g.id, c.id).available);
        if (fill) sel[g.id] = [...sel[g.id], fill.id];
      }
    }
  }
  return sel;
}

export function initialSelections(menu: Menu, productId: Id, preset?: Selections): Selections {
  const ctx = productContext(menu, productId);
  const sel: Selections = {};
  for (const g of ctx.groups) sel[g.id] = g.choices.filter((c) => c.default).map((c) => c.id);
  for (const [gid, ids] of Object.entries(preset ?? {})) if (gid in sel) sel[gid] = ids;
  return sanitize(menu, ctx, sel);
}

/** Coche / décoche un choix en respectant le type du groupe. Renvoie les sélections inchangées si c'est impossible. */
export function toggleChoice(menu: Menu, productId: Id, sel: Selections, groupId: Id, choiceId: Id): Selections {
  const ctx = productContext(menu, productId);
  const g = ctx.groups.find((x) => x.id === groupId);
  if (!g || !g.choices.some((c) => c.id === choiceId)) return sel;
  const cur = sel[groupId] ?? [];
  const selected = cur.includes(choiceId);
  if (!selected && !choiceAvailability(menu, ctx, sel, groupId, choiceId).available) return sel;

  let next: Id[];
  if (g.group.kind === "single") next = selected ? (g.min > 0 ? cur : []) : [choiceId];
  else if (g.group.kind === "toggle") next = selected ? [] : [choiceId];
  else if (selected && !g.group.allowRepeat) next = cur.filter((id) => id !== choiceId);
  else if (cur.length < g.max) next = [...cur, choiceId];
  else return sel;

  if (next === cur) return sel;
  const merged: Selections = { ...sel, [groupId]: next };
  // Choisir une option qui en exige une autre coche aussi celle-ci (frites cheddar → frites paysannes).
  const req = !selected ? g.choices.find((c) => c.id === choiceId)?.requires : undefined;
  if (req) {
    const rg = ctx.groups.find((x) => x.id === req.group);
    if (rg) merged[req.group] = rg.group.kind === "multi" ? [...new Set([...(merged[req.group] ?? []), req.choice])] : [req.choice];
  }
  return sanitize(menu, ctx, merged);
}

/** Retire une occurrence d'un choix répétable (ex. une des 3 viandes du tacos). */
export function removeOne(menu: Menu, productId: Id, sel: Selections, groupId: Id, choiceId: Id): Selections {
  const ctx = productContext(menu, productId);
  const cur = sel[groupId] ?? [];
  const i = cur.lastIndexOf(choiceId);
  if (i < 0) return sel;
  return sanitize(menu, ctx, { ...sel, [groupId]: [...cur.slice(0, i), ...cur.slice(i + 1)] });
}
