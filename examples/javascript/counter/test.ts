import { it } from "deno/testing/bdd.ts";
import { assertEquals } from "deno/testing/asserts.ts";

import * as tester from "../../demo/tester.ts";
import type { ElementHandle } from "puppeteer";

const test = tester.page("demo/counter", {
  incognito: true,
  muteConsole: "log",
});

const waitToRender = () =>
  test.page.waitForFunction(() =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    )
  );

it(
  test.suite,
  "click button 7x",
  async () => {
    await test.page.waitForSelector("render-scope:defined");

    const button: ElementHandle<HTMLButtonElement> | null = await test.page.$(
      "aria/0[role='button']",
    );
    const span: ElementHandle<HTMLSpanElement> | null = await button!.$(
      "span",
    );
    const input: ElementHandle<HTMLInputElement> | null = await test.page.$(
      "aria/[role='spinbutton']",
    );

    assertEquals(await span!.evaluate((it) => it.textContent), "0");
    assertEquals(await span!.evaluate((it) => it.getAttribute("text")), null);
    assertEquals(await input!.evaluate((it) => it.value), "");
    assertEquals(await input!.evaluate((it) => it.getAttribute("value")), null);

    for (let count = 1; count <= 7; count++) {
      await button!.click();
      await waitToRender();

      assertEquals(
        await span!.evaluate((it) => it.textContent),
        String(count),
      );
      assertEquals(
        await span!.evaluate((it) => it.getAttribute("text")),
        String(count),
      );
      assertEquals(
        await input!.evaluate((it) => it.value),
        String(count),
      );
      assertEquals(
        await input!.evaluate((it) => it.getAttribute("value")),
        String(count),
      );
    }
  },
);

it(
  test.suite,
  "input random number 7x",
  async () => {
    await test.page.waitForSelector("render-scope:defined");

    const button: ElementHandle<HTMLButtonElement> | null = await test.page.$(
      "aria/0[role='button']",
    );
    const span: ElementHandle<HTMLSpanElement> | null = await button!.$(
      "span",
    );
    const input: ElementHandle<HTMLInputElement> | null = await test.page.$(
      "aria/[role='spinbutton']",
    );

    assertEquals(await span!.evaluate((it) => it.textContent), "0");
    assertEquals(await span!.evaluate((it) => it.getAttribute("text")), null);
    assertEquals(await input!.evaluate((it) => it.value), "");
    assertEquals(await input!.evaluate((it) => it.getAttribute("value")), null);

    for (let count = 1; count <= 7; count++) {
      const number = Math.round(Math.random() * 10);

      await input!.type(String(number));
      await input!.press("Enter");
      await waitToRender();

      assertEquals(
        await input!.evaluate((it) => it.value),
        String(number),
      );
      assertEquals(
        await input!.evaluate((it) => it.getAttribute("value")),
        String(number),
      );
      assertEquals(
        await span!.evaluate((it) => it.textContent),
        String(number),
      );
      assertEquals(
        await span!.evaluate((it) => it.getAttribute("text")),
        String(number),
      );

      await Promise.all([input!.press("Control"), input!.press("a")]); // prepare for overwrite (select all)
    }
  },
);

it(
  test.suite,
  "click button then input random number alternatively 7x",
  async () => {
    await test.page.waitForSelector("render-scope:defined");

    const button: ElementHandle<HTMLButtonElement> | null = await test.page.$(
      "aria/0[role='button']",
    );
    const span: ElementHandle<HTMLSpanElement> | null = await button!.$(
      "span",
    );
    const input: ElementHandle<HTMLInputElement> | null = await test.page.$(
      "aria/[role='spinbutton']",
    );

    assertEquals(await span!.evaluate((it) => it.textContent), "0");
    assertEquals(await span!.evaluate((it) => it.getAttribute("text")), null);
    assertEquals(await input!.evaluate((it) => it.value), "");
    assertEquals(await input!.evaluate((it) => it.getAttribute("value")), null);

    for (let count = 0, number = count; count < 7; count++) {
      {
        await button!.click();
        await waitToRender();

        assertEquals(
          await span!.evaluate((it) => it.textContent),
          String(number + 1),
        );
        assertEquals(
          await span!.evaluate((it) => it.getAttribute("text")),
          String(number + 1),
        );
        assertEquals(
          await input!.evaluate((it) => it.value),
          String(number + 1),
        );
        assertEquals(
          await input!.evaluate((it) => it.getAttribute("value")),
          String(number + 1),
        );
      }
      {
        number = Math.round(Math.random() * 10);
        await Promise.all([input!.press("Control"), input!.press("a")]); // prepare for overwrite (select all)
        await input!.type(String(number));
        await input!.press("Enter");
        await waitToRender();

        assertEquals(
          await input!.evaluate((it) => it.value),
          String(number),
        );
        assertEquals(
          await input!.evaluate((it) => it.getAttribute("value")),
          String(number),
        );
        assertEquals(
          await span!.evaluate((it) => it.textContent),
          String(number),
        );
        assertEquals(
          await span!.evaluate((it) => it.getAttribute("text")),
          String(number),
        );
      }
    }
  },
);
