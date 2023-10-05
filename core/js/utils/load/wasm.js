/// <reference types="./wasm.d.ts" />
/** @typedef {import("./wasm.js")} $ */

/** @type $["exports"] */
const exports = (instance) => instance.exports;

/** @type $["instantiate"] */
export const instantiate = (url, imports) =>
  WebAssembly.instantiateStreaming(fetch(url), imports).then((wasm) =>
    exports(wasm.instance)
  );

/** @type $["compile"] */
export const compile = (url, imports) =>
  WebAssembly.compileStreaming(fetch(url))
    .then((module) =>
      WebAssembly.instantiate(
        module,
        typeof imports === "function"
          ? imports(
            () => WebAssembly.Module.imports(module),
            () => WebAssembly.Module.exports(module),
          )
          : imports,
      )
    )
    .then(exports);
