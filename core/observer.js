/** @typedef {import("./bind.js")["default"]} _bindFn */
/** @typedef {import("./query.js").Queue} _query$Queue */

import * as Flags from "./constant/flags.js";

/** @type WeakMap<Element, [ShadowRoot, _query$Queue]> */
const registry = new WeakMap();

let /** @type Promise<{bind_: _bindFn, features_: Parameters<_bindFn>[0]}> */ module;

/** fetch and run module runtime for binding along with user linked modules then bind all linked modules
@param shadow{ShadowRoot}
@param queue{_query$Queue}
*/ function lazyBind(shadow, queue) {
  //@ts-ignore BUG(typescript): can't narrow type in Promise.all().then(...)
  const { scripts_ } = queue.module_;
  if (scripts_) {
    import("./registry.js");
    if (queue.flags_ & (Flags.hasBinding | Flags.hasListener)) {
      import("./task.js");
    }

    //@ts-ignore BUG(typescript): can't narrow type in Promise.all().then(...)
    module ??= Promise.all([
      // tree-shake dynamic import https://parceljs.org/features/code-splitting/#tree-shaking
      import("./bind.js").then((module) => module.default),
      queue.flags_ & Flags.hasBinding &&
        import("./accessor.js").then((module) => [
          module.override,
          module.infer,
        ]),
      queue.flags_ & Flags.hasListener &&
        import("./listener.js").then((module) => [module.queue, module.listen]),
    ]).then(([bind_, ...features_]) => ({ bind_, features_ }));

    scripts_.forEach(async (script) =>
      import(script).then(
        (await module).bind_((await module).features_, queue.attrs_, shadow),
      ),
    );
  }
}

const viewport = new IntersectionObserver((entries) =>
  entries.forEach((scope) => {
    if (scope.isIntersecting) {
      const host = scope.target;
      lazyBind(.../** @type [ShadowRoot, _query$Queue] */ (registry.get(host)));
      registry.delete(host);
      viewport.unobserve(host);
    }
  }),
);

/** observe viewport intersection
@link https://web.dev/intersectionobserver-v2/
@param shadow{ShadowRoot}
@param queue{_query$Queue}
*/ export function inview(shadow, queue) {
  const host = shadow.host,
    rect = host.getBoundingClientRect();
  if (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= innerHeight &&
    rect.right <= innerWidth
  ) {
    // is in viewport (sync)
    lazyBind(shadow, queue);
  } else {
    registry.set(host, [shadow, queue]);
    viewport.observe(host); // async might reduce TTI when `rel=modulepreload`
  }
}

/** observe true visibility
@link https://web.dev/intersectionobserver-v2/
@param shadow{ShadowRoot}
@param queue{_query$Queue}
*/
// deno-lint-ignore no-unused-vars
export function visible(shadow, queue) {}
