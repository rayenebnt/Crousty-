/** Petits outils de géométrie pour les formes procédurales. */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Déplace chaque sommet le long de sa normale : p += n · f(p). */
export function displace(geo: THREE.BufferGeometry, f: (p: THREE.Vector3, n: THREE.Vector3) => number) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const d = f(p, n);
    pos.setXYZ(i, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Transforme chaque sommet librement. */
export function warp(geo: THREE.BufferGeometry, f: (p: THREE.Vector3) => void) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    f(p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Couleurs de sommet calculées depuis la position et la normale. */
export function paint(geo: THREE.BufferGeometry, f: (p: THREE.Vector3, n: THREE.Vector3, out: THREE.Color) => void) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    c.setRGB(1, 1, 1);
    f(p, n, c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

const sgnPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

/**
 * Demi-superellipsoïde (forme de pain) : dôme si `up`, fond sinon.
 * a, b : demi-longueur et demi-largeur ; c : hauteur ; e1 : galbe vertical ; e2 : forme du contour.
 * UV : u autour, v de l'équateur (0) au sommet (1).
 */
export function superHalf(a: number, b: number, c: number, e1: number, e2: number, up: boolean, segU = 96, segV = 28) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= segV; j++) {
    const v = j / segV;
    const theta = (v * Math.PI) / 2;
    const ct = sgnPow(Math.cos(theta), e1);
    const st = sgnPow(Math.sin(theta), e1);
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const phi = u * Math.PI * 2;
      const x = a * ct * sgnPow(Math.cos(phi), e2);
      const z = b * ct * sgnPow(Math.sin(phi), e2);
      positions.push(x, up ? c * st : -c * st, z);
      uvs.push(u, v);
    }
  }
  const row = segU + 1;
  for (let j = 0; j < segV; j++)
    for (let i = 0; i < segU; i++) {
      const a0 = j * row + i, a1 = a0 + 1, b0 = a0 + row, b1 = b0 + 1;
      if (up) indices.push(a0, b1, a1, a0, b0, b1);
      else indices.push(a0, a1, b1, a0, b1, b0);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Disque au contour de superellipse (face coupée du pain), tourné vers le haut (1) ou le bas (-1). */
export function superDisc(a: number, b: number, e2: number, facing: 1 | -1, seg = 96) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= seg; i++) {
    const phi = (i / seg) * Math.PI * 2;
    const x = a * sgnPow(Math.cos(phi), e2);
    const z = b * sgnPow(Math.sin(phi), e2);
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  const geo = new THREE.ShapeGeometry(shape, 1);
  geo.rotateX((-facing * Math.PI) / 2);
  // UV planaires répétées pour la mie
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * 1.5;
    uv[i * 2 + 1] = pos.getZ(i) * 1.5;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Profil de la superellipse, pour poser des éléments sur la surface du pain. */
export function superOutline(a: number, b: number, e2: number, phi: number) {
  return { x: a * sgnPow(Math.cos(phi), e2), z: b * sgnPow(Math.sin(phi), e2) };
}

/** Icosaèdre aux sommets fusionnés : se déforme sans facettes ni fissures. */
export function smoothIco(radius: number, detail: number) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  return mergeVertices(g);
}
