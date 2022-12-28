import modify_urls from "lume/plugins/modify_urls.ts";
import babel from "drsensor/lume-plugins/babel.ts";
import esbuild, { type Options as BuildOptions } from "lume/plugins/esbuild.ts";
import * as esbuild_js from "lume/deps/esbuild.ts";
import source_maps from "lume/plugins/source_maps.ts";
import minify_html from "lume/plugins/minify_html.ts";

import * as path from "deno/path/mod.ts";
import { expandGlob, walk, type WalkEntry } from "deno/fs/mod.ts";
import lume from "lume/mod.ts";

const keep_whitespace = {
  minify: false,
  minifySyntax: true,
  minifyIdentifiers: !Deno.env.get("NO_MANGLE"),
  minifyWhitespace: false,
} satisfies BuildOptions["options"];

const conf = {
  mangleProps: /^_/,
  keepNames: false,
  ...Deno.env.get("KEEP_WHITESPACE") || !keep_whitespace.minifyIdentifiers
    ? keep_whitespace
    : {},
} satisfies BuildOptions["options"];

export default lume()
  .ignore("core", "nusa", "demo/tester.ts", (path) => path.endsWith("test.ts"))
  .scopedUpdates((path) => path.endsWith(".ts") && !path.startsWith("_"))
  .use(modify_urls({ fn: (url) => url.startsWith("nusa") ? `/${url}` : url }))
  .use(babel())
  .use(esbuild({ extensions: [".mts"], options: { ...conf, splitting: true } }))
  .use(esbuild({ extensions: [".ts"], options: conf }))
  .use(minify_html())
  .use(source_maps())
  .use((site) => { // BUG(lume): currently they skip over symlinks https://github.com/lumeland/lume/blob/master/core/source.ts#L334-L336
    const { build, stop } = esbuild_js;
    const config: Parameters<typeof build>[0] = {
      outdir: path.join(site.options.dest, "nusa"),
      format: "esm",
      target: "esnext",
      platform: "browser",
    };
    config.bundle = config.minify = true;
    Object.assign(config, conf);

    site.addEventListener("beforeBuild", bundleScript());
    site.addEventListener("beforeUpdate", bundleScript(true));
    site.addEventListener("beforeSave", () => done.then(stop));

    let done: Promise<unknown>;
    function bundleScript(watch?: true) {
      if (watch) {
        config.watch = config.incremental = true;
        config.sourcemap = "linked";
      }
      return async () => {
        if (watch) await Deno.remove(config.outdir!, { recursive: true });
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
        done = Promise.all([
          build({ ...config, entryPoints: scripts }),
          build({ ...config, entryPoints: modules, splitting: true }),
        ]);
      };
    }
  });

/** this is just a workaround until https://github.com/denoland/deno_std/issues/1359 fixed */
async function* allFilesIn(root: string): AsyncIterableIterator<WalkEntry> {
  for await (const entry of Deno.readDir(root)) {
    if (entry.isSymlink) {
      const realPath = await Deno.realPath(path.join(root, entry.name));
      if ((await Deno.lstat(realPath)).isDirectory) {
        yield* allFilesIn(realPath);
        continue;
      }
    }
    if (entry.isDirectory) {
      yield* allFilesIn(path.join(root, entry.name));
      continue;
    }
    const result = { ...entry } as WalkEntry;
    result.path = path.join(root, entry.name);
    yield result;
  }
}
