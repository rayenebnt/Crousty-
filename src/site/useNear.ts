import { useEffect, useState, type RefObject } from "react";

/** Vrai dès que l'élément approche de l'écran (et le reste) : pour charger tard ce qui est lourd. */
export function useNear(ref: RefObject<Element | null>, margin = "100%") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (!("IntersectionObserver" in window)) return setNear(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}
