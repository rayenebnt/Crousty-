/** Pied de page : rappel, liens, mentions légales (à compléter par le restaurant). */
import { restaurant } from "../data/restaurant.ts";
import { Value } from "./Todo.tsx";

export function Footer() {
  const l = restaurant.legal;
  const tiktok = restaurant.socialLinks.find((s) => s.network === "TikTok");
  return (
    <footer className="border-t border-white/10 bg-noir px-4 pt-12 pb-10">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-4xl tracking-wide">
          LE <span className="text-flamme">CROUSTY</span>
        </p>
        <p className="mt-2 max-w-md text-white/70">Crousty, sandwichs gratinés, tacos, burgers, desserts maison. Fast-food à Bonneuil-sur-Marne (94).</p>
        <nav aria-label="Pied de page" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
          <a href="#compose" className="hover:text-white">Composer</a>
          <a href="#carte" className="hover:text-white">La carte</a>
          <a href="#resto" className="hover:text-white">Le resto</a>
          <a href="#infos" className="hover:text-white">Infos pratiques</a>
          {tiktok && (
            <a href={tiktok.url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
              TikTok {tiktok.handle}
            </a>
          )}
        </nav>

        <details className="mt-8 rounded-xl border border-white/10 p-4 text-sm text-white/70 open:bg-white/[0.03]">
          <summary className="cursor-pointer font-semibold text-white/85">Mentions légales</summary>
          <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
            <dt>Éditeur</dt>
            <dd><Value v={l.companyName} /></dd>
            <dt>SIRET</dt>
            <dd><Value v={l.siret} /></dd>
            <dt>Directeur de la publication</dt>
            <dd><Value v={l.publicationDirector} /></dd>
            <dt>Hébergeur</dt>
            <dd><Value v={l.host} /></dd>
          </dl>
          <p className="mt-3">Site vitrine : pas de commande ni de paiement en ligne. Photos et vidéo : Le Crousty.</p>
        </details>
        <p className="mt-6 text-xs text-white/40">© {new Date().getFullYear()} {restaurant.name}</p>
      </div>
    </footer>
  );
}
