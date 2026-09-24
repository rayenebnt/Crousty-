/**
 * Un assemblage en photos : le support (pain ouvert, tortilla…) puis chaque ingrédient,
 * dans l'ordre des couches. Gratiné : la garniture tombe dans le pain, puis le fromage râpé
 * pleut dessus, puis le four (fondu vers la photo « après », vapeur). Tout changement de
 * garniture rejoue la séquence.
 * Nappage : la photo des frites nappées s'étale sur les frites. Tortilla : se roule au repos.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerId, Menu } from "../data/menu.types.ts";
import type { AssemblySpec, BuildItem } from "../domain/resolveBuild.ts";
import { Steam } from "../scene/Steam.tsx";
import { usePresence, type Present } from "../scene/usePresence.ts";
import { PhotoLayer } from "./PhotoLayer.tsx";
import { piecesDuration } from "./PiecesDrop.tsx";
import { photoInfo } from "./manifest.ts";
import { ingredientShot, supportShot } from "./shots.ts";

/** Décalage de chaque couche dans le pain (cm) : chaque ingrédient ajouté reste visible. */
const OFFSET: Partial<Record<LayerId, [number, number]>> = {
  cheese: [0.5, -0.3],
  extra: [-0.6, 0.3],
  veg: [0.5, 0.2],
  "veg-top": [-0.4, -0.3],
};

const EXIT_MS = 420;
/** Écart entre deux ingrédients qui tombent ensemble (s). */
const STAGGER = 0.16;
/** Durée d'une chute avec rebond (voir PhotoLayer). */
const DROP = 0.55;
/** Durée d'arrivée d'un ingrédient : chute d'un bloc, ou morceau par morceau. */
const arrival = (file: string | undefined, reduced: boolean) => {
  const n = file ? photoInfo(file)?.pieces : undefined;
  return n && !reduced ? piecesDuration(n) : DROP;
};

/** Vapeur de sortie du four : forte quelques secondes, puis légère. (La vapeur travaille en unités ×8.) */
function OvenSteam({ delay = 0 }: { delay?: number }) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    const a = setTimeout(() => setLevel(1), delay * 1000);
    const b = setTimeout(() => setLevel(0.35), delay * 1000 + 3800);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [delay]);
  return (
    <group position-y={4} scale={8}>
      <Steam intensity={level} hx={1.1} hz={0.35} count={16} />
    </group>
  );
}

interface RunProps {
  avant: { file: string; sizeCm: [number, number] };
  apres: { file: string; sizeCm: [number, number] };
  label: string;
  color: string;
  phase: "enter" | "exit";
  /** Attente avant la pluie de fromage : le temps que la garniture se pose (s). */
  delay: number;
  reduced: boolean;
  order: number;
}

