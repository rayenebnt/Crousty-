/**
 * Configurateur : la scène 3D en haut (à gauche sur ordinateur), les options
 * dessous, le récap en bas. Mobile d'abord.
 */
import { lazy, Suspense, useMemo } from "react";
import { menu } from "../data/menu.ts";
import { productContext, productsOf } from "../domain/catalog.ts";
import { resolveBuild } from "../domain/resolveBuild.ts";
import { describe } from "../domain/summary.ts";
import { useConfigurator } from "../store/configurator.ts";
import { useReducedMotion, useWebGL } from "./hooks.ts";
import { OptionGroup } from "./OptionGroup.tsx";
import { Summary } from "./Summary.tsx";

// La 3D (three.js) est chargée à part : l'interface s'affiche tout de suite.
const Stage = lazy(() => import("../three/Stage.tsx").then((m) => ({ default: m.Stage })));

/** Catégories ouvertes à l'étape 2 (les autres arrivent à l'étape 3). */
const STEP2_CATEGORIES = ["sandwichs", "gratines", "frites-garnies"];

function ProductPicker() {
  const productId = useConfigurator((s) => s.productId);
  const setProduct = useConfigurator((s) => s.setProduct);
  // Une seule rangée qui défile : la place verticale reste aux options sur mobile.
  return (
    <nav aria-label="Choisir un produit" className="pt-3 pb-2">
      <ul className="flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {STEP2_CATEGORIES.flatMap((cid) => {
          const cat = menu.categories.find((c) => c.id === cid)!;
          return [
            <li key={cid} aria-hidden className="shrink-0 pl-1 text-[11px] leading-tight font-semibold tracking-[0.12em] text-white/50 uppercase first:pl-0">
              {cat.label}
            </li>,
            ...productsOf(menu, cid).map((p) => (
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
  const { productId, selections, activity, announcement, toggle, reset } = useConfigurator();
  const reduced = useReducedMotion();
  const webgl = useWebGL();
  const ctx = useMemo(() => productContext(menu, productId), [productId]);
  const build = useMemo(() => resolveBuild(menu, productId, selections), [productId, selections]);
  const summary = useMemo(() => describe(menu, productId, selections), [productId, selections]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <p className="font-display text-2xl tracking-wide">
          LE <span className="text-flamme">CROUSTY</span>
        </p>
        <p className="text-sm font-medium text-white/70">Compose ton menu</p>
      </header>

      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section aria-label="Aperçu 3D" className="stage-bg relative h-[46dvh] shrink-0 md:h-auto md:flex-[3]">
          {webgl ? (
            <Suspense fallback={<p className="grid h-full place-items-center text-white/60">Préchauffage du four…</p>}>
              <Stage menu={menu} build={build} reduced={reduced} activity={activity} label={summary.sentence} />
            </Suspense>
          ) : (
            <p className="grid h-full place-items-center px-8 text-center text-white/70">
              La 3D n'est pas disponible sur cet appareil. Ta composition reste détaillée ci-dessous.
            </p>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-cheddar uppercase">{ctx.category.label}</p>
            <h1 className="font-display text-4xl leading-none uppercase drop-shadow-[0_2px_10px_rgb(0_0_0/0.6)] md:text-6xl">{ctx.product.name}</h1>
            {ctx.formula && <p className="mt-1.5 inline-block rounded-full bg-rouge px-3 py-1 text-xs font-semibold">{ctx.formula.label}</p>}
          </div>
          {webgl && <p className="pointer-events-none absolute right-3 bottom-2 text-[11px] text-white/45">Fais tourner au doigt</p>}
        </section>

        <section aria-label="Options" className="picto-bg min-h-0 flex-1 overflow-y-auto md:flex-[2] md:border-l md:border-white/10">
          <ProductPicker />
          <nav aria-label="Étapes" className="sticky top-0 z-10 flex gap-1.5 overflow-x-auto border-y border-white/10 bg-nuit/95 px-4 py-2 backdrop-blur [scrollbar-width:none]">
            {ctx.groups.map((g) => (
              <a key={g.id} href={`#grp-${g.id}`} className="shrink-0 rounded-full px-3 py-1.5 text-sm text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cheddar">
                {g.group.label}
              </a>
            ))}
          </nav>
          <form onSubmit={(e) => e.preventDefault()} aria-label={`Options du ${ctx.product.name}`}>
            {ctx.groups.map((g) => (
              <OptionGroup key={`${productId}:${g.id}`} menu={menu} ctx={ctx} group={g} selections={selections} onToggle={toggle} />
            ))}
          </form>
          <p className="px-4 pt-2 pb-6 text-xs text-white/40">Aperçu étape 2 : sandwichs, gratinés et frites garnies. Le reste de la carte arrive à l'étape 3.</p>
        </section>
      </main>

      <Summary menu={menu} productId={productId} selections={selections} onReset={reset} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
