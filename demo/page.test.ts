/* WARNING: dynamic import may cause --watch flag doesn't track the imported file
import { expandGlob } from "deno/fs/expand_glob.ts";
const tests = [];
for await (const { path } of expandGlob("demo/*\/test.ts")) {
  tests.push(import(path));
}
await Promise.all(tests);
*/

import "./console/test.ts";
import "./counter/test.ts";
