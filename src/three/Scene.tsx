/**
 * La scène : le produit au centre, les frites et la boisson autour,
 * le tout sur un plateau papier journal quand la formule est incluse.
 */
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Menu, PlaceId } from "../data/menu.types.ts";
import type { AssemblySpec, BuildSpec } from "../domain/resolveBuild.ts";
import { clamp01, damp, easeOutBack } from "./anim/easing.ts";
import { Assembly } from "./assembly/Assembly.tsx";
import { usePresence } from "./assembly/usePresence.ts";
import { newspaperTexture, woodTexture } from "./lib/textures.ts";

export const TRAY = { w: 4.5, d: 3.2, h: 0.07 };
export const TRAY_TOP = TRAY.h + 0.006;

type Spot = { pos: [number, number, number]; rotY: number };
const ON_TRAY: Record<"main" | PlaceId, Spot> = {
  main: { pos: [0.15, TRAY_TOP, 0.42], rotY: -0.06 },
  side: { pos: [-1.3, TRAY_TOP, -0.7], rotY: 0.3 },
  side2: { pos: [-0.2, TRAY_TOP, -0.85], rotY: 0 },
  drink: { pos: [1.45, TRAY_TOP, -0.78], rotY: -0.15 },
};
export const BOARD_TOP = 0.07;
const SOLO: Spot = { pos: [0, BOARD_TOP, 0], rotY: -0.25 };

/** Enveloppe d'entrée / sortie d'un bloc entier (changement de produit, de pain…). */
function Pop({ phase, spot, reduced, children }: { phase: "enter" | "exit"; spot: Spot; reduced: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef({ start: -1, exit: -1, x: spot.pos[0], z: spot.pos[2], y: spot.pos[1], r: spot.rotY });
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = t.current, now = clock.elapsedTime;
    if (s.start < 0) s.start = now;
    if (phase === "exit" && s.exit < 0) s.exit = now;
    // Glisse vers sa place (le produit se décale quand le plateau arrive ou part).
    s.x = damp(s.x, spot.pos[0], 6, dt);
    s.y = damp(s.y, spot.pos[1], 6, dt);
    s.z = damp(s.z, spot.pos[2], 6, dt);
    s.r = damp(s.r, spot.rotY, 6, dt);
    const k = reduced ? 1 : clamp01((now - s.start) / 0.55);
    const out = s.exit >= 0 ? clamp01((now - s.exit) / (reduced ? 0.15 : 0.35)) : 0;
    const scale = (reduced ? k : Math.max(0.001, easeOutBack(k, 1.3))) * (1 - out * 0.999);
    g.scale.setScalar(Math.max(0.001, scale));
    g.position.set(s.x - out * 0.8, s.y + (1 - k) * 0.4 + out * 0.2, s.z);
    g.rotation.y = s.r + (1 - k) * 0.6;
  });
  return <group ref={ref}>{children}</group>;
}

function Tray({ phase, reduced }: { phase: "enter" | "exit"; reduced: boolean }) {
  const paper = useMemo(() => {
    const g = new THREE.PlaneGeometry(TRAY.w - 0.45, TRAY.d - 0.4);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const ref = useRef<THREE.Group>(null);
  const t = useRef({ start: -1, exit: -1 });
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const s = t.current, now = clock.elapsedTime;
    if (s.start < 0) s.start = now;
    if (phase === "exit" && s.exit < 0) s.exit = now;
    const k = reduced ? 1 : clamp01((now - s.start) / 0.5);
    const out = s.exit >= 0 ? clamp01((now - s.exit) / 0.35) : 0;
    g.position.z = (1 - easeOutBack(k, 1.1)) * 2.5 + out * 2.5;
    g.scale.setScalar(Math.max(0.001, 1 - out));
  });
  return (
    <group ref={ref}>
      <RoundedBox args={[TRAY.w, TRAY.h, TRAY.d]} radius={0.03} smoothness={3} position-y={TRAY.h / 2}>
        <meshStandardMaterial color="#141519" roughness={0.42} metalness={0.1} />
      </RoundedBox>
      <mesh geometry={paper} position-y={TRAY.h + 0.003} rotation-y={0.04}>
        <meshStandardMaterial map={newspaperTexture()} roughness={0.92} />
      </mesh>
    </group>
  );
}

/** Petit plateau papier journal sous un produit présenté seul. */
function Board({ phase, reduced }: { phase: "enter" | "exit"; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef({ start: -1, exit: -1 });
  const paper = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.45, 1.05);
    g.rotateX(-Math.PI / 2);
    // Un morceau du journal seulement (le titre), pas la page entière en miniature.
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.12 + uv.getX(i) * 0.5, 0.45 + uv.getY(i) * 0.5);
    return g;
  }, []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const s = t.current, now = clock.elapsedTime;
    if (s.start < 0) s.start = now;
    if (phase === "exit" && s.exit < 0) s.exit = now;
    const k = reduced ? 1 : clamp01((now - s.start) / 0.45);
    const out = s.exit >= 0 ? clamp01((now - s.exit) / 0.3) : 0;
    g.scale.setScalar(Math.max(0.001, easeOutBack(k, 1.2) * (1 - out)));
  });
  return (
    <group ref={ref}>
      <RoundedBox args={[1.65, BOARD_TOP - 0.004, 1.25]} radius={0.025} smoothness={3} position-y={(BOARD_TOP - 0.004) / 2}>
        <meshStandardMaterial color="#141519" roughness={0.42} metalness={0.1} />
      </RoundedBox>
      <mesh geometry={paper} position-y={BOARD_TOP - 0.001} rotation-y={-0.05}>
        <meshStandardMaterial map={newspaperTexture()} roughness={0.92} />
      </mesh>
    </group>
  );
}

export function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.002}>
      <circleGeometry args={[7.5, 64]} />
      <meshStandardMaterial map={woodTexture()} transparent roughness={0.7} depthWrite={false} />
    </mesh>
  );
}

function Place({ menu, spec, spot, reduced, id }: { menu: Menu; spec: AssemblySpec | undefined; spot: Spot; reduced: boolean; id: string }) {
  const list = usePresence(spec ? [spec] : [], (s) => `${id}:${s.support}`, 420);
  return (
    <>
      {list.map((p) => (
        <Pop key={p.key} phase={p.phase} spot={spot} reduced={reduced}>
          <Assembly menu={menu} spec={p.item} reduced={reduced} />
        </Pop>
      ))}
    </>
  );
}

export function Scene({ menu, build, reduced }: { menu: Menu; build: BuildSpec; reduced: boolean }) {
  const trays = usePresence(build.tray ? [true] : [], () => "tray", 400);
  const boards = usePresence(build.tray ? [] : [true], () => "board", 350);
  const spots = build.tray ? ON_TRAY : { ...ON_TRAY, main: SOLO };
  return (
    <group>
      {trays.map((p) => (
        <Tray key={p.key} phase={p.phase} reduced={reduced} />
      ))}
      {boards.map((p) => (
        <Board key={p.key} phase={p.phase} reduced={reduced} />
      ))}
      <Place menu={menu} id={build.productId} spec={build.main} spot={spots.main} reduced={reduced} />
      {(["side", "side2", "drink"] as const).map((pid) => (
        <Place key={pid} menu={menu} id={pid} spec={build.places[pid]} spot={spots[pid]} reduced={reduced} />
      ))}
    </group>
  );
}
