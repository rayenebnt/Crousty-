/**
 * Générateurs procéduraux : un archétype + les couleurs de menu.json → des pièces 3D.
 * Chaque générateur renvoie des géométries partagées et les positions de repos
 * de chaque pièce ; l'animation (chute, rebond…) est gérée par <Pieces>.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { EnterAnim, ExitAnim, Ingredient, IngredientArchetype } from "../../data/menu.types.ts";
import { displace, paint, smoothIco, warp } from "../lib/geometry.ts";
import { fbm3, rng } from "../lib/noise.ts";
import { crustBump, friedBump, friedColor, tomatoTexture } from "../lib/textures.ts";
import type { Built, BuiltPieces, Footprint, Instance, PieceSet, Surface } from "./types.ts";

type R = () => number;
const C = (hex: string | undefined, fallback = "#C08040") => new THREE.Color(hex ?? fallback);
const inst = (p: Partial<Instance> & { x: number; z: number }): Instance => ({
  y: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1, ...p,
});
const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Répartit n pièces le long de la zone (axe x), avec un peu de désordre. */
function along(n: number, fp: Footprint, r: R, zJitter = 0.25, fill = 0.82) {
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
    out.push({ x: fp.cx + t * fp.hx * fill + (r() - 0.5) * 0.04, z: fp.cz + (r() - 0.5) * fp.hz * zJitter });
  }
  return out;
}

/** Répartit n pièces au hasard dans l'ellipse de la zone. */
function scatter(n: number, fp: Footprint, r: R, margin = 0.85) {
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * margin;
    out.push({ x: fp.cx + Math.cos(a) * d * fp.hx, z: fp.cz + Math.sin(a) * d * fp.hz });
  }
  return out;
}

/** Nombre de pièces proportionnel à la surface disponible. */
const byArea = (base: number, fp: Footprint) => Math.max(7, Math.round(base * Math.min(1.6, Math.max(0.6, (fp.hx * fp.hz) / 0.3))));

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ vertexColors: true, ...p });

const pieces = (sets: PieceSet[], thickness: number, enter: EnterAnim, exit: ExitAnim = "lift-fade", extra: Partial<BuiltPieces> = {}): BuiltPieces => ({
  kind: "pieces", sets, thickness, enter, exit, ...extra,
});

// ---------------------------------------------------------------------------
// Viandes
// ---------------------------------------------------------------------------

function patty(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual, smash = v.variant === "smash";
  const R0 = 0.28 * (v.size ?? 1) * (smash ? 1.12 : 1), H = smash ? 0.055 : 0.1;
  const geo = new THREE.CylinderGeometry(R0, R0 * 0.97, H, 40, 3);
  displace(geo, (p, n) => (Math.abs(n.y) < 0.5 ? (fbm3(p.x * 7, p.y * 7, p.z * 7) - 0.5) * (smash ? 0.09 : 0.05) : (fbm3(p.x * 14, 3, p.z * 14) - 0.5) * 0.012));
  const c1 = C(v.color), c2 = C(v.color2, "#2A140A");
  paint(geo, (p, n, out) => {
    const k = fbm3(p.x * 12, p.y * 12, p.z * 12);
    if (Math.abs(n.y) > 0.6) out.copy(c2).lerp(c1, k * 0.9);
    else out.copy(c1).multiplyScalar(0.85 + k * 0.4);
  });
  const mat = std({ roughness: 0.7, bumpMap: crustBump(), bumpScale: 1.4 });
  const n = Math.max(1, Math.round((fp.hx * 2) / (R0 * 2.1)));
  return pieces([{ geometry: geo, material: mat, instances: along(n, fp, r, 0.15, 0.9).map((p) => inst({ ...p, y: H / 2, ry: r() * 6 })) }], H * 0.92, "drop-bounce");
}

