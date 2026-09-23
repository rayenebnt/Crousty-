/**
 * Pain long, en deux moitiés : le dessus pivote sur une charnière arrière.
 * Il s'ouvre quand un ingrédient arrive, puis se referme sur la garniture
 * en laissant l'avant entrouvert (on voit ce qu'il y a dedans).
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { SupportArchetype, Visual } from "../../data/menu.types.ts";
import { damp } from "../anim/easing.ts";
import { displace, paint, superDisc, superHalf } from "../lib/geometry.ts";
import { fbm3 } from "../lib/noise.ts";
import { crumbTexture, crustBump, crustTexture } from "../lib/textures.ts";
import { BREAD, type TopShape } from "./shapes.ts";
import { TopShapeContext } from "./TopShapeContext.ts";

interface Props {
  visual: Visual<SupportArchetype>;
  open: boolean;
  fill: number;
  reduced: boolean;
  children: ReactNode;
  top: ReactNode;
}

function crustGeometry(up: boolean, light: THREE.Color, dark: THREE.Color) {
  const { A, B, bottomH, topH, e1Bottom, e1Top, e2 } = BREAD;
  const geo = up ? superHalf(A, B, topH, e1Top, e2, true, 120, 32) : superHalf(A, B, bottomH, e1Bottom, e2, false, 120, 20);
  displace(geo, (p) => (fbm3(p.x * 2.2, p.y * 2.2, p.z * 2.2) - 0.5) * 0.05 * Math.min(1, Math.abs(p.y) * 8));
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 5, uv.getY(i) * 1.2);
  paint(geo, (p, _n, out) => {
    const h = Math.abs(p.y) / (up ? topH : bottomH);
    const k = fbm3(p.x * 3, p.y * 3 + 7, p.z * 3);
    const t = up ? Math.min(1, h * 0.75 + (k - 0.5) * 0.5) : 0.15 + h * 0.3 + (k - 0.5) * 0.2;
    out.copy(light).lerp(dark, Math.max(0, t) * (up ? 0.45 : 0.35));
  });
  return geo;
}

export function Bread({ visual, open, fill, reduced, children, top }: Props) {
  const { B, topH, e1Top, e2, A, closedAngle, openAngle } = BREAD;
  const geos = useMemo(() => {
    const light = new THREE.Color(visual.color ?? "#E2A45C"), dark = new THREE.Color(visual.color2 ?? "#8A4A1C");
    return {
      bottom: crustGeometry(false, light, dark),
      top: crustGeometry(true, light, dark),
      crumbUp: superDisc(A * 0.985, B * 0.985, e2, 1),
      crumbDown: superDisc(A * 0.985, B * 0.985, e2, -1),
    };
  }, [visual.color, visual.color2, A, B, e2]);
  const mats = useMemo(
    () => ({
      crust: new THREE.MeshStandardMaterial({ vertexColors: true, map: crustTexture(), bumpMap: crustBump(), bumpScale: 0.9, roughness: 0.52 }),
      crumb: new THREE.MeshStandardMaterial({ map: crumbTexture(), roughness: 0.92, bumpMap: crustBump(), bumpScale: 1.5 }),
    }),
    [],
  );
  const topShape = useMemo<TopShape>(() => ({ kind: "dome", a: A, b: B, c: topH, e1: e1Top, e2 }), [A, B, topH, e1Top, e2]);

  const hinge = useRef<THREE.Group>(null);
  const anim = useRef({ open: 0, lift: fill * 0.9 });
  useFrame((_, dt) => {
    const a = anim.current;
    const speed = reduced ? 30 : 9;
    a.open = damp(a.open, open ? 1 : 0, speed, dt);
    a.lift = damp(a.lift, fill * 0.9 + 0.005, reduced ? 30 : 10, dt);
    if (hinge.current) {
      hinge.current.rotation.x = -(closedAngle + a.open * (openAngle - closedAngle));
      hinge.current.position.y = a.lift;
    }
  });

  const hingeZ = -B * 0.92;
  return (
    <group>
      <mesh geometry={geos.bottom} material={mats.crust} />
      <mesh geometry={geos.crumbUp} material={mats.crumb} position-y={0.002} />
      {children}
      <group ref={hinge} position={[0, fill * 0.9, hingeZ]}>
        <group position={[0, 0, -hingeZ]}>
          <mesh geometry={geos.top} material={mats.crust} />
          <mesh geometry={geos.crumbDown} material={mats.crumb} position-y={-0.002} />
          <TopShapeContext.Provider value={topShape}>{top}</TopShapeContext.Provider>
        </group>
      </group>
    </group>
  );
}
