import type { Site } from "lume/core.ts";
import modify_urls from "lume/plugins/modify_urls.ts";
import * as babel_importmap from "npm:babel-plugin-import-map";
import { basename, extname, isGlob, join, relative } from "deno/path/mod.ts";
import { expandGlob } from "deno/fs/mod.ts";

interface Options {
  npm: {
    name: string;
    exports: Record<string, Record<string, string>>;
  };
}

const singleStarFiles = {
  globstar: false,
  extended: false,
  includeDirs: false,
} satisfies Parameters<typeof expandGlob>[1];

export default ({ npm }: Options, pkgPath = npm.name) => (site: Site) => {
  let entries: Map<string, string> | undefined, kinds: string[] | undefined;
  site.hooks.importmapEntries = (
    inputs: typeof entries,
    types: typeof kinds,
  ) => void (entries = inputs, kinds = types);

  let redirects: Record<string, string>;
  site.addEventListener("beforeBuild", async () => {
    redirects = await Object.entries(npm.exports).reduce(
      async (prev, [from, as]) => {
        const excludes = ["types", "sourcemap"];
        let to, type: string | undefined;
        for (const [kind, path] of Object.entries(as)) {
          if (excludes.some((it) => kind === it)) continue;
          if (kinds?.some((it) => it === kind)) type = kind;
          to = join(`/${pkgPath}`, path);
          break;
        }
        if (to == null) return prev;
        from = join(pkgPath, from);
        const final = await prev;
        const push = (exportsKey: string, path: string) => {
          if (!type) return;
          path = path.slice(1); // remove leading slash /
          if (exportsKey.endsWith("*")) {
            exportsKey = exportsKey.slice(0, -1);
            path = join(exportsKey, basename(path));
          }
          path = path.slice(0, -2) + "ts"; // replace .js with .ts
          entries?.set(path, type);
        };
        if (isGlob(from)) {
          for await (
            const { name, path } of expandGlob(from, singleStarFiles)
          ) {
            const src = to.replace("*", basename(name, extname(name)));
            const link = relative(Deno.cwd(), path).slice(
              0,
              -extname(path).length,
            );
            final[link] = src;
            push(from, src);
          }
        } else {
          final[from] = to;
          push(from, to);
        }
        return final;
      },
      Promise.resolve({} as Record<string, string>),
    );

    babel_importmap.load([{ imports: redirects }]);
  }); // TODO: generate nusa.importmap and register as site.data (all major browser except Safari now support <script type=importmap>)

  site.use(modify_urls({
    fn: (url) => url.startsWith(pkgPath) ? redirects[url] : url,
  }));
};
