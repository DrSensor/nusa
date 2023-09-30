import type { Instance, IntoSet } from "../types.d.ts";

interface HandlePrefix {
  self_?: string[];
  none_?: string[];
  // TODO: implemennt other prefix
}

/** Queue methods that need to be attached as {@link EventListener} into {@link events} */
export function queue(attr: Attr): void;

declare const events: Record<string, Map<Element, IntoSet<HandlePrefix>>>;

/** default behaviour */
declare const config: AddEventListenerOptions;

/** Attach method as event listener */
export function listen(scope: ShadowRoot, script: Instance): void;
declare namespace __listen__ {
  /** Handle {@link events} after being {@link queue} */
  const handle: (
    node: Node,
    methods: Set<string>,
    options?: typeof config,
  ) => void;
}
