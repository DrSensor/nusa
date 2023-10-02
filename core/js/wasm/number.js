/// <reference types="./number.d.ts" />
/** @typedef {import("./number.js")} $ */

import * as load from "../utils/load.js";
import { index, memory, offset, scopeSize } from "./globals.js";

export const instance = /** @type $["instance"] */ (
  load.wasm.instantiate(
    new URL("../../wasm/instance/number.wasm", import.meta.url),
    { env: { offset, scopeSize, memory } },
  )
);

export const accessor = /** @type $["accessor"] */ (
  load.wasm.instantiate(
    new URL("../../wasm/accessor/number.wasm", import.meta.url),
    { env: { index, memory } },
  )
);

export const fastops = /** @type $["fastops"] */ (
  load.wasm.instantiate(
    new URL("../../wasm/fastops/number.wasm", import.meta.url),
    { env: { memory } },
  )
);
