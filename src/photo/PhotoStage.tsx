/**
 * Le cadre photo : vue de dessus, avec un léger relief quand on bouge le doigt
 * (les couches du dessus se décalent plus que le plateau). Pas de lumière 3D :
 * les photos gardent leur éclairage réel.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Menu } from "../data/menu.types.ts";
import type { BuildSpec } from "../domain/resolveBuild.ts";
import { damp } from "../scene/easing.ts";
import { PhotoScene, sceneBounds } from "./PhotoScene.tsx";

const FOV = 26;
const TILT = 0.12;

/** Cadre la scène entière et incline légèrement la vue selon le doigt (ou doucement au repos). */
function Camera({ bounds, reduced }: { bounds: [number, number]; reduced: boolean }) {
  const { camera, size, pointer } = useThree();
  const s = useRef({ d: 0, tx: 0, tz: 0, touched: -10, px: 0, py: 0 });
  useFrame(({ clock }, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const half = THREE.MathUtils.degToRad(FOV / 2);
    const aspect = size.width / size.height;
    // Le titre occupe le haut du cadre : on laisse un peu d'air en haut.
    const [w, h] = bounds;
    const want = Math.max((h * 1.16) / 2 / Math.tan(half), w / 2 / (Math.tan(half) * aspect)) * 1.04;
    const st = s.current;
    st.d = st.d ? damp(st.d, want, 5, dt) : want;
    // Le doigt (ou la souris) a bougé : on suit ; sinon, léger balancement au repos.
    if (pointer.x !== st.px || pointer.y !== st.py) {
      st.px = pointer.x;
      st.py = pointer.y;
      st.touched = clock.elapsedTime;
    }
    const idle = clock.elapsedTime - st.touched > 2;
    const gx = reduced ? 0 : idle ? Math.sin(clock.elapsedTime * 0.45) * 0.35 : pointer.x;
    const gz = reduced ? 0 : idle ? Math.cos(clock.elapsedTime * 0.37) * 0.25 : -pointer.y;
    st.tx = damp(st.tx, gx, 4, dt);
    st.tz = damp(st.tz, gz, 4, dt);
    const lookZ = -h * 0.07;
    cam.position.set(st.tx * st.d * TILT, st.d, lookZ + st.tz * st.d * TILT + 0.001);
    cam.up.set(0, 0, -1);
    cam.lookAt(0, 0, lookZ);
    cam.fov = FOV;
    cam.near = st.d * 0.2;
    cam.far = st.d * 3;
    cam.updateProjectionMatrix();
  });
  return null;
}

interface Props {
  menu: Menu;
  build: BuildSpec;
  reduced: boolean;
  /** Description de la composition, lue par les lecteurs d'écran. */
  label: string;
}

export function PhotoStage({ menu, build, reduced, label }: Props) {
  const bounds = sceneBounds(build.tray);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: FOV, position: [0, 100, 0.001], near: 10, far: 400 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      flat
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
      }}
      aria-label={label}
      role="img"
    >
      <Camera bounds={bounds} reduced={reduced} />
      <PhotoScene menu={menu} build={build} reduced={reduced} />
    </Canvas>
  );
}
