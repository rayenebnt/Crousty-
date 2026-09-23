/**
 * npm run menu:report — valide menu.json et liste tout ce qui reste à compléter ou à vérifier.
 */
import { readFileSync } from "node:fs";
import { validateMenu } from "../src/domain/validateMenu.ts";

const raw = JSON.parse(readFileSync(new URL("../src/data/menu.json", import.meta.url), "utf8"));
const { menu, errors } = validateMenu(raw);

if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) dans menu.json :\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
console.log(`✓ menu.json valide : ${menu!.categories.length} catégories, ${menu!.products.length} produits, ${Object.keys(menu!.ingredients).length} ingrédients.\n`);

const rows: string[] = [];
const walk = (value: unknown, path: string) => {
  if (typeof value === "string") {
    if (value.includes("[À COMPLÉTER]") || path.endsWith(".toVerify")) rows.push(`${path} : ${value}`);
  } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${(v as { id?: string })?.id ?? i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
};
walk({ ...raw, meta: undefined }, "");
const descriptions = rows.filter((r) => r.includes(".description :")).length;
console.log(`${rows.length - descriptions} points à compléter ou vérifier (+ ${descriptions} descriptions produit à rédiger) :\n`);
for (const r of rows.filter((r) => !r.includes(".description :"))) console.log(`  - ${r}`);
