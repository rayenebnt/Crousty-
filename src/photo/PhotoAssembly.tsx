/**
 * Un assemblage en photos : le support (pain ouvert, tortilla…) puis chaque ingrédient,
 * dans l'ordre des couches. Gratiné : photo « avant le four » puis fondu vers « après ».
 * Nappage : la photo des frites nappées s'étale sur les frites. Tortilla : se roule au repos.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerId, Menu } from "../data/menu.types.ts";
import type { AssemblySpec, BuildItem } from "../domain/resolveBuild.ts";
import { Steam } from "../scene/Steam.tsx";
import { usePresence, type Present } from "../scene/usePresence.ts";
import { PhotoLayer } from "./PhotoLayer.tsx";
import { photoInfo } from "./manifest.ts";
import { ingredientShot, supportShot } from "./shots.ts";

/** Décalage de chaque couche dans le pain (cm) : chaque ingrédient ajouté reste visible. */
const OFFSET: Partial<Record<LayerId, [number, number]>> = {
  cheese: [0.9, -0.8],
  extra: [-1.3, 0.8],
  veg: [1.5, 1.2],
  "veg-top": [-0.7, -1.2],
};

const EXIT_MS = 420;

/** Vapeur de sortie du four : forte quelques secondes, puis légère. (La vapeur travaille en unités ×8.) */
function OvenSteam() {
  const [level, setLevel] = useState(1);
  useEffect(() => {
    const id = setTimeout(() => setLevel(0.35), 3800);
    return () => clearTimeout(id);
  }, []);
  return (
    <group position-y={4} scale={8}>
      <Steam intensity={level} hx={1.1} hz={0.35} count={16} />
    </group>
  );
}

interface Props {
  menu: Menu;
  spec: AssemblySpec;
  reduced: boolean;
  /** Ordre de dessin de base (les emplacements ne se mélangent pas). */
  baseOrder: number;
}

