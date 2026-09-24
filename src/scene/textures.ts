/**
 * Textures générées en canvas (aucune image à télécharger), mises en cache :
 * vapeur, et papier journal de secours tant que la photo du plateau manque.
 */
import * as THREE from "three";
import { fbm3, rng } from "./noise.ts";

const cache = new Map<string, THREE.Texture>();

function make(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { color?: boolean; repeat?: boolean } = {},
): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = opts.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

/** Remplit un canvas pixel par pixel à partir d'une fonction (u, v) → [r, g, b] (0-255). */
function pixels(ctx: CanvasRenderingContext2D, w: number, h: number, fn: (u: number, v: number) => [number, number, number]) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x / w, y / h);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
}

/** Disque flou pour la vapeur. */
export const softDisc = () =>
  make("soft-disc", 128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });

const DISPLAY = "Anton, 'Arial Narrow', Impact, sans-serif";

/** Petits pictogrammes au trait, comme au mur du restaurant. */
function picto(ctx: CanvasRenderingContext2D, kind: "burger" | "fries" | "hotdog" | "bottle", x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = 3 / s;
  ctx.lineJoin = ctx.lineCap = "round";
  ctx.beginPath();
  if (kind === "burger") {
    ctx.moveTo(-40, -5);
    ctx.bezierCurveTo(-40, -45, 40, -45, 40, -5);
    ctx.closePath();
    ctx.moveTo(-44, 5);
    ctx.lineTo(44, 5);
    ctx.moveTo(-42, 15);
    for (let i = -42; i <= 42; i += 12) ctx.quadraticCurveTo(i + 6, 22, i + 12, 15);
    ctx.moveTo(-40, 28);
    ctx.lineTo(40, 28);
    ctx.quadraticCurveTo(40, 40, 30, 40);
    ctx.lineTo(-30, 40);
    ctx.quadraticCurveTo(-40, 40, -40, 28);
  } else if (kind === "fries") {
    ctx.moveTo(-28, -5);
    ctx.lineTo(-22, 40);
    ctx.lineTo(22, 40);
    ctx.lineTo(28, -5);
    ctx.closePath();
    for (const fx of [-18, -8, 2, 12, 20]) {
      ctx.moveTo(fx, -5);
      ctx.lineTo(fx - 3, -40 + Math.abs(fx) * 0.6);
    }
  } else if (kind === "hotdog") {
    ctx.moveTo(-50, 0);
    ctx.bezierCurveTo(-50, 25, 50, 25, 50, 0);
    ctx.moveTo(-56, -6);
    ctx.bezierCurveTo(-56, -22, 56, -22, 56, -6);
    ctx.moveTo(-44, -2);
    for (let i = -44; i < 44; i += 11) ctx.quadraticCurveTo(i + 5.5, -10, i + 11, -2);
  } else {
    ctx.moveTo(-8, -45);
    ctx.lineTo(8, -45);
    ctx.lineTo(8, -30);
    ctx.quadraticCurveTo(22, -20, 22, 0);
    ctx.lineTo(22, 40);
    ctx.lineTo(-22, 40);
    ctx.lineTo(-22, 0);
    ctx.quadraticCurveTo(-22, -20, -8, -30);
    ctx.closePath();
    ctx.moveTo(-22, 5);
    ctx.lineTo(22, 5);
    ctx.moveTo(-22, 22);
    ctx.lineTo(22, 22);
  }
  ctx.stroke();
  ctx.restore();
}

