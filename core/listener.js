/** @template T
 ** @typedef {import("./types.d.ts").IntoSet<T>} _IntoSet */
/** @typedef {import("./types.d.ts").Instance} _Instance */
/** @typedef {import("./constant/colon.js")} _Colon */

/** @typedef _HandlePrefix
@property self_{string[]=}
@property none_{string[]=}
TODO: implemennt other prefix
*/

import { setCurrentEvent } from "./registry.js";
import * as task from "./task.js";

/** Queue methods that need to be attached as {@link EventListener} into {@link events}
@param attr{Attr}
*/ export function queue(attr) {
  const methodNamesPrefix = attr.value.split(" ").reduce(
    (final, value) => (
      value.startsWith("self:")
        ? (final.self_ ??= []).push(value.slice(5 /*ColonFor.CaptureSelf*/))
        : // TODO: implement other prefix
          (final.none_ ??= []).push(value),
      final
    ),
    /** @type Partial<_HandlePrefix> */ ({}),
  );

  const eventName = attr.name.slice(/** @type _Colon["Event"] */ (3));
  const cachedNamesPrefix = events[eventName]?.get(
    /** @type Element */ (attr.ownerElement),
  );

  if (cachedNamesPrefix) {
    methodNamesPrefix.self_?.forEach(
      (cachedNamesPrefix.self_ ??= new Set()).add,
    );
    methodNamesPrefix.none_?.forEach(
      (cachedNamesPrefix.none_ ??= new Set()).add,
    );
    // TODO: implement other prefix
  } else {
    const /** @type _IntoSet<_HandlePrefix> */ cachedNamesWithPrefix = {};
    const dedupe = /** @param names{string[]=} */ (names) =>
      names ? new Set(names) : names;

    cachedNamesWithPrefix.self_ = dedupe(methodNamesPrefix.self_);
    cachedNamesWithPrefix.none_ = dedupe(methodNamesPrefix.none_);
    // TODO: implement other prefix

    (events[eventName] ??= new Map()).set(
      /** @type Element */ (attr.ownerElement),
      cachedNamesWithPrefix,
    );
  }
}

/** @type Record<string, Map<Element, _IntoSet<_HandlePrefix>>> */
const events = {};

/** default behaviour
@satisfies {AddEventListenerOptions}
*/ const config = {
  passive: true,
  capture: true,
};

/** Attach method as event listener
@param scope{ShadowRoot}
@param script{_Instance}
*/ export function listen(scope, script) {
  Object.entries(events).forEach(([event, targetMap]) => {
    let cancel = () => {};

    /** Handle {@link events} after being {@link queue}
    @param node{Node}
    @param methods{Set<string>}
    @param options{AddEventListenerOptions}
    */ const handle = (node, methods, options = config) =>
      methods.size &&
      node.addEventListener(
        event,
        (e) => {
          // TODO: e.preventDefault() if <tag :: on:event="stealth:method">
          // TODO: allow propagation if <tag :: on:event="bubble:method">
          e.stopImmediatePropagation(); // TODO: switch to e.stopPropagation() if script bind to <tag :="">
          cancel();
          const render = task.prepare(() => {
            setCurrentEvent(e);
            methods.forEach((methodName) =>
              /** @type VoidFunction */ (script[methodName])(),
            );
          });
          cancel = /** @type {() => VoidFunction} */ (render());
          setCurrentEvent(null);
        },
        options,
      );

    targetMap.forEach((prefix, element) => {
      if (prefix.self_) handle(scope, prefix.self_);
      if (prefix.none_) handle(element, prefix.none_);
      // TODO: implement other prefix
    });
    targetMap.clear();
  });
}
