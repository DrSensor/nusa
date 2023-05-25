/** @type {import("npm:rollup").RollupOptions} */
export default {
  input: {
    "nusa/render-scope": "elements/render-scope.js",

    "libnusa/__exports__": "libs/javascript/__exports__.js",
    "libnusa/current": "libs/javascript/current.js",
    "libnusa/iterate": "libs/javascript/iterate.js",
  },
  output: {
    chunkFileNames: "runtime/[name].js",
  },
};
