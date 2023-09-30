import type { builtinSet } from "./bind/accessor.js";
import type { Descriptors, NullValue, Prototype } from "./types.d.ts";

export type Cache<P extends Prototype = Prototype> = [
  descriptors: Descriptors<P>,
  members: Record<string, Binder>,
];

type Targets = Array<
  Node | [target: Element, attrName: string, builtin?: typeof builtinSet]
>;

export type Binder = AccessorBinder;
export type AccessorBinder = {
  databank_: unknown[];
  targets_: Targets[];
  dedupeRender_?: VoidFunction;
};

export type Registry<P extends Prototype> = WeakMap<P, Cache<P>>;

/////////////////////////////////////////////////////////////////////

declare const registry: Registry<Prototype>; // TODO: consider using Attr or target Element or host Element as a key (maybe 🤔)
export default registry;

/** `instance[index]` can be used to get instance ID number */
export declare const index: unique symbol;

/** Read current event
Use {@link setCurrentEvent} to set this */
export let event: Event | NullValue;

/** Read current value
Use {@link setCurrentValue} to set this */
export let value: unknown;

/** Setter function to set current {@link event} */
export function setCurrentEvent(event_: typeof event): void;

/** Setter function to set current {@link value} */
export function setCurrentValue(value_: unknown): void;
