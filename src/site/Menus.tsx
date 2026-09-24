/**
 * « Compose ton menu » : par catégorie (Gratinés, Sandwichs, Burgers), une grande photo du produit,
 * le choix du produit, les options qui comptent et le récap. Aucune image assemblée.
 */
import { useMemo } from "react";
import { menu } from "../data/menu.ts";
import type { Id } from "../data/menu.types.ts";
import { productContext, productsOf } from "../domain/catalog.ts";
import { describe, ingredientList } from "../domain/summary.ts";
import { useConfigurator } from "../store/configurator.ts";
import { OptionGroup } from "../ui/OptionGroup.tsx";

const base = import.meta.env.BASE_URL;

export interface MenuTab {
  id: string;
  label: string;
  /** Catégories de la carte réunies sous cet onglet. */
  categories: Id[];
  photo: string;
  alt: string;
  /** Une ligne factuelle, tirée de la carte. */
  line: string;
}

export const TABS: MenuTab[] = [
  { id: "gratines", label: "Gratinés", categories: ["gratines"], photo: "gratines", alt: "Le Gratiné, emmental doré au four, et ses frites", line: "Gratiné à l'emmental, au four" },
  { id: "sandwichs", label: "Sandwichs", categories: ["sandwichs"], photo: "sandwichs", alt: "Un sandwich garni de poulet tandoori et de poulet curry, avec des frites", line: "Pain ou tortilla · gratiné en option" },
  {
    id: "burgers",
    label: "Burgers",
    categories: ["classics-burgers", "burgers-gourmets", "smash-burgers"],
    photo: "burgers",
    alt: "Un burger au pain brioché, steak et fromage fondu, avec des frites",
    line: "Classics · Gourmets · Smash",
  },
];

/** Produits qu'on peut composer ici (le bouton « Le composer » de la carte y mène). */
export const COMPOSABLE = new Set(TABS.flatMap((t) => t.categories.flatMap((c) => productsOf(menu, c).map((p) => p.id))));

/** Le client sait à quoi ressemblent sauces, crudités et boissons : on montre l'essentiel. */
const HIDDEN_GROUPS = new Set(["sauces", "crudites", "boisson", "boisson-option"]);
const TARGET_ORDER: Record<string, number> = { main: 0, side: 1, side2: 2, drink: 3 };

const tabOf = (productId: Id) => TABS.find((t) => t.categories.includes(productContext(menu, productId).category.id)) ?? TABS[0];

