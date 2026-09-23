/**
 * Affiche les pièces d'un ingrédient (instanciées : un appel de dessin par forme)
 * et joue leur entrée (chute, pluie, vol de feuille…) et leur sortie.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BuiltPieces, PieceSet, Surface } from "../archetypes/types.ts";
import { bounceOut, clamp01, damp, easeOutBack, easeOutCubic, hash01 } from "../anim/easing.ts";

export type Phase = "enter" | "exit";

interface Props {
  built: BuiltPieces;
  surface: Surface;
  phase: Phase;
  /** Délai avant l'entrée (secondes), ex. le temps que le pain s'ouvre. */
  delay: number;
  reduced: boolean;
}

const EXIT = 0.28;

export function Pieces({ built, surface, phase, delay, reduced }: Props) {
  return (
    <>
      {built.sets.map((set, i) => (
        <PieceMesh key={i} set={set} enter={built.enter} surface={surface} phase={phase} delay={delay} reduced={reduced} />
      ))}
    </>
  );
}

function PieceMesh({ set, enter, surface, phase, delay, reduced }: { set: PieceSet; enter: BuiltPieces["enter"]; surface: Surface; phase: Phase; delay: number; reduced: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = set.instances.length;
  // Matériau propre à cet élément : on peut le faire disparaître sans toucher aux autres.
  const materials = useMemo(() => (Array.isArray(set.material) ? set.material.map((m) => m.clone()) : set.material.clone()), [set.material]);
  useEffect(() => () => (Array.isArray(materials) ? materials.forEach((m) => m.dispose()) : materials.dispose()), [materials]);

  const state = useRef({ start: -1, exitStart: -1, baseY: new Float32Array(n), done: false });
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  useLayoutEffect(() => {
    const mesh = ref.current!;
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    set.instances.forEach((it, i) => {
      state.current.baseY[i] = surface(it.x, it.z) + it.y;
      mesh.setMatrixAt(i, hidden);
      if (it.color) mesh.setColorAt(i, it.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  useEffect(() => {
    if (phase === "exit") state.current.exitStart = -2;
  }, [phase]);

  const m = useMemo(() => ({ o: new THREE.Object3D() }), []);

  useFrame(({ clock }, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const s = state.current;
    const t = clock.elapsedTime;
    if (s.start < 0) s.start = t + delay;
    if (s.exitStart === -2) s.exitStart = t;
    const dur = reduced ? 0.18 : enter === "rain" ? 0.5 : enter === "flutter" ? 0.75 : enter === "pop" ? 0.4 : 0.5;
    const exitK = s.exitStart >= 0 ? clamp01((t - s.exitStart) / EXIT) : 0;
    const surf = surfaceRef.current;
    let moving = exitK > 0;

    for (let i = 0; i < n; i++) {
      const it = set.instances[i];
      const target = surf(it.x, it.z) + it.y;
      const by = s.baseY[i];
      if (Math.abs(by - target) > 1e-4) {
        s.baseY[i] = damp(by, target, 12, dt);
        moving = true;
      }
      const stagger = reduced ? 0 : enter === "rain" ? hash01(i) * 0.32 : enter === "flutter" ? i * 0.07 : i * 0.045;
      const k = clamp01((t - s.start - stagger) / dur);
      if (k < 1) moving = true;
      let yOff = 0, rx = 0, rz = 0, scale = k > 0 ? 1 : 0;
      if (!reduced) {
        if (enter === "pop") scale = k > 0 ? Math.max(0, easeOutBack(k)) : 0;
        else if (enter === "flutter") {
          yOff = (1 - easeOutCubic(k)) * 0.75;
          rz = Math.sin(k * 11 + i) * (1 - k) * 0.5;
          rx = Math.cos(k * 8 + i) * (1 - k) * 0.35;
        } else if (enter !== "none") yOff = (1 - bounceOut(k)) * (enter === "rain" ? 1.1 : 0.85);
      } else scale = k;
      if (exitK > 0) {
        yOff += exitK * 0.35;
        scale *= 1 - exitK * 0.3;
      }
      m.o.position.set(it.x, s.baseY[i] + yOff, it.z);
      m.o.rotation.set(it.rx + rx, it.ry, it.rz + rz);
      m.o.scale.set(it.sx * scale, it.sy * scale, it.sz * scale);
      m.o.updateMatrix();
      mesh.setMatrixAt(i, m.o.matrix);
    }
    if (moving || !s.done) {
      mesh.instanceMatrix.needsUpdate = true;
      s.done = !moving;
    }
    if (exitK > 0) {
      for (const mat of Array.isArray(materials) ? materials : [materials]) {
        if (!mat.transparent) {
          mat.transparent = true;
          mat.needsUpdate = true;
        }
        mat.opacity = 1 - exitK;
      }
    }
  });

  return <instancedMesh ref={ref} args={[set.geometry, materials, n]} frustumCulled={false} />;
}
