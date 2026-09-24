/**
 * Photos disponibles (manifeste écrit par tools/photos/preparer.mjs) et leur chargement.
 * Une photo absente est remplacée par un cadre « Photo à venir » à sa taille réelle.
 */
import * as THREE from "three";
import { piecesUrl, photoUrl } from "./manifest.ts";

export { manifest, photoInfo, photoUrl, type PhotoInfo } from "./manifest.ts";

export interface LoadedPhoto {
  map: THREE.Texture;
  /** Silhouette floutée, pour l'ombre portée. */
  shadow: THREE.Texture;
}

const cache = new Map<string, Promise<LoadedPhoto>>();

function blurredSilhouette(img: CanvasImageSource, w: number, h: number) {
  // Réduire fortement puis agrandir (filtrage linéaire) donne un flou doux, partout pris en charge.
  const c = document.createElement("canvas");
  c.width = Math.max(4, Math.round(w / 14));
  c.height = Math.max(4, Math.round(h / 14));
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function finish(map: THREE.Texture) {
  map.colorSpace = THREE.SRGBColorSpace;
  map.premultiplyAlpha = true;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

export function loadPhoto(file: string): Promise<LoadedPhoto> {
  let p = cache.get(file);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve({ map: finish(new THREE.Texture(img)), shadow: blurredSilhouette(img, img.naturalWidth, img.naturalHeight) });
      img.onerror = () => reject(new Error(`Photo introuvable : ${file}`));
      img.src = photoUrl(file);
    });
    cache.set(file, p);
  }
  return p;
}

/** Cadre « Photo à venir » : la place et la taille réelles de l'ingrédient, son nom, sa couleur. */
export function placeholder(label: string, color: string, wCm: number, hCm: number): LoadedPhoto {
  const key = `ph:${label}:${color}:${wCm}x${hCm}`;
  const hit = placeholders.get(key);
  if (hit) return hit;
  const k = 14;
  const c = document.createElement("canvas");
  c.width = Math.round(wCm * k);
  c.height = Math.round(hCm * k);
  const ctx = c.getContext("2d")!;
  const r = Math.min(c.width, c.height) * 0.28;
  ctx.beginPath();
  ctx.roundRect(3, 3, c.width - 6, c.height - 6, r);
  ctx.fillStyle = `${color}55`;
  ctx.fill();
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = Math.max(13, Math.min(c.height * 0.3, 30));
  const small = c.height < 60;
  ctx.font = `600 ${size}px 'Inter Variable', system-ui, sans-serif`;
  if (small) {
    // Étiquette : « Tenders · photo à venir » sur une ligne.
    ctx.fillText(`${label} · photo à venir`, c.width / 2, c.height / 2, c.width - 16);
  } else {
    ctx.fillText(label, c.width / 2, c.height / 2 - size * 0.55, c.width - 20);
    ctx.font = `${size * 0.75}px 'Inter Variable', system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("photo à venir", c.width / 2, c.height / 2 + size * 0.6, c.width - 20);
  }
  const map = finish(new THREE.CanvasTexture(c));
  const out = { map, shadow: blurredSilhouette(c, c.width, c.height) };
  placeholders.set(key, out);
  return out;
}
const placeholders = new Map<string, LoadedPhoto>();

/** Un morceau : son numéro et sa boîte dans l'image (coordonnées de texture, v vers le haut). */
export interface Piece {
  id: number;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Centre (0..1) et surface relative, pour l'ordre de chute. */
  cu: number;
  cv: number;
  area: number;
}

export interface LoadedPieces {
  labels: THREE.DataTexture;
  pieces: Piece[];
}

const piecesCache = new Map<string, Promise<LoadedPieces>>();

/** Carte des morceaux (niveaux de gris : 0 = vide, 1…N = numéro), et la boîte de chaque morceau. */
export function loadPieces(file: string): Promise<LoadedPieces> {
  let p = piecesCache.get(file);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const src = ctx.getImageData(0, 0, w, h).data;
        // Texture retournée (la ligne du bas de l'image = v 0, comme la photo) ; boîtes en pixels.
        const data = new Uint8Array(w * h * 4);
        const box = new Map<number, [number, number, number, number, number, number, number]>();
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const id = src[(y * w + x) * 4];
            const o = ((h - 1 - y) * w + x) * 4;
            data[o] = id;
            data[o + 3] = 255;
            if (!id) continue;
            const b = box.get(id);
            if (b) {
              if (x < b[0]) b[0] = x;
              if (y < b[1]) b[1] = y;
              if (x > b[2]) b[2] = x;
              if (y > b[3]) b[3] = y;
              b[4] += x;
              b[5] += y;
              b[6]++;
            } else box.set(id, [x, y, x, y, x, y, 1]);
          }
        const labels = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
        labels.magFilter = labels.minFilter = THREE.NearestFilter;
        labels.generateMipmaps = false;
        labels.needsUpdate = true;
        const total = [...box.values()].reduce((a, b) => a + b[6], 0);
        const pieces = [...box].map(([id, b]) => ({
          id,
          u0: (b[0] - 1) / w,
          u1: (b[2] + 2) / w,
          v0: 1 - (b[3] + 2) / h,
          v1: 1 - (b[1] - 1) / h,
          cu: b[4] / b[6] / w,
          cv: 1 - b[5] / b[6] / h,
          area: b[6] / total,
        }));
        resolve({ labels, pieces });
      };
      img.onerror = () => reject(new Error(`Morceaux introuvables : ${file}`));
      img.src = piecesUrl(file);
    });
    piecesCache.set(file, p);
  }
  return p;
}
