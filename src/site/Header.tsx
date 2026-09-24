/** En-tête fixe : transparent sur l'accueil, sombre ensuite. */
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#compose", label: "Composer" },
  { href: "#carte", label: "Carte" },
  { href: "#resto", label: "Le resto" },
  { href: "#infos", label: "Infos" },
];

export function Header() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => {
      const hero = document.getElementById("accueil");
      setSolid(!hero || hero.getBoundingClientRect().bottom < 64);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${solid ? "border-b border-white/10 bg-nuit/92 backdrop-blur" : "bg-transparent"}`}>
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <a href="#accueil" className="shrink-0 font-display text-xl tracking-wide whitespace-nowrap focus-visible:outline-3 focus-visible:outline-cheddar sm:text-2xl" aria-label="Le Crousty, retour à l'accueil">
          LE <span className="text-flamme">CROUSTY</span>
        </a>
        <nav aria-label="Sections">
          <ul className="flex items-center text-[13px] font-semibold whitespace-nowrap sm:gap-2 sm:text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-full px-1.5 py-2 text-white/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cheddar sm:px-3">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
