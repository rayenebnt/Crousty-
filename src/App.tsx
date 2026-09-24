import { Carte } from "./site/Carte.tsx";
import { Footer } from "./site/Footer.tsx";
import { Header } from "./site/Header.tsx";
import { Hero } from "./site/Hero.tsx";
import { Infos } from "./site/Infos.tsx";
import { Resto } from "./site/Resto.tsx";
import { Configurator } from "./ui/Configurator.tsx";

/** Le site : une page vitrine, section par section. */
export function App() {
  return (
    <>
      <a href="#compose" className="sr-only z-50 rounded bg-cheddar px-3 py-2 text-noir focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Aller au configurateur
      </a>
      <Header />
      <main>
        <Hero />
        <Configurator />
        <Carte />
        <Resto />
        <Infos />
      </main>
      <Footer />
    </>
  );
}
