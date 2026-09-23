/** Ingrédients à rendu spécial : filet de sauce, nappage qui coule, boisson. */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Ingredient } from "../../data/menu.types.ts";
import type { Footprint, Surface } from "../archetypes/types.ts";
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic } from "../anim/easing.ts";
import { rng } from "../lib/noise.ts";
import { canLabelTexture, dropletsBump } from "../lib/textures.ts";
import { createMeltMaterial } from "../materials/melt.ts";
import { CAN } from "../supports/shapes.ts";
import type { Phase } from "./Pieces.tsx";

interface Common {
  ing: Ingredient;
  phase: Phase;
  delay: number;
  reduced: boolean;
}

/** Suit le temps d'entrée / de sortie d'un élément. */
function useTimeline(phase: Phase, delay: number) {
  const s = useRef({ start: -1, exit: -1 });
  useEffect(() => {
    if (phase === "exit") s.current.exit = -2;
  }, [phase]);
  return (t: number) => {
    const c = s.current;
    if (c.start < 0) c.start = t + delay;
    if (c.exit === -2) c.exit = t;
    return { e: t - c.start, x: c.exit >= 0 ? t - c.exit : -1 };
  };
}

// ---------------------------------------------------------------------------
// Filet de sauce : un tube qui se dessine en zigzag, avec une goutte au bout.
// ---------------------------------------------------------------------------

