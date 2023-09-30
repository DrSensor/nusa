import type bind from "./bind.js";
import type { Queue } from "./query.js";

declare const registry: WeakMap<Element, [ShadowRoot, Queue]>;
declare let module: Promise<{
  bind_: typeof bind;
  features_: Parameters<typeof bind>[0];
}>;

/** fetch and run module runtime for binding along with user linked modules then bind all linked modules */
declare function lazyBind(shadow: ShadowRoot, queue: Queue): void;

/** observe viewport intersection
@see https://web.dev/intersectionobserver-v2
*/ export function inview(shadow: ShadowRoot, queue: Queue): void;

/** observe true visibility
@see https://web.dev/intersectionobserver-v2
*/ export function visible(shadow: ShadowRoot, queue: Queue): void;
