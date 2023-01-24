import type { Data, PageData } from "lume/core.ts";
import { dirname, extname, join } from "deno/path/mod.ts";

export const layout = "demo.njk";
export default async function* ({ search }: PageData) {
  const demo: Data[] = search.pages("demo=true");
  for (const data of demo) {
    const snippet: Snippet = data.snippet;
    const codes = [] as Record<"path" | "lang" | "content", string>[];
    const imports = new Map<string, string>();
    const src = data.url as string;
    for (let [file, path] of Object.entries(snippet)) {
      let lang = extname(file);
      if (Array.isArray(path)) [path, lang] = path;
      else if (typeof path === "string") lang = extname(file);
      else ({ src: path, lang = extname(file) } = path);
      lang = (lang || extname(path)).slice(1);
      const origin = path;
      path = join(dirname(src).slice(1), path);
      let content = await Deno.readTextFile(path);

      if (lang === "html" || lang === "jinja") {
        content = `<script async href=nusa/render-scope></script>

${content}`;
      } else if (
        lang === "js" && origin.startsWith("../") && !file.startsWith("../")
      ) imports.set(file, origin);

      codes.push({ path: file, lang, content });
    }
    codes.filter((a) => a.lang === "js").forEach((code) => {
      if (imports.has(code.path)) return;
      imports.forEach((origin, file) => {
        code.content = code.content.replace(origin, "./" + file);
      });
    });

    yield {
      url: join(dirname(src), "index.html"),
      content: data.content,
      templateEngine: data.templateEngine,
      tags: ["demo"],
      demo: codes,
      overwrite: true, // TODO: make PR to lume to allow explicit overwrite
    };
  }
}

export type Snippet = Record<
  string,
  string | [path: string, lang: string] | Omit<CodeSnippet, "url">
>;

interface CodeSnippet {
  url?: string;
  src: string;
  lang?: string;
}
