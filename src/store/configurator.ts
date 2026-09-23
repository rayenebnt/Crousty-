/**
 * État du configurateur : produit choisi et options cochées.
 * Toute la logique métier vit dans src/domain ; ce store ne fait que l'appeler.
 */
import { create } from "zustand";
import { menu } from "../data/menu.ts";
import type { Id, Selections } from "../data/menu.types.ts";
import { productContext } from "../domain/catalog.ts";
import { initialSelections, toggleChoice } from "../domain/selections.ts";

interface ConfiguratorState {
  productId: Id;
  selections: Selections;
  /** Incrémenté à chaque action (relance le délai avant la rotation automatique). */
  activity: number;
  /** Dernier changement, annoncé aux lecteurs d'écran. */
  announcement: string;
  setProduct: (productId: Id) => void;
  toggle: (groupId: Id, choiceId: Id) => void;
  reset: () => void;
}

const hero = menu.showcase.hero;

function labelsOf(productId: Id, sel: Selections) {
  const out = new Map<string, string>();
  for (const g of productContext(menu, productId).groups)
    for (const id of sel[g.id] ?? []) out.set(`${g.id}/${id}`, g.choices.find((c) => c.id === id)?.label ?? id);
  return out;
}

/** « Tenders choisi. Gratiné à l'emmental retiré. » */
function describeChange(productId: Id, before: Selections, after: Selections) {
  const a = labelsOf(productId, before), b = labelsOf(productId, after);
  const added = [...b].filter(([k]) => !a.has(k)).map(([, l]) => `${l} ajouté`);
  const removed = [...a].filter(([k]) => !b.has(k)).map(([, l]) => `${l} retiré`);
  return [...added, ...removed].join(". ");
}

function startFor(productId: Id): Selections {
  return initialSelections(menu, productId, productId === hero.product ? hero.selections : undefined);
}

export const useConfigurator = create<ConfiguratorState>((set, get) => ({
  productId: hero.product,
  selections: startFor(hero.product),
  activity: 0,
  announcement: "",
  setProduct: (productId) =>
    set((s) => ({
      productId,
      selections: startFor(productId),
      activity: s.activity + 1,
      announcement: `${menu.products.find((p) => p.id === productId)?.name ?? ""} affiché.`,
    })),
  toggle: (groupId, choiceId) => {
    const { productId, selections, activity } = get();
    const next = toggleChoice(menu, productId, selections, groupId, choiceId);
    if (next === selections) return;
    set({ selections: next, activity: activity + 1, announcement: describeChange(productId, selections, next) });
  },
  reset: () => set((s) => ({ selections: startFor(s.productId), activity: s.activity + 1, announcement: "Composition réinitialisée." })),
}));
