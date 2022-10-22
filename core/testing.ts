import { afterAll, beforeAll, describe } from "deno/testing/bdd.ts";
import pupetter from "pupetter";

import type { Browser, BrowserContext, Page } from "pupetter";
import type { ConsoleMessage, ConsoleMessageType } from "pupetter";
import type { TestSuite } from "deno/testing/bdd.ts";

export let browser: Browser, page: Page, incognito: BrowserContext;
const site = "http://localhost:3000";

let disabledConsoleTypes: ConsoleMessageType[] = [];
export const disableBrowserConsole = (...args: ConsoleMessageType[]) =>
  disabledConsoleTypes = args;

export const testPage = <T = unknown>(
  path: string,
  fn?: () => void,
): TestSuite<T> =>
  describe(path, {
    fn,
    async beforeEach() {
      page = await incognito.newPage();
      page.on("console", onConsole);
      await page.goto(`${site}/${path}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForNetworkIdle();
    },
    async afterEach() {
      page.off("console", onConsole);
      await page.close();
    },
    sanitizeOps: false,
  });

beforeAll(async () => {
  browser = await pupetter.launch();
  incognito = await browser.createIncognitoBrowserContext();
});

afterAll(async () => {
  await incognito.close();
  await browser.close();
});

function onConsole(event: ConsoleMessage) {
  const type = event.type(), text = event.text();
  if (disabledConsoleTypes.some((it) => it === type)) return;
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
