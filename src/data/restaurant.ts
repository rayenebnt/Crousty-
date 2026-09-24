import raw from "./restaurant.json";

/** Infos pratiques. Tout ce qui n'est pas encore connu vaut "[À COMPLÉTER]". */
export const restaurant = raw;

export const TODO = "[À COMPLÉTER]";
export const isTodo = (v: string | null | undefined) => !v || v.includes(TODO);

/** Recherche de l'établissement sur Google Maps (tant que l'adresse exacte manque). */
export const mapsUrl = () => {
  const a = restaurant.address;
  const q = isTodo(a.street) ? `${restaurant.name} ${a.postalCode} ${a.city}` : `${restaurant.name} ${a.street} ${a.postalCode} ${a.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};
