import type { Site } from "lume/core.ts";
import { join } from "deno/path/mod.ts";
import { copy, emptyDir, expandGlob } from "deno/fs/mod.ts";

import { type Options as BuildOptions } from "lume/plugins/esbuild.ts";
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

export type BuildConfig = BuildOptions["options"];

export default (conf: BuildConfig, pkgPath: string) => (site: Site) => {
  const config: BuildConfig = {
    outdir: join(site.options.dest, pkgPath),
    format: "esm",
    target: "esnext",
    platform: "browser",
  };
  config.bundle = config.minify = true;
  Object.assign(config, conf);

  site.copy("package.json", "nusa/package.json")
    .addEventListener("beforeUpdate", () => (
      config.watch = config.incremental = true, void build()
    ))
    .addEventListener("beforeBuild", () => (
      justBundling = false, void build()
    ));

  let justBundling = true;
  const build =
    async () => (config.sourcemap = "linked",
      entries.size || await populateEntries(),
      site.run("bundle"));

  const populateEntries = async () => {
    if (config.entryPoints) {
      for (const path of Object.values(config.entryPoints)) {
        entries.set(path, "import");
      }
    } else {
      for await (
        const { path } of expandGlob(
          `${pkgPath}/**/*.{js,ts,mjs,mts}`,
          { includeDirs: false },
        )
      ) entries.set(path, "import");
    }
  };
  const entries = new Map<string, "script" | "import">();
  site.hooks.importmapEntries?.(entries, ["script", "import"]);

  site.script("bundle", async () => {
    const [scripts, modules] = [...entries.entries()].reduce(
      (final, [path, kind]) => (
        final[kind === "script" ? 0 : 1].push(path), final
      ),
      [[], []] as [string[], string[]],
    );
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
          // @ts-ignore: npm:rollup-plugin-esbuild doesn't provide type declaration
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
      content = '"use strict";' + "(function(){" + whitespace + content;
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
};
