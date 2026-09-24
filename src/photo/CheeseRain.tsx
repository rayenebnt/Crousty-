/**
 * Pluie de fromage râpé : des brins tombent sur le sandwich et s'y posent,
 * pendant que la photo « fromage râpé » apparaît par plaques en dessous.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clamp01, hash01 } from "../scene/easing.ts";
import { cheeseShred } from "../scene/textures.ts";

const COLORS = ["#FFF6D6", "#FCEDB8", "#F8E3A0", "#FFF1C4", "#F3DB90"];

interface Props {
  /** Demi-axes de la zone couverte (cm). */
  rx: number;
  rz: number;
  y: number;
  order: number;
  /** Début (s, relatif au montage). */
  delay: number;
  /** Durée de la chute de tous les brins (s). */
  spread?: number;
  /** Moment où les brins s'effacent (s après le début) : la photo a pris le relais. */
  fadeAt: number;
  count?: number;
  phase: "enter" | "exit";
}

export function CheeseRain({ rx, rz, y, order, delay, spread = 1.1, fadeAt, count = 110, phase }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(1.5, 0.38).rotateX(-Math.PI / 2), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: cheeseShred(), transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 1 }),
    [],
  );
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  // Chaque brin : point d'arrivée dans l'ellipse, départ décalé, dérive, rotation.
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = hash01(i * 3 + 1) * Math.PI * 2;
        const r = Math.sqrt(hash01(i * 3 + 2));
        return {
          x: Math.cos(a) * r * rx,
          z: Math.sin(a) * r * rz,
          t0: hash01(i * 7 + 5) * spread,
          fall: 0.45 + hash01(i * 11 + 3) * 0.25,
          h: 14 + hash01(i * 13 + 7) * 10,
          drift: (hash01(i * 17 + 1) - 0.5) * 3,
          rot: hash01(i * 19 + 4) * Math.PI * 2,
          spin: (hash01(i * 23 + 9) - 0.5) * 9,
          scale: 0.7 + hash01(i * 29 + 2) * 0.6,
        };
      }),
    [count, rx, rz, spread],
  );

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) mesh.setColorAt(i, c.set(COLORS[i % COLORS.length]));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  const o = useMemo(() => new THREE.Object3D(), []);
  const t = useRef({ start: -1, exit: -1 });
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const s = t.current, now = clock.elapsedTime;
    if (s.start < 0) s.start = now + delay;
    if (phase === "exit" && s.exit < 0) s.exit = now;
    const e = now - s.start;
    const out = s.exit >= 0 ? clamp01((now - s.exit) / 0.25) : 0;
    mat.opacity = (1 - clamp01((e - fadeAt) / 0.5)) * (1 - out);
    mesh.visible = e > 0 && mat.opacity > 0.01;
    if (!mesh.visible) return;
    for (let i = 0; i < count; i++) {
      const d = drops[i];
      const k = clamp01((e - d.t0) / d.fall);
      const fallen = k * k; // accélère comme une vraie chute
      const land = 1 - fallen;
      o.position.set(d.x + d.drift * land, y + d.h * land, d.z);
      o.rotation.set(0, d.rot + d.spin * land, 0);
      o.scale.setScalar(e < d.t0 ? 0.0001 : d.scale);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, count]} renderOrder={order} frustumCulled={false} />;
}
