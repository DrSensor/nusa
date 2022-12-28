import type * as bind from "./bind.ts";
import type * as accessor from "./accessor.ts";
import type * as listener from "./listener.ts";
import { type Attribute, Flags } from "./query.ts";

type Args = Parameters<typeof lazyBind>;
const registry = new WeakMap<Element, Args>();

let module: Promise<{
  _bind: typeof bind.default;
  _features: Parameters<typeof bind.default>[1];
}>;

const enum lazy {
  "./bind.ts" = "./lazy/bind.js",
  "./accessor.ts" = "./lazy/accessor.js",
  "./listener.ts" = "./lazy/listener.js",
}

function lazyBind(
  shadow: ShadowRoot,
  scripts: string[],
  attrs: Attribute[],
  feature: Flags,
) { //@ts-ignore BUG(typescript): can't narrow type in Promise.all().then(...)
  module ??= Promise.all([ // tree-shake dynamic import https://parceljs.org/features/code-splitting/#tree-shaking
    import(lazy["./bind.ts"])
      .then((module: typeof bind) => module.default),
    (feature & Flags.hasBinding) && import(lazy["./accessor.ts"])
      .then((module: typeof accessor) => [module.override, module.infer]),
    (feature & Flags.hasListener) && import(lazy["./listener.ts"])
      .then((module: typeof listener) => [module.queue, module.listen]),
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
