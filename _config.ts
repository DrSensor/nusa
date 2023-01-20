import babel from "drsensor/lume-plugins/babel.ts";
import { type Options as BuildOptions } from "lume/plugins/esbuild.ts";
import source_maps from "lume/plugins/source_maps.ts";
import minify_html from "lume/plugins/minify_html.ts";
import minify_css from "lume/plugins/lightningcss.ts";
import svgo from "lume/plugins/svgo.ts";

// import routes from "lume/middlewares/redirects.ts";
import * as babel_importmap from "npm:babel-plugin-import-map";
import modify_urls from "lume/plugins/modify_urls.ts";

// TODO: try https://github.com/sanyuan0704/vite-plugin-chunk-split
/* TODO: create rollup-plugin-swc-wasm based on:
https://github.com/egoist/unplugin-swc
  or
https://github.com/SukkaW/rollup-plugin-swc
  or
make PR to rollup-plugin-swc3 to support wasm
*/
import { type OutputOptions, rollup, type RollupOptions } from "rollup"; // BUG(bundle): try Parcel! Rollup heuristics doesn't look great. It doesn't inline all `const` in constant/colon.ts
import sucrase from "rollup/plugin-sucrase";
import esbuild from "rollup/plugin-esbuild";
// import { swc } from "rollup/plugin-swc";
// import terser from "rollup/plugin-terser";

import { basename, extname, isGlob, join, relative } from "deno/path/mod.ts";
import { copy, emptyDir, expandGlob, walk } from "deno/fs/mod.ts";
import lume from "lume/mod.ts";
import Server from "lume/core/server.ts";

const singleStarFiles = {
  globstar: false,
  extended: false,
  includeDirs: false,
} satisfies Parameters<typeof expandGlob>[1];

let isMangle;
const keep_whitespace = {
  minify: false,
  minifySyntax: true,
  minifyIdentifiers: isMangle = !Deno.env.get("NO_MANGLE"),
  minifyWhitespace: false,
} satisfies BuildOptions["options"];

import type { Queue } from "./core/query.ts";
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
  } satisfies Partial<
    Record<
      | keyof Queue
      | keyof Queue["module_"]
      | keyof Queue["attrs_"],
      string
    >
  >,
} satisfies BuildOptions["options"];

const site = lume();

import npm from "./package.json" assert { type: "json" };
const redirects = await Object.entries(npm.exports).reduce(
  async (prev, [from, as]) => {
    const excludes = ["types", "sourcemap"];
    let to;
    for (const [kind, path] of Object.entries(as)) {
      if (excludes.some((it) => kind === it)) continue;
      to = join("/nusa", path);
      break;
    }
    if (to == null) return prev;
    from = join("nusa", from);
    const final = await prev;
    if (isGlob(from)) {
      for await (const { name, path } of expandGlob(from, singleStarFiles)) {
        final[relative(Deno.cwd(), path).slice(0, -extname(path).length)] = to
          .replace("*", basename(name, extname(name)));
      }
    } else final[from] = to;
    return final;
  },
  Promise.resolve({} as Record<string, string>),
);
// server.use(routes({ redirects })); //<-- not needed because babel_importmap and modify_urls will replace the url
babel_importmap.load([{ imports: redirects }]);
site.use(modify_urls({
  fn: (url) => url.startsWith("nusa") ? redirects[url] : url,
}));

site.script("test", async () => {
  await site.build();
  const server = new Server({ port: 3000, root: "_site" });
  server.start();
  const exit = await Deno.run({ cmd: ["deno", "task", "test"] }).status();
  server.stop();
  Deno.exit(exit.code);
});

