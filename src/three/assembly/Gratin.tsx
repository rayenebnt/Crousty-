/**
 * Gratiné : le fromage râpé apparaît, fond et coule sur les bords, puis dore
 * (bulles, zones grillées) avec de la vapeur. Au décochage, il s'efface.
 */
import { useFrame } from "@react-three/fiber";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Ingredient } from "../../data/menu.types.ts";
import { clamp01, easeInOutCubic, easeOutCubic } from "../anim/easing.ts";
import { Steam } from "../fx/Steam.tsx";
import { createMeltMaterial } from "../materials/melt.ts";
import type { TopShape } from "../supports/shapes.ts";
import { TopShapeContext } from "../supports/TopShapeContext.ts";
import type { Phase } from "./Pieces.tsx";

const sgnPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

function gratinGeometry(shape: TopShape) {
  const segU = 150, segV = 46, vMin = -0.16;
  const pos: number[] = [], m: number[] = [], idx: number[] = [];
  for (let j = 0; j <= segV; j++) {
    const v = vMin + (j / segV) * (1 - vMin);
    for (let i = 0; i <= segU; i++) {
      const u = i / segU, phi = u * Math.PI * 2;
      if (shape.kind === "dome") {
        const { a, b, c, e1, e2 } = shape;
        if (v >= 0) {
          const th = (v * Math.PI) / 2, ct = sgnPow(Math.cos(th), e1), st = sgnPow(Math.sin(th), e1);
          pos.push(a * ct * sgnPow(Math.cos(phi), e2), c * st, b * ct * sgnPow(Math.sin(phi), e2));
        } else {
          pos.push(a * 1.012 * sgnPow(Math.cos(phi), e2), v * 0.45, b * 1.012 * sgnPow(Math.sin(phi), e2));
        }
      } else {
        const r = Math.max(0, v);
        pos.push(Math.cos(phi) * shape.hx * (1 - r), 0.01 + (v < 0 ? v * 0.3 : 0), Math.sin(phi) * shape.hz * (1 - r));
      }
      m.push(u, v);
    }
  }
  const row = segU + 1;
  for (let j = 0; j < segV; j++)
    for (let i = 0; i < segU; i++) {
      const a0 = j * row + i, a1 = a0 + 1, b0 = a0 + row, b1 = b0 + 1;
      idx.push(a0, b1, a1, a0, b0, b1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aM", new THREE.Float32BufferAttribute(m, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Gratin({ ing, phase, reduced }: { ing: Ingredient; phase: Phase; reduced: boolean }) {
  const shape = useContext(TopShapeContext);
  const geo = useMemo(() => gratinGeometry(shape), [shape]);
  const { material, uniforms } = useMemo(() => createMeltMaterial(ing.visual.color ?? "#F6D77A", ing.visual.color2 ?? "#B8651E", "gratin"), [ing.visual.color, ing.visual.color2]);
  useEffect(() => () => {
    geo.dispose();
    material.dispose();
  }, [geo, material]);

  const time = useRef({ start: -1, exit: -1 });
  const [steam, setSteam] = useState(reduced ? 0 : 1);
  useEffect(() => {
    if (phase === "exit") {
      time.current.exit = -2;
      setSteam(0);
    }
  }, [phase]);
  useEffect(() => {
    if (reduced || phase === "exit") return;
    const id = setTimeout(() => setSteam(0.3), 3600);
    return () => clearTimeout(id);
  }, [reduced, phase]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime, s = time.current;
    if (s.start < 0) s.start = t;
    if (s.exit === -2) s.exit = t;
    const e = t - s.start;
    if (reduced) {
      uniforms.uShow.value = clamp01(e / 0.2);
      uniforms.uMelt.value = 1;
      uniforms.uBrown.value = 1;
    } else {
      uniforms.uShow.value = clamp01(e / 0.2);
      uniforms.uMelt.value = easeOutCubic(clamp01((e - 0.1) / 0.9));
      uniforms.uBrown.value = easeInOutCubic(clamp01((e - 0.35) / 2.6));
    }
    if (s.exit >= 0) uniforms.uShow.value = 1 - clamp01((t - s.exit) / (reduced ? 0.15 : 0.4));
  });

  const hx = shape.kind === "dome" ? shape.a * 0.7 : shape.hx * 0.7;
  const hz = shape.kind === "dome" ? shape.b * 0.5 : shape.hz * 0.5;
  const topY = shape.kind === "dome" ? shape.c : 0.02;
  return (
    <group>
      <mesh geometry={geo} material={material} />
      {!reduced && (
        <group position-y={topY}>
          <Steam intensity={steam} hx={hx} hz={hz} />
        </group>
      )}
    </group>
  );
}
