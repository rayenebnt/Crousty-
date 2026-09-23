import { Configurator } from "./ui/Configurator.tsx";
import { useFontsReady } from "./ui/hooks.ts";

export function App() {
  // Les textures 3D écrivent en Anton : on attend la police (2 s au plus).
  const ready = useFontsReady();
  return ready ? <Configurator /> : <div className="stage-bg h-full" aria-busy="true" />;
}
