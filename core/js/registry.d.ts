import type { builtinSet } from "./bind/accessor.js";
import type { Descriptors, Module, NullValue, Prototype } from "./types.d.ts";

export type Cache<P extends Prototype = Prototype> = [
  descriptors: Descriptors<P>,
  members: Record<string, Binder>,
];

type Targets = Array<
  Node | [target: Element, attrName: string, builtin?: typeof builtinSet]
>;

export interface Binder {
  targets_: Targets[];
  dedupeRender_?: VoidFunction;
}

export interface AccessorBinder extends Binder {
  /** @todo rename it as `dataframe_` */
  databank_: unknown[];
}
export interface WasmBinder extends Binder {
  series_: [addr: number, len: number][];
}

export interface PropCache {
  [propName: string]: WasmBinder;
}

export type Registry<Key extends WeakKey> = WeakMap<
  Key,
  Key extends Prototype ? Cache<Key> : PropCache
>;

/////////////////////////////////////////////////////////////////////

/** `instance[index]` can be used to get instance ID number */
export const index: unique symbol;

/** Read current event
Use {@link setCurrentEvent} to set this */
export let event: Event | NullValue;
/** Setter function to set current {@link event} */
export function setCurrentEvent(event_: typeof event): void;

/** Read current value
Use {@link setCurrentValue} to set this */
export let value: unknown;
/** Setter function to set current {@link value} */
export function setCurrentValue(value_: typeof value): void;

// TODO: consider using Attr or target Element or host Element as a key (maybe 🤔)
declare const registry: Registry<Prototype | typeof module>;
export default registry;

/** Read current module Object
Use {@link setCurrentModule} to set this */
export let module: Module | WebAssembly.Exports;
/** Setter function to set current {@link module} */
export function setCurrentModule(module_: typeof module): void;

/** Map prop_name to wasm memory address */
export function cABIregister(
  propNameAddr: number,
  propNameLen: number,
  memAddr: number,
): void;
