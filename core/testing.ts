import { afterAll, beforeAll, describe } from "deno/testing/bdd.ts";
import pupetter from "pupetter";

import type { Browser, BrowserContext, Page } from "pupetter";
import type { ConsoleMessage, ConsoleMessageType } from "pupetter";
import type { TestSuite } from "deno/testing/bdd.ts";

export let browser: Browser, incognito: BrowserContext, hasIncognito = false;
const site = "http://localhost:3000";

export const testPage = <T = unknown>(
  path: string,
  opts?: {
    fn?: () => void;
    incognito?: true;
    muteConsole?: ConsoleMessageType[] | ConsoleMessageType | true;
  },
  fn?: () => void,
) => {
  const test = {} as {
    suite: TestSuite<T>;
    page: Page;
    console: ConsoleMessage;
  };
  if (opts?.incognito) hasIncognito = true;

  test.suite = describe(path, {
    fn: opts?.fn ?? fn,

    async beforeEach() {
      const { muteConsole, incognito: priv } = opts ?? {};
      test.page = await (priv ? incognito : browser).newPage();
      test.page.on("console", (message) => test.console = message);

      if (muteConsole !== true) {
        test.page.on("console", (message) => {
          const type = message.type();
          if (
            typeof muteConsole === "string"
              ? muteConsole !== type
              : !muteConsole?.some((it) => it === type)
          ) onConsole(message);
        });
      }

      await test.page.goto(`${site}/${path}`, {
        waitUntil: "domcontentloaded",
      });
      await test.page.waitForNetworkIdle();
    },

    async afterEach() {
      test.page.off("console", onConsole);
      await test.page.close();
    },

    sanitizeOps: false,
  });

  return test;
};

beforeAll(async () => {
  browser ??= await pupetter.launch();
  if (hasIncognito) incognito ??= await browser.createIncognitoBrowserContext();
});

afterAll(async () => {
  await incognito?.close();
  await browser.close();
});

function onConsole(event: ConsoleMessage) {
  const type = event.type(), text = event.text();
  switch (type) {
    case "warning":
      console.warn(text);
      break;
    case "verbose":
      console.debug(text);
      break;
    case "startGroup":
      console.group(text);
      break;
    case "startGroupCollapsed":
      console.groupCollapsed(text);
      break;
    case "endGroup":
      console.groupEnd();
      break;
    case "profile":
      console.time(text);
      break;
    case "timeEnd":
    case "profileEnd":
      console.timeEnd(text);
      break;
    case "clear":
      console.clear();
      break;
    default:
      console[type](text);
  }
}
