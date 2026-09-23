/**
 * npm run photos:liste — écrit la liste des photos à prendre (docs/photos/liste-des-photos.md),
 * générée depuis menu.json, et coche celles déjà reçues (src/data/photos.json).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Menu } from "../src/data/menu.types.ts";
import { shotList, type Shot } from "../src/photo/shots.ts";

const menu = JSON.parse(readFileSync(new URL("../src/data/menu.json", import.meta.url), "utf8")) as Menu;
const manifest = JSON.parse(readFileSync(new URL("../src/data/photos.json", import.meta.url), "utf8")) as { files: Record<string, { demo?: boolean }> };
const shots = shotList(menu);

const done = (s: Shot) => {
  const f = manifest.files[s.file];
  return f && !f.demo;
};
const table = (list: Shot[]) =>
  [
    "| ✓ | Fichier | Photo | Consigne |",
    "|---|---|---|---|",
    ...list.map((s) => `| ${done(s) ? "✅" : "⬜"} | \`${s.file}.jpg\` | ${s.title} | ${s.how}${s.alignWith ? ` **Même cadrage que \`${s.alignWith}.jpg\`.**` : ""} |`),
  ].join("\n");

// Priorité : tout ce qu'il faut pour le Crousty et son menu (de quoi valider le rendu).
const REFERENCE = "Sandwichs Crousty";
const lot1 = shots.filter((s) => s.lot === 1);
const lot1a = lot1.filter((s) => s.usedBy.includes(REFERENCE));
const lot1b = lot1.filter((s) => !s.usedBy.includes(REFERENCE));
const lot2 = shots.filter((s) => s.lot === 2);
const md = `# Liste des photos à prendre

> Générée depuis \`menu.json\` par \`npm run photos:liste\`. Ne pas modifier à la main.
> Le protocole (angle, lumière, envoi) est dans [protocole.md](protocole.md).

| Lot | Contenu | Photos | Reçues |
|---|---|---|---|
| **1a** | Le Crousty et son menu : de quoi valider le rendu | ${lot1a.length} | ${lot1a.filter(done).length} |
| **1b** | Les autres sandwichs, le gratiné, les frites garnies | ${lot1b.length} | ${lot1b.filter(done).length} |
| **2** | Le reste de la carte (étape 3) | ${lot2.length} | ${lot2.filter(done).length} |

## Lot 1a — à faire en premier (Crousty)

${table(lot1a)}

## Lot 1b — sandwichs, gratiné, frites garnies

${table(lot1b)}

## Lot 2 — plus tard (étape 3)

${table(lot2)}
`;
mkdirSync(new URL("../docs/photos/", import.meta.url), { recursive: true });
writeFileSync(new URL("../docs/photos/liste-des-photos.md", import.meta.url), md);
console.log(`Lot 1a : ${lot1a.length} · Lot 1b : ${lot1b.length} · Lot 2 : ${lot2.length} → docs/photos/liste-des-photos.md`);
