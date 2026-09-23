/** Petit compteur « photos reçues » tant que la séance photo n'est pas terminée. */
import { useMemo } from "react";
import { menu } from "../data/menu.ts";
import { manifest } from "../photo/photos.ts";
import { shotList } from "../photo/shots.ts";

export function PhotoProgress() {
  const { done, total } = useMemo(() => {
    const lot1 = shotList(menu).filter((s) => s.lot === 1);
    return { done: lot1.filter((s) => manifest.files[s.file] && !manifest.files[s.file].demo).length, total: lot1.length };
  }, []);
  if (done >= total) return null;
  return (
    <p className="pointer-events-none absolute right-3 bottom-2 rounded-full bg-noir/70 px-2.5 py-1 text-[11px] text-white/70">
      Photos réelles : {done} / {total}
    </p>
  );
}
