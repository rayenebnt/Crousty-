/**
 * resolveBuild : carte + choix du client → liste de ce qu'il faut afficher.
 *
 * La scène 3D, la vue 2D et la liste accessible lisent toutes ce résultat.
 * Chaque élément a une clé stable : une clé qui apparaît joue l'animation
 * d'entrée, une clé qui disparaît joue celle de sortie.
 */
import type { Id, IngredientRef, LayerId, Menu, PlaceId, Selections, Target } from "../data/menu.types.ts";
import { productContext } from "./catalog.ts";
import { currentSupport, sanitize } from "./selections.ts";

export interface BuildItem {
  /** Clé stable : `${origine}:${ingrédient}#${n}`. */
  key: string;
  ingredient: Id;
  layer: LayerId;
  /** "base" (garniture du produit) ou "groupe/choix" ; suffixe "*k" pour une copie (double, triple). */
  source: string;
  /** Rang de l'élément dans sa couche (0 = premier posé). */
  rank: number;
}

export interface AssemblySpec {
  support: Id;
  items: BuildItem[];
}

export interface BuildSpec {
  productId: Id;
  main: AssemblySpec;
  places: Partial<Record<PlaceId, AssemblySpec>>;
  tray: boolean;
}

interface Entry {
  ingredient: Id;
  source: string;
}

export function resolveBuild(menu: Menu, productId: Id, input: Selections): BuildSpec {
  const ctx = productContext(menu, productId);
  const sel = sanitize(menu, ctx, input);
  const targets: Target[] = ["main", ...(Object.keys(ctx.formula?.places ?? {}) as PlaceId[])];
  const entries = new Map<Target, Entry[]>(targets.map((t) => [t, []]));

  const push = (target: Target, ref: IngredientRef, source: string) => {
    const list = entries.get(target);
    if (!list) return;
    const [id, qty] = typeof ref === "string" ? [ref, 1] : [ref.id, ref.qty];
    for (let i = 0; i < qty; i++) list.push({ ingredient: id, source });
  };

  for (const r of ctx.product.defaults) push("main", r, "base");
  for (const [pid, place] of Object.entries(ctx.formula?.places ?? {})) for (const r of place?.defaults ?? []) push(pid as PlaceId, r, "base");

  const chosen = ctx.groups.flatMap((g) =>
    (sel[g.id] ?? []).map((cid) => ({ g, c: g.choices.find((c) => c.id === cid)! })).filter((x) => x.c),
  );
  for (const { g, c } of chosen) for (const r of c.adds ?? []) push(g.target, r, `${g.id}/${c.id}`);

  // « removes » ne retire que la garniture de base (ex. frites maison → paysannes).
  for (const { g, c } of chosen) {
    if (!c.removes?.length) continue;
    const list = entries.get(g.target)!;
    entries.set(g.target, list.filter((e) => !(e.source === "base" && c.removes!.includes(e.ingredient))));
  }

  // « duplicate » copie toute une couche (double, triple, doublez votre viande).
  for (const { g, c } of chosen) {
    if (!c.duplicate) continue;
    const list = entries.get(g.target)!;
    const originals = list.filter((e) => menu.ingredients[e.ingredient]?.layer === c.duplicate!.layer);
    for (let k = 1; k <= c.duplicate.times; k++) for (const e of originals) list.push({ ingredient: e.ingredient, source: `${e.source}*${k}` });
  }

  const assemble = (target: Target): AssemblySpec => {
    const support = currentSupport(ctx, sel, target);
    const s = menu.supports[support];
    const order = [...s.layers, ...(s.onTop ?? [])];
    const counts = new Map<string, number>();
    const ranks = new Map<LayerId, number>();
    const items: BuildItem[] = [];
    for (const e of entries.get(target) ?? []) {
      const ing = menu.ingredients[e.ingredient];
      if (!ing || !order.includes(ing.layer)) continue;
      const base = `${e.source}:${e.ingredient}`;
      const n = counts.get(base) ?? 0;
      counts.set(base, n + 1);
      items.push({ key: `${base}#${n}`, ingredient: e.ingredient, layer: ing.layer, source: e.source, rank: 0 });
    }
    items.sort((a, b) => order.indexOf(a.layer) - order.indexOf(b.layer));
    for (const it of items) {
      it.rank = ranks.get(it.layer) ?? 0;
      ranks.set(it.layer, it.rank + 1);
    }
    return { support, items };
  };

  const places: BuildSpec["places"] = {};
  for (const t of targets) if (t !== "main") places[t] = assemble(t);
  return { productId, main: assemble("main"), places, tray: ctx.formula?.tray ?? false };
}
