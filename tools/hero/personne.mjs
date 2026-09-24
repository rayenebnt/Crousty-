/**
 * Détoure la personne de la dernière image du hero : les lettres CROUSTY passent derrière elle.
 *   node tools/hero/personne.mjs
 * (utilise le détourage de tools/photos : cd tools/photos && npm install)
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "../..");
const require = createRequire(join(ROOT, "tools/photos/package.json"));
const { removeBackground } = require("@imgly/background-removal-node");
const sharp = require("sharp");

const MODEL = pathToFileURL(join(ROOT, "tools/photos/node_modules/@imgly/background-removal-node/dist/")).href;
const src = join(here, "fin.png");
const blob = await removeBackground(pathToFileURL(src).href, { publicPath: MODEL, model: "medium", output: { format: "image/png" } });
const png = Buffer.from(await blob.arrayBuffer());
await sharp(png).webp({ quality: 88, alphaQuality: 95 }).toFile(join(ROOT, "public/hero/fin-personne.webp"));
console.log("✓ public/hero/fin-personne.webp");
