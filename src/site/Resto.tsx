/** Chez Le Crousty : vraies images du restaurant (tirées de la vidéo) et des plats. */
import { restaurant } from "../data/restaurant.ts";

const base = import.meta.env.BASE_URL;
const PHOTOS = [
  { file: "accueil-porte", alt: "Un membre de l'équipe accueille à la porte du Crousty", caption: "L'entrée", span: "row-span-2" },
  { file: "gratine-steak", alt: "Un gratiné au steak, l'emmental doré au four", caption: "Gratiné", span: "row-span-2" },
  { file: "burger-frites", alt: "Un burger et des frites posés sur le comptoir", caption: "Au comptoir", span: "row-span-2" },
  { file: "frites-cheddar-tandoori", alt: "Frites nappées de cheddar et poulet tandoori", caption: "Frites cheddar tandoori", span: "row-span-2" },
  { file: "comptoir", alt: "La salle : le comptoir en bois, les écrans du menu, les boissons", caption: "La salle", span: "row-span-2" },
  { file: "frites-cheddar-viande", alt: "Frites nappées de cheddar et viande hachée, à côté d'un gratiné", caption: "Frites cheddar viande hachée", span: "row-span-2" },
];

export function Resto() {
  const tiktok = restaurant.socialLinks.find((s) => s.network === "TikTok");
  return (
    <section id="resto" aria-labelledby="resto-titre" className="scroll-mt-14 border-t border-white/10 bg-noir py-16">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-cheddar uppercase">Le resto</p>
        <h2 id="resto-titre" className="mt-1 font-display text-5xl uppercase md:text-6xl">
          Chez <span className="text-flamme">Le Crousty</span>
        </h2>
        <p className="mt-2 max-w-xl text-white/70">La salle, le comptoir et ce qui en sort. Des vraies photos, prises sur place.</p>

        <ul className="mt-8 grid auto-rows-[120px] grid-cols-2 gap-3 md:auto-rows-[150px] md:grid-cols-3">
          {PHOTOS.map((p) => (
            <li key={p.file} className={`group relative overflow-hidden rounded-2xl ${p.span}`}>
              <img src={`${base}galerie/${p.file}.webp`} alt={p.alt} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-noir/85 to-transparent px-3 pt-8 pb-2 font-display text-lg tracking-wide uppercase">{p.caption}</span>
            </li>
          ))}
        </ul>

        {tiktok && (
          <a
            href={tiktok.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/30 focus-visible:outline-3 focus-visible:outline-cheddar"
          >
            <span>
              <span className="block font-display text-2xl uppercase">Suis-nous sur TikTok</span>
              <span className="text-white/70">{tiktok.handle}</span>
            </span>
            <span aria-hidden className="text-2xl text-flamme">
              ↗
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
