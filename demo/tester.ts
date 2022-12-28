import { afterAll, beforeAll, describe } from "deno/testing/bdd.ts";
import puppeteer from "puppeteer";

import type { Browser, BrowserContext, Page } from "puppeteer";
import type { ConsoleMessage, ConsoleMessageType } from "puppeteer";
import type { TestSuite } from "deno/testing/bdd.ts";

export let browser: Browser, incognito: BrowserContext;
let hasIncognito = false;

const site = "http://localhost:3000";

export const page = <T = unknown>(
  path: string,
  opts?: {
    fn?: () => void;
    incognito?: true;
    only?: true;
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

  // BUG(deno): passing test descriptor of desribe.only doesn't ignore all tests
  test.suite = (opts?.only ? describe.only : describe)(path, {
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

      for (let retry = 20, timeout = .3, n = retry; retry--;) {
        try {
          await test.page.goto(`${site}/${path}`, {
            waitUntil: "domcontentloaded",
          });
          break;
        } catch {
          if (!retry) {
            throw `Can't open ${site} after ${n} retries in ${n * timeout}s.`;
          }
          await new Promise((resolve) => setTimeout(resolve, timeout * 1e3));
        }
      }
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
  browser ??= await puppeteer.launch();
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
