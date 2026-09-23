/**
 * Photos disponibles (manifeste écrit par tools/photos/preparer.mjs) et leur chargement.
 * Une photo absente est remplacée par un cadre « Photo à venir » à sa taille réelle.
 */
import * as THREE from "three";
import raw from "../data/photos.json";

export interface PhotoInfo {
  w: number;
  h: number;
  wCm: number;
  hCm: number;
  /** Photo provisoire (tirée d'une image de démonstration), à remplacer. */
  demo?: boolean;
}

export const manifest = raw as { pxPerCm: number; files: Record<string, PhotoInfo> };

export const photoInfo = (file: string): PhotoInfo | undefined => manifest.files[file];

export const photoUrl = (file: string) => `${import.meta.env.BASE_URL}photos/${file}.webp`;

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
