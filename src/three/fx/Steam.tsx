/** Vapeur : volutes douces qui montent (sprites instanciés, un seul appel de dessin). */
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { softDisc } from "../lib/textures.ts";
import { hash01 } from "../anim/easing.ts";

interface Props {
  /** Intensité cible (0 = éteinte, 1 = sortie du four). */
  intensity: number;
  hx: number;
  hz: number;
  count?: number;
}

export function Steam({ intensity, hx, hz, count = 16 }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ map: softDisc(), transparent: true, depthWrite: false, opacity: 0, color: "#FFF6EA", toneMapped: false }),
    [],
  );
  const level = useRef(0);
  const o = useMemo(() => new THREE.Object3D(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ clock, camera }, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    level.current += (intensity - level.current) * Math.min(1, dt * 2.5);
    mat.opacity = 0.16 * level.current;
    mesh.visible = level.current > 0.01;
    if (!mesh.visible) return;
    const t = clock.elapsedTime;
    // Toujours face à la caméra, même si le parent est tourné.
    mesh.parent?.getWorldQuaternion(q);
    q.invert().multiply(camera.quaternion);
    for (let i = 0; i < count; i++) {
      const life = 2.6 + hash01(i) * 1.2;
      const k = ((t + hash01(i + 40) * life) % life) / life;
      const x = (hash01(i + 7) * 2 - 1) * hx + Math.sin(t * 0.9 + i) * 0.06 * k;
      const z = (hash01(i + 19) * 2 - 1) * hz;
      o.position.set(x, 0.05 + k * 1.1, z);
      o.quaternion.copy(q);
      const s = (0.25 + k * 0.65) * Math.sin(Math.PI * Math.min(1, k * 1.25));
      o.scale.set(s, s, s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} renderOrder={10} />;
}
