import type { Instance } from "./types.ts";
import { setCurrentEvent } from "./registry.ts";
import * as task from "./task.ts";
import * as ColonFor from "./constant/colon.ts";

interface HandlePrefix {
  self_?: string[];
  // TODO: implement other prefix
  none_?: string[];
}

const events = {} as Record<string, Map<Element, IntoSet<HandlePrefix>>>;

export function queue(attr: Attr) {
  const methodNamesPrefix = attr.value.split(" ").reduce((final, value) => (
    value.startsWith("self:")
      ? (final.self_ ??= []).push(value.slice(5 /*ColonFor.CaptureSelf*/))
      // TODO: implement other prefix
      : (final.none_ ??= []).push(value), final
  ), {} as Partial<HandlePrefix>);

  const eventName = attr.name.slice(3 /*ColonFor.Event*/);
  const cachedNamesPrefix = events[eventName]?.get(attr.ownerElement!);

  if (cachedNamesPrefix) {
    methodNamesPrefix.self_
      ?.forEach((cachedNamesPrefix.self_ ??= new Set()).add);
    // TODO: implement other prefix
    methodNamesPrefix.none_
      ?.forEach((cachedNamesPrefix.none_ ??= new Set()).add);
  } else {
    const cachedNamesWithPrefix: IntoSet<HandlePrefix> = {},
      dedupe = (names?: string[]) => names ? new Set(names) : names;

    cachedNamesWithPrefix.self_ = dedupe(methodNamesPrefix.self_);
    // TODO: implement other prefix
    cachedNamesWithPrefix.none_ = dedupe(methodNamesPrefix.none_);

    (events[eventName] ??= new Map())
      .set(attr.ownerElement!, cachedNamesWithPrefix);
  }
}

const config = { // default behaviour
  passive: true,
  capture: true,
} satisfies AddEventListenerOptions;

export function listen(scope: ShadowRoot, script: Instance) {
  Object.entries(events).forEach(([event, targetMap]) => {
    let cancel = () => {};
    const handle = (node: Node, methods: Set<string>, options = config) =>
      methods.size && node.addEventListener(
        event,
        (e: Event) => {
          // TODO: e.preventDefault() if <tag :: on:event="stealth:method">
          // TODO: allow propagation if <tag :: on:event="bubble:method">
          e.stopImmediatePropagation(); // TODO: switch to e.stopPropagation() if script bind to <tag :="">
          cancel();
          const render = task.prepare(() => {
            setCurrentEvent(e);
            methods.forEach((methodName) =>
              (script[methodName] as VoidFunction)()
            );
          });
          cancel = render()!;
          setCurrentEvent(null);
        },
        options,
      );

    targetMap.forEach((prefix, element) => {
      if (prefix.self_) handle(scope, prefix.self_);
      // TODO: implement other prefix
      if (prefix.none_) handle(element, prefix.none_);
    });
    targetMap.clear();
  });
}

type IntoSet<R> = {
  [k in keyof R]: R[k] extends ArrayLike<infer T> | infer U ? Set<T> | U
    : R[k];
};