export default site
  .loadAssets([".svg"])
  .ignore("core", "nusa", "demo/tester.ts", (path) => path.endsWith("test.ts"))
  .scopedUpdates((path) => path.endsWith(".ts") && !path.startsWith("_"))
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
  .use(minify_html())
  .use(source_maps())
  .use((site) => {
    const config: BuildOptions["options"] = {
      outdir: join(site.options.dest, "nusa"),
      format: "esm",
      target: "esnext",
      platform: "browser",
    };
    config.bundle = config.minify = true;
    Object.assign(config, conf);

    site.copy("package.json", "nusa/package.json");
    site.addEventListener("beforeUpdate", () => {
      config.watch = config.incremental = true;
      config.sourcemap = "linked";
      site.run("bundle");
    });
    site.addEventListener("beforeBuild", () => {
      justBundling = false;
      config.sourcemap = "linked";
      site.run("bundle");
    });

    let justBundling = true;
    site.script("bundle", async () => {
      const scripts: string[] = [], modules: string[] = [];

      for await (const entry of walk("nusa", { includeDirs: false })) {
        if (entry.name.endsWith(".ts")) scripts.push(entry.path);
        else if (entry.name.endsWith(".mts")) modules.push(entry.path);
      }
      await emptyDir(config.outdir!);

      const whitespace = config.minify || config.minifyWhitespace ? "" : "\n";
      const cfg = {
        input: {
          treeshake: {
            moduleSideEffects: false,
            unknownGlobalSideEffects: false,
            tryCatchDeoptimization: false,
            propertyReadSideEffects: false,
          },
          plugins: [
            sucrase({ // TODO: try SWC 🤔
              transforms: ["typescript"],
              disableESTransforms: true,
            }),
            /* BUG(deno): something wrong when using node:worker_threads
                  error: Uncaught (in worker "$DENO_STD_NODE_WORKER_THREAD") Top-level await promise never resolved
                    [{ threadId, workerData, environmentData }] = await once(
                                                                  ^
                      at <anonymous> (https://deno.land/std@0.168.0/node/worker_threads.ts:178:49)
                  error: Uncaught Error: Unhandled error in child worker.
                      at Worker.#pollControl (deno:runtime/js/11_workers.js:155:21)
              */
            // config.minify ? terser(),
            esbuild({
              ...conf,
              target: "esnext",
              // BUG(rollup-plugin-esbuild): can't handle import from *.mts
              // include: /\.[mc]?[jt]sx?$/,
              // loader: { ".mts": "ts", ".ts": "ts" },
              // resolveExtensions: [".ts", ".mts"],
            }),
          ],
        } satisfies RollupOptions,

        output: {
          dir: config.outdir,
          sourcemap: !!config.sourcemap,
          freeze: false,
          generatedCode: {
            constBindings: true,
            objectShorthand: true,
          },
          compact: config.minify,
          format: "es",
          externalLiveBindings: false,
          hoistTransitiveImports: false,
        } satisfies OutputOptions,
      };

      const build = await rollup({
        ...cfg.input,
        input: modules.concat(scripts),
        preserveEntrySignatures: "allow-extension",
      });

      await build.write(cfg.output);

      for (let file of scripts) {
        let content = await Deno.readTextFile(
          file = join(
            config.outdir!,
            file.slice("nusa/".length).slice(0, -".ts".length) + ".js",
          ),
        );
        content = "(function(){" + whitespace + content;
        if (config.sourcemap) {
          content = content.replace(
            "\n//# sourceMappingURL",
            whitespace + "})()" + "\n//# sourceMappingURL",
          );
        } else {
          content = content.slice(0, content.at(-2) === ";" ? -2 : -1);
          content += whitespace + "})()" + "\n";
        }
        Deno.writeTextFile(file, content);
      }

      {
        const bug = join(config.outdir!, "current.js");
        const content = await Deno.readTextFile(bug);
        const hash = content.match(/import.*from".\/registry-(.*).js/)![1];
        Deno.writeTextFile(
          bug,
          `export{event,value}from"./registry-${hash}.js";\n` +
            (config.sourcemap
              ? `//# sourceMappingURL=registry-${hash}.js.map\n`
              : ""),
        );
      }

      if (justBundling) {
        copy("package.json", join(config.outdir!, "package.json"));
        console.log("🔥 /nusa/package.json");
      }
      console.log("🔥 /nusa/*.js");
      console.log("🔥 /nusa/*/*.js");
      if (config.sourcemap) {
        console.log("🔥 /nusa/*.js.map");
        console.log("🔥 /nusa/*/*.js.map");
      }
    });
  });
