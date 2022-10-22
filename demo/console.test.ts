import { it } from "deno/testing/bdd.ts";
import { assertEquals } from "deno/testing/asserts.ts";

import { testPage } from "../core/testing.ts";
import type { ConsoleMessageType } from "pupetter";

const test = testPage("demo/console.html", {
  incognito: true,
  muteConsole: true,
});

for (
  const msgType of [
    "log",
    "debug",
    "info",
    "warning",
    "error",
  ] as ConsoleMessageType[]
) {
  const func = msgType === "warning" ? "warn" : msgType;

  it(test.suite, `click [console.${func}] button`, async () => {
    await test.page.waitForSelector("render-scope:defined");
    const button = await test.page.$(`aria/console.${func}[role='button']`);
    await button!.click();
    assertEquals(test.console.type(), msgType);
  });
}
