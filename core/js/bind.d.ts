import type { Feature } from "./constant.js";
import type { Attributes } from "./query.js";
import type { Module, Prototype } from "./types.d.ts";

/** Bind properties and methods */
export default function (
  features: Feature.modules,
  attrs: Attributes,
  scope: ShadowRoot,
): (module: Module) => void;

/** Perform incremental binding */
declare function bind(
  pc: Prototype,
  attrs: Attributes,
  scope: ShadowRoot,
  get: Feature.modules,
): void;
