/// <reference types="./wasm.d.ts" />
/** @typedef {import("./wasm.js")} $ */

/** @type $["cache"] */
const cache = {};

/** @type $["exports"] */
const exports = (instance) => instance.exports;

/** @type $["instantiate"] */
export const instantiate = (url, imports) => async () => // @ts-expect-error auto url.toString()
  cache[url] ??= await WebAssembly.instantiateStreaming(fetch(url), imports)
    .then((wasm) => exports(wasm.instance));

/** @type $["compile"] */
export const compile = (url, imports) => async () => // @ts-expect-error auto url.toString()
  cache[url] ??= await WebAssembly.compileStreaming(fetch(url))
    .then(async (module) =>
      WebAssembly.instantiate(
        module,
        typeof imports === "function"
          ? await imports(
            () => WebAssembly.Module.imports(module),
            () => WebAssembly.Module.exports(module),
          )
          : imports,
      )
    )
    .then(exports);