export function Menus() {
  const { productId, selections, announcement, toggle, reset, setProduct } = useConfigurator();
  const tab = tabOf(productId);
  const ctx = useMemo(() => productContext(menu, productId), [productId]);
  const groups = useMemo(() => {
    const formula = new Set(ctx.formula?.optionGroups ?? []);
    return ctx.groups
      .filter((g) => !HIDDEN_GROUPS.has(g.id))
      .map((g, i) => ({ g, k: TARGET_ORDER[g.target] * 1000 + (formula.has(g.id) ? 0 : 500) + i }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.g);
  }, [ctx]);
  const summary = useMemo(() => describe(menu, productId, selections), [productId, selections]);
  const shown = new Set(groups.map((g) => g.id));
  const lines = summary.lines.filter((l) => shown.has(l.groupId));
  const composition = ingredientList(menu, ctx.product.defaults);

  const openTab = (t: MenuTab) => {
    if (t.id === tab.id) return;
    setProduct(t.id === "gratines" ? menu.showcase.hero.product : productsOf(menu, t.categories[0])[0].id);
  };

  return (
    <section id="compose" aria-labelledby="compose-titre" className="scroll-mt-14 border-t border-white/10 bg-nuit py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-cheddar uppercase">Compose ton menu</p>
            <h2 id="compose-titre" className="mt-1 font-display text-5xl uppercase md:text-6xl">
              Choisis, <span className="text-flamme">on prépare</span>
            </h2>
          </div>
          <div role="tablist" aria-label="Catégories" className="flex gap-1 rounded-2xl bg-white/6 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`menu-tab-${t.id}`}
                aria-selected={t.id === tab.id}
                aria-controls="menu-panel"
                onClick={() => openTab(t)}
                className={`min-h-11 rounded-xl px-4 py-2 font-display text-lg tracking-wide uppercase transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar sm:px-6 ${
                  t.id === tab.id ? "bg-rouge text-white shadow-lg shadow-rouge/25" : "text-white/75 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div id="menu-panel" role="tabpanel" aria-labelledby={`menu-tab-${tab.id}`} className="mt-8 grid gap-8 md:grid-cols-[1.05fr_1fr] md:items-start">
          {/* La photo de la catégorie : fixe, elle ne change qu'avec l'onglet. */}
          <figure className="relative overflow-hidden rounded-3xl bg-noir shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] md:sticky md:top-20">
            <img key={tab.id} src={`${base}menus/${tab.photo}.webp`} alt={tab.alt} className="menu-photo aspect-[4/3] w-full object-cover md:aspect-square" decoding="async" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-noir/90 via-noir/50 to-transparent p-5 pt-20">
              <p className="text-xs font-semibold tracking-[0.16em] text-cheddar uppercase">{tab.line}</p>
              <p className="mt-1 font-display text-4xl leading-none uppercase md:text-5xl">{tab.label}</p>
            </figcaption>
          </figure>

          <div className="grid gap-6">
            {tab.categories.length > 1 || productsOf(menu, tab.categories[0]).length > 1 ? (
              <div className="grid gap-5">
                {tab.categories.length > 1 && (
                  <div role="group" aria-label="Gamme" className="flex flex-wrap gap-2">
                    {tab.categories.map((cid) => {
                      const cat = menu.categories.find((c) => c.id === cid)!;
                      const on = cid === ctx.category.id;
                      return (
                        <button
                          key={cid}
                          type="button"
                          aria-pressed={on}
                          onClick={() => !on && setProduct(productsOf(menu, cid)[0].id)}
                          className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar ${
                            on ? "border-white bg-white text-noir" : "border-white/20 text-white/80 hover:border-white/50"
                          }`}
                        >
                          {cat.label} <span className={on ? "text-noir/50" : "text-white/40"}>{productsOf(menu, cid).length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {tab.categories.filter((cid) => cid === ctx.category.id).map((cid) => {
                  const cat = menu.categories.find((c) => c.id === cid)!;
                  const formula = cat.formula ? menu.formulas[cat.formula] : null;
                  return (
                    <fieldset key={cid} className="grid gap-2.5">
                      <legend className="mb-2.5 flex w-full flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-display text-2xl tracking-wide uppercase">{tab.categories.length > 1 ? cat.label : "Ton sandwich"}</span>
                        {formula && <span className="text-xs font-medium text-white/55">{formula.label}</span>}
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {productsOf(menu, cid).map((p) => {
                          const on = p.id === productId;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => !on && setProduct(p.id)}
                              className={`group grid gap-0.5 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar ${
                                on ? "border-cheddar bg-cheddar/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"
                              }`}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="font-display text-xl tracking-wide uppercase">{p.name}</span>
                                <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition ${on ? "border-cheddar bg-cheddar text-noir" : "border-white/25 text-transparent"}`}>
                                  ✓
                                </span>
                              </span>
                              <span className="line-clamp-2 text-[13px] leading-snug text-white/60">{ingredientList(menu, p.defaults).join(", ") || "Composition à venir"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            ) : (
              <div>
                <p className="font-display text-3xl uppercase">{ctx.product.name}</p>
                {ctx.formula && <p className="mt-1 text-sm text-white/60">{ctx.formula.label}</p>}
              </div>
            )}

            {groups.length > 0 && (
              <form onSubmit={(e) => e.preventDefault()} aria-label={`Options du ${ctx.product.name}`} className="menu-options -mx-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] sm:mx-0">
                {groups.map((g) => (
                  <OptionGroup key={`${productId}:${g.id}`} menu={menu} ctx={ctx} group={g} selections={selections} onToggle={toggle} />
                ))}
              </form>
            )}

            {/* Récap */}
            <div className="rounded-2xl bg-cheddar p-5 text-noir">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-2xl uppercase">Ta compo</p>
                <button type="button" onClick={reset} className="text-sm font-semibold underline decoration-noir/30 underline-offset-4 hover:decoration-noir focus-visible:outline-2 focus-visible:outline-noir">
                  Recommencer
                </button>
              </div>
              <p className="mt-1 font-display text-3xl leading-tight uppercase">
                {summary.category} · {summary.title}
              </p>
              {composition.length > 0 && <p className="mt-1 text-sm text-noir/75">{composition.join(", ")}</p>}
              {lines.length > 0 && (
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-noir/15 pt-3 text-sm">
                  {lines.map((l) => (
                    <div key={l.groupId} className="contents">
                      <dt className="text-noir/60">{l.label}</dt>
                      <dd className="font-semibold">{l.values.join(", ")}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-3 text-xs text-noir/65">Site vitrine : pas de commande en ligne, commande au comptoir.</p>
            </div>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
