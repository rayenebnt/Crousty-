import { describe, expect, it } from "vitest";
import raw from "../src/data/menu.json";
import type { Menu, Selections } from "../src/data/menu.types.ts";
import { productContext } from "../src/domain/catalog.ts";
import { initialSelections, toggleChoice } from "../src/domain/selections.ts";
import { resolveBuild } from "../src/domain/resolveBuild.ts";

const menu = raw as unknown as Menu;
const P = "sandwich-crousty-escalope";
const ids = (items: { ingredient: string }[]) => items.map((i) => i.ingredient);
const pick = (sel: Selections, ...steps: [string, string][]) => steps.reduce((s, [g, c]) => toggleChoice(menu, P, s, g, c), sel);

describe("Sandwich Crousty escalope", () => {
  const start = initialSelections(menu, P);

  it("démarre avec pain, escalope, fromage, frites maison, sans boisson", () => {
    const b = resolveBuild(menu, P, start);
    expect(b.main.support).toBe("pain-sandwich");
    expect(ids(b.main.items)).toEqual(["escalope", "fromage-fondu"]);
    expect(ids(b.places.side!.items)).toEqual(["frites"]);
    expect(b.places.drink!.items).toEqual([]);
  });

  it("gratiné : s'ajoute puis se retire", () => {
    const on = pick(start, ["gratine", "gratine"]);
    expect(ids(resolveBuild(menu, P, on).main.items)).toContain("gratin-fromage");
    expect(ids(resolveBuild(menu, P, pick(on, ["gratine", "gratine"])).main.items)).not.toContain("gratin-fromage");
  });

  it("tortilla : change le pain et retire le gratiné", () => {
    const s = pick(start, ["gratine", "gratine"], ["pain", "tortilla"]);
    expect(resolveBuild(menu, P, s).main.support).toBe("tortilla-wrap");
    expect(s.gratine).toEqual([]);
    expect(pick(s, ["gratine", "gratine"]).gratine).toEqual([]);
  });

  it("2 sauces maximum", () => {
    const s = pick(start, ["sauces", "ketchup"], ["sauces", "harissa"], ["sauces", "samourai"]);
    expect(s.sauces).toEqual(["ketchup", "harissa"]);
  });

  it("frites paysannes remplacent les frites maison", () => {
    expect(ids(resolveBuild(menu, P, pick(start, ["frites-formule", "paysannes"])).places.side!.items)).toEqual(["frites-paysannes"]);
  });

  it("boisson en option : une des canettes de la carte", () => {
    const s = pick(start, ["boisson-option", "tropico"]);
    expect(ids(resolveBuild(menu, P, s).places.drink!.items)).toEqual(["tropico"]);
    expect(resolveBuild(menu, P, pick(s, ["boisson-option", "tropico"])).places.drink!.items).toEqual([]);
  });
});

describe("autres règles", () => {
  it("Chicanos et Roll : en tortilla, sans gratiné", () => {
    for (const id of ["sandwich-chicanos", "sandwich-roll"]) {
      const ctx = productContext(menu, id);
      expect(ctx.baseSupport).toBe("tortilla-wrap");
      expect(ctx.groups.map((g) => g.id)).not.toContain("gratine");
    }
  });

  it("double / triple copient le steak (Classic Whoop)", () => {
    const s = toggleChoice(menu, "burger-whoop", initialSelections(menu, "burger-whoop"), "taille-classic", "triple");
    expect(ids(resolveBuild(menu, "burger-whoop", s).main.items).filter((i) => i === "steak-90g")).toHaveLength(3);
  });

  it("tacos S, M, L : 1, 2 et 3 viandes", () => {
    for (const [id, n] of [["tacos-s", 1], ["tacos-m", 2], ["tacos-l", 3]] as const) {
      const g = productContext(menu, id).groups.find((x) => x.id.startsWith("viandes-tacos"))!;
      expect([g.min, g.max]).toEqual([n, n]);
      expect(initialSelections(menu, id)[g.id]).toHaveLength(n);
    }
  });

  it("Crousty : piquant ou sucré", () => {
    const s = toggleChoice(menu, "crousty-tandory", initialSelections(menu, "crousty-tandory"), "piquant-sucre", "sucre");
    expect(s["piquant-sucre"]).toEqual(["sucre"]);
  });

  it("le gratiné de départ se construit (mozzarella, steak)", () => {
    const { product, selections } = menu.showcase.hero;
    const b = resolveBuild(menu, product, initialSelections(menu, product, selections));
    expect(ids(b.main.items)).toEqual(expect.arrayContaining(["steak-hache", "gratin-mozzarella"]));
  });
});

describe("Gratiné : frites cheddar (option en plus, frites paysannes obligatoires)", () => {
  const G = "gratine-viande";
  const t = (sel: Selections, g: string, c: string) => toggleChoice(menu, G, sel, g, c);
  const start = initialSelections(menu, G, { "viandes-gratine": ["steak"] });

  it("sans option : frites maison seules", () => {
    expect(start["frites-cheddar"]).toEqual([]);
    expect(ids(resolveBuild(menu, G, start).places.side!.items)).toEqual(["frites"]);
  });

  it("cheddar tandoori : passe aux frites paysannes, nappage puis viande", () => {
    const s = t(start, "frites-cheddar", "tandoori");
    expect(s["frites-formule"]).toEqual(["paysannes"]);
    expect(ids(resolveBuild(menu, G, s).places.side!.items)).toEqual(["frites-paysannes", "nappage-cheddar", "tandoori"]);
  });

  it("une seule frites cheddar à la fois : en choisir une autre la remplace", () => {
    const s = t(t(start, "frites-cheddar", "tandoori"), "frites-cheddar", "viande-hachee");
    expect(s["frites-cheddar"]).toEqual(["viande-hachee"]);
    // et on peut la retirer
    expect(t(s, "frites-cheddar", "viande-hachee")["frites-cheddar"]).toEqual([]);
  });

  it("revenir aux frites maison retire les frites cheddar", () => {
    const s = t(t(start, "frites-cheddar", "tandoori"), "frites-formule", "maison");
    expect(s["frites-cheddar"]).toEqual([]);
    expect(ids(resolveBuild(menu, G, s).places.side!.items)).toEqual(["frites"]);
  });
});
