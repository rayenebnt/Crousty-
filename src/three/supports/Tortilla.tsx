/**
 * Tortilla : galette à plat pendant qu'on la garnit, puis les bords s'enroulent
 * autour de la garniture. Pas de gratiné possible (aucune couche « gratin »).
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { SupportArchetype, Visual } from "../../data/menu.types.ts";
import { damp } from "../anim/easing.ts";
import { tortillaTexture } from "../lib/textures.ts";
import { TORTILLA } from "./shapes.ts";

interface Props {
  visual: Visual<SupportArchetype>;
  open: boolean;
  fill: number;
  reduced: boolean;
  children: ReactNode;
}

export function Tortilla({ open, fill, reduced, children }: Props) {
  const { R, strip } = TORTILLA;
  const { geo, flat } = useMemo(() => {
    const g = new THREE.RingGeometry(0.0005, R, 80, 26);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    // UV planaires pour la texture de galette
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) * 0.9 + 0.5, pos.getZ(i) * 0.9 + 0.5);
    return { geo: g, flat: Float32Array.from(pos.array as Float32Array) };
  }, [R]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tortillaTexture(), roughness: 0.78, side: THREE.DoubleSide }), []);

  const state = useRef({ fold: 0, applied: -1, fill: -1 });
  useFrame((_, dt) => {
    const s = state.current;
    s.fold = damp(s.fold, open ? 0 : 1, reduced ? 30 : 6, dt);
    if (Math.abs(s.fold - s.applied) < 1e-3 && Math.abs(fill - s.fill) < 1e-3) return;
    s.applied = s.fold;
    s.fill = fill;
    const rc = Math.max(0.08, (fill + 0.06) / 2) / Math.max(s.fold, 1e-3);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = flat[i * 3], z0 = flat[i * 3 + 2];
      const d = Math.abs(z0) - strip;
      let y = 0, z = z0;
      if (d > 0) {
        const sgn = Math.sign(z0);
        const th = d / rc;
        if (th <= Math.PI) {
          z = sgn * (strip + rc * Math.sin(th));
          y = rc * (1 - Math.cos(th));
        } else {
          z = sgn * (strip - (d - Math.PI * rc));
          y = 2 * rc + (sgn < 0 ? 0.008 : 0);
        }
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <group>
      <mesh geometry={geo} material={mat} position-y={0.004} />
      {children}
    </group>
  );
}
