/**
 * Un aliment qui tombe morceau par morceau : chaque frite, chaque morceau de viande est un
 * élément indépendant (même photo, découpée selon ses contours : public/photos/<nom>.morceaux.png).
 * Les morceaux du bord tombent d'abord, le haut du tas en dernier ; chacun a sa rotation, son
 * rebond et son ombre. Une fois tout posé, on retrouve exactement la photo.
 * Un seul appel de dessin pour tous les morceaux (instances), un autre pour leurs ombres.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { bounceOut, clamp01, easeOutCubic, hash01 } from "../scene/easing.ts";
import type { LoadedPieces } from "./photos.ts";

/** État partagé avec le calque : début de la chute, fondu de sortie, avancement. */
export interface PiecesClock {
  start: number;
  opacity: number;
  /** 0 → 1 : part des morceaux posés (l'ombre d'ensemble suit). */
  landed: number;
  done: boolean;
}

const FALL = 0.42;
/** Durée totale d'une chute en morceaux (le dernier morceau posé), pour enchaîner la suite. */
export const piecesDuration = (n: number) => Math.min(0.95, 0.25 + n * 0.012) + FALL;
const HEIGHT = 13;

function material(map: THREE.Texture, labels: THREE.Texture, shadow: boolean) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, labels: { value: labels }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aRect;
      attribute float aId;
      attribute float aAlpha;
      varying vec2 vUv;
      varying float vId;
      varying float vAlpha;
      void main() {
        vUv = mix(aRect.xy, aRect.zw, uv);
        vId = aId;
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform sampler2D labels;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vId;
      varying float vAlpha;
      void main() {
        if (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) discard;
        float id = floor(texture2D(labels, vUv).r * 255.0 + 0.5);
        if (abs(id - vId) > 0.5) discard;
        vec4 c = texture2D(map, vUv);
        float a = vAlpha * uOpacity;
        ${shadow ? "gl_FragColor = vec4(vec3(0.03, 0.01, 0.0) * c.a * a, c.a * a);" : "gl_FragColor = c * a;"}
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    premultipliedAlpha: true,
    toneMapped: false,
  });
}

interface Props {
  map: THREE.Texture;
  data: LoadedPieces;
  size: [number, number];
  order: number;
  reduced: boolean;
  clock: PiecesClock;
}

export function PiecesDrop({ map, data, size, order, clock }: Props) {
  const n = data.pieces.length;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    g.setAttribute("aRect", new THREE.InstancedBufferAttribute(new Float32Array(data.pieces.flatMap((p) => [p.u0, p.v0, p.u1, p.v1])), 4));
    g.setAttribute("aId", new THREE.InstancedBufferAttribute(new Float32Array(data.pieces.map((p) => p.id)), 1));
    g.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
    return g;
  }, [data, n]);
  const shadowGeo = useMemo(() => {
    const g = geo.clone();
    g.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
    return g;
  }, [geo, n]);
  const mat = useMemo(() => material(map, data.labels, false), [map, data]);
  const shadowMat = useMemo(() => material(map, data.labels, true), [map, data]);
  useEffect(
    () => () => {
      geo.dispose();
      shadowGeo.dispose();
      mat.dispose();
      shadowMat.dispose();
    },
    [geo, shadowGeo, mat, shadowMat],
  );

  // Chaque morceau : quand il part (le bord d'abord, le sommet du tas en dernier), d'où, avec quelle rotation.
  const plan = useMemo(() => {
    const [w, h] = size;
    const ranked = data.pieces
      .map((p, i) => ({ i, d: Math.hypot((p.cu - 0.5) * 1.2, (p.cv - 0.55) * 1.6) + hash01(i * 7 + 3) * 0.25 }))
      .sort((a, b) => b.d - a.d);
    const spread = piecesDuration(n) - FALL;
    const out = new Array(n);
    ranked.forEach(({ i }, rank) => {
      const p = data.pieces[i];
      out[i] = {
        x: ((p.u0 + p.u1) / 2 - 0.5) * w,
        z: (0.5 - (p.v0 + p.v1) / 2) * h,
        sx: (p.u1 - p.u0) * w,
        sz: (p.v1 - p.v0) * h,
        t0: (rank / Math.max(1, n - 1)) * spread,
        rot: (hash01(i * 13 + 1) - 0.5) * 1.6,
        dx: (hash01(i * 17 + 5) - 0.5) * 4,
        dz: (hash01(i * 19 + 2) - 0.5) * 3,
        hgt: HEIGHT * (0.8 + hash01(i * 23 + 4) * 0.5),
      };
    });
    return { items: out as { x: number; z: number; sx: number; sz: number; t0: number; rot: number; dx: number; dz: number; hgt: number }[], end: spread + FALL };
  }, [data, size, n]);

  const body = useRef<THREE.InstancedMesh>(null);
  const shade = useRef<THREE.InstancedMesh>(null);
  const o = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock: c }) => {
    const m = body.current, s = shade.current;
    if (!m || !s || clock.start < 0) return;
    const e = c.elapsedTime - clock.start;
    if (e > plan.end + 0.05) {
      clock.landed = 1;
      clock.done = true;
      m.visible = s.visible = false;
      return;
    }
    const alpha = m.geometry.getAttribute("aAlpha") as THREE.InstancedBufferAttribute;
    const salpha = s.geometry.getAttribute("aAlpha") as THREE.InstancedBufferAttribute;
    let landed = 0;
    for (let i = 0; i < n; i++) {
      const it = plan.items[i];
      const k = clamp01((e - it.t0) / FALL);
      landed += k;
      const up = 1 - bounceOut(k);
      const settle = 1 - easeOutCubic(k);
      o.position.set(it.x + it.dx * settle, 0.02 + up * it.hgt, it.z + it.dz * settle);
      o.rotation.set(0, it.rot * settle, 0);
      o.scale.set(it.sx, 1, it.sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      alpha.setX(i, e < it.t0 ? 0 : clamp01(k * 5));
      // L'ombre reste au sol : plus grande et plus pâle quand le morceau est haut.
      o.position.set(it.x + it.dx * settle + 0.4 + up * 2.5, 0.01, it.z + it.dz * settle + 0.6 + up * 3);
      o.scale.set(it.sx * (1 + up * 0.3), 1, it.sz * (1 + up * 0.3));
      o.updateMatrix();
      s.setMatrixAt(i, o.matrix);
      salpha.setX(i, e < it.t0 ? 0 : 0.5 * clamp01(k * 3) * (1 - up * 0.6));
    }
    m.instanceMatrix.needsUpdate = s.instanceMatrix.needsUpdate = true;
    alpha.needsUpdate = salpha.needsUpdate = true;
    mat.uniforms.uOpacity.value = shadowMat.uniforms.uOpacity.value = clock.opacity;
    clock.landed = landed / n;
  });

  return (
    <>
      <instancedMesh ref={shade} args={[shadowGeo, shadowMat, n]} renderOrder={order * 2 - 1} frustumCulled={false} />
      <instancedMesh ref={body} args={[geo, mat, n]} renderOrder={order * 2} frustumCulled={false} />
    </>
  );
}
