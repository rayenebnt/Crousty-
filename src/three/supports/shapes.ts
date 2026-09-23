/**
 * Dimensions des supports et zone de pose de la garniture (repère de l'assemblage, 1 unité ≈ 10 cm).
 */
import type { SupportArchetype, Visual } from "../../data/menu.types.ts";
import type { Footprint } from "../archetypes/types.ts";

/** Pain long (photo du plat) : deux demi-coques de superellipsoïde. */
export const BREAD = { A: 1.2, B: 0.42, bottomH: 0.2, topH: 0.3, e1Bottom: 0.45, e1Top: 0.62, e2: 0.7, closedAngle: 0.32, openAngle: 1.15 };

export const TORTILLA = { R: 0.95, strip: 0.2 };

export const BOAT = { bottomW: 0.62, bottomD: 0.42, topW: 0.86, topD: 0.62, H: 0.3 };

export const CAN = { R: 0.33, H: 1.22 };

/** Forme du dessus d'un support refermé (pour le gratiné). */
export type TopShape = { kind: "dome"; a: number; b: number; c: number; e1: number; e2: number } | { kind: "flat"; hx: number; hz: number };

export interface SupportLayout {
  footprint: Footprint;
  baseY: number;
  /** Rayon approximatif (cadrage caméra). */
  radius: number;
}

export function supportLayout(visual: Visual<SupportArchetype>): SupportLayout {
  switch (visual.archetype) {
    case "bread":
      return { footprint: { hx: 0.9, hz: 0.24, cx: 0, cz: 0.04 }, baseY: 0.004, radius: 1.3 };
    case "tortilla":
      return { footprint: { hx: 0.66, hz: 0.14, cx: 0, cz: 0 }, baseY: 0.012, radius: 1.0 };
    case "fry-box":
      return { footprint: { hx: 0.3, hz: 0.2, cx: 0, cz: 0 }, baseY: 0.03, radius: 0.6 };
    case "drink-spot":
      return { footprint: { hx: 0.3, hz: 0.3, cx: 0, cz: 0 }, baseY: 0, radius: 0.7 };
    default:
      return { footprint: { hx: 0.5, hz: 0.32, cx: 0, cz: 0 }, baseY: 0.06, radius: 0.8 };
  }
}
