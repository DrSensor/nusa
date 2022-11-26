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
  events.forEach((targetMap, event) => {
    let proto: Event, target: Element;
    scope.addEventListener(event, (e) => {
      target = e.target as Element;
      const methods = targetMap.get(target as Element);
      if (methods) {
        e.stopImmediatePropagation();
        task.idle(() => {
          currentEvent = e;
          methods.forEach((methodName) =>
            (script[methodName] as VoidFunction)()
          );
        });
        if (!proto) {
          Object.defineProperty(proto = Object.getPrototypeOf(e), "target", {
            get: () => target,
          });
        }
      }
    }, { passive: true, capture: true });
  });
  events.clear();
}
