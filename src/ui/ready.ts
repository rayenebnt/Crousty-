import { menu } from "../data/menu.ts";
import { productReady } from "../photo/presentable.ts";

/** Démo : produits dont les photos sont prêtes, donc proposés dans le configurateur. */
export const READY = new Set(menu.products.filter((p) => productReady(menu, p.id)).map((p) => p.id));
