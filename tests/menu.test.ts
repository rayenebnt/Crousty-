import { describe, expect, it } from "vitest";
import raw from "../src/data/menu.json";
import type { Menu } from "../src/data/menu.types.ts";
import { validateMenu } from "../src/domain/validateMenu.ts";
import { productContext } from "../src/domain/catalog.ts";
import { initialSelections, toggleChoice } from "../src/domain/selections.ts";
import { resolveBuild } from "../src/domain/resolveBuild.ts";
import { describe as summarize } from "../src/domain/summary.ts";

const menu = raw as unknown as Menu;

describe("menu.json", () => {
  it("est valide (forme + références + couches)", () => {
    const { errors } = validateMenu(raw);
    expect(errors).toEqual([]);
  });

  it("ne contient aucun prix", () => {
    expect(JSON.stringify(raw)).not.toMatch(/"price|€/);
  });
});

describe("chaque produit et chaque option se construisent", () => {
  for (const p of menu.products) {
    it(p.id, () => {
      const sel = initialSelections(menu, p.id);
      const check = (s: typeof sel) => {
        const build = resolveBuild(menu, p.id, s);
        for (const a of [build.main, ...Object.values(build.places)]) {
          const support = menu.supports[a!.support];
          const accepted = [...support.layers, ...(support.onTop ?? [])];
          for (const it of a!.items) expect(accepted).toContain(it.layer);
          expect(new Set(a!.items.map((i) => i.key)).size).toBe(a!.items.length);
        }
        expect(summarize(menu, p.id, s).sentence.length).toBeGreaterThan(0);
      };
      check(sel);
      for (const g of productContext(menu, p.id).groups) for (const c of g.choices) check(toggleChoice(menu, p.id, sel, g.id, c.id));
    });
  }
});
