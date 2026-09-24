/** Une information pas encore fournie par le restaurant : visible, jamais inventée. */
import { isTodo } from "../data/restaurant.ts";

export function Todo({ what }: { what?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-cheddar/60 bg-cheddar/10 px-2 py-0.5 text-sm font-medium text-cheddar">
      À compléter{what ? <span className="font-normal text-cheddar/75">· {what}</span> : null}
    </span>
  );
}

export function Value({ v, what }: { v: string; what?: string }) {
  return isTodo(v) ? <Todo what={what} /> : <>{v}</>;
}
