import { describe, expect, it } from "vitest";
import raw from "../src/data/menu.json";
import type { Menu, Selections } from "../src/data/menu.types.ts";
import { initialSelections, toggleChoice } from "../src/domain/selections.ts";
import { resolveBuild } from "../src/domain/resolveBuild.ts";

const menu = raw as unknown as Menu;
const P = "sandwich-crousty";
const ids = (items: { ingredient: string }[]) => items.map((i) => i.ingredient);
const pick = (sel: Selections, ...steps: [string, string][]) => steps.reduce((s, [g, c]) => toggleChoice(menu, P, s, g, c), sel);

describe("Crousty (étape 2)", () => {
  const start = initialSelections(menu, P, { viandes: ["tenders"] });

  it("démarre avec pain, tenders, cheddar, frites maison, sans boisson", () => {
    const b = resolveBuild(menu, P, start);
    expect(b.main.support).toBe("pain-sandwich");
    expect(ids(b.main.items)).toEqual(expect.arrayContaining(["tenders", "cheddar"]));
    expect(ids(b.places.side!.items)).toEqual(["frites"]);
    expect(b.places.drink!.items).toEqual([]);
    expect(b.tray).toBe(true);
  });

  it("gratiné : ajoute le fromage sur le pain, puis le retire", () => {
    const on = pick(start, ["gratine", "gratine"]);
    expect(ids(resolveBuild(menu, P, on).main.items)).toContain("gratin-fromage");
    const off = pick(on, ["gratine", "gratine"]);
    expect(ids(resolveBuild(menu, P, off).main.items)).not.toContain("gratin-fromage");
  });

  it("tortilla : change le support et retire le gratiné", () => {
    const s = pick(start, ["gratine", "gratine"], ["pain", "tortilla"]);
    const b = resolveBuild(menu, P, s);
    expect(b.main.support).toBe("tortilla-wrap");
    expect(ids(b.main.items)).not.toContain("gratin-fromage");
    expect(s.gratine).toEqual([]);
    // Le gratiné ne peut pas être recoché sur la tortilla.
    expect(pick(s, ["gratine", "gratine"]).gratine).toEqual([]);
  });

  it("changer de viande garde des clés stables pour le reste", () => {
    const a = resolveBuild(menu, P, start);
    const b = resolveBuild(menu, P, pick(start, ["viandes", "curry"]));
    const keys = (x: typeof a) => new Set(x.main.items.map((i) => i.key));
    expect([...keys(a)].filter((k) => !keys(b).has(k))).toEqual(["viandes/tenders:tenders#0"]);
    expect([...keys(b)].filter((k) => !keys(a).has(k))).toEqual(["viandes/curry:curry#0"]);
  });

  it("2 sauces maximum", () => {
    const s = pick(start, ["sauces", "ketchup"], ["sauces", "harissa"], ["sauces", "samourai"]);
    expect(s.sauces).toEqual(["ketchup", "harissa"]);
  });

  it("frites paysannes remplacent les frites maison", () => {
    const b = resolveBuild(menu, P, pick(start, ["frites-formule", "paysannes"]));
    expect(ids(b.places.side!.items)).toEqual(["frites-paysannes"]);
  });

  it("boisson en option : se coche puis se décoche", () => {
    const s = pick(start, ["boisson-option", "sprite"]);
    expect(ids(resolveBuild(menu, P, s).places.drink!.items)).toEqual(["sprite"]);
    expect(resolveBuild(menu, P, pick(s, ["boisson-option", "sprite"])).places.drink!.items).toEqual([]);
  });

  it("les couches sont dans l'ordre du support", () => {
    const s = pick(start, ["sauces", "algerienne"], ["crudites", "salade"], ["supplements", "oeuf"], ["gratine", "gratine"]);
    const layers = resolveBuild(menu, P, s).main.items.map((i) => i.layer);
    const order = ["sauce-base", "meat", "cheese", "extra", "veg", "veg-top", "sauce", "gratin"];
    expect([...layers].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(layers);
  });
});

describe("autres règles", () => {
  it("double / triple copient la viande (Whoop)", () => {
    const s = toggleChoice(menu, "burger-whoop", initialSelections(menu, "burger-whoop"), "taille-classic", "triple");
    expect(ids(resolveBuild(menu, "burger-whoop", s).main.items).filter((i) => i === "steak-hache")).toHaveLength(3);
  });

  it("tacos : jusqu'à 3 viandes", () => {
    let s = initialSelections(menu, "tacos");
    for (const v of ["curry", "tenders", "merguez", "pastrami"]) s = toggleChoice(menu, "tacos", s, "viandes-tacos", v);
    expect(s["viandes-tacos"]).toHaveLength(3);
  });

  it("la vitrine d'accueil se construit", () => {
    const { product, selections } = menu.showcase.hero;
    const b = resolveBuild(menu, product, initialSelections(menu, product, selections));
    expect(ids(b.main.items)).toEqual(expect.arrayContaining(["tenders", "gratin-fromage"]));
  });
});
