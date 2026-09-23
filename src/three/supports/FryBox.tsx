/** Barquette en carton : rouge Crousty à l'extérieur, papier clair à l'intérieur. */
import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { SupportArchetype, Visual } from "../../data/menu.types.ts";
import { boxPrintTexture } from "../lib/textures.ts";
import { BOAT } from "./shapes.ts";

export function FryBox({ children }: { visual: Visual<SupportArchetype>; children: ReactNode }) {
  const { geo, floor } = useMemo(() => {
    const { topW, topD, bottomW, H } = BOAT;
    const g = new THREE.CylinderGeometry((topW / 2) * Math.SQRT2, (bottomW / 2) * Math.SQRT2, H, 4, 1, true);
    g.rotateY(Math.PI / 4);
    g.translate(0, H / 2, 0);
    g.scale(1, 1, topD / topW);
    const f = new THREE.PlaneGeometry(bottomW, bottomW * (topD / topW));
    f.rotateX(-Math.PI / 2);
    f.translate(0, 0.004, 0);
    return { geo: g, floor: f };
  }, []);
  const mats = useMemo(
    () => ({
      outside: new THREE.MeshStandardMaterial({ map: boxPrintTexture(), roughness: 0.62, side: THREE.FrontSide }),
      inside: new THREE.MeshStandardMaterial({ color: "#F2EADB", roughness: 0.9, side: THREE.BackSide }),
      floor: new THREE.MeshStandardMaterial({ color: "#EFE5D2", roughness: 0.9 }),
    }),
    [],
  );
  return (
    <group>
      <mesh geometry={geo} material={mats.outside} />
      <mesh geometry={geo} material={mats.inside} />
      <mesh geometry={floor} material={mats.floor} />
      {children}
    </group>
  );
}

/** Emplacement de la boisson : invisible, la canette se pose au sol. */
export function DrinkSpot({ children }: { visual: Visual<SupportArchetype>; children: ReactNode }) {
  return <group>{children}</group>;
}

/** Supports pas encore dessinés (étape 3) : une assiette sombre neutre. */
export function PlainSupport({ children }: { visual: Visual<SupportArchetype>; children: ReactNode }) {
  return (
    <group>
      <mesh position-y={0.03}>
        <cylinderGeometry args={[0.75, 0.7, 0.06, 48]} />
        <meshStandardMaterial color="#1A1B22" roughness={0.4} />
      </mesh>
      {children}
    </group>
  );
}
