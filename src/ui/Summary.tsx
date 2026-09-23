/** Récapitulatif de la composition (vitrine : pas de prix, pas de commande). */
import { useState } from "react";
import type { Id, Menu, Selections } from "../data/menu.types.ts";
import { productContext } from "../domain/catalog.ts";
import { describe, ingredientList } from "../domain/summary.ts";

export function Summary({ menu, productId, selections, onReset }: { menu: Menu; productId: Id; selections: Selections; onReset: () => void }) {
  const [open, setOpen] = useState(false);
  const s = describe(menu, productId, selections);
  const base = ingredientList(menu, productContext(menu, productId).product.defaults);
  const chips = s.lines.flatMap((l) => l.values);

  return (
    <section aria-label="Ta composition" className="border-t border-white/10 bg-noir/95 backdrop-blur">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="recap"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-3 focus-visible:outline-cheddar"
      >
        <span className="font-display text-lg tracking-wide text-cheddar uppercase">Ta compo</span>
        <span className="min-w-0 flex-1 truncate text-sm text-white/80">
          {s.title} · {chips.join(" · ")}
        </span>
        <span aria-hidden className={`text-white/60 transition ${open ? "rotate-180" : ""}`}>
          ▲
        </span>
      </button>
      <div id="recap" hidden={!open} className="max-h-[40dvh] overflow-y-auto px-4 pb-4">
        <p className="font-display text-3xl uppercase">
          {s.category} · {s.title}
        </p>
        {base.length > 0 && <p className="pt-1 text-sm text-white/70">{base.join(", ")}</p>}
        {s.formula && <p className="pt-1 text-sm font-medium text-flamme">{s.formula}</p>}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {s.lines.map((l) => (
            <div key={l.groupId} className="contents">
              <dt className="text-white/60">{l.label}</dt>
              <dd>{l.values.join(", ")}</dd>
            </div>
          ))}
        </dl>
        <button type="button" onClick={onReset} className="mt-4 rounded-full border border-white/25 px-4 py-2 text-sm hover:border-white/60 focus-visible:outline-3 focus-visible:outline-cheddar">
          Recommencer
        </button>
      </div>
    </section>
  );
}
