/**
 * Un groupe d'options, en vrais boutons radio / cases à cocher : utilisable
 * au clavier, au lecteur d'écran et sans 3D. La scène n'en est que le reflet.
 */
import type { Id, Menu, Selections } from "../data/menu.types.ts";
import type { ProductContext, ResolvedGroup } from "../domain/catalog.ts";
import { choiceAvailability, isGroupFull } from "../domain/selections.ts";

interface Props {
  menu: Menu;
  ctx: ProductContext;
  group: ResolvedGroup;
  selections: Selections;
  onToggle: (groupId: Id, choiceId: Id) => void;
}

function hint(g: ResolvedGroup) {
  if (g.group.kind === "multi" && g.group.max) return `${g.group.max} maximum`;
  if (g.group.kind === "single" && g.min === 0) return "Facultatif";
  if (g.group.kind === "single") return "1 au choix";
  return null;
}

export function OptionGroup({ menu, ctx, group: g, selections, onToggle }: Props) {
  const selected = selections[g.id] ?? [];
  const full = isGroupFull(g, selections);
  // Radio seulement quand un choix est obligatoire ; sinon cases (on peut tout décocher).
  const radio = g.group.kind === "single" && g.min > 0;
  const reasons = new Set<string>();
  const h = hint(g);

  return (
    <fieldset id={`grp-${g.id}`} className="scroll-mt-16 border-t border-white/10 px-4 pt-4 pb-5">
      <legend className="float-left w-full">
        <span className="font-display text-2xl tracking-wide uppercase">{g.group.label}</span>
        {h && <span className="ml-2 align-middle text-xs font-medium text-white/60">{h}</span>}
      </legend>
      <div className="clear-both flex flex-wrap gap-2 pt-3">
        {g.choices.map((c) => {
          const checked = selected.includes(c.id);
          const av = choiceAvailability(menu, ctx, selections, g.id, c.id);
          const disabled = !checked && (!av.available || full);
          if (!av.available && av.reason) reasons.add(av.reason);
          return (
            <label
              key={c.id}
              className={[
                "relative inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full border px-4 py-2 text-[15px] transition",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cheddar",
                checked ? "border-cheddar bg-cheddar font-semibold text-noir shadow-[0_6px_20px_-6px_rgb(255_194_26/0.7)]" : "border-white/20 bg-white/5 text-white hover:border-white/50",
                disabled ? "cursor-not-allowed opacity-35 hover:border-white/20" : "",
              ].join(" ")}
            >
              <input
                type={radio ? "radio" : "checkbox"}
                name={g.id}
                value={c.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(g.id, c.id)}
                onClick={(e) => {
                  // Un radio déjà coché ne déclenche pas onChange : rien à faire.
                  if (radio && checked) e.preventDefault();
                }}
                className="sr-only"
              />
              <span>{c.label}</span>
              {c.note && <span className={`text-[11px] font-medium uppercase ${checked ? "text-noir/70" : "text-flamme"}`}>{c.note}</span>}
            </label>
          );
        })}
      </div>
      {reasons.size > 0 && <p className="pt-2 text-sm text-white/60">{[...reasons].join(" · ")}</p>}
    </fieldset>
  );
}
