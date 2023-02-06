import type { Data, PageData } from "lume/core.ts";
import { basename, dirname, extname } from "deno/path/mod.ts";
import { fromFileUrl, join, relative } from "deno/path/mod.ts";
import { DOMParser, type Element } from "lume/deps/dom.ts";
import { concat, dedupe, ext } from "../utils.ts";

type DemoSnippet = Record<"path" | "lang" | "content", string>;

type Yield = Data & { demo: DemoSnippet[] };
export default async function* (page: PageData): AsyncGenerator<Yield> {
  const demo: Data[] = page.search.pages("demo=true");
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
        code.content = code.content.replace(origin, "./" + file);
      });
    });

    const url = join(
      ...["/", __dirname],
      ...((out) => (
        out.shift(), out.at(-1) === "" && (out[out.length - 1] = "/"), out
      ))(src.split("/")),
    );

    const content = extname(src) === ".html"
      ? remap(src, data.content, [scripts, styles])
      : data.content;

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
    let content = await Deno.readTextFile(path);

    if (ext.HTMLish(lang)) { // TODO: move all top level <script> and <link rel=stylesheet> to <head> base layout via site.data.scripts
      content = `<script async href=nusa/render-scope></script>

${content}`;
    } else if (
      lang === "js" && origin.startsWith("../") && !file.startsWith("../")
    ) imports.set(file, origin);

    codes.set(file, { lang, content });
  }
}

const DOM = new DOMParser();
function remap(
  src: string,
  content: string,
  [scripts, styles]: [scripts: unknown[], styles: unknown[]],
): string {
  const document = DOM.parseFromString(content, "text/html")!;
  for (const node of document.querySelectorAll("render-scope link[href]")) {
    const module = node as Element;
    const url = module.getAttribute("href")!;
    if (url.startsWith("/")) continue;
    module.setAttribute("href", "/" + join(dirname(src), url));
  }
  // WARNING: this solution can't redirect head.children without explicit <head> in template engine (i.e jinja/njk)
  for (const el of document.head!.getElementsByTagName("script")) {
    const module = el.getAttribute("type") === "module";
    const attrs = el.getAttributeNames().filter((it) =>
      it !== "src" && (module ? it !== "type" : true)
    ).join(" ");
    scripts.push({
      path: el.getAttribute("src"),
      ...module && { module },
      ...attrs && { attrs },
    });
  }
  for (const el of document.head!.getElementsByTagName("link")) {
    const rel = el.getAttribute("rel")!;
    switch (rel) {
      case "stylesheet": {
        const media = el.getAttribute("media");
        const attrs = el.getAttributeNames().filter((it) =>
          it !== "rel" && it !== "href" && (media ? it !== "media" : true)
        ).join(" ");
        styles.push({
          path: el.getAttribute("href"),
          ...media && { media },
          ...attrs && { attrs },
        });
        break;
      }
    }
  }
  return document.body.innerHTML;
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
