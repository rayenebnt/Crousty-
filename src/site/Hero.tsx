/**
 * Accueil : on entre chez Le Crousty en faisant défiler la page.
 *
 * La vidéo du restaurant est découpée en images (tools/hero) : le défilement choisit l'image,
 * comme si on avançait avec la caméra. À la fin, la caméra s'arrête face au comptoir et le nom
 * CROUSTY tombe dans la salle, lettre par lettre, derrière la personne (détourée), puis s'allume.
 */
import { useEffect, useRef } from "react";
import hero from "../data/hero.json";
import { clamp01, damp, easeInOutCubic, easeOutBack, easeOutCubic } from "../scene/easing.ts";
import { useReducedMotion } from "../ui/hooks.ts";

const base = import.meta.env.BASE_URL;
const frameUrl = (i: number) => `${base}hero/f${String(i).padStart(3, "0")}.webp`;
const FIN = `${base}hero/fin.webp`;
const PERSONNE = `${base}hero/fin-personne.webp`;

/** Part du défilement consacrée à la marche (le reste : arrêt face au comptoir, le nom apparaît). */
const WALK = 0.66;
const NAME = "CROUSTY";

/** Ordre de chargement : quelques images réparties d'abord, puis on remplit les trous. */
function loadOrder(n: number) {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const step of [16, 8, 4, 2, 1])
    for (let i = 0; i < n; i += step)
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
  if (!seen.has(n - 1)) out.push(n - 1);
  return out;
}

