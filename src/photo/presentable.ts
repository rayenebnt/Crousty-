/**
 * Un produit peut-il être montré avec de vraies photos, sans étiquette « photo à venir » ?
 * Sert au sélecteur de la démo : on ne propose que ce qui est prêt.
 */
import type { Id, Menu } from "../data/menu.types.ts";
import { resolveBuild, type AssemblySpec } from "../domain/resolveBuild.ts";
import { initialSelections } from "../domain/selections.ts";
import { photoInfo } from "./manifest.ts";
import { ingredientShot, productShotName, supportShot } from "./shots.ts";

const isGratin = (menu: Menu, id: Id) => menu.ingredients[id]?.visual.archetype === "melt" && menu.ingredients[id]?.visual.variant !== "pour";

/** Tout ce qui se voit dans l'assemblage a sa photo (ce qui est sous le gratiné ne se voit pas). */
export function assemblyReady(menu: Menu, a: AssemblySpec): boolean {
  const onTop = new Set(menu.supports[a.support].onTop ?? []);
  const gratin = a.items.some((i) => isGratin(menu, i.ingredient));
  if (!gratin && !supportShot(menu, a.support).every((s) => s.state === "roulee" || photoInfo(s.file))) return false;
  return a.items.every((i) => {
    const shots = ingredientShot(menu, i.ingredient, a.support);
    if (isGratin(menu, i.ingredient)) return shots.some((s) => photoInfo(s.file));
    if (gratin && !onTop.has(i.layer)) return true;
    return shots.every((s) => photoInfo(s.file));
  });
}

export function productReady(menu: Menu, productId: Id): boolean {
  const b = resolveBuild(menu, productId, initialSelections(menu, productId));
  const main = !!photoInfo(productShotName(productId)) || assemblyReady(menu, b.main);
  return main && Object.values(b.places).every((p) => !p || assemblyReady(menu, p));
}
