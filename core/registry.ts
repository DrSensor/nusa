import type { Descriptors, Prototype } from "./types.ts";

export const index = Symbol(),
  setCurrentEvent = (event_: typeof event) => event = event_,
  setCurrentValue = <T>(value_: T) => value = value_;
export let event: Event | null = null, value: unknown;

// TODO: consider using Attr or target Element or host Element as a key (maybe 🤔)
export default new WeakMap() as Registry<Prototype>;

export type Registry<P extends Prototype> = WeakMap<P, Cache<P>>;

export type Cache<P extends Prototype> = [
  descriptors: Descriptors<P>,
  members: Record<string, Binder>,
];

export type Binder = AccessorBinder;
export type AccessorBinder = {
  databank_: unknown[];
  targets_: Targets[];
  dedupeRender_?: VoidFunction;
};
type Targets = (Attr | [target: Element, attrName: string] | Text)[];
