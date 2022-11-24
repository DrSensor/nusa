import type { Instance } from "./types.ts";
import { ColonFor } from "./query.ts";
import * as task from "./task.ts";

const events = new Map<string, WeakMap<Element, string[]>>();

export function queue(attr: Attr) {
  const eventName = attr.name.slice(ColonFor.Event);
  events.set(
    eventName,
    (events.get(eventName) ?? new WeakMap())
      .set(attr.ownerElement!, attr.value.split(" ")),
  );
}

export let currentEvent: Event;

export function handledBy(scope: ShadowRoot, script: Instance) {
  events.forEach((targetMap, event) =>
    scope.addEventListener(event, (e) => {
      const methods = targetMap.get(e.target as Element);
      if (methods) {
        e.stopImmediatePropagation();
        task.idle(() =>
          methods.forEach(
            (methodName) => (script[methodName] as VoidFunction)(),
          )
        );
        currentEvent = e;
      }
    }, { passive: true, capture: true })
  );
  events.clear();
}
