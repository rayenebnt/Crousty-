import type * as THREE from "three";
import type { EnterAnim, ExitAnim } from "../../data/menu.types.ts";

/** Zone où l'on pose un ingrédient, dans le repère de l'assemblage. */
export interface Footprint {
  hx: number;
  hz: number;
  cx: number;
  cz: number;
}

/** Hauteur de la surface sur laquelle on pose (plate pour le pain, bombée pour les frites). */
export type Surface = (x: number, z: number) => number;

export interface Instance {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  color?: THREE.Color;
}

export interface PieceSet {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  instances: Instance[];
}

export interface BuiltPieces {
  kind: "pieces";
  sets: PieceSet[];
  /** Épaisseur ajoutée à la pile. */
  thickness: number;
  /** Surface laissée pour la couche suivante, si elle n'est pas simplement « + épaisseur ». */
  surfaceAfter?: (below: Surface) => Surface;
  enter: EnterAnim;
  exit: ExitAnim;
}

export interface BuiltCustom {
  kind: "custom";
  component: "drizzle" | "pour" | "gratin" | "drink" | "placeholder";
  thickness: number;
  enter: EnterAnim;
  exit: ExitAnim;
}

export type Built = BuiltPieces | BuiltCustom;
