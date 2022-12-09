import type { Descriptors, Prototype } from "./types.ts";

export const index = Symbol();

// TODO: consider using Attr or target Element or host Element as a key (maybe 🤔)
const registry = new WeakMap<Prototype, [
  descriptors: Descriptors<Prototype>,
  members: Record<string, Binder>,
]>();
export default registry;

export const enum Registry {
  descriptors,
  members,
}
export const enum Bound {
  databank,
  targets,
  dedupe,
}
export type Binder = AccessorBinder;
export type AccessorBinder = [
  databank: unknown[],
  targets: Target[],
  dedupe?: VoidFunction,
];
type Target = (Attr | [target: Element, attr: name] | Text)[];
type name = string;