/** Une séquence de gratinage : pluie d'emmental râpé, puis le four. */
function GratinRun({ avant, apres, label, color, phase, delay, reduced, order }: RunProps) {
  const hasAvant = !!photoInfo(avant.file), hasApres = !!photoInfo(apres.file);
  const common = { label, color, phase, reduced, x: 0, z: 0 };
  if (reduced || !hasAvant) {
    return <PhotoLayer {...common} file={hasApres ? apres.file : avant.file} fallbackCm={apres.sizeCm} y={3.2} order={order + 1} enter="fade" delay={reduced ? 0 : delay} />;
  }
  // L'emmental râpé (vraie photo) tombe morceau par morceau, puis le four : fondu vers la photo « après ».
  const fall = arrival(avant.file, reduced);
  const oven = delay + fall + 0.1;
  return (
    <group>
      <PhotoLayer {...common} file={avant.file} fallbackCm={avant.sizeCm} y={3} order={order} enter="drop" delay={delay} />
      {hasApres && <PhotoLayer {...common} file={apres.file} fallbackCm={apres.sizeCm} y={3.2} order={order + 1} mode="dissolve" duration={0.8} delay={oven} glow />}
      {phase === "enter" && <OvenSteam delay={oven + 0.2} />}
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

  // Frites : les nouvelles arrivées se suivent (les frites, puis le cheddar coule, puis la viande tombe).
  const seenItems = useRef<Set<string> | null>(null);
  const tasDelay = useMemo(() => {
    const known = seenItems.current;
    const fresh = items.filter((p) => p.phase === "enter" && (!known || !known.has(p.key))).sort((a, b) => a.batchIndex - b.batchIndex);
    const out = new Map<string, number>();
    let t = known ? 0.1 : 0.3;
    for (const p of fresh) {
      out.set(p.key, t);
      const v = menu.ingredients[p.item.ingredient].visual;
      const file = ingredientShot(menu, p.item.ingredient, spec.support)[0]?.file;
      // Le suivant part quand le précédent est presque posé.
      t += v.variant === "pour" ? 0.75 : arrival(file, reduced) * 0.8;
    }
    return out;
  }, [items, menu, spec.support, reduced]);
  useEffect(() => {
    seenItems.current = new Set(items.map((p) => p.key));
  }, [items]);

  const isGratin = (p: Present<BuildItem>) => {
    const v = menu.ingredients[p.item.ingredient].visual;
    return v.archetype === "melt" && v.variant !== "pour";
  };
  const gratin = items.find((p) => isGratin(p) && p.phase === "enter");
  // Sous le gratiné, un ingrédient sans photo n'a pas d'étiquette : le fromage le recouvre.
  const hidden = (p: Present<BuildItem>) => !!gratin && p !== gratin && !onTop.has(p.item.layer);
  const under = items.filter((p) => p.phase === "enter" && !isGratin(p));
  const underSig = under.map((p) => p.key).join("|");

  // Le gratinage se rejoue à chaque changement de garniture, une fois les nouveaux ingrédients posés.
  const seen = useRef<Set<string> | null>(null);
  const runDelay = useMemo(() => {
    const first = seen.current === null;
    const fresh = under.filter((p) => first || !seen.current!.has(p.key));
    if (!fresh.length) return first ? 0.4 : 0.45;
    const end = Math.max(...fresh.map((p) => p.batchIndex * STAGGER + arrival(ingredientShot(menu, p.item.ingredient, spec.support)[0]?.file, reduced)));
    return (first ? 0.3 : 0.1) + end + 0.2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [underSig]);
  useEffect(() => {
    seen.current = new Set(underSig.split("|"));
  }, [underSig]);
  const gratinItem = gratin?.item;
  const runInput = useMemo(() => (gratinItem ? [{ sig: underSig, delay: runDelay, item: gratinItem }] : []), [gratinItem, underSig, runDelay]);
  const runs = usePresence(runInput, (r) => `${r.item.key}:${r.sig}`, 400);

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
    const first = !mounted.current;
    const common = { label: ing.label, color: ing.visual.color ?? "#C08040", phase: p.phase, reduced, delay: tas ? (tasDelay.get(p.key) ?? 0.1) : (first ? 0.3 : 0.1) + p.batchIndex * STAGGER };
    if (ing.visual.archetype === "melt" && ing.visual.variant !== "pour") return null; // voir GratinRun
    const shot = shots[0];
    if (!shot) return null;
    if (ing.visual.variant === "pour") {
      return <PhotoLayer key={p.key} {...common} file={shot.file} fallbackCm={shot.sizeCm} x={0} z={0} y={1 + i * 0.3} order={baseOrder + 5 + i} mode="reveal" duration={1.0} showPlaceholder />;
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
    const drizzle = ing.visual.archetype === "drizzle";
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
        {...(drizzle ? { mode: "wipe" as const, duration: 0.75 } : {})}
      />
    );
  };

  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  return (
    <group>
      {flat && (photoInfo(flat.file) || !gratin) && <PhotoLayer file={flat.file} label={support.label} color={support.visual.color ?? "#D9A05B"} fallbackCm={flat.sizeCm} x={0} z={0} y={0.2} order={baseOrder + 1} phase="enter" reduced={reduced} enter="fade" />}
      {items.map(layer)}
      {runs.map((r) => {
        const [avant, apres] = ingredientShot(menu, r.item.item.ingredient, spec.support);
        const ing = menu.ingredients[r.item.item.ingredient];
        return <GratinRun key={r.key} avant={avant} apres={apres} label={ing.label} color={ing.visual.color ?? "#F5D98A"} phase={r.phase} delay={r.item.delay} reduced={reduced} order={baseOrder + 40} />;
      })}
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