function cutlet(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual, breaded = v.variant === "breaded";
  const rx = 0.4 * (v.size ?? 1), rz = 0.19 * (v.size ?? 1);
  const shape = new THREE.Shape();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2, k = 0.86 + fbm3(Math.cos(a) * 2, Math.sin(a) * 2, 1.3) * 0.28;
    const x = Math.cos(a) * rx * k, z = Math.sin(a) * rz * k;
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.02, bevelSegments: 3, curveSegments: 40 });
  geo.rotateX(-Math.PI / 2);
  geo.center();
  warp(geo, (p) => {
    p.y += 0.018 * Math.max(0, 1 - (p.x / rx) ** 2 - (p.z / rz) ** 2) + (fbm3(p.x * 9, 0, p.z * 9) - 0.5) * 0.012;
  });
  const c1 = C(v.color), c2 = C(v.color2, "#6E3A18");
  paint(geo, (p, _n, out) => {
    const k = fbm3(p.x * 10, p.y * 10, p.z * 10);
    out.copy(c1).lerp(c2, breaded ? k * 0.35 : k * 0.45);
    if (!breaded && Math.sin((p.x + p.z * 0.6) * 30) > 0.82 && p.y > 0) out.lerp(c2, 0.75).multiplyScalar(0.7);
  });
  const mat = breaded
    ? std({ roughness: 0.8, map: friedColor(), bumpMap: friedBump(), bumpScale: 3 })
    : std({ roughness: 0.55, bumpMap: crustBump(), bumpScale: 0.8 });
  const n = Math.max(1, Math.round((fp.hx * 2) / (rx * 2.1)));
  return pieces([{ geometry: geo, material: mat, instances: along(n, fp, r, 0.2, 0.55).map((p) => inst({ ...p, y: 0.035, ry: (r() - 0.5) * 0.5 })) }], 0.07, "drop-bounce");
}

function strips(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual, nugget = v.variant === "nuggets";
  const geo = nugget ? new THREE.SphereGeometry(0.085, 20, 14) : new THREE.CapsuleGeometry(0.072, 0.34, 8, 18);
  if (!nugget) geo.rotateZ(Math.PI / 2);
  geo.scale(nugget ? 1.25 : 1, 0.72, nugget ? 1 : 1.08);
  displace(geo, (p) => (fbm3(p.x * 16, p.y * 16, p.z * 16) - 0.5) * 0.028);
  const c1 = C(v.color), c2 = C(v.color2, "#F2C46A");
  paint(geo, (p, n, out) => {
    const k = fbm3(p.x * 11 + 3, p.y * 11, p.z * 11);
    out.copy(c1).lerp(c2, smoothstep(0.35, 0.75, k) * 0.8).multiplyScalar(n.y > 0.3 ? 1.02 : 0.9);
  });
  const mat = std({ roughness: 0.78, map: friedColor(), bumpMap: friedBump(), bumpScale: 4.5 });
  const count = Math.max(1, Math.round((v.count ?? 3) * Math.min(1.3, Math.max(0.6, fp.hx))));
  const spots = nugget ? scatter(count, fp, r, 0.6) : along(count, fp, r, 0.9, 0.62);
  const instances = spots.map((p, i) =>
    inst({ ...p, z: p.z + (nugget ? 0 : (i % 2 ? 0.05 : -0.05)), y: 0.055 + (i % 2) * 0.012, ry: (r() - 0.5) * 0.7, rz: (r() - 0.5) * 0.12, sx: 0.9 + r() * 0.2, sz: 0.9 + r() * 0.2 }),
  );
  return pieces([{ geometry: geo, material: mat, instances }], 0.11, "drop-bounce");
}

function chunks(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual;
  const geo = smoothIco(0.06, 2);
  displace(geo, (p) => (fbm3(p.x * 13, p.y * 13, p.z * 13) - 0.5) * 0.075);
  const sc = v.variant === "shaved" ? [1.4, 0.32, 0.8] : v.variant === "strips" ? [1.9, 0.5, 0.65] : [1.15, 0.62, 0.9];
  geo.scale(sc[0], sc[1], sc[2]);
  const c1 = C(v.color), c2 = C(v.color2, "#6A2A10");
  paint(geo, (p, _n, out) => {
    const k = fbm3(p.x * 25 + 1, p.y * 25, p.z * 25);
    out.copy(c1).multiplyScalar(0.85 + k * 0.3);
    if (k > 0.55) out.lerp(c2, Math.min(0.9, (k - 0.55) * 2.6));
  });
  const mat = std({ roughness: 0.5 });
  const n = byArea(v.count ?? 9, fp);
  const instances = scatter(n, fp, r, 0.82).map((p, i) =>
    inst({ ...p, y: 0.035 + (i % 3) * 0.018 + r() * 0.01, rx: (r() - 0.5) * 0.6, ry: r() * 6.3, rz: (r() - 0.5) * 0.6, sx: 0.85 + r() * 0.35, sy: 0.85 + r() * 0.3, sz: 0.85 + r() * 0.35 }),
  );
  return pieces([{ geometry: geo, material: mat, instances }], 0.1, "rain");
}

