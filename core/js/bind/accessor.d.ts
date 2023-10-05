import type { AccessorBinder } from "../registry.js";
import type { Instance } from "../types.d.ts";

declare const mark:
  "This is `unique symbol` but typescript coerce it to `symbol` when used in JSDoc 😞";

/** Override accessor behaviour described in {@link descs}
After override, you still need to apply it via {@link Object.defineProperties}
*/ export function override(
  accessor: string,
  descs: Record<string, (PropertyDescriptor & { [mark]?: true }) | undefined>,
  members: Record<string, AccessorBinder>,
  attr: Attr,
  id: number,
): void;

/** Populate registry {@link members} */
declare function init(
  members: Record<string, AccessorBinder>,
  accessor: string,
  attr: Attr,
  id: number,
): void;

/** Autocast accessor value from {@link Attr.value} (string) at runtime */
export function infer(
  properties: Set<string>,
  accessors: Set<string>,
  descs: Record<string, PropertyDescriptor & { [mark]?: true }>,
  members: Record<string, AccessorBinder>,
  instance: Instance,
  id: number,
): void;

/** Patch {@link PropertyDescriptor} of certain {@link accessor} */
declare function patch(
  desc: PropertyDescriptor,
  cache: AccessorBinder,
  id: number,
): void;

/** Update accessor value (pointer) which point into {@link databank} (virtual heap)
@todo use DOM Parts Imperative API (only when it's adopted by Chrome)
*/ export function update(
  databank: AccessorBinder["databank_"],
  targets: AccessorBinder["targets_"],
  id: number,
): void;

declare const builtinSet: {
  /** replace element.textContent */
  text(element: Element, value: string): Text;
  /** replace element.innerHTML */
  html(element: Element, value: string): void;
};
