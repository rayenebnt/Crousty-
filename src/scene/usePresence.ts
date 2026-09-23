/**
 * Garde affichés les éléments qui viennent de disparaître le temps de leur
 * animation de sortie (équivalent d'AnimatePresence pour la scène 3D).
 */
import { useEffect, useRef, useState } from "react";

export interface Present<T> {
  key: string;
  item: T;
  phase: "enter" | "exit";
  /** Rang d'arrivée parmi les nouveaux éléments du même lot (pour les décaler). */
  batchIndex: number;
}

export function usePresence<T>(items: T[], keyOf: (t: T) => string, exitMs: number): Present<T>[] {
  const [list, setList] = useState<Present<T>[]>(() => items.map((item, i) => ({ key: keyOf(item), item, phase: "enter", batchIndex: i })));
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setList((prev) => {
      const incoming = new Map(items.map((it) => [keyOf(it), it]));
      const next: Present<T>[] = [];
      let fresh = 0;
      // Ordre : celui des éléments reçus, les sortants gardent leur place.
      const prevKeys = new Set(prev.map((p) => p.key));
      for (const p of prev) {
        const it = incoming.get(p.key);
        if (it) next.push({ ...p, item: it, phase: "enter" });
        else next.push(p.phase === "exit" ? p : { ...p, phase: "exit" });
      }
      for (const it of items) {
        const k = keyOf(it);
        if (!prevKeys.has(k)) next.push({ key: k, item: it, phase: "enter", batchIndex: fresh++ });
      }
      const order = new Map(items.map((it, i) => [keyOf(it), i]));
      next.sort((a, b) => (order.get(a.key) ?? 1e6) - (order.get(b.key) ?? 1e6));
      // Rien n'a changé : on garde la même liste (sinon boucle de rendu infinie).
      const same = next.length === prev.length && next.every((p, i) => p.key === prev[i].key && p.item === prev[i].item && p.phase === prev[i].phase);
      return same ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    for (const p of list) {
      if (p.phase === "exit" && !timers.current.has(p.key)) {
        timers.current.set(
          p.key,
          setTimeout(() => {
            timers.current.delete(p.key);
            setList((cur) => cur.filter((x) => !(x.key === p.key && x.phase === "exit")));
          }, exitMs),
        );
      }
      if (p.phase === "enter" && timers.current.has(p.key)) {
        clearTimeout(timers.current.get(p.key));
        timers.current.delete(p.key);
      }
    }
  }, [list, exitMs]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return list;
}