export function Hero() {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const backdrop = useRef<HTMLCanvasElement>(null);
  const sign = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const person = useRef<HTMLImageElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);
  const outro = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const images: (HTMLImageElement | null)[] = Array(hero.count).fill(null);
    let fin: HTMLImageElement | null = null;
    let alive = true;
    let target = 0, current = reduced ? 1 : 0, drawn = -1, raf = 0, visible = true;
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    // Mise en page : l'image couvre l'écran sur mobile ; sur ordinateur, une colonne à droite sur fond flou.
    let wide = false;
    const layout = () => {
      const el = stage.current, cv = canvas.current, box = section.current?.firstElementChild as HTMLElement | null;
      if (!el || !cv || !box) return;
      const vw = box.clientWidth, vh = box.clientHeight;
      wide = vw / vh > 0.95;
      let w: number, h: number, left: number, top: number;
      if (wide) {
        h = vh;
        w = (vh * hero.w) / hero.h;
        left = Math.min(vw - w, vw * 0.64 - w / 2);
        top = 0;
      } else {
        const s = Math.max(vw / hero.w, vh / hero.h);
        w = hero.w * s;
        h = hero.h * s;
        left = (vw - w) / 2;
        top = (vh - h) / 2;
      }
      Object.assign(el.style, { width: `${w}px`, height: `${h}px`, left: `${left}px`, top: `${top}px` });
      el.style.setProperty("--fw", `${w}px`);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      if (backdrop.current) backdrop.current.style.display = wide ? "block" : "none";
      drawn = -1;
      render(current);
    };

    const nearest = (i: number) => {
      for (let d = 0; d < hero.count; d++) {
        if (images[i - d]) return images[i - d];
        if (images[i + d]) return images[i + d];
      }
      return null;
    };

    const render = (p: number) => {
      const walk = clamp01(p / WALK);
      const hold = clamp01((p - WALK) / (1 - WALK));
      const idx = Math.round(walk * (hero.count - 1));
      const atEnd = idx === hero.count - 1;
      const img = atEnd && fin ? fin : nearest(idx);
      const key = atEnd && fin ? -2 : img ? images.indexOf(img) : -1;
      const cv = canvas.current;
      if (cv && img && key !== drawn) {
        cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
        const bd = backdrop.current;
        if (bd && wide) bd.getContext("2d")!.drawImage(img, 0, 0, bd.width, bd.height);
        drawn = key;
      }
      // Arrêt face au comptoir : la caméra avance encore un peu, la salle s'assombrit, le nom tombe puis s'allume.
      const push = easeInOutCubic(hold);
      if (stage.current) stage.current.style.transform = `scale(${1 + 0.07 * push})`;
      const dim = 0.38 * easeOutCubic(clamp01(hold / 0.5));
      if (shade.current) shade.current.style.opacity = String(dim);
      if (person.current) {
        person.current.style.opacity = atEnd && hold > 0 ? "1" : "0";
        person.current.style.filter = `brightness(${1 - dim})`;
      }
      const letters = sign.current?.children;
      if (letters) {
        for (let i = 0; i < letters.length; i++) {
          const e = clamp01((hold - 0.12 - i * 0.055) / 0.28);
          const k = easeOutBack(e, 1.4);
          const l = letters[i] as HTMLElement;
          l.style.opacity = String(clamp01(e * 4));
          l.style.transform = `translate3d(0, ${(1 - k) * -140}%, 0) rotateX(${(1 - k) * 75}deg) scale(${0.7 + 0.3 * k})`;
        }
        // Allumage façon néon : quelques clignements, puis la lueur reste.
        const on = clamp01((hold - 0.62) / 0.2);
        const flicker = on > 0 && on < 1 ? (Math.sin(on * 40) > -0.2 ? 1 : 0.35) : 1;
        stage.current?.style.setProperty("--glow", String(on * flicker));
      }
      if (intro.current) intro.current.style.opacity = String(1 - clamp01(p / 0.07));
      if (cue.current) cue.current.style.opacity = String(1 - clamp01(p / 0.04));
      if (caption.current) {
        const c = clamp01((walk - 0.35) / 0.12) * (1 - clamp01((walk - 0.8) / 0.12));
        caption.current.style.opacity = String(c);
        caption.current.style.transform = `translateY(${(1 - c) * 12}px)`;
      }
      if (outro.current) {
        const o = clamp01((hold - 0.72) / 0.22);
        outro.current.style.opacity = String(o);
        outro.current.style.transform = `translateY(${(1 - easeOutCubic(o)) * 24}px)`;
        outro.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
      }
    };

    const measure = () => {
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const range = el.offsetHeight - window.innerHeight;
      target = reduced || range <= 0 ? 1 : clamp01(-r.top / range);
    };
    let last = 0;
    const tick = (now: number) => {
      raf = 0;
      if (!alive) return;
      // Amorti selon le temps écoulé (même rendu à 30 ou 120 images/s).
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      current = reduced ? target : damp(current, target, 9, dt);
      if (Math.abs(target - current) < 0.0004) current = target;
      render(current);
      if (current !== target && visible) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const kick = () => {
      measure();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    if (section.current) io.observe(section.current);
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", layout);
    layout();
    kick();

    // Chargement : l'image finale et la personne tout de suite si les animations sont réduites.
    (async () => {
      if (reduced) {
        fin = await load(FIN).catch(() => null);
        drawn = -1;
        render(1);
      }
      for (const i of loadOrder(hero.count)) {
        if (!alive) return;
        images[i] = await load(frameUrl(i)).catch(() => null);
        if (i === 0 || Math.abs(i - Math.round(clamp01(current / WALK) * (hero.count - 1))) < 8) {
          drawn = -1;
          render(current);
        }
      }
      fin = fin ?? (await load(FIN).catch(() => null));
      drawn = -1;
      render(current);
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", layout);
    };
  }, [reduced]);

  return (
    <section ref={section} id="accueil" aria-labelledby="hero-titre" className={reduced ? "relative h-[100svh]" : "relative h-[400svh]"}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-noir">
        {/* Ordinateur : la même image, très floue, en fond. */}
        <canvas ref={backdrop} width={48} height={85} aria-hidden className="absolute inset-0 hidden h-full w-full scale-110 blur-2xl brightness-[0.45] saturate-150" />
        <div ref={stage} className="hero-stage absolute origin-[50%_42%] will-change-transform">
          <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />
          <div ref={shade} aria-hidden className="absolute inset-0 bg-noir opacity-0" />
          <div aria-hidden className="crousty-spill absolute inset-x-0 top-[26%] h-[26%]" />
          <div ref={sign} aria-hidden className="crousty-sign">
            {NAME.split("").map((c, i) => (
              <span key={i} className="crousty-letter" style={{ opacity: reduced ? 1 : 0 }}>
                {c}
              </span>
            ))}
          </div>
          <img ref={person} src={PERSONNE} alt="" aria-hidden className="absolute inset-0 h-full w-full opacity-0" decoding="async" />
        </div>
        <div aria-hidden className="hero-vignette pointer-events-none absolute inset-0" />

        <h1 id="hero-titre" className="sr-only">
          Le Crousty, fast-food à Bonneuil-sur-Marne : Crousty, sandwichs gratinés, tacos, burgers et desserts maison
        </h1>

        <div ref={intro} className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-24 md:inset-y-0 md:right-auto md:flex md:w-[42%] md:flex-col md:justify-center md:pb-0 md:pl-12">
          <p className="text-xs font-semibold tracking-[0.18em] text-cheddar uppercase">Bonneuil-sur-Marne · 94</p>
          <p className="mt-2 font-display text-5xl leading-[0.95] uppercase drop-shadow-[0_2px_16px_rgb(0_0_0/0.7)] md:text-7xl">
            Bienvenue
            <br />
            chez <span className="text-flamme">Le Crousty</span>
          </p>
        </div>

        <p ref={caption} className="pointer-events-none absolute inset-x-0 bottom-24 px-5 font-display text-3xl leading-tight uppercase opacity-0 drop-shadow-[0_2px_14px_rgb(0_0_0/0.8)] md:inset-x-auto md:bottom-auto md:left-12 md:top-1/2 md:w-[36%] md:text-5xl">
          Crousty, sandwichs <span className="text-cheddar">gratinés</span>, tacos, burgers
        </p>

        <div ref={outro} className="absolute inset-x-0 bottom-0 px-5 pb-8 opacity-0 md:inset-y-0 md:right-auto md:flex md:w-[42%] md:flex-col md:justify-center md:pb-0 md:pl-12">
          <p className="text-xs font-semibold tracking-[0.18em] text-cheddar uppercase">Fast-food · Bonneuil-sur-Marne</p>
          <p className="mt-2 max-w-md text-lg leading-snug text-white/90 drop-shadow-[0_2px_10px_rgb(0_0_0/0.8)] md:text-xl">
            Crousty, sandwichs gratinés à la mozzarella, tacos, burgers gourmets et desserts maison. Découvre la carte et compose ton menu.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#compose" className="rounded-full bg-rouge px-5 py-3 font-display text-lg tracking-wide uppercase shadow-lg shadow-rouge/30 transition hover:bg-flamme focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar">
              Compose ton menu
            </a>
            <a href="#carte" className="rounded-full border border-white/40 bg-noir/40 px-5 py-3 font-display text-lg tracking-wide uppercase backdrop-blur transition hover:border-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar">
              Voir la carte
            </a>
          </div>
        </div>

        {!reduced && (
          <div ref={cue} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 text-xs font-semibold tracking-[0.18em] text-white/80 uppercase">
            Fais défiler pour entrer
            <span className="hero-cue block h-6 w-px bg-white/70" />
          </div>
        )}
      </div>
    </section>
  );
}
