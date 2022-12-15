import type bind from "./bind.ts";
import { type Attribute, Flags } from "./query.ts";

type Args = Parameters<typeof lazyBind>;
const registry = new WeakMap<Element, Args>();

let module: Promise<{
  _bind: typeof bind;
  _features: Parameters<typeof bind>[1];
}>;

function lazyBind(
  shadow: ShadowRoot,
  scripts: string[],
  attrs: Attribute[],
  feature: Flags,
) { //@ts-ignore BUG(typescript): can't narrow type in Promise.all().then(...)
  module ??= Promise.all([ // tree-shake dynamic import https://parceljs.org/features/code-splitting/#tree-shaking
    import("./bind.ts")
      .then((module) => module.default),
    (feature & Flags.hasListener) && import("./listener.ts")
      .then((module) => [module.queue, module.listen]),
  ]).then(([_bind, ..._features]) => ({ _bind, _features }));

  // BUG(esbuild): can't bundle import() as single module
  // TODO: import("./runtime.ts"); // preload task.ts and registry.ts

  scripts.forEach(async (script) =>
    import(script).then(
      ((await module)._bind)(
        [attrs, shadow],
        (await module)._features,
      ),
    )
  );
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
*/ export function inview(...args: Args) {
  const host = args[0].host;
  const rect = host.getBoundingClientRect();
  if (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= innerHeight &&
    rect.right <= innerWidth
  ) { // is in viewport (sync)
    lazyBind(...args);
  } else {
    registry.set(host, args);
    viewport.observe(host); // async might reduce TTI when `rel=modulepreload`
  }
}

/** observe true visibility
@see https://web.dev/intersectionobserver-v2/
*/ export function visible(...args: Args) {}
