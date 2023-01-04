import modify_urls from "lume/plugins/modify_urls.ts";
import babel from "drsensor/lume-plugins/babel.ts";
import { type Options as BuildOptions } from "lume/plugins/esbuild.ts";
import source_maps from "lume/plugins/source_maps.ts";
import minify_html from "lume/plugins/minify_html.ts";

import * as es from "esbuild";
// TODO: try https://github.com/sanyuan0704/vite-plugin-chunk-split
/* TODO: create rollup-plugin-swc-wasm based on:
https://github.com/egoist/unplugin-swc
  or
https://github.com/SukkaW/rollup-plugin-swc
  or
make PR to rollup-plugin-swc3 to support wasm
*/
import { type OutputOptions, rollup, type RollupOptions } from "rollup";
import sucrase from "rollup/plugin-sucrase";
import esbuild from "rollup/plugin-esbuild";
import { swc } from "rollup/plugin-swc";
import terser from "rollup/plugin-terser";

import { join } from "deno/path/mod.ts";
import { copy, emptyDir, type WalkEntry } from "deno/fs/mod.ts";
import lume from "lume/mod.ts";
import Server from "lume/core/server.ts";

const keep_whitespace = {
  minify: false,
  minifySyntax: true,
  minifyIdentifiers: !Deno.env.get("NO_MANGLE"),
  minifyWhitespace: false,
} satisfies BuildOptions["options"];

const conf = {
  ...Deno.env.get("KEEP_WHITESPACE") || !keep_whitespace.minifyIdentifiers
    ? keep_whitespace
    : { minify: true },
  mangleProps: /^_/,
  keepNames: false,
} satisfies BuildOptions["options"];

const CI = Deno.env.get("CI");
const site = lume();

site.script("test", async () => {
  await site.build();
  const server = new Server({ port: 3000, root: site.dest() });
  server.start();
  const exit = await Deno.run({ cmd: ["deno", "task", "test"] }).status();
  server.stop();
  Deno.exit(exit.code);
});

export default site
  .ignore("core", "nusa", "demo/tester.ts", (path) => path.endsWith("test.ts"))
  .scopedUpdates((path) => path.endsWith(".ts") && !path.startsWith("_"))
  .use(modify_urls({ fn: (url) => url.startsWith("nusa") ? `/${url}` : url }))
  .use(babel())
  // .use(esbuild({ extensions: [".mts"], options: { ...conf, splitting: true } }))
  // .use(esbuild({ extensions: [".ts"], options: conf }))
  .use(minify_html())
  .use(source_maps())
  .use((site) => { // BUG(lume): currently they skip over symlinks https://github.com/lumeland/lume/blob/master/core/source.ts#L334-L336
    const config: Parameters<typeof es.build>[0] = {
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
    site.addEventListener("beforeBuild", () => void (justBundling = false));
    site.addEventListener("beforeBuild", "bundle");
    if (!CI) site.addEventListener("beforeSave", () => done?.then(es.stop));

    let done: Promise<unknown> | undefined, justBundling = true;
    site.script("bundle", async () => {
      const scripts: string[] = [], modules: string[] = [];
      // BUG(deno): `walk` and `expandsGlob` must not skip over symlinks
      // for await (const entry of walk("nusa", { includeDirs: false, exts: [".ts", ".mts"] })) {
      //                           OR
      // for await (const entry of expandGlob("nusa/**/*.{,m}ts")) {
      //
      for await (const entry of allFilesIn("nusa")) {
        if (entry.name.endsWith(".ts")) scripts.push(entry.path);
        else if (entry.name.endsWith(".mts")) modules.push(entry.path);
      }
      await emptyDir(config.outdir!);

      if (CI) {
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
            generatedCode: {
              constBindings: true,
              objectShorthand: true,
            },
            compact: config.minify,
          } satisfies OutputOptions,
        };
        await Promise.all([
          rollup({
            ...cfg.input,
            external: modules.map((path) =>
              path.replace("nusa/", "./").replace(".mts", ".js")
            ),
            input: scripts,
            preserveEntrySignatures: false,
          }).then((build) => build.write({ ...cfg.output, format: "iife" })),
          rollup({
            ...cfg.input,
            input: modules,
            preserveEntrySignatures: "allow-extension",
          }).then((build) => build.write({ ...cfg.output, format: "module" })),
        ]);
      } else {
        done = Promise.all([
          es.build({ ...config, entryPoints: scripts }),
          es.build({ ...config, entryPoints: modules, splitting: true }),
        ]);
      }

      if (justBundling) {
        await done?.then(es.stop);
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

/** this is just a workaround until https://github.com/denoland/deno_std/issues/1359 fixed */
async function* allFilesIn(root: string): AsyncIterableIterator<WalkEntry> {
  for await (const entry of Deno.readDir(root)) {
    if (entry.isSymlink) {
      const realPath = await Deno.realPath(join(root, entry.name));
      if ((await Deno.lstat(realPath)).isDirectory) {
        yield* allFilesIn(realPath);
        continue;
      }
    }
    if (entry.isDirectory) {
      yield* allFilesIn(join(root, entry.name));
      continue;
    }
    const result = { ...entry } as WalkEntry;
    result.path = join(root, entry.name);
    yield result;
  }
}
