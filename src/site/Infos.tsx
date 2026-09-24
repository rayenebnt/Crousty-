/** Nous trouver : adresse, horaires, téléphone, services. Ce qui manque est affiché « À compléter ». */
import { isTodo, mapsUrl, restaurant } from "../data/restaurant.ts";
import { Value } from "./Todo.tsx";

const base = import.meta.env.BASE_URL;

export function Infos() {
  const a = restaurant.address;
  const s = restaurant.services;
  const phone = restaurant.phone;
  return (
    <section id="infos" aria-labelledby="infos-titre" className="scroll-mt-14 border-t border-white/10 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-cheddar uppercase">Infos pratiques</p>
          <h2 id="infos-titre" className="mt-1 font-display text-5xl uppercase md:text-6xl">
            Nous <span className="text-flamme">trouver</span>
          </h2>

          <dl className="mt-6 space-y-5">
            <div>
              <dt className="text-sm font-semibold tracking-wide text-white/60 uppercase">Adresse</dt>
              <dd className="mt-1 text-lg">
                <address className="not-italic">
                  <Value v={a.street} what="rue" />
                  <br />
                  {a.postalCode} {a.city}
                </address>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold tracking-wide text-white/60 uppercase">Horaires</dt>
              <dd className="mt-1 text-lg">
                <Value v={restaurant.openingHours} what="jours et heures" />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold tracking-wide text-white/60 uppercase">Téléphone</dt>
              <dd className="mt-1 text-lg">{isTodo(phone) ? <Value v={phone} /> : <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold tracking-wide text-white/60 uppercase">Sur place · à emporter · livraison</dt>
              <dd className="mt-1 flex flex-wrap gap-2 text-lg">
                <Value v={s.surPlace} what="sur place" /> <Value v={s.aEmporter} what="à emporter" /> <Value v={s.livraison} what="livraison" />
              </dd>
            </div>
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className="rounded-full bg-rouge px-5 py-3 font-display text-lg tracking-wide uppercase transition hover:bg-flamme focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar">
              Itinéraire ↗
            </a>
            <a href="#compose" className="rounded-full border border-white/30 px-5 py-3 font-display text-lg tracking-wide uppercase transition hover:border-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cheddar">
              Compose ton menu
            </a>
          </div>
        </div>

        <figure className="relative overflow-hidden rounded-3xl border border-white/10">
          <img src={`${base}galerie/comptoir.webp`} alt="Le comptoir du Crousty et les écrans du menu" loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-noir/90 to-transparent p-4 pt-12 font-display text-2xl uppercase">
            {a.city} <span className="text-cheddar">· {a.postalCode.slice(0, 2)}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
