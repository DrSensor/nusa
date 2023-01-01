import modify_urls from "lume/plugins/modify_urls.ts";
import babel from "drsensor/lume-plugins/babel.ts";
import esbuild, { type Options as BuildOptions } from "lume/plugins/esbuild.ts";
import * as esbuild_js from "lume/deps/esbuild.ts";
import source_maps from "lume/plugins/source_maps.ts";
import minify_html from "lume/plugins/minify_html.ts";

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
  mangleProps: /^_/,
  keepNames: false,
  ...Deno.env.get("KEEP_WHITESPACE") || !keep_whitespace.minifyIdentifiers
    ? keep_whitespace
    : {},
} satisfies BuildOptions["options"];

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
    const { build, stop } = esbuild_js;
    const config: Parameters<typeof build>[0] = {
      outdir: join(site.options.dest, "nusa"),
      format: "esm",
      target: "esnext",
      platform: "browser",
    };
    config.bundle = config.minify = true;
    Object.assign(config, conf);

    site.copy("package.json", "nusa/package.json");
    site.addEventListener("afterStartServer", () => {
      config.watch = config.incremental = true;
      config.sourcemap = "linked";
      site.run("bundle");
    });
    site.addEventListener("beforeBuild", () => void (justBundling = false));
    site.addEventListener("beforeBuild", "bundle");
    site.addEventListener("beforeUpdate", "bundle");
    site.addEventListener("beforeSave", () => done.then(stop));

    let done: Promise<unknown>, justBundling = true;
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
      done = Promise.all([
        build({ ...config, entryPoints: scripts }),
        build({ ...config, entryPoints: modules, splitting: true }),
      ]);
      if (justBundling) {
        copy("package.json", join(config.outdir!, "package.json"));
        await done.then(stop);
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