function crumble(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual;
  const flakes = v.variant === "bits";
  const geo = smoothIco(flakes ? 0.026 : 0.03, 1);
  displace(geo, (p) => (fbm3(p.x * 50, p.y * 50, p.z * 50) - 0.5) * 0.025);
  geo.scale(flakes ? 1.6 : 1.1, flakes ? 0.45 : 0.7, 1);
  const c1 = C(v.color), c2 = C(v.color2, "#301408");
  paint(geo, (p, _n, out) => {
    const k = fbm3(p.x * 50, p.y * 50, p.z * 50);
    out.copy(c1).lerp(c2, k * 0.6);
  });
  const mat = std({ roughness: v.variant === "sauce" ? 0.35 : 0.6 });
  const n = byArea(flakes ? 40 : 46, fp);
  const instances = scatter(n, fp, r, 0.78).map((p, i) =>
    inst({ ...p, y: 0.015 + (i % 2) * 0.012, rx: (r() - 0.5) * 0.8, ry: r() * 6, rz: (r() - 0.5) * 0.8, sx: 0.7 + r() * 0.6, sy: 0.7 + r() * 0.5, sz: 0.7 + r() * 0.6 }),
  );
  return pieces([{ geometry: geo, material: mat, instances }], 0.05, "rain");
}

function sausage(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual;
  const len = Math.min(0.9, fp.hx * 1.5);
  const geo = new THREE.CapsuleGeometry(0.046, len, 6, 24);
  geo.rotateZ(Math.PI / 2);
  warp(geo, (p) => {
    p.y -= 0.18 * (p.x / len) ** 2;
  });
  const c1 = C(v.color), c2 = C(v.color2, "#3A1208");
  paint(geo, (p, n, out) => {
    const k = fbm3(p.x * 14, p.y * 14, p.z * 14);
    out.copy(c1).multiplyScalar(0.85 + k * 0.3);
    if (n.y > 0.2 && Math.sin(p.x * 34) > 0.7) out.lerp(c2, 0.8);
  });
  const mat = std({ roughness: 0.42 });
  const n = v.count ?? 2;
  const instances = Array.from({ length: n }, (_, i) => inst({ x: fp.cx + (r() - 0.5) * 0.05, z: fp.cz + (i - (n - 1) / 2) * 0.11, y: 0.05, ry: (r() - 0.5) * 0.15 }));
  return pieces([{ geometry: geo, material: mat, instances }], 0.09, "drop-bounce");
}

function sliced(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual, bacon = v.variant === "bacon";
  const w = bacon ? 0.55 : 0.42, d = bacon ? 0.13 : 0.26;
  const geo = new THREE.PlaneGeometry(w, d, 32, 6);
  geo.rotateX(-Math.PI / 2);
  const phase = r() * 6;
  warp(geo, (p) => {
    p.y += Math.sin(p.x * (bacon ? 17 : 11) + phase) * (bacon ? 0.02 : 0.03) + (fbm3(p.x * 8, 0, p.z * 8) - 0.5) * 0.02;
  });
  const c1 = C(v.color), c2 = C(v.color2, "#5C1E24");
  paint(geo, (p, _n, out) => {
    const k = fbm3(p.x * 18, 0, p.z * 18);
    if (bacon) out.copy(Math.sin(p.z * 70 + k * 3) > 0.15 ? c1 : c2).multiplyScalar(0.9 + k * 0.2);
    else {
      const edge = Math.max(Math.abs(p.x) / (w / 2), Math.abs(p.z) / (d / 2));
      out.copy(c1).multiplyScalar(0.9 + k * 0.2).lerp(c2, smoothstep(0.78, 1, edge));
    }
  });
  const mat = std({ roughness: 0.55, side: THREE.DoubleSide });
  const n = Math.max(2, Math.round((v.count ?? 2) * Math.min(1.4, Math.max(0.6, fp.hx))));
  const instances = along(n, fp, r, 0.5, 0.75).map((p, i) => inst({ ...p, y: 0.02 + (i % 2) * 0.012, ry: (r() - 0.5) * 0.9 }));
  return pieces([{ geometry: geo, material: mat, instances }], 0.035, "flutter");
}

