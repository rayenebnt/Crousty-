/**
 * Textures générées en canvas (aucune image à télécharger), mises en cache.
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

/** Bruit périodique (se raccorde en u et v), pour les textures répétées. */
function tileNoise(u: number, v: number, scale: number, octaves = 4) {
  const a = u * Math.PI * 2, b = v * Math.PI * 2;
  return fbm3(Math.cos(a) * scale, Math.sin(a) * scale + Math.cos(b) * scale, Math.sin(b) * scale, octaves);
}

/** Croûte de pain : grain, taches de cuisson, farine. Multipliée par les couleurs de sommet. */
export const crustTexture = () =>
  make("crust", 512, 512, (ctx, w, h) => {
    pixels(ctx, w, h, (u, v) => {
      const n = tileNoise(u, v, 3.2, 5);
      const fine = tileNoise(u, v, 18, 2);
      const spot = tileNoise(u + 0.37, v, 7, 3);
      let l = 0.84 + (n - 0.5) * 0.35 + (fine - 0.5) * 0.18;
      if (spot > 0.66) l -= (spot - 0.66) * 1.4;
      const flour = tileNoise(u, v + 0.5, 11, 3) > 0.72 ? 0.12 : 0;
      l = Math.min(1.05, l + flour);
      return [255 * Math.min(1, l * 1.02), 255 * Math.min(1, l), 255 * Math.min(1, l * 0.96)];
    });
  }, { repeat: true });

/** Relief pour la croûte (bump). */
export const crustBump = () =>
  make("crust-bump", 256, 256, (ctx, w, h) => {
    pixels(ctx, w, h, (u, v) => {
      const n = tileNoise(u, v, 6, 4) * 0.6 + tileNoise(u, v, 22, 2) * 0.4;
      const g = 255 * n;
      return [g, g, g];
    });
  }, { color: false, repeat: true });

/** Mie (face coupée du pain). */
export const crumbTexture = () =>
  make("crumb", 256, 256, (ctx, w, h) => {
    pixels(ctx, w, h, (u, v) => {
      const n = tileNoise(u, v, 9, 3);
      const hole = tileNoise(u + 0.2, v, 16, 2);
      let l = 0.95 + (n - 0.5) * 0.12;
      if (hole > 0.62) l -= (hole - 0.62) * 1.6;
      return [250 * l, 232 * l, 196 * l];
    });
  }, { repeat: true });

/** Panure (tenders, escalope panée) : relief irrégulier. */
export const friedBump = () =>
  make("fried-bump", 256, 256, (ctx, w, h) => {
    pixels(ctx, w, h, (u, v) => {
      const n = tileNoise(u, v, 14, 3);
      const crumbs = tileNoise(u + 0.3, v + 0.1, 34, 2);
      const g = 255 * Math.min(1, n * 0.55 + (crumbs > 0.55 ? 0.5 : 0.1));
      return [g, g, g];
    });
  }, { color: false, repeat: true });

/** Variation de couleur de la panure (zones plus ou moins dorées). */
export const friedColor = () =>
  make("fried-color", 256, 256, (ctx, w, h) => {
    pixels(ctx, w, h, (u, v) => {
      const n = tileNoise(u, v, 8, 4);
      const crumbs = tileNoise(u + 0.3, v + 0.1, 34, 2);
      const l = 0.78 + n * 0.3 + (crumbs > 0.6 ? 0.12 : 0);
      return [255 * Math.min(1, l), 255 * Math.min(1, l * 0.97), 255 * Math.min(1, l * 0.9)];
    });
  }, { repeat: true });

