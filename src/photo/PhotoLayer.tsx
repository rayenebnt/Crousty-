/**
 * Un calque photo posé à plat (vue de dessus), avec son ombre portée, et ses animations :
 * chute avec rebond, fondu, glissé, fondu « fromage qui fond » (dissolve) ou nappage qui s'étale (reveal).
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { NOISE_GLSL } from "../scene/glsl.ts";
import { bounceOut, clamp01, damp, easeInOutCubic, easeOutBack, easeOutCubic } from "../scene/easing.ts";
import { photoInfo } from "./manifest.ts";
import { loadPhoto, loadPieces, placeholder, type LoadedPhoto, type LoadedPieces } from "./photos.ts";
import { PiecesDrop, type PiecesClock } from "./PiecesDrop.tsx";

export type Enter = "drop" | "fade" | "slide" | "none";
export type Mode = "normal" | "dissolve" | "reveal" | "wipe";

export interface LayerProps {
  file: string;
  label: string;
  color: string;
  /** Taille réelle (cm) si la photo n'existe pas encore. */
  fallbackCm: [number, number];
  x: number;
  z: number;
  y: number;
  rot?: number;
  order: number;
  phase: "enter" | "exit";
  delay?: number;
  reduced: boolean;
  enter?: Enter;
  mode?: Mode;
  /** Durée du fondu / de l'étalement (s). */
  duration?: number;
  /** Afficher / masquer en fondu (tortilla roulée). */
  visible?: boolean;
  /** Lueur chaude pendant le fondu (sortie du four). */
  glow?: boolean;
  /** Afficher un cadre « photo à venir » si la photo manque (sinon rien). */
  showPlaceholder?: boolean;
}

function photoMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, uOpacity: { value: 0 }, uProgress: { value: 1 }, uMode: { value: 0 }, uGlow: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${NOISE_GLSL}
      uniform sampler2D map;
      uniform float uOpacity, uProgress, uMode, uGlow;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(map, vUv);
        float n = cr_fbm(vUv * vec2(7.0, 3.0) + 1.7);
        float m;
        if (uMode < 0.5) {
          // Fondu irrégulier : des plaques apparaissent au hasard, comme le fromage qui fond.
          m = smoothstep(n - 0.06, n + 0.06, uProgress * 1.2 - 0.1);
        } else if (uMode > 1.5) {
          // Filet de sauce : tracé de gauche à droite, comme le flacon qu'on presse.
          float x = vUv.x + (n - 0.5) * 0.06;
          m = 1.0 - smoothstep(uProgress * 1.1 - 0.05, uProgress * 1.1, x);
        } else {
          // Nappage : part du centre et s'étale en coulures.
          vec2 d = (vUv - 0.5) * 2.0;
          float r = length(d) + (n - 0.5) * 0.45;
          m = 1.0 - smoothstep(uProgress * 1.4 - 0.12, uProgress * 1.4, r);
        }
        float a = m * uOpacity;
        gl_FragColor = vec4(c.rgb * (1.0 + uGlow) * a, c.a * a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    premultipliedAlpha: true,
    toneMapped: false,
  });
}

function shadowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() { gl_FragColor = vec4(0.03, 0.01, 0.0, texture2D(map, vUv).a * uOpacity); }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
}