// ---------------------------------------------------------------------------
// Fromages, crèmes
// ---------------------------------------------------------------------------

function cheeseSlice(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual, soft = v.variant === "soft";
  const s = Math.min(0.42, fp.hz * 2.1);
  const geo = new THREE.PlaneGeometry(s, s, 18, 18);
  geo.rotateX(-Math.PI / 2);
  warp(geo, (p) => {
    const d = soft ? Math.hypot(p.x, p.z) : Math.max(Math.abs(p.x), Math.abs(p.z));
    p.y -= 0.7 * Math.max(0, d - s * 0.3) ** 2 + (fbm3(p.x * 9, 0, p.z * 9) - 0.5) * 0.01;
  });
  geo.translate(0, 0.012, 0);
  const color = C(v.color);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.38, side: THREE.DoubleSide, emissive: color.clone().multiplyScalar(0.07) });
  const n = Math.max(1, Math.round((fp.hx * 2) / (s * 1.05)));
  const instances = along(n, fp, r, 0.2, 0.8).map((p, i) => inst({ ...p, y: 0.005 + i * 0.002, ry: (r() - 0.5) * 0.35 }));
  return pieces([{ geometry: geo, material: mat, instances }], 0.02, "flutter");
}

function spread(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual, sauce = v.variant === "sauce";
  const geo = new THREE.SphereGeometry(0.1, 22, 12);
  geo.scale(sauce ? 1.9 : 1.5, 0.3, sauce ? 1.3 : 1.1);
  displace(geo, (p) => (fbm3(p.x * 14, p.y * 14, p.z * 14) - 0.5) * 0.02);
  const c1 = C(v.color), c2 = C(v.color2 ?? v.color);
  paint(geo, (p, _n, out) => {
    const k = fbm3(p.x * 60, p.y * 60, p.z * 60);
    out.copy(c1).multiplyScalar(0.96 + k * 0.06);
    if (v.variant === "herbs" && k > 0.68) out.copy(c2);
  });
  const mat = std({ roughness: sauce ? 0.22 : 0.4 });
  const n = Math.max(2, Math.round(fp.hx * (sauce ? 4 : 5)));
  const instances = along(n, fp, r, 0.5, 0.78).map((p) => inst({ ...p, y: 0.012, ry: r() * 3, sx: 0.8 + r() * 0.4, sz: 0.8 + r() * 0.4 }));
  return pieces([{ geometry: geo, material: mat, instances }], 0.03, "pop");
}

// ---------------------------------------------------------------------------
// Crudités et petits éléments
// ---------------------------------------------------------------------------

function leaf(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual;
  const geo = new THREE.PlaneGeometry(0.5, 0.34, 20, 12);
  geo.rotateX(-Math.PI / 2);
  warp(geo, (p) => {
    const e = Math.max(Math.abs(p.x) / 0.25, Math.abs(p.z) / 0.17);
    p.y += 0.045 * Math.sin(p.x * 30 + p.z * 12) * e * e + 0.06 * e * e + (fbm3(p.x * 6, 0, p.z * 6) - 0.5) * 0.04;
  });
  const c1 = C(v.color), c2 = C(v.color2, "#DDEFA8");
  paint(geo, (p, _n, out) => {
    const e = Math.max(Math.abs(p.x) / 0.25, Math.abs(p.z) / 0.17);
    out.copy(c2).lerp(c1, smoothstep(0.1, 1, e)).multiplyScalar(0.92 + fbm3(p.x * 20, 0, p.z * 20) * 0.16);
  });
  const mat = std({ roughness: 0.45, side: THREE.DoubleSide });
  const n = Math.max(3, Math.round(fp.hx * 5));
  // Un peu vers l'avant : la salade dépasse du pain, côté client.
  const instances = along(n, fp, r, 0.6, 0.85).map((p) => inst({ ...p, z: p.z + fp.hz * 0.35, y: 0.02, ry: (r() - 0.5) * 1.2, rx: (r() - 0.5) * 0.3, rz: (r() - 0.5) * 0.3 }));
  return pieces([{ geometry: geo, material: mat, instances }], 0.05, "flutter");
}

