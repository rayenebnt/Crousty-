import { describe, expect, it } from "vitest";
import raw from "../src/data/menu.json";
import type { Menu } from "../src/data/menu.types.ts";
import { productContext } from "../src/domain/catalog.ts";
import { resolveBuild } from "../src/domain/resolveBuild.ts";
import { initialSelections, toggleChoice } from "../src/domain/selections.ts";
import { ingredientShot, LOT1_CATEGORIES, shotList, supportShot } from "../src/photo/shots.ts";

const menu = raw as unknown as Menu;
const shots = shotList(menu);
const files = new Set(shots.map((s) => s.file));

describe("liste des photos", () => {
  it("noms de fichiers uniques et bien formés", () => {
    expect(files.size).toBe(shots.length);
    for (const f of files) expect(f).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?$/);
  });

  it("les paires « même cadrage » pointent vers une photo de la liste", () => {
    for (const s of shots) if (s.alignWith) expect(files).toContain(s.alignWith);
  });

  it("le lot 1 couvre les sandwichs, gratinés et frites garnies", () => {
    const lot1 = shots.filter((s) => s.lot === 1);
    expect(lot1.map((s) => s.file)).toEqual(expect.arrayContaining(["pain-sandwich__ouvert", "tenders", "gratin-fromage__avant", "gratin-fromage__apres", "frites", "coca-cola", "plateau-journal"]));
    for (const s of lot1) expect(s.usedBy.some((u) => menu.categories.some((c) => LOT1_CATEGORIES.includes(c.id) && u.startsWith(c.label)))).toBe(true);
  });
});

describe("chaque élément affiché a sa photo dans la liste", () => {
  for (const p of menu.products) {
    it(p.id, () => {
      const sel = initialSelections(menu, p.id);
      const variants = [sel, ...productContext(menu, p.id).groups.flatMap((g) => g.choices.map((c) => toggleChoice(menu, p.id, sel, g.id, c.id)))];
      for (const v of variants) {
        const b = resolveBuild(menu, p.id, v);
        for (const a of [b.main, ...Object.values(b.places)]) {
          for (const s of supportShot(menu, a!.support)) expect(files).toContain(s.file);
          for (const it of a!.items) {
            const wanted = ingredientShot(menu, it.ingredient, a!.support);
            expect(wanted.length).toBeGreaterThan(0);
            for (const w of wanted) expect(files).toContain(w.file);
          }
        }
      }
    });
  }
});