/** Coupe de tomate. */
export const tomatoTexture = () =>
  make("tomato", 256, 256, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = "#C81E12";
    ctx.fillRect(0, 0, w, w);
    const g = ctx.createRadialGradient(c, c, 10, c, c, c);
    g.addColorStop(0, "#F0604A");
    g.addColorStop(0.75, "#E23A26");
    g.addColorStop(0.9, "#C81E12");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.98, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      ctx.save();
      ctx.translate(c + Math.cos(a) * c * 0.45, c + Math.sin(a) * c * 0.45);
      ctx.rotate(a);
      ctx.fillStyle = "rgba(255,190,120,0.55)";
      ctx.beginPath();
      ctx.ellipse(0, 0, c * 0.26, c * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F7E08A";
      for (let s = 0; s < 5; s++) {
        ctx.beginPath();
        ctx.ellipse((s - 2) * 7, (s % 2) * 5 - 2, 3.2, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.fillStyle = "#F4A48A";
    ctx.beginPath();
    ctx.arc(c, c, c * 0.12, 0, Math.PI * 2);
    ctx.fill();
  });

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

/** Gouttes de condensation (bump) pour les canettes. */
export const dropletsBump = () =>
  make("droplets", 512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y = r() * h, s = 1 + r() * r() * 7;
      const g = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.8, s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { color: false, repeat: true });

const DISPLAY = "Anton, 'Arial Narrow', Impact, sans-serif";

/** Étiquette de canette générique : couleur, bande, nom en clair (jamais de logo). */
export function canLabelTexture(color: string, color2: string, label: string) {
  return make(`can:${color}:${color2}:${label}`, 1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#B9BEC6");
    g.addColorStop(0.08, "#E8EBEF");
    g.addColorStop(0.1, color);
    g.addColorStop(0.9, color);
    g.addColorStop(0.92, "#E8EBEF");
    g.addColorStop(1, "#A9AEB6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Bande ondulée
    ctx.fillStyle = color2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.64);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.64 + Math.sin((x / w) * Math.PI * 4) * h * 0.05);
    ctx.lineTo(w, h * 0.74);
    for (let x = w; x >= 0; x -= 8) ctx.lineTo(x, h * 0.74 + Math.sin((x / w) * Math.PI * 4 + 0.8) * h * 0.04);
    ctx.closePath();
    ctx.fill();
    // Nom écrit à la verticale, deux fois autour de la canette : lisible de face.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 150;
    ctx.font = `${size}px ${DISPLAY}`;
    const maxLen = h * 0.74;
    const wdt = ctx.measureText(label).width;
    if (wdt > maxLen) size = Math.floor((size * maxLen) / wdt);
    ctx.font = `${size}px ${DISPLAY}`;
    // u = 0 est l'avant de la canette : une copie à cheval sur la couture (0 et w), une à l'arrière.
    for (const cx of [0, w, w * 0.5]) {
      ctx.save();
      ctx.translate(cx, h * 0.47);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillText(label, 3, 5);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  });
}

/** Impression de la barquette : rouge Crousty, bande cheddar, nom. */
export const boxPrintTexture = () =>
  make("box-print", 1024, 256, (ctx, w, h) => {
    ctx.fillStyle = "#E3262B";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#FFC21A";
    ctx.fillRect(0, h * 0.78, w, h * 0.1);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, h * 0.9, w, h * 0.03);
    ctx.font = `${h * 0.42}px ${DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const cx of [w * 0.125, w * 0.375, w * 0.625, w * 0.875]) ctx.fillText("LE CROUSTY", cx, h * 0.45);
  }, { repeat: true });

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

/** Galette de blé : fond clair, taches de grill. */
export const tortillaTexture = () =>
  make("tortilla", 512, 512, (ctx, w, h) => {
    pixels(ctx, w, h, (u, v) => {
      const n = tileNoise(u, v, 5, 4);
      const spots = tileNoise(u + 0.4, v + 0.2, 9, 3);
      let l = 0.97 + (n - 0.5) * 0.1;
      let warm = 0;
      if (spots > 0.6) {
        warm = Math.min(1, (spots - 0.6) * 4);
        l -= warm * 0.35;
      }
      return [245 * l, (226 - warm * 40) * l, (178 - warm * 60) * l];
    });
  }, { repeat: true });

/** Plancher en bois, fondu vers le noir sur les bords (se mêle au fond de page). */
export const woodTexture = () =>
  make("wood", 1024, 1024, (ctx, w, h) => {
    const lo = document.createElement("canvas");
    lo.width = 256;
    lo.height = 256;
    pixels(lo.getContext("2d")!, 256, 256, (u, v) => {
      const plank = Math.floor(u * 6);
      const grain = fbm3(plank * 7.3, v * 3, 1, 3) * 0.6 + fbm3(u * 60, v * 4, plank, 2) * 0.4;
      const ring = Math.sin((v * 18 + grain * 6 + plank * 1.7) * Math.PI) * 0.5 + 0.5;
      let l = 0.55 + grain * 0.35 + ring * 0.12;
      if (u * 6 - plank < 0.02) l *= 0.45;
      return [84 * l, 54 * l, 34 * l];
    });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(lo, 0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.06, w / 2, h / 2, w * 0.44);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