function slices(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual;
  const c1 = C(v.color), c2 = C(v.color2 ?? v.color);
  const n = Math.max(1, Math.round((v.count ?? 3) * Math.min(1.3, Math.max(0.5, fp.hx))));
  const spots = along(n, fp, r, 0.6, 0.78);
  let sets: PieceSet[];
  if (v.variant === "tomato") {
    const geo = new THREE.CylinderGeometry(0.12, 0.12, 0.032, 30);
    const side = new THREE.MeshStandardMaterial({ color: c1, roughness: 0.3 });
    const cap = new THREE.MeshStandardMaterial({ map: tomatoTexture(), roughness: 0.25 });
    sets = [{ geometry: geo, material: [side, cap, cap], instances: spots.map((p) => inst({ ...p, z: p.z + fp.hz * 0.3, y: 0.016, ry: r() * 6, rx: (r() - 0.5) * 0.15 })) }];
  } else if (v.variant === "rings") {
    const geo = new THREE.TorusGeometry(0.085, 0.013, 8, 30);
    geo.rotateX(Math.PI / 2);
    paint(geo, (p, _n, out) => out.copy(Math.hypot(p.x, p.z) > 0.085 ? c1 : c2));
    sets = [{ geometry: geo, material: std({ roughness: 0.35 }), instances: spots.map((p) => inst({ ...p, y: 0.013, sx: 0.8 + r() * 0.5, sz: 0.8 + r() * 0.5, rx: (r() - 0.5) * 0.3 })) }];
  } else {
    const rad = v.variant === "goat" ? 0.1 : v.variant === "avocado" ? 0.09 : v.variant === "mushroom" ? 0.07 : 0.065;
    const geo = new THREE.CylinderGeometry(rad, rad, v.variant === "goat" ? 0.05 : 0.022, 24);
    if (v.variant === "avocado") geo.scale(1.9, 1, 0.7);
    paint(geo, (p, _n, out) => {
      const d = Math.hypot(p.x / (v.variant === "avocado" ? 1.9 : 1), p.z / (v.variant === "avocado" ? 0.7 : 1)) / rad;
      out.copy(c2).lerp(c1, smoothstep(0.55, 0.95, d));
    });
    sets = [{ geometry: geo, material: std({ roughness: 0.4 }), instances: spots.map((p) => inst({ ...p, y: 0.012, ry: r() * 6, rx: (r() - 0.5) * 0.2 })) }];
  }
  return pieces(sets, 0.035, "drop-bounce");
}

function bits(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual;
  const c1 = C(v.color), c2 = C(v.color2 ?? v.color);
  let geo: THREE.BufferGeometry;
  let rough = 0.5;
  switch (v.variant) {
    case "strips":
      geo = new THREE.BoxGeometry(0.15, 0.018, 0.032);
      break;
    case "rings":
      geo = new THREE.TorusGeometry(0.028, 0.012, 6, 14);
      geo.rotateX(Math.PI / 2);
      rough = 0.25;
      break;
    case "corn":
    case "seeds":
      geo = new THREE.SphereGeometry(0.022, 10, 8);
      rough = 0.2;
      break;
    case "cubes":
      geo = new RoundedBoxGeometry(0.055, 0.045, 0.055, 1, 0.008);
      break;
    case "crispy":
    case "blue-cheese":
    case "veg-mix":
      geo = smoothIco(0.03, 1);
      displace(geo, (p) => (fbm3(p.x * 60, p.y * 60, p.z * 60) - 0.5) * 0.02);
      geo.scale(1.6, 0.6, 1);
      break;
    default:
      // Oignons émincés, caramélisés : demi-anneaux
      geo = new THREE.TorusGeometry(0.05, 0.009, 6, 14, Math.PI);
      geo.rotateX(Math.PI / 2);
      rough = v.variant === "caramelized" ? 0.25 : 0.35;
  }
  // Poivrons : pièces rouges et vertes, par couleur d'instance.
  const twoTone = v.variant === "strips";
  if (!twoTone)
    paint(geo, (p, _n, out) => {
      const k = fbm3(p.x * 60 + 5, p.y * 60, p.z * 60);
      out.copy(c1).lerp(c2, k);
    });
  const mat = twoTone
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    : std({ roughness: rough, transparent: !v.variant, opacity: v.variant ? 1 : 0.92 });
  const n = byArea(twoTone ? 12 : 24, fp);
  const instances = scatter(n, fp, r, 0.82).map((p, i) =>
    inst({ ...p, y: 0.015 + (i % 2) * 0.012, rx: (r() - 0.5) * 0.8, ry: r() * 6.3, rz: (r() - 0.5) * 0.8, color: twoTone ? (i % 2 ? c2 : c1).clone() : undefined }),
  );
  const set: PieceSet = { geometry: geo, material: mat, instances };
  return pieces([set], 0.03, "rain");
}

