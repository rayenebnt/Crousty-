/** La carte complète, par catégorie : composition, options au choix, formule. Sans prix (site vitrine). */
import { useId, useState } from "react";
import { menu } from "../data/menu.ts";
import type { Category, Product } from "../data/menu.types.ts";
import { productsOf, resolveGroup } from "../domain/catalog.ts";
import { productText } from "../domain/summary.ts";
import { useConfigurator } from "../store/configurator.ts";
import { categoryPhoto, COMPOSABLE } from "./Menus.tsx";
import { Todo } from "./Todo.tsx";

function Choices({ category }: { category: Category }) {
  const groups = category.optionGroups.map((g) => resolveGroup(menu, g)).filter((g) => g.choices.length);
  if (!groups.length) return null;
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {groups.map((g) => (
        <div key={g.id} className="contents">
          <dt className="font-semibold text-white/90">
            {g.group.label}
            {g.group.kind === "multi" && g.group.max ? <span className="font-normal text-white/50"> · {g.group.max} max</span> : null}
          </dt>
          <dd className="text-white/70">{g.choices.map((c) => (c.note ? `${c.label} (${c.note.toLowerCase()})` : c.label)).join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProductCard({ p }: { p: Product }) {
  const setProduct = useConfigurator((s) => s.setProduct);
  const text = productText(menu, p.id);
  const compose = () => {
    setProduct(p.id);
    document.getElementById("compose")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="flex flex-1 flex-col p-4">
        <h4 className="font-display text-2xl leading-tight uppercase">{p.name}</h4>
        <p className="mt-1 flex-1 text-sm text-white/70">{text ?? (p.defaults.length ? null : <Todo what="composition" />)}</p>
        {COMPOSABLE.has(p.id) && (
          <button type="button" onClick={compose} className="mt-3 self-start rounded-full bg-rouge px-4 py-2 text-sm font-semibold transition hover:bg-flamme focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar">
            Le composer ›
          </button>
        )}
      </div>
    </li>
  );
}

export function Carte() {
  const cats = menu.categories.filter((c) => productsOf(menu, c.id).length);
  const [active, setActive] = useState(cats[0].id);
  const uid = useId();
  const cat = cats.find((c) => c.id === active)!;
  const formula = cat.formula ? menu.formulas[cat.formula] : null;
  const products = productsOf(menu, cat.id);
  const photo = categoryPhoto(cat.id);

  return (
    <section id="carte" aria-labelledby="carte-titre" className="picto-bg scroll-mt-14 border-t border-white/10 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-cheddar uppercase">La carte</p>
        <h2 id="carte-titre" className="mt-1 font-display text-5xl uppercase md:text-6xl">
          Toute la <span className="text-flamme">carte</span>
        </h2>
        <p className="mt-2 max-w-xl text-white/70">Site vitrine : pas de prix ni de commande en ligne. Choisis une catégorie.</p>

        <div role="tablist" aria-label="Catégories" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {cats.map((c) => (
            <button
              key={c.id}
              role="tab"
              id={`${uid}-tab-${c.id}`}
              aria-selected={c.id === active}
              aria-controls={`${uid}-panel`}
              onClick={() => setActive(c.id)}
              className={`min-h-11 shrink-0 rounded-xl px-4 py-2 font-display text-lg tracking-wide uppercase transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar ${
                c.id === active ? "bg-rouge text-white" : "bg-white/8 text-white/80 hover:bg-white/15"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${active}`} className="mt-6">
          <div className={`overflow-hidden rounded-2xl border border-white/10 bg-nuit/70 backdrop-blur ${photo ? "grid md:grid-cols-[1fr_320px]" : ""}`}>
            <div className="p-5">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <h3 className="font-display text-4xl uppercase">{cat.label}</h3>
                {formula && <p className="rounded-full bg-rouge px-3 py-1 text-xs font-semibold">{formula.label}</p>}
              </div>
              <Choices category={cat} />
            </div>
            {photo && <img key={cat.id} src={photo.src} alt={photo.alt} loading="lazy" decoding="async" className="menu-photo -order-1 aspect-[16/9] h-full w-full object-cover md:order-none md:aspect-auto md:min-h-56" />}
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
