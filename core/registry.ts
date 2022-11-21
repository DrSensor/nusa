import type { Descriptors, Prototype } from "./types.ts";

export const index = Symbol();

const registry = new WeakMap<Prototype, [
  descriptors: Descriptors<Prototype>,
  members: Record<string, DataBind>,
]>();
export default registry;
export const enum Registry {
  descriptors,
  members,
}
export const enum Member {
  databank,
  targets,
  dedupe,
}
export type DataBind = [
  databank: unknown[],
  targets: (Attr | [target: Element, attr: name] | Text)[][],
  dedupe?: () => void,
];
type name = string;