export function Drizzle({ ing, phase, delay, reduced, fp, surface, rank }: Common & { fp: Footprint; surface: Surface; rank: number }) {
  const honey = ing.visual.variant === "honey";
  const geo = useMemo(() => {
    const r = rng(17 + rank * 31);
    const pts: THREE.Vector3[] = [];
    const turns = 7 + rank * 2;
    for (let i = 0; i <= turns * 6; i++) {
      const t = i / (turns * 6);
      const x = fp.cx + (t * 2 - 1) * fp.hx * 0.86;
      const z = fp.cz + Math.sin(t * Math.PI * turns + rank * 1.3) * fp.hz * (0.72 - rank * 0.12) + (r() - 0.5) * 0.02;
      pts.push(new THREE.Vector3(x, surface(x, z) + 0.018 + rank * 0.006, z));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, honey ? 0.011 : 0.016, 8, false);
  }, [fp, surface, rank, honey]);
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: ing.visual.color, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.18, transparent: honey, opacity: honey ? 0.9 : 1 }),
    [ing.visual.color, honey],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => mat.dispose(), [mat]);
  const tip = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const tl = useTimeline(phase, delay);
  const total = geo.index!.count;

  useFrame(({ clock }) => {
    const { e, x } = tl(clock.elapsedTime);
    const k = reduced ? (e > 0 ? 1 : 0) : clamp01(e / 0.65);
    geo.setDrawRange(0, Math.floor((total * easeInOutCubic(k)) / 6) * 6);
    if (tip.current) {
      tip.current.visible = k > 0 && k < 1;
      if (tip.current.visible) tip.current.position.copy((geo.parameters.path as THREE.Curve<THREE.Vector3>).getPointAt(easeInOutCubic(k)));
    }
    if (x >= 0 && group.current) {
      const q = clamp01(x / 0.25);
      group.current.position.y = q * 0.25;
      mat.transparent = true;
      mat.opacity = 1 - q;
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geo} material={mat} />
      <mesh ref={tip} material={mat} visible={false}>
        <sphereGeometry args={[honey ? 0.016 : 0.024, 12, 10]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Nappage cheddar : un filet tombe, puis la nappe s'étale sur les frites.
// ---------------------------------------------------------------------------

export function Pour({ ing, phase, delay, reduced, fp, surface }: Common & { fp: Footprint; surface: Surface }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2, 60, 60);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const m = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i), nz = pos.getZ(i);
      const x = fp.cx + nx * fp.hx * 1.12, z = fp.cz + nz * fp.hz * 1.12;
      // Plus épais au centre, il redescend vers les bords.
      pos.setXYZ(i, x, surface(x, z) + 0.03 * Math.max(0, 1 - nx * nx - nz * nz) + 0.012, z);
      m[i * 2] = nx;
      m[i * 2 + 1] = nz;
    }
    g.setAttribute("aM", new THREE.BufferAttribute(m, 2));
    g.computeVertexNormals();
    return g;
  }, [fp, surface]);
  const { material, uniforms } = useMemo(() => createMeltMaterial(ing.visual.color ?? "#FFB81C", ing.visual.color2 ?? "#E8901A", "pour"), [ing.visual.color, ing.visual.color2]);
  const stream = useMemo(() => new THREE.MeshPhysicalMaterial({ color: ing.visual.color, roughness: 0.25, clearcoat: 0.6 }), [ing.visual.color]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => {
    material.dispose();
    stream.dispose();
  }, [material, stream]);
  const streamRef = useRef<THREE.Mesh>(null);
  const tl = useTimeline(phase, delay);
  const top = surface(fp.cx, fp.cz);

  useFrame(({ clock }) => {
    const { e, x } = tl(clock.elapsedTime);
    uniforms.uShow.value = x >= 0 ? 1 - clamp01(x / 0.35) : e > 0 ? 1 : 0;
    uniforms.uMelt.value = reduced ? (e > 0 ? 1 : 0) : easeOutCubic(clamp01((e - 0.2) / 0.85));
    const s = streamRef.current;
    if (s) {
      const k = reduced ? 1 : clamp01(e / 0.2);
      const fade = reduced ? 1 : clamp01((e - 0.75) / 0.3);
      s.visible = e > 0 && fade < 1 && x < 0;
      s.scale.set(1 - fade, k, 1 - fade);
    }
  });

  return (
    <group>
      <mesh geometry={geo} material={material} />
      <mesh ref={streamRef} material={stream} position={[fp.cx, top + 0.9, fp.cz]} visible={false}>
        <cylinderGeometry args={[0.03, 0.022, 0.9, 12, 1, true]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Boisson : canette générique (nom en clair, pas de logo) ou bouteille d'eau.
// ---------------------------------------------------------------------------

function canProfile() {
  const { R, H } = CAN;
  return [
    [0, 0.02], [R * 0.78, 0], [R * 0.93, 0.02], [R, 0.08], [R, H - 0.12], [R * 0.9, H - 0.04], [R * 0.82, H - 0.01], [R * 0.84, H], [R * 0.8, H], [R * 0.76, H - 0.02], [0, H - 0.02],
  ].map(([x, y]) => new THREE.Vector2(x, y));
}

function bottleProfile() {
  return [
    [0, 0], [0.26, 0], [0.29, 0.05], [0.29, 0.9], [0.2, 1.12], [0.1, 1.24], [0.095, 1.32], [0, 1.32],
  ].map(([x, y]) => new THREE.Vector2(x, y));
}

export function Drink({ ing, phase, reduced }: Common) {
  const v = ing.visual;
  const isCan = v.archetype === "can";
  const { geo, mats } = useMemo(() => {
    const g = new THREE.LatheGeometry(isCan ? canProfile() : bottleProfile(), 56);
    // UV verticales proportionnelles à la hauteur (l'étiquette n'est pas écrasée).
    const pos = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
    const height = isCan ? CAN.H : 1.32;
    for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / height);
    if (isCan) {
      return {
        geo: g,
        mats: [
          new THREE.MeshPhysicalMaterial({
            map: canLabelTexture(v.color ?? "#D0141E", v.color2 ?? "#FFFFFF", v.label ?? ing.label.toUpperCase()),
            metalness: 0.45,
            roughness: 0.3,
            clearcoat: 0.8,
            clearcoatRoughness: 0.25,
            bumpMap: dropletsBump(),
            bumpScale: 0.8,
          }),
        ],
      };
    }
    return {
      geo: g,
      mats: [new THREE.MeshPhysicalMaterial({ color: v.color ?? "#9FD3F2", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.45, clearcoat: 1 })],
    };
  }, [isCan, v.color, v.color2, v.label, ing.label]);
  const group = useRef<THREE.Group>(null);
  const tl = useTimeline(phase, 0);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const { e, x } = tl(clock.elapsedTime);
    const k = reduced ? 1 : clamp01(e / 0.5);
    g.position.x = (1 - easeOutBack(k, 1.4)) * 1.1;
    g.rotation.z = reduced ? 0 : Math.sin(k * 9) * (1 - k) * 0.35;
    const out = x >= 0 ? clamp01(x / 0.25) : 0;
    g.position.x += out * 1.1;
    g.scale.setScalar(1 - out * 0.3);
  });

  return (
    <group ref={group}>
      <mesh geometry={geo} material={mats[0]} />
      {!isCan && (
        <>
          <mesh position-y={1.36}>
            <cylinderGeometry args={[0.1, 0.1, 0.09, 24]} />
            <meshStandardMaterial color="#1E6FD9" roughness={0.4} />
          </mesh>
          <mesh position-y={0.55}>
            <cylinderGeometry args={[0.295, 0.295, 0.32, 48, 1, true]} />
            <meshStandardMaterial map={canLabelTexture("#1E6FD9", "#FFFFFF", v.label ?? "EAU")} roughness={0.5} />
          </mesh>
        </>
      )}
    </group>
  );
}
