/// <reference types="./observer.d.ts" />
/** @typedef {import("./observer.js")} $ */
/** @typedef {import("./query.js").Queue} Queue */
import { Flags, Wasm } from "./constant.js";
import * as load from "./utils/load.js";

/** @type $["registry"] */
const registry = new WeakMap();

/** @type $["module"] */
let module; // Promise

/** @type $["lazyBind"] */
function lazyBind(shadow, queue) {
  const { js_, wasm_ } = queue.module_;
  if (wasm_ || js_) {
    import("./registry.js");
    if (queue.flags_ & (Flags.hasBinding | Flags.hasListener)) {
      import("./utils/task.js");
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
  }
  if (wasm_) {
    wasm_.forEach(async (url) =>
      load.wasm.compile(url, async (getImports) => {
        const imports = new Set(
          getImports()
            .flatMap((the) => the.module === "nusa" ? [the.name] : []),
        );
        if (imports.size) {
          const nusa = /** @type WebAssembly.ModuleImports */ ({});
          const queue = /** @type Promise<unknown>[] */ ([]);
          const insertIfHas = /** @type $["__lazyBind__"]["insertIf"] */
            (importName, loadWasm) => {
              if (imports.has(importName)) {
                queue.push(
                  loadWasm().then((require) => {
                    for (const importName in require) {
                      nusa[importName] = require[importName];
                    }
                  }),
                );
              }
            };
          for (const dt of Wasm.dataTypes) {
            for (const mod of Wasm.modNames) {
              insertIfHas(`${dt}.${mod}.noop`, Wasm.load[dt][mod]);
              insertIfHas(`${dt}.${mod}.noop`, Wasm.load[dt][mod]);
              insertIfHas(`${dt}.${mod}.noop`, Wasm.load[dt][mod]);
            }
          }
          await Promise.all(queue);
          return { nusa };
        } else return /** @type {{}} */ ({});
      })().then( // TODO: update ./bind.js
        (await module).bind_((await module).features_, queue.attrs_, shadow),
      )
    );
  }
  if (js_) {
    js_.forEach(async (url) =>
      import(url).then(
        (await module).bind_((await module).features_, queue.attrs_, shadow),
      )
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
  })
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
