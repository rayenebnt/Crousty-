import { createContext } from "react";
import type { TopShape } from "./shapes.ts";

/** Forme du dessus du support, transmise au gratiné pour qu'il épouse le pain. */
export const TopShapeContext = createContext<TopShape>({ kind: "flat", hx: 0.5, hz: 0.3 });
