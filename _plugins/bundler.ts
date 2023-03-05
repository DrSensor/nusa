import type { Site } from "lume/core.ts";
import { basename, join } from "deno/path/mod.ts";
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

  let cache: RollupOptions["cache"] | undefined = false;
  site.copy("package.json", join(pkgPath, "package.json"))
    .addEventListener("afterStartServer", () => {
      cache = undefined; // enable cache
    })
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
  site.hooks.importmapEntries?.(entries, ["script", "import"]); // BUG: only works on `deno task build`, mean that `deno task ci:bundle` will fail

  site.script("bundle", async () => {
    const [scripts, modules] = [...entries.entries()].reduce(
      (final, [path, kind]) => (
        final[kind === "script" ? 0 : 1].push(path), final
      ),
      [[], []] as [string[], string[]],
    );
    const nonModules = new Set(scripts.map((path) => basename(path, ".ts")));
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
          /* WARNING: enable sucrase only when there is *.mts since rollup-plugin-esbuild not process them (most likely a bug cuz in the past typescript doesn't acknowledge .mts)
          sucrase({ // TODO: try SWC 🤔
            transforms: ["typescript"],
            disableESTransforms: true,
          }),
          */
          /* BUG(deno): something wrong when using node:worker_threads
                  error: Uncaught (in worker "$DENO_STD_NODE_WORKER_THREAD") Top-level await promise never resolved
                    [{ threadId, workerData, environmentData }] = await once(
                                                                  ^
                      at <anonymous> (https://deno.land/std@0.168.0/node/worker_threads.ts:178:49)
                  error: Uncaught Error: Unhandled error in child worker.
                      at Worker.#pollControl (deno:runtime/js/11_workers.js:155:21)
              */
          // config.minify ? terser(),
          // TODO: emit *.d.ts based on package.json#exports.*.types using https://github.com/Swatinem/rollup-plugin-dts
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
      cache,
      input: modules.concat(scripts), // BUG: `scripts` might be empty because `hooks.importmapEntries` only executed at `deno task build`
      preserveEntrySignatures: "allow-extension",
    });
    if (cache !== false) cache = build.cache;

    const gen = await build.generate(cfg.output);
    for (const output of gen.output) {
      const outputPath = join(config.outdir!, output.fileName);
      const bugs = ["current.js"] as const;
      switch (output.type) {
        case "chunk": {
          let code = output.code;
          if (nonModules.has(output.name)) {
            code = '"use strict";' + "(function(){" + whitespace + code;
            if (config.sourcemap) {
              code = code.replace(
                "\n//# sourceMappingURL",
                whitespace + "})()" + "\n//# sourceMappingURL",
              );
            } else {
              code = code.slice(0, code.at(-2) === ";" ? -2 : -1);
              code += whitespace + "})()" + "\n";
            }
          }
          if (output.fileName === bugs[0]) {
            const hash = code.match(/import.*from".\/registry-(.*).js/)![1];
            code = `export{event,value}from"./registry-${hash}.js";\n` +
              (config.sourcemap
                ? `//# sourceMappingURL=registry-${hash}.js.map\n`
                : "");
          }
          Deno.writeTextFile(outputPath, code); // TODO: remove this and use site.processAll()
          break;
        }
        case "asset": {
          const asset = output.source;
          // TODO: remove this and use site.processAll()
          if (typeof asset === "string") Deno.writeTextFile(outputPath, asset);
          else Deno.writeFile(outputPath, asset);
          break;
        }
      }
    }

    if (justBundling) {
      copy("package.json", join(config.outdir!, "package.json"));
      console.log(`🔥 /${pkgPath}/package.json`);
    }
    console.log(`🔥 /${pkgPath}/*.js`);
    console.log(`🔥 /${pkgPath}/*/*.js`);
    if (config.sourcemap) {
      console.log(`🔥 /${pkgPath}/*.js.map`);
      console.log(`🔥 /${pkgPath}/*/*.js.map`);
    }
  });
};
