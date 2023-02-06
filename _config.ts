import babel from "drsensor/lume-plugins/babel.ts";
import { type Options as BuildOptions } from "lume/plugins/esbuild.ts";
import source_maps from "lume/plugins/source_maps.ts";
import minify_html from "lume/plugins/minify_html.ts";
import minify_css from "lume/plugins/lightningcss.ts";
import svgo from "lume/plugins/svgo.ts";

import code_highlight from "lume/plugins/code_highlight.ts";
import javascript from "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/es/languages/javascript.min.js";
import django from "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets/es/languages/django.min.js";

import importmap from "./_plugins/importmap.ts";
import bundler, { BuildConfig } from "./_plugins/bundler.ts";

import * as babel_importmap from "npm:babel-plugin-import-map";
import npm from "./package.json" assert { type: "json" };

import lume from "lume/mod.ts";
import Server from "lume/core/server.ts";

let isMangle;
const keep_whitespace = {
  minify: false,
  minifySyntax: true,
  minifyIdentifiers: isMangle = !Deno.env.get("NO_MANGLE"),
  minifyWhitespace: false,
} satisfies BuildOptions["options"];

import type { Queue } from "./core/query.ts";
import type { Binder } from "./core/registry.ts";
const conf = {
  ...Deno.env.get("KEEP_WHITESPACE") || !keep_whitespace.minifyIdentifiers
    ? keep_whitespace
    : { minify: isMangle = true },
  keepNames: false,
  mangleProps: isMangle ? /[^_]_$/ : undefined,
  mangleCache: {
    attrs_: "a",
    flags_: "f",
    module_: "m",
    scripts_: "j",
    styles_: "c",
    props_: "p",
    events_: "e",
    databank_: "d",
    targets_: "t",
    dedupeRender_: "r",
  } satisfies Partial<
    Record<
      | keyof Queue
      | keyof Queue["module_"]
      | keyof Queue["attrs_"]
      | keyof Binder,
      string
    >
  >,
} satisfies BuildConfig;

const site = lume({}, { search: { returnPageData: true } });

site.script("test", async () => {
  await site.build();
  const server = new Server({ port: 3000, root: "_site" });
  server.start();
  const exit = await Deno.run({ cmd: ["deno", "task", "test"] }).status();
  server.stop();
  Deno.exit(exit.code);
});

import { basename } from "deno/path/mod.ts";
export default site
  .remoteFile(
    "missing.css",
    "https://cdn.jsdelivr.net/npm/missing.css/dist/missing.min.css",
  )
  .remoteFile(
    "missing/tabs.js",
    "https://cdn.jsdelivr.net/npm/missing.css/dist/missing-js/tabs.js/+esm",
  )
  // TODO: add monospace fonts
  .remoteFile(
    "highlight/light.css",
    "https://cdn.jsdelivr.net/npm/highlight.js/styles/foundation.css",
  )
  .remoteFile(
    "highlight/dark.css",
    "https://cdn.jsdelivr.net/npm/highlight.js/styles/base16/zenburn.css",
  )
  .loadAssets([".svg"])
  .ignore("core", "nusa")
  .ignore("utils.ts", "demo/tester.ts", (path) => path.endsWith("test.ts"))
  .scopedUpdates((path) => !basename(path).startsWith("_"))
  .use(code_highlight({ languages: { javascript, njk: django } }))
  .use(importmap({ npm }))
  .use(babel({ plugins: [babel_importmap.plugin()] }))
  .use(svgo({
    options: {
      plugins: [{
        name: "preset-default",
        params: { overrides: { inlineStyles: false } },
      }],
    },
  }))
  .use(minify_css())
  .use(bundler(conf, npm.name))
  .use(minify_html())
  .use(source_maps());
