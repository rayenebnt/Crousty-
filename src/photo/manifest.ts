/** Manifeste des photos prêtes (écrit par tools/photos/preparer.mjs). Sans three.js : utilisable par l'interface. */
import raw from "../data/photos.json";

export interface PhotoInfo {
  w: number;
  h: number;
  wCm: number;
  hCm: number;
  /** Photo provisoire (tirée d'une image de démonstration), à remplacer. */
  demo?: boolean;
}

export const manifest = raw as { pxPerCm: number; files: Record<string, PhotoInfo> };

export const photoInfo = (file: string): PhotoInfo | undefined => manifest.files[file];

export const photoUrl = (file: string) => `${import.meta.env.BASE_URL}photos/${file}.webp`;
