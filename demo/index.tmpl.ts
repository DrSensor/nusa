import type { Data, PageData } from "lume/core.ts";
import type { ElementHandlers } from "html-rewriter-wasm";
import { basename, dirname, extname } from "deno/path/mod.ts";
import { fromFileUrl, join, relative } from "deno/path/mod.ts";
import { concat, dedupe, ext } from "../utils.ts";
import { HTMLRewriter } from "html-rewriter";

type DemoSnippet = Record<"path" | "lang" | "content", string>;

type Yield = Data & { demo: DemoSnippet[] };
export default async function* (page: PageData): AsyncGenerator<Yield> {
  const demo: Data[] = page.search.pages("demo=true");
  if (demo.length === 0) return;
  const rewrite = new HTMLRewriter();

  for (const data of demo) {
    if (
      typeof data.content !== "string" || typeof data.url !== "string"
    ) continue;

    // <head>
    const scripts = dedupe(concat(data.scripts, page.scripts), "path");
    const styles = dedupe(concat(data.styles, page.styles), "path");
    // </head>

    const src = data.url.slice(1);

    const codes = new Map<DemoSnippet["path"], Omit<DemoSnippet, "path">>(); // dedupe code snippet
    const imports = new Map<DemoSnippet["path"], string>(); // remap static string used in import, fetch, worker, etc

    let snippet: Snippet | (string | Snippet | CodeSnippet)[] = data.snippet;
    if (Array.isArray(snippet)) {
      const list = snippet;
      snippet = {};
      for (const entry of list) {
        if (typeof entry === "string") snippet[basename(entry)] = entry;
        else if (isCodeSnippet(entry)) {
          const { url, ...value } = entry;
          snippet[url!] = value;
        } else {
          for (const [dst, src] of Object.entries(entry)) {
            snippet[dst] = typeof src === "string" ? src : src.src;
          }
        }
      }
    }
    await process(src, snippet, [codes, imports]);

    codes.forEach((code, path) => {
      if (code.lang !== "js" || imports.has(path)) return;
      imports.forEach((origin, file) => {
        code.content = code.content.replaceAll(origin, "./" + file);
      });
    });

    const url = join(
      ...["/", __dirname],
      ...((out) => (
        out.shift(), out.at(-1) === "" && (out[out.length - 1] = "/"), out
      ))(src.split("/")),
    );

    const register: ElementHandlers = {
      element(el) {
        const attrs = [...el.attributes].flatMap(([name, value]) =>
          name !== "src" && name !== "href"
            ? [value ? `${name}="${value}"` : name]
            : []
        );
        switch (el.tagName) {
          case "script":
            scripts.push({
              path: el.getAttribute("src"),
              ...attrs.length && { attrs },
              ...el.getAttribute("type") === "module" && { module: true },
            });
            break;
          case "style":
            styles.push({
              path: el.getAttribute("href"),
              ...attrs.length && { attrs },
              ...el.hasAttribute("media") &&
                { media: el.getAttribute("media") },
            });
            break;
        }
        el.remove();
      },
    }; // WARNING(cloudflare): HTMLRewriter can't handle :root selector
    rewrite.once('script[type="importmap"]', register);
    rewrite.once('script[src^="nusa"]', register);
    rewrite.once('link[rel="stylesheet"]', register);

    const redirect: ElementHandlers = {
      element(el) {
        let attr;
        let url = el.getAttribute(attr = "href") ??
          el.getAttribute(attr = "src")!;
        if (url.startsWith("/")) return;
        url = join("/", extname(src) ? dirname(src) : src, url);
        el.setAttribute(attr, url);
      },
    };
    rewrite.once("render-scope > link[href]", redirect);
    rewrite.once("render-scope > script[src]", redirect);

    const content = await rewrite.transform(data.content);

    const demo: DemoSnippet[] = [...codes.entries()].map(
      ([path, code]) => ({ path, ...code }),
    );

    yield {
      ...data,
      ...{ url, content },
      ...{ scripts, styles },
      ...{ tags: ["demo"], demo },
    };
  }
  rewrite.free();
}

const isCodeSnippet = (entry: Snippet | CodeSnippet): entry is CodeSnippet =>
  Object.hasOwn(entry, "src");

async function process(
  src: string,
  snippet: Snippet,
  [codes, imports]: [ // output
    codes: Map<DemoSnippet["path"], Omit<DemoSnippet, "path">>,
    imports: Map<string, string>,
  ],
) {
  for (let [file, path] of Object.entries(snippet)) {
    let lang = extname(file);
    if (typeof path === "string") lang = extname(file);
    else ({ src: path, lang = extname(file) } = path);
    lang = (lang || extname(path)).slice(1);
    const origin = path;
    path = join(src.endsWith("/") ? src : dirname(src), path);
    const content = await Deno.readTextFile(path);

    if (
      lang === "js" && origin.startsWith("../") && !file.startsWith("../")
    ) imports.set(file, origin);

    codes.set(file, { lang, content });
  }
}

const __dirname = (
  (path) =>
    basename(import.meta.url).split(".")[0] === "index" ? dirname(path) : path
)(relative(Deno.cwd(), fromFileUrl(import.meta.url)));

export type Snippet = Record<
  NonNullable<CodeSnippet["url"]>,
  CodeSnippet["src"] | Omit<CodeSnippet, "url">
>;
export interface CodeSnippet {
  url?: string;
  src: string;
  lang?: string;
}
