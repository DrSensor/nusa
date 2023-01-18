import type bind from "./bind.ts";
import { type Queue } from "./query.ts";

import * as Flags from "./constant/flags.ts";

const registry = new WeakMap<Element, [ShadowRoot, Queue]>();

let module: Promise<{
  bind_: typeof bind;
  features_: Parameters<typeof bind>[0];
}>;

function lazyBind(shadow: ShadowRoot, queue: Queue) { //@ts-ignore BUG(typescript): can't narrow type in Promise.all().then(...)
  const { scripts_ } = queue.module_;
  if (scripts_) {
    import("./registry.ts");
    if (queue.flags_ & (Flags.hasBinding | Flags.hasListener)) {
      import("./task.ts");
    }

    //@ts-ignore BUG(typescript): can't narrow type in Promise.all().then(...)
    module ??= Promise.all([ // tree-shake dynamic import https://parceljs.org/features/code-splitting/#tree-shaking
      import("./bind.ts")
        .then((module) => module.default),
      (queue.flags_ & Flags.hasBinding) && import("./accessor.ts")
        .then((module) => [module.override, module.infer]),
      (queue.flags_ & Flags.hasListener) && import("./listener.ts")
        .then((module) => [module.queue, module.listen]),
    ]).then(([bind_, ...features_]) => ({ bind_, features_ }));

    scripts_.forEach(async (script) =>
      import(script).then(
        ((await module).bind_)(
          (await module).features_,
          queue.attrs_,
          shadow,
        ),
      )
    );
  }
}

const viewport = new IntersectionObserver((entries) =>
  entries.forEach((scope) => {
    if (scope.isIntersecting) {
      const host = scope.target;
      lazyBind(...registry.get(host)!);
      registry.delete(host);
      viewport.unobserve(host);
    }
  })
);

/** observe viewport intersection
@see https://web.dev/intersectionobserver-v2/
*/ export function inview(shadow: ShadowRoot, queue: Queue) {
  const host = shadow.host, rect = host.getBoundingClientRect();
  if (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= innerHeight &&
    rect.right <= innerWidth
  ) { // is in viewport (sync)
    lazyBind(shadow, queue);
  } else {
    registry.set(host, [shadow, queue]);
    viewport.observe(host); // async might reduce TTI when `rel=modulepreload`
  }
}

/** observe true visibility
@see https://web.dev/intersectionobserver-v2/
*/
// deno-lint-ignore no-unused-vars
export function visible(shadow: ShadowRoot, queue: Queue) {}
