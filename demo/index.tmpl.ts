export const layout = "demo.njk";

import type { Data, PageData } from "lume/core.ts";
import { basename, dirname, extname } from "deno/path/mod.ts";
import { fromFileUrl, join, relative } from "deno/path/mod.ts";
import { DOMParser, type Element } from "lume/deps/dom.ts";
const dom = new DOMParser();

const __dirname = (
  (path) =>
    basename(import.meta.url).split(".")[0] === "index" ? dirname(path) : path
)(relative(Deno.cwd(), fromFileUrl(import.meta.url)));

type DemoSnippet = Record<"path" | "lang" | "content", string>;

export default async function* ({ search }: PageData): AsyncGenerator<
  Data & { demo?: DemoSnippet[] }
> {
  const demo: Data[] = search.pages("demo=true");
  for (const data of demo) {
    const codes = new Map<DemoSnippet["path"], Omit<DemoSnippet, "path">>();
    const imports = new Map<DemoSnippet["path"], string>();
    const src = (data.url as string).slice(1);

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

    const scripts = [...data.scripts ?? []], styles = [...data.styles ?? []];
    const content: string = ((content) => {
      if (extname(src) !== ".html") return content;

      const document = dom.parseFromString(content, "text/html")!;
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
    })(data.content as string);

    const url = join(
      ...["/", __dirname],
      ...((out) => (
        out.shift(), out.at(-1) === "" && (out[out.length - 1] = "/"), out
      ))(src.split("/")),
    );

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

class ext {
  static #HTML = new Set(["html", "htm"]);
  static #HTMLtemplate = new Set(["jinja", "njk", "eta", "ejs"]);
  static #HTMLish = new Set([...this.#HTML, ...this.#HTMLtemplate]);
  static HTML = (lang: string) => this.#HTML.has(lang);
  static HTMLtemplate = (lang: string) => this.#HTMLtemplate.has(lang);
  static HTMLish = (lang: string) => this.#HTMLish.has(lang);
}

export type Snippet = Record<
  NonNullable<CodeSnippet["url"]>,
  CodeSnippet["src"] | Omit<CodeSnippet, "url">
>;
export interface CodeSnippet {
  url?: string;
  src: string;
  lang?: string;
}
