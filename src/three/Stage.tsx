/**
 * Le canvas 3D : lumière chaude, reflets, ombre de contact, caméra orbitale
 * (doigt / souris, zoom limité, rotation lente au repos).
 */
import { ContactShadows, Environment, Lightformer, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Menu } from "../data/menu.types.ts";
import type { BuildSpec } from "../domain/resolveBuild.ts";
import { BOARD_TOP, Ground, Scene, TRAY_TOP } from "./Scene.tsx";
import { supportLayout } from "./supports/shapes.ts";

interface Props {
  menu: Menu;
  build: BuildSpec;
  reduced: boolean;
  /** Change à chaque action du client : relance le compte à rebours avant la rotation auto. */
  activity: number;
  /** Description de la composition, lue par les lecteurs d'écran. */
  label: string;
}

/** Cadre la scène selon ce qui est affiché et la forme de l'écran. */
function CameraRig({ radius, center, elevation, controls }: { radius: number; center: THREE.Vector3; elevation: number; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera, size } = useThree();
  const rig = useRef({ last: -1, active: true, bound: false });
  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const r = rig.current;
    // Dès que le client prend la main (rotation, zoom), on le laisse faire.
    if (!r.bound) {
      c.addEventListener("start", () => (r.active = false));
      r.bound = true;
    }
    const cam = camera as THREE.PerspectiveCamera;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (size.width / size.height));
    const want = Math.max(radius / Math.sin(vfov / 2), radius / Math.sin(hfov / 2)) * 0.95;
    if (Math.abs(want - r.last) > 1e-3) {
      r.last = want;
      r.active = true;
      c.minDistance = want * 0.7;
      c.maxDistance = want * 1.3;
    }
    if (!r.active) return;
    const k = 1 - Math.exp(-5 * Math.min(dt, 0.1));
    c.target.lerp(center, k);
    // Distance et hauteur de vue (plus plongeante pour une barquette seule), azimut conservé.
    const sph = new THREE.Spherical().setFromVector3(cam.position.clone().sub(c.target));
    sph.radius = THREE.MathUtils.lerp(sph.radius, want, k);
    sph.phi = THREE.MathUtils.lerp(sph.phi, Math.PI / 2 - elevation, k);
    cam.position.copy(c.target).add(new THREE.Vector3().setFromSpherical(sph));
    c.update();
    if (Math.abs(sph.radius - want) < want * 0.002 && Math.abs(sph.phi - (Math.PI / 2 - elevation)) < 0.002 && c.target.distanceTo(center) < 0.002) r.active = false;
  });
  return null;
}

export function Stage({ menu, build, reduced, activity, label }: Props) {
  const [dpr, setDpr] = useState(1.5);
  const controls = useRef<OrbitControlsImpl>(null);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    setIdle(false);
    const id = setTimeout(() => setIdle(true), 3000);
    return () => clearTimeout(id);
  }, [activity]);

  const mainRadius = supportLayout(menu.supports[build.main.support].visual).radius;
  const radius = build.tray ? 2.45 : Math.max(0.95, mainRadius * 1.25);
  // Centre un peu haut : le produit descend dans le cadre, sous le titre.
  const center = build.tray ? new THREE.Vector3(0, 0.75, 0) : new THREE.Vector3(0, 0.1 + radius * 0.5, 0);
  const elevation = build.tray ? 0.62 : 0.8;

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 3.5, 5.0], fov: 30, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      onPointerDown={() => setIdle(false)}
      aria-label={label}
      role="img"
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))} />
      <hemisphereLight args={["#FFE7C7", "#20121A", 0.55]} />
      <directionalLight position={[-3, 5, 4]} intensity={3} color="#FFE4C4" />
      <directionalLight position={[3.5, 2.5, -4]} intensity={1.5} color="#FF8A3D" />
      <directionalLight position={[4, 1.5, 3]} intensity={0.35} color="#9DB4FF" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#FFE2BC" position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#FF8A3D" position={[5, 1.5, -2]} rotation-y={-Math.PI / 2} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#6D84FF" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 1, 1]} />
      </Environment>
      <Ground />
      <Scene menu={menu} build={build} reduced={reduced} />
      <ContactShadows
        position-y={build.tray ? TRAY_TOP + 0.002 : BOARD_TOP + 0.002}
        scale={build.tray ? [4.6, 3.3] : [2, 1.6]}
        resolution={256}
        blur={2.2}
        opacity={0.6}
        far={1.6}
        color="#1A0A04"
      />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.45}
        maxPolarAngle={1.28}
        autoRotate={idle && !reduced}
        autoRotateSpeed={0.9}
        rotateSpeed={0.7}
        zoomSpeed={0.6}
      />
      <CameraRig radius={radius} center={center} elevation={elevation} controls={controls} />
    </Canvas>
  );
}
