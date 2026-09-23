import { useEffect, useState } from "react";

/** Réglage système « réduire les animations ». */
export function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** La 3D est-elle possible sur cet appareil ? */
export function useWebGL() {
  const [ok] = useState(() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  });
  return ok;
}

/** Attend la police des titres (utilisée aussi dans les textures 3D), 2 s au plus. */
export function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    Promise.all([document.fonts.load("64px Anton"), document.fonts.load("16px 'Inter Variable'")]).then(finish, finish);
    const id = setTimeout(finish, 2000);
    return () => clearTimeout(id);
  }, []);
  return ready;
}