export function PhotoAssembly({ menu, spec, reduced, baseOrder }: Props) {
  const support = menu.supports[spec.support];
  const bases = useMemo(() => supportShot(menu, spec.support), [menu, spec.support]);
  const flat = bases.find((b) => b.state !== "roulee");
  const rolled = bases.find((b) => b.state === "roulee");
  const onTop = useMemo(() => new Set(support.onTop ?? []), [support.onTop]);
  const items = usePresence(spec.items, (i) => i.key, EXIT_MS);
  const tas = support.visual.archetype === "fry-box";

  // Tortilla : à plat quand un ingrédient arrive, roulée au repos.
  const [resting, setResting] = useState(false);
  const known = useRef(new Set(spec.items.map((i) => i.key)));
  useEffect(() => {
    const fresh = spec.items.some((i) => !known.current.has(i.key));
    known.current = new Set(spec.items.map((i) => i.key));
    setResting(false);
    const id = setTimeout(() => setResting(true), fresh ? 1500 : 900);
    return () => clearTimeout(id);
  }, [spec.items]);

  const isGratin = (p: Present<BuildItem>) => {
    const v = menu.ingredients[p.item.ingredient].visual;
    return v.archetype === "melt" && v.variant !== "pour";
  };
  // Sous le gratiné, la garniture ne se voit pas : pas d'étiquette, et le gratinage se rejoue à chaque changement.
  const gratin = items.find((p) => isGratin(p) && p.phase === "enter");
  const hidden = (p: Present<BuildItem>) => !!gratin && p !== gratin && !onTop.has(p.item.layer);
  const underSig = items
    .filter((p) => p.phase === "enter" && !isGratin(p))
    .map((p) => p.key)
    .join("|");

  // Photos manquantes : de petites étiquettes lisibles, en colonne, plutôt qu'une pile de cadres.
  const missing = items.filter((p) => {
    const shot = ingredientShot(menu, p.item.ingredient, spec.support)[0];
    return shot && !isGratin(p) && !hidden(p) && !photoInfo(shot.file);
  });
  const chip = (p: Present<BuildItem>) => {
    const k = missing.indexOf(p);
    const cols = tas ? 1 : 2;
    const col = k % cols, row = Math.floor(k / cols);
    return { x: cols === 1 ? 0 : col ? 6.5 : -6.5, z: -5 + row * 3.4, size: [12, 2.8] as [number, number] };
  };

  const layer = (p: Present<BuildItem>, i: number) => {
    const ing = menu.ingredients[p.item.ingredient];
    const shots = ingredientShot(menu, p.item.ingredient, spec.support);
    const common = { label: ing.label, color: ing.visual.color ?? "#C08040", phase: p.phase, reduced, delay: p.batchIndex * 0.12 };
    if (ing.visual.archetype === "melt" && ing.visual.variant !== "pour") {
      // Gratiné : « avant » tombe, puis fondu vers « après ». Sans photo « avant », fondu direct.
      const [avant, apres] = shots;
      const hasAvant = !!photoInfo(avant.file), hasApres = !!photoInfo(apres.file);
      return (
        <group key={`${p.key}:${underSig}`}>
          {(hasAvant || !hasApres) && <PhotoLayer {...common} file={avant.file} fallbackCm={avant.sizeCm} x={0} z={0} y={3} order={baseOrder + 40} enter="fade" />}
          {hasApres && <PhotoLayer {...common} file={apres.file} fallbackCm={apres.sizeCm} x={0} z={0} y={3.2} order={baseOrder + 41} mode="dissolve" duration={1.3} delay={hasAvant ? 0.5 : 0.1} glow />}
          {!reduced && p.phase === "enter" && <OvenSteam />}
        </group>
      );
    }
    const shot = shots[0];
    if (!shot) return null;
    if (ing.visual.variant === "pour") {
      return <PhotoLayer key={p.key} {...common} file={shot.file} fallbackCm={shot.sizeCm} x={0} z={0} y={1 + i * 0.3} order={baseOrder + 5 + i} mode="reveal" duration={0.9} showPlaceholder />;
    }
    if (!photoInfo(shot.file)) {
      if (hidden(p)) return null;
      const c = chip(p);
      return <PhotoLayer key={p.key} {...common} file={shot.file} fallbackCm={c.size} x={c.x} z={c.z} y={4 + i * 0.1} order={baseOrder + 60 + i} enter="drop" />;
    }
    const [ox, oz] = tas ? [0, 0] : (OFFSET[p.item.layer] ?? [0, 0]);
    const spread = tas ? 2.2 : 1.8;
    const rx = p.item.rank ? (p.item.rank % 2 ? 1 : -1) * spread * Math.ceil(p.item.rank / 2) : 0;
    const rz = p.item.rank ? (p.item.rank % 2 ? -0.5 : 0.5) : 0;
    const enter = ing.visual.archetype === "can" || ing.visual.archetype === "bottle" ? "slide" : "drop";
    return (
      <PhotoLayer
        key={p.key}
        {...common}
        file={shot.file}
        fallbackCm={shot.sizeCm}
        x={ox + rx}
        z={oz + rz}
        y={onTop.has(p.item.layer) ? 3 : 0.6 + i * 0.35}
        order={baseOrder + 5 + i}
        enter={enter}
      />
    );
  };

  return (
    <group>
      {flat && (photoInfo(flat.file) || !gratin) && <PhotoLayer file={flat.file} label={support.label} color={support.visual.color ?? "#D9A05B"} fallbackCm={flat.sizeCm} x={0} z={0} y={0.2} order={baseOrder + 1} phase="enter" reduced={reduced} enter="fade" />}
      {items.map(layer)}
      {rolled && (
        <PhotoLayer
          file={rolled.file}
          label="Tortilla roulée"
          color={support.visual.color ?? "#EFD29A"}
          fallbackCm={rolled.sizeCm}
          x={0}
          z={0}
          y={3.5}
          order={baseOrder + 45}
          phase="enter"
          reduced={reduced}
          enter="none"
          visible={resting && spec.items.length > 0}
        />
      )}
    </group>
  );
}
