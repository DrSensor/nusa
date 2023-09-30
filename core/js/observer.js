/// <reference types="./observer.d.ts" />
/** @typedef {import("./observer.js")} $ */
/** @typedef {import("./query.js").Queue} Queue */
import { Flags } from "./constant.js";

/** @type $["registry"] */
const registry = new WeakMap();

/** @type $["module"] */
let module; // Promise

/** @type $["lazyBind"] */
function lazyBind(shadow, queue) {
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
        import("./bind/accessor.js").then((module) => [
          module.override,
          module.infer,
        ]),
      queue.flags_ & Flags.hasListener &&
        import("./bind/listener.js").then((module) => [
          module.queue,
          module.listen,
        ]),
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
      lazyBind(.../** @type [ShadowRoot, Queue] */ (registry.get(host)));
      registry.delete(host);
      viewport.unobserve(host);
    }
  }),
);

/** @type $["inview"] */
export function inview(shadow, queue) {
  const host = shadow.host;
  const rect = host.getBoundingClientRect();
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

/** @type $["visible"] */
export function visible(_shadow, _queue) {}