function egg(ing: Ingredient, fp: Footprint, _r: R): Built {
  const v = ing.visual;
  const white = new THREE.SphereGeometry(0.2, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  white.scale(1, 0.12, 0.85);
  warp(white, (p) => {
    const a = Math.atan2(p.z, p.x), k = 1 + (fbm3(Math.cos(a) * 2, Math.sin(a) * 2, 4) - 0.5) * 0.35;
    p.x *= k;
    p.z *= k;
  });
  const yolk = new THREE.SphereGeometry(0.07, 28, 16);
  yolk.scale(1, 0.72, 1);
  yolk.translate(0.02, 0.03, 0);
  const whiteMat = new THREE.MeshStandardMaterial({ color: C(v.color, "#FFFFFF"), roughness: 0.3 });
  const yolkMat = new THREE.MeshPhysicalMaterial({ color: C(v.color2, "#FFB300"), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 });
  const at = inst({ x: fp.cx, z: fp.cz + fp.hz * 0.1, y: 0.005, ry: 0.4 });
  return pieces(
    [
      { geometry: white, material: whiteMat, instances: [at] },
      { geometry: yolk, material: yolkMat, instances: [at] },
    ],
    0.04,
    "drop-bounce",
  );
}

// ---------------------------------------------------------------------------
// Frites
// ---------------------------------------------------------------------------

function fries(ing: Ingredient, fp: Footprint, r: R): Built {
  const v = ing.visual, wedge = v.variant === "wedges";
  let geo: THREE.BufferGeometry;
  if (wedge) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.absarc(0, 0, 0.085, -0.62, 0.62, false);
    s.lineTo(0, 0);
    geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.008, bevelSegments: 2, curveSegments: 10 });
    geo.center();
  } else {
    geo = new RoundedBoxGeometry(0.066, 0.062, 1, 2, 0.014);
    // Légèrement courbée et irrégulière, comme une vraie frite.
    warp(geo, (p) => {
      p.y += 0.035 * (p.z * p.z - 0.25) + (fbm3(p.z * 6, 1, 2) - 0.5) * 0.012;
      p.x *= 0.9 + fbm3(p.z * 4, 3, 1) * 0.25;
    });
  }
  const c1 = C(v.color), c2 = C(v.color2, "#B8781E");
  paint(geo, (p, _n, out) => {
    const k = fbm3(p.x * 30, p.y * 30, p.z * 6);
    out.copy(c1).multiplyScalar(0.9 + k * 0.2);
    if (wedge) {
      if (Math.hypot(p.x, p.y) > 0.05 && p.x > 0.02) out.copy(c2).multiplyScalar(0.8 + k * 0.4);
    } else out.lerp(c2, smoothstep(0.28, 0.52, Math.abs(p.z)) * 0.85);
  });
  const mat = std({ roughness: 0.55, bumpMap: crustBump(), bumpScale: 0.8 });
  const n = Math.round((v.count ?? 40) * 1.3 * Math.min(1.2, Math.max(0.6, (fp.hx * fp.hz) / 0.06)));
  const pileH = 0.26;
  const instances: Instance[] = [];
  // Chaque frite doit tenir entière dans la zone (sinon elle traverse la barquette).
  const limX = fp.hx * 1.18, limZ = fp.hz * 1.18;
  for (let i = 0; i < n; i++) {
    let x = 0, z = 0, ry = 0, len = 0;
    for (let tries = 0; tries < 12; tries++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.7;
      x = fp.cx + Math.cos(a) * d * fp.hx;
      z = fp.cz + Math.sin(a) * d * fp.hz;
      // Surtout dans la longueur de la barquette, quelques-unes en travers.
      ry = r() < 0.45 ? r() * Math.PI : Math.PI / 2 + (r() - 0.5) * 0.9;
      len = wedge ? 0.36 + r() * 0.1 : 0.34 + r() * 0.26;
      const ex = Math.abs(Math.sin(ry)) * len * 0.5, ez = Math.abs(Math.cos(ry)) * len * 0.5;
      if (Math.abs(x - fp.cx) + ex < limX && Math.abs(z - fp.cz) + ez < limZ) break;
      len *= 0.6;
    }
    const d = Math.hypot((x - fp.cx) / fp.hx, (z - fp.cz) / fp.hz);
    const lift = (i / n) * pileH * Math.max(0.2, 1 - d * 0.6) + r() * 0.03;
    // Le dessus de la pile : quelques frites dressées qui dépassent.
    const up = i > n * 0.75 && r() < 0.25 ? -0.3 - r() * 0.3 : (r() - 0.5) * 0.35;
    instances.push(inst({ x, z, y: 0.04 + lift + (up < -0.4 ? 0.06 : 0), rx: up, ry, rz: wedge ? r() * 6 : (r() - 0.5) * 1.2, sx: 0.85 + r() * 0.3, sy: 0.85 + r() * 0.3, sz: len }));
  }
  const surfaceAfter = (below: Surface): Surface => (x, z) =>
    below(x, z) + pileH * Math.max(0.25, 1 - 0.6 * (((x - fp.cx) / fp.hx) ** 2 + ((z - fp.cz) / fp.hz) ** 2)) + 0.05;
  return pieces([{ geometry: geo, material: mat, instances }], pileH, "rain", "lift-fade", { surfaceAfter });
}

