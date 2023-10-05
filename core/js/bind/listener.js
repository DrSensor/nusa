/// <reference types="./listener.d.ts" />
/** @typedef {import("./listener.js")} $ */
/** @typedef {import("./listener.js").HandlePrefix} HandlePrefix */
/** @template T
    @typedef {import("../types.d.ts").IntoSet<T>} IntoSet */
import { AttrPrefix as attrprefix, Mod } from "../constant.js";
import { setCurrentEvent } from "../registry.js";
import * as task from "../utils/task.js";

/** @type $["queue"] */
export function queue(attr) {
  const methodNamesPrefix = attr.value.split(" ").reduce((final, value) => {
    if (value.startsWith(Mod.CaptureSelf)) {
      final.self_ ??= [];
      final.self_.push(value.slice(Mod.CaptureSelf.length));
    } else {
      // TODO: implement other prefix
      final.none_ ??= [];
      final.none_.push(value);
    }
    return final;
  }, /** @type Partial<HandlePrefix> */ ({}));

  const eventName = attr.name.slice(attrprefix.listener.length);
  const cachedNamesPrefix = events[eventName]?.get(
    /** @type Element */ (attr.ownerElement),
  );

  if (cachedNamesPrefix) {
    if (methodNamesPrefix.self_) {
      cachedNamesPrefix.self_ ??= new Set();
      methodNamesPrefix.self_.forEach(cachedNamesPrefix.self_.add);
    }
    if (methodNamesPrefix.none_) {
      cachedNamesPrefix.none_ ??= new Set();
      cachedNamesPrefix.none_.forEach(cachedNamesPrefix.none_.add);
    }
    // TODO: implement other prefix
  } else {
    const /** @type IntoSet<HandlePrefix> */ cachedNamesWithPrefix = {};
    const dedupe = /** @param names{string[]=} */ (names) =>
      names ? new Set(names) : names;

    cachedNamesWithPrefix.self_ = dedupe(methodNamesPrefix.self_);
    cachedNamesWithPrefix.none_ = dedupe(methodNamesPrefix.none_);
    // TODO: implement other prefix
    events[eventName] ??= new Map();
    events[eventName].set(
      /** @type Element */ (attr.ownerElement),
      cachedNamesWithPrefix,
    );
  }
}

/** @type $["events"] */
const events = {};

/** @type $["config"] */
const config = {
  passive: true,
  capture: true,
};

/** @type $["listen"] */
export function listen(scope, script) {
  Object.entries(events).forEach(([event, targetMap]) => {
    let cancel = () => {};

    /** @type $["__listen__"]["handle"] */
    const handle = (node, methods, options = config) => {
      if (methods.size) {
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
                /** @type VoidFunction */ (script[methodName])()
              );
            });
            cancel = /** @type {() => VoidFunction} */ (render());
            setCurrentEvent(null);
          },
          options,
        );
      }
    };

    targetMap.forEach((prefix, element) => {
      if (prefix.self_) handle(scope, prefix.self_);
      if (prefix.none_) handle(element, prefix.none_);
      // TODO: implement other prefix
    });
    targetMap.clear();
  });
}
