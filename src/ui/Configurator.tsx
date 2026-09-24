/**
 * Configurateur (section « Compose ton menu ») : la scène en haut (à gauche sur ordinateur),
 * les options dessous, le récap en bas. Mobile d'abord.
 */
import { lazy, Suspense, useMemo, useRef } from "react";
import { menu } from "../data/menu.ts";
import { productContext, productsOf } from "../domain/catalog.ts";
import { resolveBuild } from "../domain/resolveBuild.ts";
import { describe } from "../domain/summary.ts";
import { useConfigurator } from "../store/configurator.ts";
import { useNear } from "../site/useNear.ts";
import { useFontsReady, useReducedMotion, useWebGL } from "./hooks.ts";
import { OptionGroup } from "./OptionGroup.tsx";
import { PhotoProgress } from "./PhotoProgress.tsx";
import { READY } from "./ready.ts";
import { Summary } from "./Summary.tsx";

// Le rendu (three.js) est chargé à part : l'interface s'affiche tout de suite.
const PhotoStage = lazy(() => import("../photo/PhotoStage.tsx").then((m) => ({ default: m.PhotoStage })));

/** Catégories ouvertes à l'étape 2 (les autres arrivent à l'étape 3). */
const STEP2_CATEGORIES = ["gratines", "sandwichs"];
/** Le client sait à quoi ressemblent sauces, crudités et boissons : le configurateur montre l'essentiel. */
const HIDDEN_GROUPS = new Set(["sauces", "crudites", "boisson", "boisson-option"]);
/** Ordre d'affichage : le produit d'abord, puis les frites (le choix des frites avant les frites cheddar). */
const TARGET_ORDER: Record<string, number> = { main: 0, side: 1, side2: 2, drink: 3 };

function ProductPicker() {
  const productId = useConfigurator((s) => s.productId);
  const setProduct = useConfigurator((s) => s.setProduct);
  // Une seule rangée qui défile : la place verticale reste aux options sur mobile.
  return (
    <nav aria-label="Choisir un produit" className="pt-3 pb-2">
      <ul className="flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {STEP2_CATEGORIES.flatMap((cid) => {
          const cat = menu.categories.find((c) => c.id === cid)!;
          const products = productsOf(menu, cid).filter((p) => READY.has(p.id));
          if (!products.length) return [];
          return [
            <li key={cid} aria-hidden className="shrink-0 pl-1 text-[11px] leading-tight font-semibold tracking-[0.12em] text-white/50 uppercase first:pl-0">
              {cat.label}
            </li>,
            ...products.map((p) => (
              <li key={p.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={p.id === productId}
                  aria-label={`${cat.label} ${p.name}`}
                  onClick={() => p.id !== productId && setProduct(p.id)}
                  className={`min-h-11 rounded-xl px-3.5 py-2 font-display text-lg tracking-wide uppercase transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar ${
                    p.id === productId ? "bg-rouge text-white" : "bg-white/8 text-white/85 hover:bg-white/15"
                  }`}
                >
                  {p.name}
                </button>
              </li>
            )),
          ];
        })}
      </ul>
    </nav>
  );
}

export function Configurator() {
  const { productId, selections, announcement, toggle, reset } = useConfigurator();
  const reduced = useReducedMotion();
  const webgl = useWebGL();
  const ctx = useMemo(() => productContext(menu, productId), [productId]);
  const groups = useMemo(() => {
    const formula = new Set(ctx.formula?.optionGroups ?? []);
    return ctx.groups
      .filter((g) => !HIDDEN_GROUPS.has(g.id))
      .map((g, i) => ({ g, k: TARGET_ORDER[g.target] * 1000 + (formula.has(g.id) ? 0 : 500) + i }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.g);
  }, [ctx]);
  const build = useMemo(() => resolveBuild(menu, productId, selections), [productId, selections]);
  const summary = useMemo(() => describe(menu, productId, selections), [productId, selections]);
  // Le rendu (three.js, photos) ne se charge qu'à l'approche de la section, une fois la police prête.
  const root = useRef<HTMLElement>(null);
  const near = useNear(root, "150%");
  const fonts = useFontsReady();

  return (
    <section ref={root} id="compose" aria-labelledby="compose-titre" className="flex h-[calc(100svh-3.5rem)] scroll-mt-14 flex-col overflow-hidden border-t border-white/10">
      <h2 id="compose-titre" className="sr-only">
        Compose ton menu
      </h2>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div role="region" aria-label="Aperçu" className="stage-bg relative h-[46dvh] shrink-0 md:h-auto md:flex-[3]">
          {!near || !fonts ? null : webgl ? (
            <Suspense fallback={<p className="grid h-full place-items-center text-white/60">Préchauffage du four…</p>}>
              <PhotoStage menu={menu} build={build} reduced={reduced} label={summary.sentence} />
            </Suspense>
          ) : (
            <p className="grid h-full place-items-center px-8 text-center text-white/70">
              L'aperçu n'est pas disponible sur cet appareil. Ta composition reste détaillée ci-dessous.
            </p>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-cheddar uppercase">
              Compose ton menu · {ctx.category.label}
            </p>
            <p className="font-display text-4xl leading-none uppercase drop-shadow-[0_2px_10px_rgb(0_0_0/0.6)] md:text-6xl">{ctx.product.name}</p>
            {ctx.formula && <p className="mt-1.5 inline-block rounded-full bg-rouge px-3 py-1 text-xs font-semibold">{ctx.formula.label}</p>}
          </div>
          <PhotoProgress />
        </div>

        <div role="region" aria-label="Options" className="picto-bg min-h-0 flex-1 overflow-y-auto md:flex-[2] md:border-l md:border-white/10">
          <ProductPicker />
          <nav aria-label="Étapes" className="sticky top-0 z-10 flex gap-1.5 overflow-x-auto border-y border-white/10 bg-nuit/95 px-4 py-2 backdrop-blur [scrollbar-width:none]">
            {groups.map((g) => (
              <a key={g.id} href={`#grp-${g.id}`} className="shrink-0 rounded-full px-3 py-1.5 text-sm text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cheddar">
                {g.group.label}
              </a>
            ))}
          </nav>
          <form onSubmit={(e) => e.preventDefault()} aria-label={`Options du ${ctx.product.name}`}>
            {groups.map((g) => (
              <OptionGroup key={`${productId}:${g.id}`} menu={menu} ctx={ctx} group={g} selections={selections} onToggle={toggle} />
            ))}
          </form>
          <p className="px-4 pt-2 pb-6 text-xs text-white/40">Démonstration : seuls les produits déjà photographiés sont proposés. Le reste de la carte arrivera avec la séance photo.</p>
        </div>
      </div>

      <Summary menu={menu} productId={productId} selections={selections} onReset={reset} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
