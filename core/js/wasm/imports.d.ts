import type { PropCache, WasmBinder } from "../registry.js";

export const memory: WebAssembly.Memory;
export const offset: WebAssembly.Global,
  index: WebAssembly.Global,
  scopeSize: WebAssembly.Global;

export function prop(
  propNameAddr: number,
  propNameLen: number,
): [addr: number, len: number];

export function cache(addr: number, len: number): void;

declare type MayCache = PropCache | undefined;
declare type Series = WasmBinder["series_"];
