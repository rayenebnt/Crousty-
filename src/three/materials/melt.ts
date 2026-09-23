/**
 * Matériau « fromage qui fond ».
 *  - gratin : la nappe s'affaisse sur le pain, coule sur les bords, puis dore (bulles, zones grillées).
 *  - pour   : le nappage cheddar coule du centre vers les bords, sur les frites.
 * Construit sur MeshStandardMaterial : il garde l'éclairage PBR de la scène.
 */
import * as THREE from "three";
import { BUMP_GLSL, NOISE_GLSL } from "./glsl.ts";

export interface MeltUniforms {
  uShow: { value: number };
  uMelt: { value: number };
  uBrown: { value: number };
  uColor2: { value: THREE.Color };
}

export function createMeltMaterial(color: string, color2: string, mode: "gratin" | "pour") {
  const uniforms: MeltUniforms = {
    uShow: { value: 0 },
    uMelt: { value: 0 },
    uBrown: { value: 0 },
    uColor2: { value: new THREE.Color(color2) },
  };
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.35, metalness: 0, side: THREE.DoubleSide });
  material.defines = { ...(material.defines ?? {}), [mode === "pour" ? "CR_POUR" : "CR_GRATIN"]: "" };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec2 aM;
uniform float uMelt;
varying vec2 vM;
varying vec3 vP;
${NOISE_GLSL}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vM = aM;
vP = position;
#ifdef CR_GRATIN
  float grate = (1.0 - uMelt) * cr_noise(aM * vec2(90.0, 26.0)) * 0.035;
  transformed += objectNormal * (0.012 + grate + 0.01 * uMelt * smoothstep(0.0, 0.4, aM.y));
#else
  transformed.y -= cr_noise(aM * 9.0) * 0.03 * uMelt;
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uShow;
uniform float uMelt;
uniform float uBrown;
uniform vec3 uColor2;
varying vec2 vM;
varying vec3 vP;
${NOISE_GLSL}
${BUMP_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
#ifdef CR_GRATIN
  float colN = cr_noise(vec2(vM.x * 13.0, 3.1));
  float drip = pow(colN, 5.0) * 0.55;
  float edge = mix(0.82, 0.3, uMelt) - drip * uMelt;
  float wob = (cr_fbm(vM * vec2(18.0, 6.0)) - 0.5) * 0.12;
  float cover = smoothstep(edge - 0.01, edge + 0.01, vM.y + wob);
  float rim = 1.0 - smoothstep(edge, edge + 0.09, vM.y + wob);
#else
  float ang = atan(vM.y, vM.x);
  float r = length(vM);
  float edge = uMelt * (1.02 + (cr_noise(vec2(ang * 3.0, 1.7)) - 0.5) * 0.4);
  float cover = 1.0 - smoothstep(edge - 0.02, edge, r);
  float rim = smoothstep(edge - 0.18, edge, r);
#endif
  float dis = cr_noise(vM * vec2(60.0, 18.0) + 7.0);
  if (cover < 0.5 || dis > uShow) discard;
  // Zones de cuisson : grandes plages dorées, quelques cloques brunes.
  float bn = cr_fbm(vP.xz * 2.6 + 3.0) * 0.7 + cr_fbm(vP.xz * 7.5 + 11.0) * 0.3;
  vec2 cellP = vP.xz * 8.0;
  float cells = cr_cells(cellP);
  float pick = step(0.62, cr_hash(floor(cellP) + 3.0));
  float bubble = smoothstep(0.3, 0.05, cells) * pick;
  float strands = smoothstep(0.35, 0.65, cr_noise(vec2(vM.x * 160.0 + vM.y * 40.0, vM.y * 14.0)));
#ifdef CR_GRATIN
  float heat = bn * 0.75 + rim * 0.22 + vM.y * 0.12 + bubble * 0.18;
  float toast = uBrown * smoothstep(0.52, 0.8, heat);
#else
  float heat = bn;
  float toast = 0.0;
#endif
  vec3 cBase = diffuseColor.rgb;
  vec3 golden = vec3(0.91, 0.63, 0.23);
  vec3 brown = uColor2;
  vec3 dark = uColor2 * 0.55;
  vec3 cc = mix(cBase, mix(cBase, golden, 0.45), uBrown * smoothstep(0.3, 0.6, heat));
  cc = mix(cc, brown, toast * 0.85);
  cc = mix(cc, dark, uBrown * smoothstep(0.78, 0.9, heat) * 0.6);
  cc = mix(cc, brown * 0.8, uBrown * bubble * 0.45);
#ifdef CR_POUR
  cc = mix(cc, uColor2, rim * 0.35 + bn * 0.15);
#endif
  cc *= mix(1.0, 0.82 + strands * 0.3, 1.0 - uMelt);
  diffuseColor.rgb = cc;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = mix(0.26, 0.6, toast) + (1.0 - uMelt) * 0.3;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
normal = cr_bump(normal, -vViewPosition, bubble * uBrown * 0.8 + bn * 0.35 + (1.0 - uMelt) * strands * 0.6, 0.6);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += cc * 0.06 * (1.0 - toast);`,
      );
  };
  material.customProgramCacheKey = () => `cr-melt-${mode}`;
  return { material, uniforms };
}