// ---------------------------------------------------------------------------
// Formes pas encore dessinées (étape 3) : un volume neutre de la bonne couleur
// ---------------------------------------------------------------------------

function placeholder(ing: Ingredient, fp: Footprint, r: R): Built {
  const geo = new RoundedBoxGeometry(0.22, 0.08, 0.16, 2, 0.03);
  const mat = new THREE.MeshStandardMaterial({ color: C(ing.visual.color), roughness: 0.6 });
  const n = Math.max(1, Math.round(fp.hx * 2.5));
  return pieces([{ geometry: geo, material: mat, instances: along(n, fp, r, 0.4).map((p) => inst({ ...p, y: 0.04, ry: r() })) }], 0.08, "drop-bounce");
}

const BUILDERS: Partial<Record<IngredientArchetype, (ing: Ingredient, fp: Footprint, r: R) => Built>> = {
  patty,
  cutlet,
  strips,
  chunks,
  crumble,
  sausage,
  sliced,
  "cheese-slice": cheeseSlice,
  spread,
  leaf,
  slices,
  bits,
  egg,
  fries,
};

const CUSTOM: Partial<Record<IngredientArchetype, Built>> = {
  drizzle: { kind: "custom", component: "drizzle", thickness: 0.02, enter: "pour", exit: "lift-fade" },
  can: { kind: "custom", component: "drink", thickness: 0, enter: "slide-in", exit: "slide-out" },
  bottle: { kind: "custom", component: "drink", thickness: 0, enter: "slide-in", exit: "slide-out" },
};

export function buildIngredient(ing: Ingredient, fp: Footprint, seed: number): Built {
  const a = ing.visual.archetype;
  if (a === "melt") return { kind: "custom", component: ing.visual.variant === "pour" ? "pour" : "gratin", thickness: 0.03, enter: "melt", exit: "dissolve" };
  const custom = CUSTOM[a];
  if (custom) return custom;
  const built = (BUILDERS[a] ?? placeholder)(ing, fp, rng(seed));
  if (built.kind === "pieces" && ing.visual.anim?.enter) built.enter = ing.visual.anim.enter;
  return built;
}

export function isImplemented(a: IngredientArchetype) {
  return a in BUILDERS || a in CUSTOM || a === "melt";
}