/** Charge la photo, ou fabrique le cadre « photo à venir ». */
export function usePhoto(file: string, label: string, color: string, fallbackCm: [number, number], showPlaceholder = true) {
  const info = photoInfo(file);
  const [photo, setPhoto] = useState<LoadedPhoto | null>(() => (info ? null : showPlaceholder ? placeholder(label, color, ...fallbackCm) : null));
  useEffect(() => {
    if (!info) return;
    let alive = true;
    loadPhoto(file).then(
      (p) => alive && setPhoto(p),
      () => alive && showPlaceholder && setPhoto(placeholder(label, color, ...fallbackCm)),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);
  const size: [number, number] = info ? [info.wCm, info.hCm] : fallbackCm;
  return { photo, size, real: !!info };
}

/** Morceaux de la photo, si elle en a et qu'elle tombe : null tant qu'ils chargent, false s'il n'y en a pas. */
function usePieces(file: string, wanted: boolean) {
  const has = wanted && !!photoInfo(file)?.pieces;
  const [pieces, setPieces] = useState<LoadedPieces | null | false>(has ? null : false);
  useEffect(() => {
    if (!has) return setPieces(false);
    let alive = true;
    loadPieces(file).then(
      (p) => alive && setPieces(p),
      () => alive && setPieces(false),
    );
    return () => {
      alive = false;
    };
  }, [file, has]);
  return pieces;
}

const SHADOW_OFFSET = { x: 0.5, z: 0.8 };

export function PhotoLayer(p: LayerProps) {
  const { photo, size } = usePhoto(p.file, p.label, p.color, p.fallbackCm, p.showPlaceholder ?? true);
  // Un aliment qui tombe arrive morceau par morceau (si la photo a été découpée).
  const pieces = usePieces(p.file, !p.reduced && (p.enter ?? "drop") === "drop" && (!p.mode || p.mode === "normal"));
  const pclock = useRef<PiecesClock>({ start: -1, opacity: 1, landed: 0, done: false });
  const mat = useMemo(photoMaterial, []);
  const shadow = useMemo(shadowMaterial, []);
  useEffect(() => () => {
    mat.dispose();
    shadow.dispose();
  }, [mat, shadow]);
  useEffect(() => {
    mat.uniforms.map.value = photo?.map ?? null;
    shadow.uniforms.map.value = photo?.shadow ?? null;
    mat.uniforms.uMode.value = p.mode === "wipe" ? 2 : p.mode === "reveal" ? 1 : 0;
  }, [photo, mat, shadow, p.mode]);

  const group = useRef<THREE.Group>(null);
  const shadowMesh = useRef<THREE.Mesh>(null);
  const t = useRef({ start: -1, exit: -1, vis: p.visible === false ? 0 : 1 });

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g || !photo || pieces === null) return;
    const s = t.current, now = clock.elapsedTime;
    if (s.start < 0) s.start = now + (p.reduced ? 0 : (p.delay ?? 0));
    if (p.phase === "exit" && s.exit < 0) s.exit = now;
    const e = now - s.start;
    const enter = p.reduced ? "fade" : (p.enter ?? "drop");
    const dur = p.reduced ? 0.15 : enter === "drop" ? 0.55 : enter === "slide" ? 0.6 : 0.35;
    const k = clamp01(e / dur);
    let yOff = 0, xOff = 0, rotOff = 0, opacity = e < 0 ? 0 : 1, shadowK = 1;
    const piecewise = !!pieces && !p.reduced;
    if (piecewise) {
      // Les morceaux tombent eux-mêmes ; la photo entière n'apparaît qu'une fois tout posé.
      pclock.current.start = s.start;
      opacity = pclock.current.done ? 1 : 0;
      shadowK = pclock.current.landed;
    } else if (enter === "drop") {
      yOff = (1 - bounceOut(k)) * 26;
      opacity = e < 0 ? 0 : clamp01(k * 5);
      shadowK = k * k;
    } else if (enter === "slide") {
      xOff = (1 - easeOutBack(k, 1.3)) * 28;
      rotOff = Math.sin(k * 8) * (1 - k) * 0.25;
      shadowK = k;
    } else if (enter === "fade") {
      opacity = easeOutCubic(k);
      shadowK = opacity;
    }
    // Fondu du fromage / étalement du nappage.
    let progress = 1;
    if (p.mode && p.mode !== "normal") {
      progress = p.reduced ? (e > 0 ? 1 : 0) : easeInOutCubic(clamp01(e / (p.duration ?? 1)));
      opacity = e < 0 ? 0 : 1;
      shadowK = progress;
    }
    // Apparition / disparition commandée (tortilla roulée).
    s.vis = damp(s.vis, p.visible === false ? 0 : 1, p.reduced ? 40 : 9, dt);
    opacity *= s.vis;
    shadowK *= s.vis;
    if (s.exit >= 0) {
      const x = clamp01((now - s.exit) / (p.reduced ? 0.12 : 0.3));
      if (p.mode === "dissolve") progress *= 1 - x;
      else {
        yOff += x * 10;
        opacity *= 1 - x;
      }
      shadowK *= 1 - x;
    }
    // Fondu de sortie (et masquage de la tortilla) : transmis aux morceaux.
    pclock.current.opacity = s.exit >= 0 ? 1 - clamp01((now - s.exit) / (p.reduced ? 0.12 : 0.3)) : s.vis;
    g.position.set(p.x + xOff, p.y + yOff, p.z);
    g.rotation.y = (p.rot ?? 0) + rotOff;
    mat.uniforms.uOpacity.value = opacity;
    mat.uniforms.uProgress.value = progress;
    mat.uniforms.uGlow.value = p.glow ? Math.sin(Math.PI * progress) * 0.18 : 0;
    shadow.uniforms.uOpacity.value = 0.55 * shadowK;
    const sm = shadowMesh.current;
    if (sm) {
      // L'ombre reste au sol pendant la chute : plus grande et plus douce quand l'aliment est haut.
      const lift = yOff / 26;
      sm.position.set(SHADOW_OFFSET.x * (1 + lift * 3), -yOff - 0.01, SHADOW_OFFSET.z * (1 + lift * 3));
      sm.scale.setScalar(1 + lift * 0.35);
    }
  });

  if (!photo || pieces === null) return null;
  return (
    <group ref={group}>
      <mesh ref={shadowMesh} rotation-x={-Math.PI / 2} material={shadow} renderOrder={p.order * 2 - 1} scale={1}>
        <planeGeometry args={[size[0] * 1.04, size[1] * 1.04]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} material={mat} renderOrder={p.order * 2}>
        <planeGeometry args={size} />
      </mesh>
      {pieces && !p.reduced && <PiecesDrop map={photo.map} data={pieces} size={size} order={p.order} reduced={p.reduced} clock={pclock.current} />}
    </group>
  );
}
