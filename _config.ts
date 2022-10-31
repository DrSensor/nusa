import modify_urls from "lume/plugins/modify_urls.ts";
import babel from "drsensor/lume-plugins/babel.ts";
import esbuild from "lume/plugins/esbuild.ts";
import minify_html from "lume/plugins/minify_html.ts";

import lume from "lume/mod.ts";

export default lume()
  .ignore("core", "demo/tester.ts", (path) => path.endsWith("test.ts"))
  .scopedUpdates((path) => path.endsWith(".ts") && !path.startsWith("_"))
  .use(modify_urls({ fn: (url) => url.startsWith("nusa") ? "/" + url : url }))
  .use(babel())
  .use(esbuild({ options: { mangleProps: /^_/ } }))
  .use(minify_html());
