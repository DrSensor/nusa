/// <reference types="./imports.d.ts" />
/** @typedef {import("./imports.js")} $ */
/** @typedef {import("./imports.js").MayCache} MayCache */
/** @typedef {import("./imports.js").Series} Series */
import registry, { module } from "../registry.js";

export const memory = new WebAssembly.Memory({ initial: 1 });

const muti32 = () => new WebAssembly.Global({ mutable: true, value: "i32" });
export const offset = muti32(),
  index = muti32(),
  scopeSize = muti32();

const utf8 = new TextDecoder();

let /** @type string|undefined */ propName;
let /** @type Series|undefined */ series_;

/** @type $["prop"] */
export function prop(propNameAddr, propNameLen) {
  propName = utf8.decode(memory.buffer.slice(propNameAddr, propNameLen));
  series_ = /** @type MayCache */ (registry.get(module))?.[propName].series_;
  return series_?.[index.value] ?? [0, -1];
}

/** @type $["cache"] */
export function cache(addr, len) {
  /** @type Series */ (series_)[index.value] = [addr, len];
}
