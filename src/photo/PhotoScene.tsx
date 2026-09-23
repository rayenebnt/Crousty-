/**
 * La scène photo, vue de dessus : le plateau papier journal (formule) ou une feuille seule,
 * le produit, les frites et la boisson à leur place. Unités : centimètres.
 */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Menu, PlaceId } from "../data/menu.types.ts";
import type { AssemblySpec, BuildSpec } from "../domain/resolveBuild.ts";
import { clamp01, damp, easeOutCubic } from "../scene/easing.ts";
import { newspaperTexture } from "../scene/textures.ts";
import { usePresence } from "../scene/usePresence.ts";
import { PhotoAssembly } from "./PhotoAssembly.tsx";
import { PhotoLayer } from "./PhotoLayer.tsx";
import { photoInfo } from "./photos.ts";
import { DECOR } from "./shots.ts";

type Spot = { x: number; z: number; rot: number };
/** Places sur le plateau (cm, x vers la droite, z vers le bas de l'écran). */
const ON_TRAY: Record<"main" | PlaceId, Spot> = {
  main: { x: 1.5, z: 5, rot: -0.06 },
  side: { x: -11.5, z: -7, rot: 0.15 },
  side2: { x: 0, z: -9, rot: 0 },
  drink: { x: 13, z: -8.5, rot: 0.45 },
};
const SOLO: Spot = { x: 0, z: 0, rot: -0.05 };

/** Cadre de la scène (cm) : sert au cadrage de la caméra. */
export const sceneBounds = (tray: boolean): [number, number] => (tray ? [47, 35] : [34, 26]);

/** Entrée / sortie d'un bloc entier (changement de produit, de pain…). */
function Pop({ phase, spot, reduced, children }: { phase: "enter" | "exit"; spot: Spot; reduced: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef({ start: -1, exit: -1, x: spot.x, z: spot.z, r: spot.rot });
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = t.current, now = clock.elapsedTime;
    if (s.start < 0) s.start = now;
    if (phase === "exit" && s.exit < 0) s.exit = now;
    s.x = damp(s.x, spot.x, 6, dt);
    s.z = damp(s.z, spot.z, 6, dt);
    s.r = damp(s.r, spot.rot, 6, dt);
    const out = s.exit >= 0 ? clamp01((now - s.exit) / (reduced ? 0.1 : 0.3)) : 0;
    g.position.set(s.x - out * 12, out * 6, s.z);
    g.rotation.y = s.r;
    g.scale.setScalar(Math.max(0.001, 1 - out * 0.4));
    g.visible = out < 1;
  });
  return <group ref={ref}>{children}</group>;
}

/** Plateau ou feuille : la vraie photo si elle existe, sinon le papier journal dessiné. */
function Decor({ tray, phase, reduced }: { tray: boolean; phase: "enter" | "exit"; reduced: boolean }) {
  const d = tray ? DECOR.tray : DECOR.sheet;
  const hasPhoto = !!photoInfo(d.file);
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      paper: new THREE.MeshBasicMaterial({ map: newspaperTexture(), transparent: true, toneMapped: false, depthTest: false, depthWrite: false }),
      tray: new THREE.MeshBasicMaterial({ color: "#141519", transparent: true, toneMapped: false, depthTest: false, depthWrite: false }),
    }),
    [],
  );
  const t = useRef({ start: -1, exit: -1 });
  useFrame(({ clock }) => {
    const s = t.current, now = clock.elapsedTime;
    if (s.start < 0) s.start = now;
    if (phase === "exit" && s.exit < 0) s.exit = now;
    const k = reduced ? 1 : easeOutCubic(clamp01((now - s.start) / 0.4));
    const o = k * (s.exit >= 0 ? 1 - clamp01((now - s.exit) / 0.3) : 1);
    mats.paper.opacity = o;
    mats.tray.opacity = o;
    if (group.current) group.current.scale.setScalar(0.96 + 0.04 * k);
  });
  if (hasPhoto) return <PhotoLayer file={d.file} label="" color="#000000" fallbackCm={d.sizeCm} x={0} z={0} y={0} order={1} phase={phase} reduced={reduced} enter="fade" />;
  const [w, h] = d.sizeCm;
  return (
    <group ref={group}>
      {tray && (
        <mesh rotation-x={-Math.PI / 2} material={mats.tray} renderOrder={1}>
          <planeGeometry args={[w, h]} />
        </mesh>
      )}
      <mesh rotation-x={-Math.PI / 2} rotation-z={0.02} material={mats.paper} renderOrder={2}>
        <planeGeometry args={tray ? [w - 4, h - 3.5] : [w, h]} />
      </mesh>
    </group>
  );
}

function Place({ menu, spec, spot, reduced, id, baseOrder }: { menu: Menu; spec?: AssemblySpec; spot: Spot; reduced: boolean; id: string; baseOrder: number }) {
  const list = usePresence(spec ? [spec] : [], (s) => `${id}:${s.support}`, 380);
  return (
    <>
      {list.map((p) => (
        <Pop key={p.key} phase={p.phase} spot={spot} reduced={reduced}>
          <PhotoAssembly menu={menu} spec={p.item} reduced={reduced} baseOrder={baseOrder} />
        </Pop>
      ))}
    </>
  );
}

export function PhotoScene({ menu, build, reduced }: { menu: Menu; build: BuildSpec; reduced: boolean }) {
  const decor = usePresence([build.tray], (t) => (t ? "tray" : "sheet"), 350);
  const spots = build.tray ? ON_TRAY : { ...ON_TRAY, main: SOLO };
  return (
    <group>
      {decor.map((p) => (
        <Decor key={p.key} tray={p.item} phase={p.phase} reduced={reduced} />
      ))}
      <Place menu={menu} id={build.productId} spec={build.main} spot={spots.main} reduced={reduced} baseOrder={200} />
      {(["side", "side2", "drink"] as const).map((pid, i) => (
        <Place key={pid} menu={menu} id={pid} spec={build.places[pid]} spot={spots[pid]} reduced={reduced} baseOrder={50 + i * 50} />
      ))}
    </group>
  );
}
