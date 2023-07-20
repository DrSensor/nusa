import main from "./nusa/package.json" assert { type: "json" };
import libs from "./libs/javascript/package.json" assert { type: "json" };
import core from "./core/js/package.json" assert { type: "json" };

/** @type {import("npm:rollup").RollupOptions} */
export default {
  input: {
    [`${main.name}/render-scope`]: "nusa/elements/render-scope.js",

    [`${libs.name}/__exports__`]: "libs/javascript/__exports__.js",
    [`${libs.name}/current`]: "libs/javascript/current.js",
    [`${libs.name}/iterate`]: "libs/javascript/iterate.js",
  },
  output: {
    chunkFileNames: `${core.name}/[name].js`,
    freeze: false,
    hoistTransitiveImports: false,
  },
  preserveEntrySignatures: "allow-extension",
};
