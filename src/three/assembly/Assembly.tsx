/**
 * Un assemblage = un support (pain, barquette…) + ses ingrédients, dans l'ordre des couches.
 * Calcule où chaque ingrédient se pose, ouvre le support quand quelque chose arrive,
 * et joue les entrées / sorties.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Menu, SupportArchetype, Visual } from "../../data/menu.types.ts";
import type { AssemblySpec, BuildItem } from "../../domain/resolveBuild.ts";
import { buildIngredient } from "../archetypes/pieces.ts";
import type { Built, Surface } from "../archetypes/types.ts";
import { hashString } from "../lib/noise.ts";
import { Bread } from "../supports/Bread.tsx";
import { DrinkSpot, FryBox, PlainSupport } from "../supports/FryBox.tsx";
import { supportLayout } from "../supports/shapes.ts";
import { Tortilla } from "../supports/Tortilla.tsx";
import { Drink, Drizzle, Pour } from "./Custom.tsx";
import { Gratin } from "./Gratin.tsx";
import { Pieces } from "./Pieces.tsx";
import { usePresence, type Present } from "./usePresence.ts";

interface SupportProps {
  visual: Visual<SupportArchetype>;
  open: boolean;
  fill: number;
  reduced: boolean;
  children: ReactNode;
  top: ReactNode;
}

const SUPPORTS: Partial<Record<SupportArchetype, (p: SupportProps) => ReactNode>> = {
  bread: (p) => <Bread {...p} />,
  tortilla: (p) => <Tortilla {...p} />,
  "fry-box": (p) => <FryBox visual={p.visual}>{p.children}</FryBox>,
  "drink-spot": (p) => <DrinkSpot visual={p.visual}>{p.children}</DrinkSpot>,
};
const Fallback = (p: SupportProps) => <PlainSupport visual={p.visual}>{p.children}</PlainSupport>;

const EXIT_MS = 450;

export function Assembly({ menu, spec, reduced }: { menu: Menu; spec: AssemblySpec; reduced: boolean }) {
  const support = menu.supports[spec.support];
  const layout = useMemo(() => supportLayout(support.visual), [support.visual]);
  const onTop = useMemo(() => new Set(support.onTop ?? []), [support.onTop]);

  const inner = useMemo(() => spec.items.filter((i) => !onTop.has(i.layer)), [spec.items, onTop]);
  const top = useMemo(() => spec.items.filter((i) => onTop.has(i.layer)), [spec.items, onTop]);
  const innerP = usePresence(inner, (i) => i.key, EXIT_MS);
  const topP = usePresence(top, (i) => i.key, EXIT_MS);

  // Géométries mises en cache par élément : un ajout ne reconstruit pas le reste.
  const builds = useRef(new Map<string, Built>());
  const builtFor = (it: BuildItem) => {
    let b = builds.current.get(it.key);
    if (!b) {
      b = buildIngredient(menu.ingredients[it.ingredient], layout.footprint, hashString(it.key));
      builds.current.set(it.key, b);
    }
    return b;
  };

  // Surfaces : chaque élément présent se pose sur ce qui est dessous ; les sortants gardent leur place.
  const lastSurface = useRef(new Map<string, Surface>());
  const { surfaces, fill } = useMemo(() => {
    const map = new Map<string, Surface>();
    let cur: Surface = () => layout.baseY;
    for (const p of innerP) {
      if (p.phase === "exit") continue;
      const b = builtFor(p.item);
      map.set(p.key, cur);
      const below = cur;
      cur = b.kind === "pieces" && b.surfaceAfter ? b.surfaceAfter(below) : (x, z) => below(x, z) + b.thickness;
    }
    for (const p of innerP) if (p.phase === "exit") map.set(p.key, lastSurface.current.get(p.key) ?? cur);
    lastSurface.current = map;
    // Oublie les géométries des éléments partis.
    const alive = new Set([...innerP, ...topP].map((p) => p.key));
    for (const k of builds.current.keys()) if (!alive.has(k)) builds.current.delete(k);
    return { surfaces: map, fill: cur(layout.footprint.cx, layout.footprint.cz) - layout.baseY };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innerP, topP, layout]);

  // Le support s'ouvre à chaque arrivée d'ingrédient intérieur, puis se referme.
  const [open, setOpen] = useState(false);
  const known = useRef(new Set(inner.map((i) => i.key)));
  useEffect(() => {
    const fresh = inner.some((i) => !known.current.has(i.key));
    known.current = new Set(inner.map((i) => i.key));
    if (!fresh || !support.opens) return;
    setOpen(true);
    const id = setTimeout(() => setOpen(false), reduced ? 300 : 1300);
    return () => clearTimeout(id);
  }, [inner, support.opens, reduced]);

  const Support = SUPPORTS[support.visual.archetype] ?? Fallback;
  // Laisse au support le temps de s'ouvrir, et décale les arrivées simultanées.
  const enterDelay = (p: Present<BuildItem>) => (reduced ? 0 : (support.opens ? 0.22 : 0) + p.batchIndex * 0.12);

  const renderItem = (p: Present<BuildItem>) => {
    const ing = menu.ingredients[p.item.ingredient];
    const b = builtFor(p.item);
    const surface = surfaces.get(p.key) ?? (() => layout.baseY);
    const common = { ing, phase: p.phase, delay: enterDelay(p), reduced };
    if (b.kind === "pieces") return <Pieces key={p.key} built={b} surface={surface} phase={p.phase} delay={common.delay} reduced={reduced} />;
    switch (b.component) {
      case "drizzle":
        return <Drizzle key={p.key} {...common} fp={layout.footprint} surface={surface} rank={p.item.rank} />;
      case "pour":
        return <Pour key={p.key} {...common} fp={layout.footprint} surface={surface} />;
      case "drink":
        return <Drink key={p.key} {...common} />;
      case "gratin":
        return <Gratin key={p.key} ing={ing} phase={p.phase} reduced={reduced} />;
      default:
        return null;
    }
  };

  return (
    <Support visual={support.visual} open={open} fill={fill} reduced={reduced} top={topP.map(renderItem)}>
      {innerP.map(renderItem)}
    </Support>
  );
}
