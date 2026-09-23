/**
 * Prépare les photos du restaurant pour le site.
 *
 *   photos/brutes/<nom>.jpg  →  public/photos/<nom>.webp  +  src/data/photos.json
 *
 * Pour chaque photo : orientation, détourage automatique (le fond disparaît),
 * recadrage sur l'aliment, mise à l'échelle commune (px par cm), WebP avec transparence.
 * Les paires « même cadrage » (gratiné avant / après, frites / frites nappées)
 * sont recadrées ensemble pour rester superposables.
 *
 * Usage (depuis la racine du dépôt) :
 *   cd tools/photos && npm install && cd ../..
 *   node tools/photos/preparer.mjs            # toutes les photos brutes
 *   node tools/photos/preparer.mjs --demo     # marque les résultats comme provisoires
 *   node tools/photos/preparer.mjs --brutes=chemin/vers/dossier
 *
 * Outil hors site : @imgly/background-removal-node est sous licence AGPL-3.0,
 * il ne fait pas partie du site publié.
 */
import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { shotList } from "../../src/photo/shots.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
/** Modèle de détourage, livré avec le paquet npm (aucun téléchargement). */
const MODEL_PATH = new URL("./node_modules/@imgly/background-removal-node/dist/", import.meta.url).href;
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const RAW = arg("brutes") ?? join(ROOT, "photos/brutes");
const OUT = join(ROOT, "public/photos");
const MANIFEST = join(ROOT, "src/data/photos.json");
/** Résolution des fichiers publiés : 30 px par cm (un sandwich de 27 cm ≈ 810 px). */
const OUT_PX_PER_CM = 30;
const DEMO = process.argv.includes("--demo");
/** Longueur d'une canette 33 cl couchée : sert d'étalon si elle est dans les photos. */
const CAN_LENGTH_CM = 11.5;

const menu = JSON.parse(readFileSync(join(ROOT, "src/data/menu.json"), "utf8"));
const shots = new Map(shotList(menu).map((s) => [s.file, s]));
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { pxPerCm: OUT_PX_PER_CM, files: {} };
const scaleFile = join(RAW, "echelle.json");
const scaleCfg = existsSync(scaleFile) ? JSON.parse(readFileSync(scaleFile, "utf8")) : {};

const raws = readdirSync(RAW).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
if (!raws.length) {
  console.log("Aucune photo dans photos/brutes.");
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), `crousty-photos-${process.pid}`);
mkdirSync(tmp, { recursive: true });

/** Boîte englobante des pixels visibles (alpha > seuil). */
async function alphaBox(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return { x0: 0, y0: 0, x1: info.width - 1, y1: info.height - 1, w: info.width, h: info.height };
  return { x0, y0, x1, y1, w: info.width, h: info.height };
}

// 1. Détourage de chaque photo reconnue.
const cut = new Map();
for (const f of raws) {
  const name = basename(f, extname(f)).toLowerCase();
  const shot = shots.get(name);
  if (!shot) {
    console.warn(`⚠ ${f} : nom inconnu, ignorée (voir docs/photos/liste-des-photos.md)`);
    continue;
  }
  const normalized = join(tmp, `${name}.png`);
  await sharp(join(RAW, f)).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).png().toFile(normalized);
  const t = Date.now();
  const blob = await removeBackground(pathToFileURL(normalized).href, { publicPath: MODEL_PATH, model: "medium", output: { format: "image/png" } });
  const png = Buffer.from(await blob.arrayBuffer());
  cut.set(name, { shot, png, box: await alphaBox(png) });
  console.log(`✂ ${name} (${Date.now() - t} ms)`);
}

// 2. Échelle d'origine (px par cm) : fichier echelle.json, sinon les canettes, sinon chaque photo à sa taille type.
let inPxPerCm = scaleCfg.pxParCm ?? null;
if (!inPxPerCm) {
  const cans = [...cut.values()].filter((c) => menu.ingredients[c.shot.id]?.visual.archetype === "can");
  if (cans.length) {
    const lengths = cans.map((c) => Math.max(c.box.x1 - c.box.x0, c.box.y1 - c.box.y0) / CAN_LENGTH_CM).sort((a, b) => a - b);
    inPxPerCm = lengths[Math.floor(lengths.length / 2)];
    console.log(`Échelle déduite des canettes : ${inPxPerCm.toFixed(1)} px/cm`);
  }
}

// 3. Paires « même cadrage » : recadrage commun.
const groupBox = new Map();
for (const [name, c] of cut) {
  const partner = c.shot.alignWith ?? [...cut.values()].find((o) => o.shot.alignWith === name)?.shot.file;
  if (!partner || !cut.has(partner)) continue;
  const b = cut.get(partner).box;
  groupBox.set(name, { x0: Math.min(c.box.x0, b.x0), y0: Math.min(c.box.y0, b.y0), x1: Math.max(c.box.x1, b.x1), y1: Math.max(c.box.y1, b.y1) });
}

// 4. Recadrage, mise à l'échelle, export WebP.
for (const [name, c] of cut) {
  const b = groupBox.get(name) ?? c.box;
  const margin = Math.round(Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.03);
  const left = Math.max(0, b.x0 - margin), top = Math.max(0, b.y0 - margin);
  const width = Math.min(c.box.w - left, b.x1 - b.x0 + 2 * margin), height = Math.min(c.box.h - top, b.y1 - b.y0 + 2 * margin);
  // Taille réelle : échelle commune, ou taille fixée dans echelle.json, ou taille type de la prise de vue.
  const longPx = Math.max(width, height);
  const fixedCm = scaleCfg.tailles?.[name];
  const pxPerCm = fixedCm ? longPx / fixedCm : (inPxPerCm ?? longPx / Math.max(...c.shot.sizeCm));
  const wCm = width / pxPerCm, hCm = height / pxPerCm;
  const outW = Math.round(wCm * OUT_PX_PER_CM), outH = Math.round(hCm * OUT_PX_PER_CM);
  // Tout à l'horizontale (le plus grand côté en largeur), sauf les décors ; les paires tournent ensemble.
  const turn = c.shot.kind !== "decor" && height > width;
  let img = sharp(c.png).extract({ left, top, width, height }).resize(outW, outH);
  if (turn) img = sharp(await img.png().toBuffer()).rotate(90);
  await img.webp({ quality: 84, alphaQuality: 90, effort: 5 }).toFile(join(OUT, `${name}.webp`));
  const [fw, fh, fwCm, fhCm] = turn ? [outH, outW, hCm, wCm] : [outW, outH, wCm, hCm];
  manifest.files[name] = { w: fw, h: fh, wCm: +fwCm.toFixed(2), hCm: +fhCm.toFixed(2), ...(DEMO ? { demo: true } : {}) };
  console.log(`✓ ${name}.webp  ${wCm.toFixed(1)} × ${hCm.toFixed(1)} cm`);
}

manifest.pxPerCm = OUT_PX_PER_CM;
manifest.files = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
rmSync(tmp, { recursive: true, force: true });
console.log(`\n${cut.size} photo(s) prête(s) → public/photos, src/data/photos.json`);