/** Papier journal vintage du plateau (clin d'œil à la photo du plat). */
export const newspaperTexture = () =>
  make("newspaper", 1600, 1100, (ctx, w, h) => {
    const r = rng(1994);
    // Papier jauni (calculé en basse résolution puis agrandi : rapide sur mobile)
    const lo = document.createElement("canvas");
    lo.width = w / 4;
    lo.height = h / 4;
    pixels(lo.getContext("2d")!, lo.width, lo.height, (u, v) => {
      const n = fbm3(u * 6, v * 4, 0.5, 4);
      const stain = fbm3(u * 2 + 10, v * 2, 3, 3);
      const edge = Math.min(u, v, 1 - u, 1 - v);
      let l = 0.93 + (n - 0.5) * 0.08 - (stain > 0.62 ? (stain - 0.62) * 0.5 : 0) - (edge < 0.04 ? (0.04 - edge) * 1.5 : 0);
      l = Math.max(0.6, l);
      return [240 * l, 228 * l, 204 * l];
    });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(lo, 0, 0, w, h);
    const ink = "rgba(38,30,24,0.9)";
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    const M = 60;
    // Titre
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `150px ${DISPLAY}`;
    ctx.fillText("LE CROUSTY", w / 2, 190);
    ctx.fillRect(M, 215, w - 2 * M, 6);
    ctx.fillRect(M, 228, w - 2 * M, 2);
    ctx.font = "italic 26px Georgia, 'Times New Roman', serif";
    ctx.fillText("Édition spéciale · Bonneuil-sur-Marne · Tacos, sandwichs, burgers", w / 2, 262);
    ctx.fillRect(M, 280, w - 2 * M, 2);

    const words = "le gratiné fondant croustillant frites maison sauce tacos sandwich burger tenders poulet cheddar emmental pain doré viande grillée oignons salade tomate recette comptoir soir midi faim régal chaud".split(" ");
    const cols = 5;
    const gap = 28;
    const colW = (w - 2 * M - gap * (cols - 1)) / cols;
    const heads = ["EXTRA ! EXTRA !", "LE GRATINÉ", "À TABLE !", "CROUSTILLANT", "SAUCE AU CHOIX"];
    for (let c = 0; c < cols; c++) {
      const x0 = M + c * (colW + gap);
      let y = 330;
      if (c > 0) ctx.fillRect(x0 - gap / 2, 300, 1.5, h - 360);
      ctx.textAlign = "left";
      ctx.font = `${c === 1 ? 64 : 44}px ${DISPLAY}`;
      ctx.fillText(heads[c], x0, y + 30, colW);
      y += c === 1 ? 70 : 56;
      // Encart publicitaire avec pictogramme
      if (c === 1 || c === 3 || c === 4) {
        const boxH = c === 1 ? 260 : 190;
        ctx.lineWidth = 3;
        ctx.strokeRect(x0 + 4, y, colW - 8, boxH);
        ctx.strokeRect(x0 + 10, y + 6, colW - 20, boxH - 12);
        const kinds = ["burger", "fries", "hotdog", "bottle"] as const;
        picto(ctx, kinds[c % 4], x0 + colW / 2, y + boxH * 0.42, c === 1 ? 1.5 : 1.1);
        ctx.textAlign = "center";
        ctx.font = `34px ${DISPLAY}`;
        ctx.fillText(["", "SANDWICHS GRATINÉS", "", "FRITES MAISON", "SAUCES"][c], x0 + colW / 2, y + boxH - 26, colW - 30);
        ctx.textAlign = "left";
        y += boxH + 22;
      }
      // Colonnes de texte (mots en tout petit)
      ctx.font = "15px Georgia, 'Times New Roman', serif";
      while (y < h - 70) {
        let line = "";
        while (ctx.measureText(line).width < colW - 40) line += words[Math.floor(r() * words.length)] + " ";
        ctx.fillText(line.trim(), x0, y, colW);
        y += 20;
        if (r() < 0.07) {
          ctx.font = `28px ${DISPLAY}`;
          y += 16;
          ctx.fillText(words[Math.floor(r() * words.length)].toUpperCase() + " !", x0, y, colW);
          y += 30;
          ctx.font = "15px Georgia, 'Times New Roman', serif";
        }
      }
    }
    // Irrégularités d'impression : voiles clairs qui « usent » l'encre
    for (let i = 0; i < 160; i++) {
      const x = r() * w, y = r() * h, s = 20 + r() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, `rgba(240,228,204,${0.1 + r() * 0.25})`);
      g.addColorStop(1, "rgba(240,228,204,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
  });

/** Brin d'emmental râpé (pluie de fromage) : blanc, teinté par instance. */
export const cheeseShred = () =>
  make("cheese-shred", 128, 32, (ctx, w, h) => {
    ctx.lineCap = "round";
    ctx.lineWidth = h * 0.42;
    ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(h * 0.3, h * 0.55);
    ctx.quadraticCurveTo(w / 2, h * 0.25, w - h * 0.3, h * 0.5);
    ctx.stroke();
    // léger modelé : bord inférieur plus sombre
    ctx.globalCompositeOperation = "source-atop";
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(150,120,60,0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
