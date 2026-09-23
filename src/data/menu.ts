import raw from "./menu.json";
import type { Menu } from "./menu.types.ts";

/** La carte. Sa validité est garantie par les tests (tests/menu.test.ts), lancés avant chaque build. */
export const menu = raw as unknown as Menu;
